#!/bin/bash
# Airgapped deployment script for workbench_service
# This script facilitates the deployment of the workbench_service in an airgapped environment

set -e

echo "==== AFWI Multi-Agent Generative Engine - Workbench Service ===="
echo "==== Airgapped Deployment Helper ===="
echo

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is required but not installed."
    echo "Please install Docker before proceeding."
    exit 1
fi

# Create required directories if they don't exist
mkdir -p data/workbench/spreadsheets

# Build the Docker image
echo "Building Docker image for workbench_service..."
docker build -t workbench_service .

# Display success message and usage instructions
echo
echo "Build completed successfully!"
echo
echo "To run the service, use the following command:"
echo "docker run -d --name workbench_service -p 8020:8020 workbench_service"
echo
echo "The service will be available at http://localhost:8020"
echo
echo "Additional options:"
echo "- To mount data volume for persistence: -v /path/to/data:/app/data"
echo "- To view logs: docker logs -f workbench_service"
echo
echo "To stop the service: docker stop workbench_service"
echo "To remove the container: docker rm workbench_service" 