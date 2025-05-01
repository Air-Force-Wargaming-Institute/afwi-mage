#!/bin/bash
# Airgapped deployment script for review_service
# This script facilitates the deployment of the review_service in an airgapped environment

set -e

echo "==== AFWI Multi-Agent Generative Engine - Review Service ===="
echo "==== Airgapped Deployment Helper ===="
echo

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is required but not installed."
    echo "Please install Docker before proceeding."
    exit 1
fi

# Build the Docker image
echo "Building Docker image for review_service..."
docker build -t review_service .

# Display success message and usage instructions
echo
echo "Build completed successfully!"
echo
echo "To run the service, use the following command:"
echo "docker run -d --name review_service -p 8004:8004 review_service"
echo
echo "The service will be available at http://localhost:8004"
echo
echo "Additional options:"
echo "- To mount external data: -v /path/to/local/data:/app/data"
echo "- To view logs: docker logs -f review_service"
echo
echo "To stop the service: docker stop review_service"
echo "To remove the container: docker rm review_service" 