const { execSync } = require('child_process');
const path = require('path');

function verifyPython() {
    try {
        // Check Python version
        const pythonVersion = execSync('python3 --version').toString().trim();
        console.log('Python version:', pythonVersion);

        // Verify pip is installed
        const pipVersion = execSync('python3 -m pip --version').toString().trim();
        console.log('Pip version:', pipVersion);

        // Verify ffmpeg is installed
        const ffmpegVersion = execSync('ffmpeg -version').toString().split('\n')[0];
        console.log('FFmpeg version:', ffmpegVersion);

        console.log('✅ Python environment verification successful');
        return true;
    } catch (error) {
        console.error('❌ Python environment verification failed:', error.message);
        console.error('\nPlease ensure Python 3.8+ and FFmpeg are installed:');
        console.error('1. Install Python 3.8 or later from https://www.python.org/downloads/');
        console.error('2. Install FFmpeg from https://ffmpeg.org/download.html');
        console.error('3. Make sure both are added to your system PATH');
        process.exit(1);
    }
}

// Run verification
verifyPython(); 