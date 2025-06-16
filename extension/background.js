// Background script for Instant Download extension

import { cookieManager } from './background/cookieManager.js';

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Instant Download extension installed');
    // Initialize cookie manager
    cookieManager.initialize().catch(console.error);
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
        case 'DOWNLOAD_STARTED':
            // Update badge when download starts
            chrome.action.setBadgeText({ text: '↓' });
            chrome.action.setBadgeBackgroundColor({ color: '#ff6b35' });
            break;

        case 'DOWNLOAD_COMPLETED':
            // Clear badge when download completes
            chrome.action.setBadgeText({ text: '' });
            // Cleanup cookies after download
            cookieManager.cleanup().catch(console.error);
            break;

        case 'GET_TEMP_DIR':
            // Get platform-specific temp directory
            chrome.runtime.getPlatformInfo((platformInfo) => {
                const tempDir = platformInfo.os === 'win' 
                    ? `${process.env.TEMP}/video-downloader`
                    : `${process.env.TMPDIR || '/tmp'}/video-downloader`;
                sendResponse({ tempDir });
            });
            return true;

        case 'SAVE_COOKIES':
            // Save cookies to file
            try {
                const fs = require('fs');
                const path = require('path');
                const dir = path.dirname(request.path);
                
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                fs.writeFileSync(request.path, request.content);
                sendResponse({ success: true });
            } catch (error) {
                sendResponse({ error: error.message });
            }
            return true;

        case 'DELETE_COOKIES':
            // Delete cookie file
            try {
                const fs = require('fs');
                if (fs.existsSync(request.path)) {
                    fs.unlinkSync(request.path);
                }
                sendResponse({ success: true });
            } catch (error) {
                sendResponse({ error: error.message });
            }
            return true;

        case 'EXTRACT_COOKIES':
            // Extract cookies for a URL
            cookieManager.extractCookies(request.url)
                .then(cookiePath => sendResponse({ cookiePath }))
                .catch(error => sendResponse({ error: error.message }));
            return true;
    }
});

// Handle download completion
chrome.downloads.onChanged.addListener((delta) => {
    if (delta.state && delta.state.current === 'complete') {
        chrome.action.setBadgeText({ text: '' });
        // Cleanup cookies after download
        cookieManager.cleanup().catch(console.error);
    }
});

// Handle browser action click
chrome.action.onClicked.addListener((tab) => {
    // Open popup when extension icon is clicked
    chrome.windows.create({
        url: chrome.runtime.getURL('popup/popup.html'),
        type: 'popup',
        width: 400,
        height: 600
    });
}); 