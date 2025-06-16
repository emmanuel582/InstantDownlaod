#!/bin/bash
set -e

# Install Bun
curl -fsSL https://bun.sh/install | bash
export PATH="/opt/render/project/src/.bun/bin:$PATH"

# Install Python dependencies
python3 -m pip install --upgrade pip
pip3 install -r requirements.txt

# Install Node.js dependencies
npm install 