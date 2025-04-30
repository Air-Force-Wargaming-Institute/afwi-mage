#!/bin/bash
# Airgapped deployment script for auth_service
# This script facilitates the deployment of the auth_service in an airgapped environment

set -e

echo "==== AFWI Multi-Agent Generative Engine - Auth Service ===="
echo "==== Airgapped Deployment Helper ===="
echo

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is required but not installed."
    echo "Please install Docker before proceeding."
    exit 1
fi

# Build the Docker image
echo "Building Docker image for auth_service..."
docker build -t auth_service .

# Display success message and usage instructions
echo
echo "Build completed successfully!"
echo
echo "To run the service, use the following command:"
echo "docker run -d --name auth_service -p 8000:8000 auth_service"
echo
echo "The service will be available at http://localhost:8000"
echo
echo "Additional options:"
echo "- To mount external data: -v /path/to/local/data:/app/data"
echo "- To view logs: docker logs -f auth_service"
echo
echo "To stop the service: docker stop auth_service"
echo "To remove the container: docker rm auth_service" 