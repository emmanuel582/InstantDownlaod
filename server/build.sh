#!/bin/bash
set -e

echo "Starting build process..."

# Install system dependencies
echo "Installing system dependencies..."
apt-get update && apt-get install -y \
    software-properties-common \
    && add-apt-repository ppa:deadsnakes/ppa \
    && apt-get update \
    && apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3.11-dev \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment
echo "Setting up Python virtual environment..."
python3.11 -m venv /opt/render/project/src/venv
source /opt/render/project/src/venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
python -m pip install --upgrade pip
pip install --no-cache-dir -r requirements.txt

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm ci --production

# Create temp directory
echo "Setting up temp directory..."
mkdir -p /opt/render/project/src/temp
chmod 777 /opt/render/project/src/temp

# Verify installations
echo "Verifying installations..."
python --version
node --version
npm --version
ffmpeg -version

echo "Build completed successfully!" 