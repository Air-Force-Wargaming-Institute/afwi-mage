#!/bin/bash
# Airgapped deployment script for api_gateway
# This script facilitates the deployment of the api_gateway in an airgapped environment

set -e

echo "==== AFWI Multi-Agent Generative Engine - API Gateway ===="
echo "==== Airgapped Deployment Helper ===="
echo

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is required but not installed."
    echo "Please install Docker before proceeding."
    exit 1
fi

# Create required directories
mkdir -p logs/traefik
mkdir -p dynamic

# Check if required files exist
if [ ! -f "traefik.yaml" ]; then
    echo "ERROR: traefik.yaml not found! Make sure you run this script from the api_gateway directory."
    exit 1
fi

if [ ! -f "dynamic_conf.yaml" ]; then
    echo "ERROR: dynamic_conf.yaml not found! Make sure you run this script from the api_gateway directory."
    exit 1
fi

# Set appropriate permissions for log directory
chmod -R 755 logs

# Check if Docker network exists
if ! docker network inspect app-network >/dev/null 2>&1; then
    echo "Creating Docker network: app-network"
    docker network create app-network
else
    echo "Docker network app-network already exists"
fi

# Build the Docker image
echo "Building Docker image for api_gateway..."
docker build -t api_gateway .

# Display success message and usage instructions
echo
echo "Build completed successfully!"
echo
echo "To run the gateway service, use the following command:"
echo "docker run -d --name api_gateway -p 80:80 -p 8080:8080 -p 8082:8082 -p 8083:8083 --network app-network api_gateway"
echo
echo "The Traefik dashboard will be available at http://localhost:8080"
echo
echo "Additional options:"
echo "- To mount configuration files: -v /path/to/traefik.yaml:/etc/traefik/traefik.yaml -v /path/to/dynamic_conf.yaml:/etc/traefik/dynamic/dynamic_conf.yaml"
echo "- To mount log directory: -v /path/to/logs:/var/log/traefik"
echo
echo "To stop the service: docker stop api_gateway"
echo "To remove the container: docker rm api_gateway" 