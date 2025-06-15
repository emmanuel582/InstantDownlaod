// Content script for Video Downloader Pro
(function() {
    'use strict';
    
    // Detect video elements on supported sites
    function detectVideos() {
        const videos = document.querySelectorAll('video');
        const videoData = [];
        
        videos.forEach(video => {
            if (video.src || video.currentSrc) {
                videoData.push({
                    src: video.src || video.currentSrc,
                    duration: video.duration,
                    title: document.title
                });
            }
        });
        
        return videoData;
    }
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getVideos') {
            const videos = detectVideos();
            sendResponse({ videos: videos });
        }
    });
    
    // Periodically check for new videos
    setInterval(() => {
        const videos = detectVideos();
        if (videos.length > 0) {
            chrome.runtime.sendMessage({
                action: 'videosFound',
                videos: videos,
                url: window.location.href
            });
        }
    }, 5000);
})();