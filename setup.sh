#!/bin/bash
echo "🎯 Setting up Video Downloader Pro..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first:"
    echo "   https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg not found. Please install FFmpeg:"
    echo "   Windows: Download from https://ffmpeg.org/download.html"
    echo "   Mac: brew install ffmpeg"
    echo "   Linux: sudo apt-get install ffmpeg"
    exit 1
fi

echo "✅ FFmpeg found"

# Navigate to server directory
cd server

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🚀 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Run: npm start"
echo "   2. Open Chrome Extensions"
echo "   3. Enable Developer mode"
echo "   4. Load unpacked extension folder"
echo ""
echo "⚠️  Use responsibly and respect platform terms"
echo ""
