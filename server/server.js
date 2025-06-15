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

// Helper to call Python script
function callPythonInfo(url) {
    return new Promise((resolve, reject) => {
        const py = spawn('python', ['yt_dlp_api.py', 'info', url]);
        let data = '';
        let err = '';
        py.stdout.on('data', chunk => data += chunk);
        py.stderr.on('data', chunk => err += chunk);
        py.on('close', code => {
            if (code !== 0 || err) {
                reject(err || data);
            } else {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject('Failed to parse info: ' + data);
                }
            }
        });
    });
}

function callPythonDownload(url, format_id, outPath, isAudio) {
    return new Promise((resolve, reject) => {
        const py = spawn('python', ['yt_dlp_api.py', 'download', url, format_id, outPath, isAudio.toString()]);
        let err = '';
        py.stderr.on('data', chunk => err += chunk);
        py.on('close', code => {
            if (code !== 0) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
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
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    
    try {
        const info = await callPythonInfo(url);
        
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
            formats: formats
        });
    } catch (error) {
        console.error('Info fetch error:', error);
                    res.status(500).json({ 
            error: 'Failed to fetch formats', 
            details: isProduction ? undefined : error.toString() 
        });
    }
});

// Download media (video or audio)
app.post('/api/download', async (req, res) => {
    const { url, format, quality, extractAudio } = req.body;
    if (!url || !format) return res.status(400).json({ error: 'URL and format are required' });
    
    const outPath = path.join(tempDir, `temp_${Date.now()}.${format === 'audio' ? 'mp3' : 'mp4'}`);
    
    try {
        const isAudio = format === 'audio' || extractAudio;
        const format_id = quality || (isAudio ? 'bestaudio' : 'best');
        
        await callPythonDownload(url, format_id, outPath, isAudio);
        
        // Set appropriate headers
        res.setHeader('Content-Disposition', `attachment; filename="download.${isAudio ? 'mp3' : 'mp4'}"`);
        res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');
        
        // Stream file
        const stream = fs.createReadStream(outPath);
        stream.pipe(res);
        
        stream.on('close', () => {
            fs.unlink(outPath, () => {});
        });
        
        stream.on('error', err => {
            console.error('Stream error:', err);
            fs.unlink(outPath, () => {});
                    if (!res.headersSent) {
                res.status(500).json({ 
                    error: 'Failed to stream file', 
                    details: isProduction ? undefined : err.toString() 
                });
            }
        });
    } catch (error) {
        console.error('Download error:', error);
        fs.unlink(outPath, () => {});
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Download failed', 
                details: isProduction ? undefined : error.toString() 
            });
        }
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    if (!res.headersSent) {
        res.status(500).json({ 
            error: 'Internal server error',
            details: isProduction ? undefined : err.message
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
});