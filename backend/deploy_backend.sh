#!/bin/bash

# Navigate to the backend directory
cd "$(dirname "$0")"

# Build and start the backend services
docker-compose up --build -d
cd vLLM
./deploy_airgapped_vllm.sh

echo "Backend services deployed successfully!"
