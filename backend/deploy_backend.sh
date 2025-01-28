#!/bin/bash

# Navigate to the backend directory
cd "$(dirname "$0")"

# Build and start the backend services
docker-compose up --build -d

echo "Backend services deployed successfully!"
