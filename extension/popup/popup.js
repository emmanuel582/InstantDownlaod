class VideoDownloaderPopup {
    constructor() {
        // Server URLs
        this.serverUrl = 'https://instantdownload.onrender.com';
        this.localServerUrl = 'http://localhost:3000';
        
        // State
        this.currentUrl = '';
        this.selectedFormat = 'video';
        this.selectedQuality = 'best';
        this.isDownloading = false;
        this.availableFormats = {
            video: [],
            audio: []
        };
        this.formatsLoaded = false;
        this.activeServerUrl = null;
        this.serverCheckInterval = null;
        
        // Initialize after DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        // Get DOM elements
        this.elements = {
            videoUrlInput: document.getElementById('videoUrl'),
            pasteBtn: document.getElementById('pasteBtn'),
            formatSelect: document.getElementById('formatSelect'),
            formatBtns: document.querySelectorAll('.format-btn'),
            downloadBtn: document.getElementById('downloadBtn'),
            statusMessage: document.querySelector('.status-message'),
            serverStatus: document.querySelector('.status-indicator'),
            serverStatusText: document.querySelector('.status-text'),
            progressContainer: document.querySelector('.progress-container'),
            progressBar: document.querySelector('.progress-bar'),
            loadingSpinner: document.querySelector('.loading-spinner')
        };

        // Initialize components
        this.checkServerStatus();
        this.startServerCheck();
        this.bindEvents();
        this.setupFormatOptions();
        
        // Get current tab URL
        this.getCurrentTabUrl();
    }

    startServerCheck() {
        // Check server status every 30 seconds
        this.serverCheckInterval = setInterval(() => this.checkServerStatus(), 30000);
    }

    async getCurrentTabUrl() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]?.url) {
                this.currentUrl = tabs[0].url;
                if (this.elements.videoUrlInput) {
                    this.elements.videoUrlInput.value = this.currentUrl;
                    this.handleUrlInput();
                }
            }
        } catch (error) {
            console.error('Error getting current tab URL:', error);
        }
    }

    bindEvents() {
        // URL Input events
        if (this.elements.videoUrlInput) {
            this.elements.videoUrlInput.addEventListener('input', () => this.handleUrlInput());
            this.elements.videoUrlInput.addEventListener('paste', () => this.handleUrlInput());
        }

        // Paste button
        if (this.elements.pasteBtn) {
            this.elements.pasteBtn.addEventListener('click', () => this.handlePaste());
        }

        // Format selection
        if (this.elements.formatSelect) {
            this.elements.formatSelect.addEventListener('change', () => this.handleFormatChange());
        }

        // Format buttons
        if (this.elements.formatBtns) {
            this.elements.formatBtns.forEach(btn => {
                btn.addEventListener('click', () => this.handleFormatButtonClick(btn));
            });
        }

        // Download button
        if (this.elements.downloadBtn) {
            this.elements.downloadBtn.addEventListener('click', () => this.handleDownload());
        }
    }

    setupFormatOptions() {
        console.log('Setting up format options. Available formats:', this.availableFormats);
        
        const formatOptions = this.availableFormats[this.selectedFormat] || [];
        console.log('Format options for select:', formatOptions);
        
        if (this.elements.formatSelect) {
            // Update format select options
            this.elements.formatSelect.innerHTML = formatOptions.map(opt => 
                `<option value="${opt.format_id}" ${opt.format_id === this.selectedQuality ? 'selected' : ''}>${opt.label}</option>`
            ).join('');
            
            // Enable/disable select based on format type and availability
            this.elements.formatSelect.disabled = !this.formatsLoaded;
            
            // Make sure the select is visible if we have formats
            if (this.formatsLoaded) {
                this.elements.formatSelect.style.display = 'block';
            }
        }

        // Set initial format button state
        if (this.elements.formatBtns) {
            this.elements.formatBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.format === this.selectedFormat);
            });
        }

        // Update download button state
        this.updateDownloadButton();
    }

    async checkServerStatus() {
        let renderServerOk = false;
        let localServerOk = false;

        try {
            // Try Render server first
            const response = await fetch(`${this.serverUrl}/status`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'ok') {
                    renderServerOk = true;
                    this.updateServerStatus(true, 'render');
                    this.activeServerUrl = this.serverUrl;
                    return;
                }
            }
        } catch (error) {
            console.log('Render server not available:', error);
        }

        try {
            // Fallback to local server
            const response = await fetch(`${this.localServerUrl}/status`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'ok') {
                    localServerOk = true;
                    this.updateServerStatus(true, 'local');
                    this.activeServerUrl = this.localServerUrl;
                    return;
                }
            }
        } catch (error) {
            console.log('Local server not available:', error);
        }

        // If neither server is available
        if (!renderServerOk && !localServerOk) {
            this.updateServerStatus(false);
            this.activeServerUrl = null;
            this.showStatus('Server unavailable. Please try again later.', 'error');
        }
    }

    updateServerStatus(isAvailable, serverType = null) {
        if (this.elements.serverStatus) {
            this.elements.serverStatus.className = 'status-indicator ' + 
                (isAvailable ? 'status-ok' : 'status-error');
        }
        if (this.elements.serverStatusText) {
            this.elements.serverStatusText.textContent = isAvailable 
                ? `Server: ${serverType === 'render' ? 'Cloud' : 'Local'}`
                : 'Server: Unavailable';
        }
    }

    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-message ${type}`;
            statusElement.style.display = 'block';
            
            // Auto-hide success messages after 3 seconds
            if (type === 'success') {
                setTimeout(() => {
                    statusElement.style.display = 'none';
                }, 3000);
            }
        }
    }

    async handleUrlInput() {
        const url = this.elements.videoUrlInput?.value.trim() || '';
        if (url && url !== this.currentUrl) {
            this.currentUrl = url;
            this.formatsLoaded = false;
            this.selectedQuality = 'best';
            this.setupFormatOptions();
            await this.fetchFormats(url);
        }
    }

    async handlePaste() {
        try {
            const text = await navigator.clipboard.readText();
            if (this.elements.videoUrlInput) {
                this.elements.videoUrlInput.value = text;
                this.handleUrlInput();
            }
        } catch (error) {
            this.showStatus('Failed to paste from clipboard', 'error');
        }
    }

    handleFormatChange() {
        const format = this.elements.formatSelect?.value;
        if (format) {
            this.selectedQuality = format;
            this.updateDownloadButton();
        }
    }

    handleFormatButtonClick(button) {
        if (!button) return;

        // Update active state
        if (this.elements.formatBtns) {
            this.elements.formatBtns.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        }
        
        // Update format type and reset quality
        this.selectedFormat = button.dataset.format;
        this.selectedQuality = this.selectedFormat === 'audio' ? 'bestaudio' : 'best';
        this.setupFormatOptions();
        this.updateDownloadButton();
    }

    updateDownloadButton() {
        if (this.elements.downloadBtn) {
            const canDownload = this.currentUrl && this.selectedFormat && 
                (this.formatsLoaded || this.selectedQuality === 'best' || this.selectedQuality === 'bestaudio');
            this.elements.downloadBtn.disabled = !canDownload;
        }
    }

    async fetchFormats(url) {
        if (!this.activeServerUrl) {
            throw new Error('No active server available');
        }

        try {
            this.showStatus('Loading available formats...', 'info');
            this.elements.formatSelect.disabled = true;
            this.elements.formatSelect.innerHTML = '<option value="loading">Loading formats...</option>';
            
            const response = await fetch(`${this.activeServerUrl}/api/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch formats');
            }

            const data = await response.json();
            console.log('Received formats:', data.formats);
            
            this.availableFormats = data.formats;
            this.formatsLoaded = true;
            
            if (Object.values(this.availableFormats).every(formats => formats.length === 0)) {
                this.showStatus('No formats available for this video', 'error');
                this.elements.formatSelect.innerHTML = '<option value="auto">Auto (No formats available)</option>';
            } else {
                this.showStatus('Formats loaded successfully', 'success');
                this.setupFormatOptions();
            }
            
            this.updateDownloadButton();
        } catch (error) {
            console.error('Error fetching formats:', error);
            this.showStatus(error.message || 'Failed to load formats', 'error');
            this.elements.formatSelect.innerHTML = '<option value="auto">Auto (Error loading formats)</option>';
            this.formatsLoaded = false;
        } finally {
            this.elements.formatSelect.disabled = false;
        }
    }

    async getYouTubeCookies() {
        try {
            const cookies = await chrome.cookies.getAll({ domain: '.youtube.com' });
            return cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
        } catch (error) {
            console.error('Error getting cookies:', error);
            return '';
        }
    }

    async handleDownload() {
        if (this.isDownloading || !this.currentUrl || !this.selectedFormat) return;

        if (!this.activeServerUrl) {
            this.showStatus('No active server available', 'error');
            return;
        }

        try {
            this.isDownloading = true;
            this.showStatus('Starting download...', 'info');
            this.updateDownloadUI(true);

            const cookies = await this.getYouTubeCookies();
            const response = await fetch(`${this.activeServerUrl}/api/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: this.currentUrl,
                    format: this.selectedFormat,
                    quality: this.selectedQuality,
                    cookies: cookies,
                    extractAudio: this.selectedFormat === 'audio'
                })
            });

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const filename = this.getSuggestedFilename(this.currentUrl);
            
            // Create download URL and trigger download
            const url = URL.createObjectURL(blob);
            await chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: false
            });

            this.showStatus('Download completed!', 'success');
            chrome.runtime.sendMessage({ type: 'DOWNLOAD_COMPLETED' });
            
            // Clear the input after successful download
            if (this.elements.videoUrlInput) {
                this.elements.videoUrlInput.value = '';
                this.currentUrl = '';
                this.availableFormats = { video: [], audio: [] };
                this.selectedQuality = this.selectedFormat === 'audio' ? 'bestaudio' : 'best';
                this.setupFormatOptions();
            }
        } catch (error) {
            console.error('Download error:', error);
            this.showStatus('Download failed: ' + error.message, 'error');
        } finally {
            this.isDownloading = false;
            this.updateDownloadUI(false);
        }
    }

    updateDownloadUI(isDownloading) {
        if (this.elements.downloadBtn) {
            this.elements.downloadBtn.disabled = isDownloading;
            const btnText = this.elements.downloadBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.textContent = isDownloading ? 'Downloading...' : 'Download';
            }
        }
        if (this.elements.loadingSpinner) {
            this.elements.loadingSpinner.style.display = isDownloading ? 'block' : 'none';
        }
        if (this.elements.progressContainer) {
            this.elements.progressContainer.style.display = isDownloading ? 'block' : 'none';
        }
    }

    getSuggestedFilename(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.replace('www.', '');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const ext = this.selectedFormat === 'audio' ? 'mp3' : 'mp4';
            return `${hostname}-${timestamp}.${ext}`;
        } catch {
            const ext = this.selectedFormat === 'audio' ? 'mp3' : 'mp4';
            return `download-${Date.now()}.${ext}`;
        }
    }
}

// Initialize popup
new VideoDownloaderPopup();