#!/bin/bash
# Airgapped deployment script for extraction_service (Linux/macOS)

set -e  # Exit on error

echo "Starting airgapped deployment for extraction_service..."

# Check Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH!"
    echo "Please install Docker and try again."
    exit 1
fi

# Check wheel files exist
WHEELS_DIR="./wheels"
NLTK_DATA_DIR="./wheels/nltk_data"
if [ ! -d "$WHEELS_DIR" ] || [ -z "$(ls -A $WHEELS_DIR 2>/dev/null)" ]; then
    echo "Error: Wheels directory is empty or does not exist!"
    echo "Run download_wheels.py first in a connected environment."
    exit 1
fi

# Check NLTK data exists
if [ ! -d "$NLTK_DATA_DIR" ] || [ -z "$(ls -A $NLTK_DATA_DIR 2>/dev/null)" ]; then
    echo "Error: NLTK data directory is empty or does not exist!"
    echo "Run download_wheels.py first in a connected environment."
    exit 1
fi

# Count wheel files
WHEEL_COUNT=$(find "$WHEELS_DIR" -type f -not -name ".gitkeep" | wc -l)
echo "Found $WHEEL_COUNT wheel/source files in $WHEELS_DIR"
echo "Found NLTK data in $NLTK_DATA_DIR"

# Check requirements.txt exists
if [ ! -f "requirements.txt" ]; then
    echo "Error: requirements.txt not found!"
    exit 1
fi

# Build docker image
echo "Building Docker image for extraction_service..."
docker build -t extraction-service:airgapped .

echo
echo "=========================="
echo "Deployment Successful! 🚀"
echo "=========================="
echo
echo "To run the service:"
echo "docker run -d --name extraction-service -p 8002:8002 extraction-service:airgapped"
echo
echo "To mount a data volume:"
echo "docker run -d --name extraction-service -p 8002:8002 -v /path/to/data:/app/data extraction-service:airgapped"
echo
echo "To view logs:"
echo "docker logs extraction-service"
echo
echo "To stop the service:"
echo "docker stop extraction-service" 