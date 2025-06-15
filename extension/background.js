// Background script for Instant Download extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Instant Download extension installed');
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'DOWNLOAD_STARTED') {
        // Update badge when download starts
        chrome.action.setBadgeText({ text: '↓' });
        chrome.action.setBadgeBackgroundColor({ color: '#ff6b35' });
    } else if (request.type === 'DOWNLOAD_COMPLETED') {
        // Clear badge when download completes
        chrome.action.setBadgeText({ text: '' });
    }
    return true;
});

// Handle download completion
chrome.downloads.onChanged.addListener((delta) => {
    if (delta.state && delta.state.current === 'complete') {
        chrome.action.setBadgeText({ text: '' });
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