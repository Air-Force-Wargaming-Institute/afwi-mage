#!/bin/bash
# Script to save the Traefik Docker image for airgapped deployment

set -e

echo "==== AFWI Multi-Agent Generative Engine - API Gateway ===="
echo "==== Docker Image Preparation for Airgapped Deployment ===="
echo

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is required but not installed."
    echo "Please install Docker before proceeding."
    exit 1
fi

# Check if traefik image is available locally
if ! docker image inspect traefik:v2.10 &> /dev/null; then
    echo "Pulling traefik:v2.10 image from Docker Hub..."
    docker pull traefik:v2.10
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to pull traefik image. Check your internet connection."
        exit 1
    fi
fi

echo "Saving traefik:v2.10 image to traefik-v2.10.tar..."
docker save traefik:v2.10 > traefik-v2.10.tar

if [ $? -ne 0 ]; then
    echo "Error: Failed to save Docker image."
    exit 1
fi

echo "Creating archive with configuration files and Docker image..."
tar -czvf api_gateway_airgapped.tar.gz traefik-v2.10.tar traefik.yaml dynamic_conf.yaml Dockerfile airgapped_deploy.sh README_AIRGAPPED.md

echo
echo "Successfully created api_gateway_airgapped.tar.gz for airgapped deployment."
echo
echo "To deploy in an airgapped environment:"
echo "1. Transfer api_gateway_airgapped.tar.gz to the target machine"
echo "2. Extract: tar -xzvf api_gateway_airgapped.tar.gz"
echo "3. Load Docker image: docker load < traefik-v2.10.tar"
echo "4. Run the deployment script: ./airgapped_deploy.sh" 