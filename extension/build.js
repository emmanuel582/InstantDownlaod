const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
    sourceDir: path.join(__dirname),
    buildDir: path.join(__dirname, 'dist'),
    manifestPath: path.join(__dirname, 'manifest.json'),
    excludeFiles: [
        'node_modules',
        'dist',
        'build.js',
        'package-lock.json',
        '.git',
        '.gitignore',
        '*.md'
    ]
};

// Clean build directory
function cleanBuild() {
    console.log('Cleaning build directory...');
    if (fs.existsSync(config.buildDir)) {
        fs.rmSync(config.buildDir, { recursive: true, force: true });
    }
    fs.mkdirSync(config.buildDir);
}

// Copy files
function copyFiles() {
    console.log('Copying files...');
    const files = fs.readdirSync(config.sourceDir);
    
    files.forEach(file => {
        const sourcePath = path.join(config.sourceDir, file);
        const destPath = path.join(config.buildDir, file);
        
        // Skip excluded files
        if (config.excludeFiles.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp(pattern.replace('*', '.*'));
                return regex.test(file);
            }
            return file === pattern;
        })) {
            return;
        }
        
        // Copy file or directory
        if (fs.statSync(sourcePath).isDirectory()) {
            fs.cpSync(sourcePath, destPath, { recursive: true });
        } else {
            fs.copyFileSync(sourcePath, destPath);
        }
    });
}

// Update manifest for production
function updateManifest() {
    console.log('Updating manifest for production...');
    const manifestPath = path.join(config.buildDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Update version if needed
    const version = manifest.version.split('.');
    version[2] = (parseInt(version[2]) + 1).toString();
    manifest.version = version.join('.');
    
    // Update production URLs
    manifest.host_permissions = manifest.host_permissions.map(url => {
        if (url.includes('localhost')) {
            return url.replace('localhost:3000', 'video-downloader-server.onrender.com');
        }
        return url;
    });
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

// Create zip file
function createZip() {
    console.log('Creating zip file...');
    const zipName = `video-downloader-extension-v${require('./package.json').version}.zip`;
    const zipPath = path.join(config.buildDir, '..', zipName);
    
    try {
        execSync(`cd ${config.buildDir} && zip -r ${zipPath} .`, { stdio: 'inherit' });
        console.log(`Created zip file: ${zipName}`);
    } catch (error) {
        console.error('Error creating zip file:', error);
        process.exit(1);
    }
}

// Main build process
function build() {
    try {
        console.log('Starting build process...');
        cleanBuild();
        copyFiles();
        updateManifest();
        createZip();
        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

build(); 