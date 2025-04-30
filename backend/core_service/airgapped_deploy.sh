#!/bin/bash
# Airgapped deployment script for core_service
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

# Count wheel files and source packages
WHEEL_COUNT=$(ls -1 wheels/*.whl 2>/dev/null | wc -l)
SOURCE_COUNT=$(ls -1 wheels/*.tar.gz wheels/*.zip 2>/dev/null | wc -l)

echo "Found $WHEEL_COUNT wheel files and $SOURCE_COUNT source packages in the wheels directory"
echo "Note: Source packages will be compiled during the Docker build process"

# Build the Docker image
echo "Building Docker image for core_service (airgapped mode)..."
docker build -t core_service .

# Check if the build was successful
if [ $? -eq 0 ]; then
    echo "Docker image built successfully!"
    echo ""
    echo "To run the service, use:"
    echo "docker run -p 8000:8000 -v /path/to/data:/app/data core_service"
    echo ""
    echo "For data persistence, mount a volume for /app/data:"
    echo "docker run -p 8000:8000 -v ./data:/app/data core_service"
    echo ""
    echo "The service will be available at: http://localhost:8000"
else
    echo "Error: Docker build failed"
    exit 1
fi 