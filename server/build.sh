#!/bin/bash
set -e

echo "Starting build process..."

# Install system dependencies
echo "Installing system dependencies..."
apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
echo "Installing Python dependencies..."
python3 -m pip install --upgrade pip
pip3 install --no-cache-dir -r requirements.txt

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm ci --production

# Create temp directory
echo "Setting up temp directory..."
mkdir -p /opt/render/project/src/temp
chmod 777 /opt/render/project/src/temp

# Verify installations
echo "Verifying installations..."
python3 --version
node --version
npm --version
ffmpeg -version

echo "Build completed successfully!" 