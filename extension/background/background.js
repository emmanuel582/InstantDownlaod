// Background script for Video Downloader Pro
chrome.runtime.onInstalled.addListener(() => {
    console.log('Video Downloader Pro installed');
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'detectVideo') {
        // Handle video detection
        sendResponse({ success: true });
    }
});

// Monitor download progress
chrome.downloads.onChanged.addListener((downloadDelta) => {
    if (downloadDelta.state) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'downloadProgress',
                    state: downloadDelta.state.current
                });
            }
        });
    }
});