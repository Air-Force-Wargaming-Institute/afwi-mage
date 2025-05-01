#!/bin/bash
# Airgapped deployment script for generation_service
# This script facilitates the deployment of the generation_service in an airgapped environment

set -e

echo "==== AFWI Multi-Agent Generative Engine - Generation Service ===="
echo "==== Airgapped Deployment Helper ===="
echo

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is required but not installed."
    echo "Please install Docker before proceeding."
    exit 1
fi

# Build the Docker image
echo "Building Docker image for generation_service..."
docker build -t generation_service .

# Display success message and usage instructions
echo
echo "Build completed successfully!"
echo
echo "To run the service, use the following command:"
echo "docker run -d --name generation_service -p 8003:8003 generation_service"
echo
echo "The service will be available at http://localhost:8003"
echo
echo "Additional options:"
echo "- To mount external data: -v /path/to/local/data:/app/data"
echo "- To view logs: docker logs -f generation_service"
echo
echo "To stop the service: docker stop generation_service"
echo "To remove the container: docker rm generation_service" 