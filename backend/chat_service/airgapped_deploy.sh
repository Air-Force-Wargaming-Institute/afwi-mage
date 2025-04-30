#!/bin/bash
# Airgapped deployment script for chat_service
# This script builds the Docker image without internet access

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    echo "Please install Docker before running this script"
    exit 1
fi

# Check if the wheels directory exists and has content
if [ ! -d "wheels" ] || [ -z "$(ls -A wheels)" ]; then
    echo "Error: wheels directory is missing or empty"
    echo "Please run download_wheels.py on a machine with internet access first"
    exit 1
fi

# Build the Docker image
echo "Building Docker image for chat_service (airgapped mode)..."
docker build -t chat_service .

# Check if the build was successful
if [ $? -eq 0 ]; then
    echo "Docker image built successfully!"
    echo ""
    echo "To run the service, use:"
    echo "docker run -p 8009:8009 -v /path/to/data:/app/data chat_service"
    echo ""
    echo "For data persistence, mount a volume for /app/data:"
    echo "docker run -p 8009:8009 -v ./data:/app/data chat_service"
    echo ""
    echo "The service will be available at: http://localhost:8009"
else
    echo "Error: Docker build failed"
    exit 1
fi 