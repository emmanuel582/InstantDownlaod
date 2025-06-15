// Content script for Instant Download extension

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_VIDEO_URL') {
        // Get the current page URL
        const url = window.location.href;
        sendResponse({ url });
    }
    return true;
});

// Add context menu for video elements
document.addEventListener('contextmenu', (event) => {
    const video = event.target.closest('video');
    if (video) {
        // Store video URL for context menu use
        chrome.storage.local.set({ 'contextVideoUrl': video.src });
    }
}, true);

// Listen for video elements being added to the page
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'VIDEO') {
                // Store video URL when new video is added
                chrome.storage.local.set({ 'contextVideoUrl': node.src });
            }
        });
    });
});

// Start observing the document for video elements
observer.observe(document.documentElement, {
    childList: true,
    subtree: true
}); 