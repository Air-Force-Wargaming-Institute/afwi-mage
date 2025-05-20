#!/bin/bash
# Airgapped deployment script for report_builder_service (Linux/macOS version)

IMAGE_NAME="report_builder_service"
IMAGE_TAG="latest"

# Allow overriding image name and tag with arguments
if [ -n "$1" ]; then
    IMAGE_NAME=$1
fi
if [ -n "$2" ]; then
    IMAGE_TAG=$2
fi

FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==== AFWI Multi-Agent Generative Engine - Report Builder Service ===="
echo "==== Airgapped Deployment Helper (Linux/macOS) ===="
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null
then
    echo "Error: Docker is required but not installed." >&2
    echo "Please install Docker before proceeding." >&2
    exit 1
fi

# Build the Docker image
echo "Building Docker image for report_builder_service as $FULL_IMAGE_NAME ..."
echo "Context: $SCRIPT_DIR"

docker build -t "$FULL_IMAGE_NAME" "$SCRIPT_DIR"

if [ $? -ne 0 ]; then
    echo "Error: Docker build failed with exit code $?" >&2
    exit $?
fi

echo ""
echo "Build completed successfully! Image $FULL_IMAGE_NAME is ready."
echo ""
echo "This script only builds the image. To run it, you would typically use docker-compose"
echo "with the main docker-compose.yml from the airgap package (backend_support directory),"
echo "which should be configured to use this image name ($FULL_IMAGE_NAME or a similar name like report_builder-airgapped:latest)."
echo "Example standalone run (less common for multi-service app, ensure port is correct for your setup):"
echo "docker run -d --name report_builder_service -p 8019:8019 $FULL_IMAGE_NAME" 