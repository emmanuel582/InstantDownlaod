const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();

// Environment configuration
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const tempDir = path.join(__dirname, 'temp');
const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

// Create temp directory if it doesn't exist
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Enable CORS for the extension
app.use(cors({
    origin: isProduction 
        ? ['chrome-extension://*', 'https://instantdownload.onrender.com']
        : ['chrome-extension://*', 'http://localhost:*'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Increase payload limit for large files
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cleanup temp files periodically
setInterval(() => {
    fs.readdir(tempDir, (err, files) => {
        if (err) return;
        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                // Delete files older than 1 hour
                if (now - stats.mtimeMs > 3600000) {
                    fs.unlink(filePath, () => {});
                }
            });
        });
    });
}, 300000); // Run every 5 minutes

// Helper to call Python script with better error handling
function callPythonScript(args) {
    return new Promise((resolve, reject) => {
        const py = spawn(pythonCommand, args);
        let data = '';
        let err = '';
        
        py.stdout.on('data', chunk => {
            try {
                // Try to parse each chunk as JSON to catch errors early
                const jsonStr = chunk.toString();
                JSON.parse(jsonStr);
                data += jsonStr;
            } catch (e) {
                data += chunk;
            }
        });
        
        py.stderr.on('data', chunk => {
            try {
                // Try to parse stderr as JSON too (since we send errors as JSON)
                const jsonStr = chunk.toString();
                const parsed = JSON.parse(jsonStr);
                if (parsed.error) {
                    err = parsed.error;
                } else {
                    err += jsonStr;
                }
            } catch (e) {
                err += chunk;
            }
        });
        
        py.on('error', (error) => {
            reject(new Error(`Failed to start Python process: ${error.message}`));
        });
        
        py.on('close', code => {
            try {
                if (code !== 0) {
                    // Try to parse the error as JSON first
                    try {
                        const errorJson = JSON.parse(err || data);
                        reject(new Error(errorJson.error || 'Unknown error occurred'));
                    } catch (e) {
                        // If not JSON, use the raw error
                        reject(new Error(err || data || `Process exited with code ${code}`));
                    }
            } else {
                    // Try to parse the success response
                try {
                        const result = JSON.parse(data);
                        if (result.error) {
                            reject(new Error(result.error));
                        } else {
                            resolve(result);
                        }
                } catch (e) {
                        reject(new Error(`Failed to parse Python output: ${data}`));
                    }
                }
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Helper to call Python script for info
function callPythonInfo(url, cookiesPath) {
    const args = ['yt_dlp_api.py', 'info', url];
    if (cookiesPath) args.push('--cookies', cookiesPath);
    return callPythonScript(args);
}

// Helper to call Python script for download
function callPythonDownload(url, format_id, outPath, isAudio, cookiesPath) {
        const args = ['yt_dlp_api.py', 'download', url, format_id, outPath, isAudio.toString()];
        if (cookiesPath) args.push('--cookies', cookiesPath);
    return callPythonScript(args);
}

// Health check endpoint
app.get('/status', (req, res) => {
    res.json({ 
        status: 'ok', 
        version: 'yt-dlp-backend',
        environment: isProduction ? 'production' : 'development'
    });
});

// Get video/audio info and formats
app.post('/api/info', async (req, res) => {
    const { url, cookies } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    
    let cookiesPath = null;
    try {
        if (cookies) {
            cookiesPath = path.join(tempDir, `cookies_${Date.now()}.txt`);
            fs.writeFileSync(cookiesPath, cookies);
        }
        
        const info = await callPythonInfo(url, cookiesPath);
        if (!info) {
            throw new Error('Failed to get video information');
        }
        
        // Process formats
        const formats = {
            video: [],
            audio: []
        };
        
        // Sort and organize formats
        for (const f of info.formats) {
            if (f.type === 'video') {
                formats.video.push({
                    format_id: f.format_id,
                    label: f.label,
                    ext: f.ext,
                    height: f.height,
                    fps: f.fps
                });
            } else if (f.type === 'audio') {
                formats.audio.push({
                    format_id: f.format_id,
                    label: f.label,
                    ext: f.ext,
                    abr: f.abr
                });
            }
        }
        
        // Sort video formats by height (descending)
        formats.video.sort((a, b) => (b.height || 0) - (a.height || 0));
        
        // Sort audio formats by bitrate (descending)
        formats.audio.sort((a, b) => (b.abr || 0) - (a.abr || 0));
        
        // Add 'best' options
        formats.video.unshift({ format_id: 'best', label: 'Best Quality (Auto)' });
        formats.audio.unshift({ format_id: 'bestaudio', label: 'Best Audio (Auto)' });
        
        res.json({
            title: info.title,
            formats: formats,
            platform: info.platform,
            thumbnail: info.thumbnail,
            duration: info.duration
        });
    } catch (error) {
        console.error('Info fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch formats', 
            details: isProduction ? undefined : error.message
        });
    } finally {
        if (cookiesPath) {
            try {
                fs.unlinkSync(cookiesPath);
            } catch (e) {
                console.error('Failed to delete cookies file:', e);
            }
        }
    }
});

// Download media (video or audio)
app.post('/api/download', async (req, res) => {
    const { url, format, quality, extractAudio, cookies } = req.body;
    if (!url || !format) {
        return res.status(400).json({ error: 'URL and format are required' });
    }
    
    const outPath = path.join(tempDir, `temp_${Date.now()}.${format === 'audio' ? 'mp3' : 'mp4'}`);
    let cookiesPath = null;
    
    try {
        if (cookies) {
            cookiesPath = path.join(tempDir, `cookies_${Date.now()}.txt`);
            fs.writeFileSync(cookiesPath, cookies);
        }
        
        const isAudio = format === 'audio' || extractAudio;
        const format_id = quality || (isAudio ? 'bestaudio' : 'best');
        
        await callPythonDownload(url, format_id, outPath, isAudio, cookiesPath);
        
        // Set appropriate headers
        res.setHeader('Content-Disposition', `attachment; filename="download.${isAudio ? 'mp3' : 'mp4'}"`);
        res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');
        
        // Stream file
        const stream = fs.createReadStream(outPath);
        stream.pipe(res);
        
        stream.on('close', () => {
            try {
                fs.unlinkSync(outPath);
            } catch (e) {
                console.error('Failed to delete output file:', e);
            }
        });
        
        stream.on('error', err => {
            console.error('Stream error:', err);
            try {
                fs.unlinkSync(outPath);
            } catch (e) {
                console.error('Failed to delete output file:', e);
            }
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: 'Failed to stream file', 
                    details: isProduction ? undefined : err.message
                });
            }
        });
    } catch (error) {
        console.error('Download error:', error);
        try {
            if (fs.existsSync(outPath)) {
                fs.unlinkSync(outPath);
            }
        } catch (e) {
            console.error('Failed to delete output file:', e);
        }
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Download failed', 
                details: isProduction ? undefined : error.message
            });
        }
    } finally {
        if (cookiesPath) {
            try {
                fs.unlinkSync(cookiesPath);
            } catch (e) {
                console.error('Failed to delete cookies file:', e);
            }
        }
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
        res.status(500).json({ 
            error: 'Internal server error',
            details: isProduction ? undefined : err.message
        });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
});