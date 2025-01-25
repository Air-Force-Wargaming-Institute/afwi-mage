#!/bin/bash

# Create necessary directories
echo "Creating required directories..."
mkdir -p ../data/uploads ../data/extraction ../data/datasets ../data/logs ../data/outputs
mkdir -p ./models/base_models ./models/fine-tuned_models

# Ensure proper line endings for shell scripts
echo "Fixing line endings..."
find . -type f -name "*.sh" -exec dos2unix {} \;

# Make shell scripts executable
echo "Setting file permissions..."
find . -type f -name "*.sh" -exec chmod +x {} \;

# Copy environment files if they don't exist
if [ ! -f auth_service/.env ]; then
    cp auth_service/.env.example auth_service/.env
    echo "Created auth_service/.env from example"
fi

# Clean up any existing containers and volumes
echo "Cleaning up existing containers..."
docker compose down -v

# Rebuild all services
echo "Building services..."
docker compose build

echo "Development environment setup complete!"
echo "You can now start the services with: docker compose up" 