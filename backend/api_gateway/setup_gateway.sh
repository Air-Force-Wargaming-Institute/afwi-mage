#!/bin/bash

# AFWI-MAGE API Gateway Setup Script
# This script prepares the environment for the Traefik API Gateway

echo "Setting up API Gateway environment..."

# Create required directories
mkdir -p logs/traefik
mkdir -p dynamic

# Check if Docker network exists
if ! docker network inspect app-network >/dev/null 2>&1; then
  echo "Creating Docker network: app-network"
  docker network create app-network
else
  echo "Docker network app-network already exists"
fi

# Check if traefik.yaml exists
if [ ! -f "traefik.yaml" ]; then
  echo "ERROR: traefik.yaml not found! Make sure you run this script from the api_gateway directory."
  exit 1
fi

# Check if dynamic_conf.yaml exists
if [ ! -f "dynamic_conf.yaml" ]; then
  echo "ERROR: dynamic_conf.yaml not found! Make sure you run this script from the api_gateway directory."
  exit 1
fi

# Set appropriate permissions for log directory
chmod -R 755 logs

echo "API Gateway environment setup complete!"
echo ""
echo "To start the gateway service:"
echo "1. Navigate to the project root directory"
echo "2. Run: docker-compose -f docker-compose.yml -f api_gateway/docker-compose.gateway.yml up -d"
echo ""
echo "To access the Traefik dashboard: http://traefik.localhost" 