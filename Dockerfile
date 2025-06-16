# Use Node.js 18 as base image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY server/package*.json ./

# Install Node.js dependencies
RUN npm ci --production

# Copy server files
COPY server/ ./

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Create temp directory
RUN mkdir -p /app/temp && chmod 777 /app/temp

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"] 