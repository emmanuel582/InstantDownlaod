const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function verifyPython() {
    try {
        // Check if we're in a virtual environment
        const venvPath = path.join(__dirname, '..', 'venv');
        const isVenv = process.env.VIRTUAL_ENV || fs.existsSync(venvPath);
        
        // Get Python command based on environment
        const pythonCmd = isVenv ? 'python' : 'python3.11';
        
        // Check Python version
        const pythonVersion = execSync(`${pythonCmd} --version`).toString().trim();
        console.log('Python version:', pythonVersion);
        
        // Verify version is >= 3.11
        const versionMatch = pythonVersion.match(/Python (\d+\.\d+)/);
        if (!versionMatch || parseFloat(versionMatch[1]) < 3.11) {
            throw new Error(`Python 3.11 or higher is required, but found ${pythonVersion}`);
        }

        // Verify pip is installed
        const pipVersion = execSync(`${pythonCmd} -m pip --version`).toString().trim();
        console.log('Pip version:', pipVersion);

        // Verify ffmpeg is installed
        const ffmpegVersion = execSync('ffmpeg -version').toString().split('\n')[0];
        console.log('FFmpeg version:', ffmpegVersion);

        // Verify yt-dlp is installed and up to date
        try {
            const ytdlpVersion = execSync(`${pythonCmd} -m pip show yt-dlp`).toString();
            console.log('yt-dlp version:', ytdlpVersion.match(/Version: (.*)/)[1]);
        } catch (e) {
            console.log('Installing yt-dlp...');
            execSync(`${pythonCmd} -m pip install --upgrade yt-dlp`);
        }

        console.log('✅ Python environment verification successful');
        return true;
    } catch (error) {
        console.error('❌ Python environment verification failed:', error.message);
        console.error('\nPlease ensure Python 3.11+ and FFmpeg are installed:');
        console.error('1. Install Python 3.11 or later from https://www.python.org/downloads/');
        console.error('2. Install FFmpeg from https://ffmpeg.org/download.html');
        console.error('3. Make sure both are added to your system PATH');
        console.error('4. Run "npm run verify-python" again after installation');
        process.exit(1);
    }
}

// Run verification
verifyPython(); 