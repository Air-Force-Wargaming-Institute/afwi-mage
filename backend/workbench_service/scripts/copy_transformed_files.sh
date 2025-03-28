#!/bin/bash
# Copy transformed files from Docker container to host

CONTAINER_ID=$(docker ps | grep workbench | awk '{print $1}')
if [ -z "$CONTAINER_ID" ]; then
  echo "Workbench container not found!"
  exit 1
fi

# Create local directories if they don't exist
mkdir -p ../../data/workbench/outputs

# Copy files from container to host
echo "Copying files from container to host..."
docker cp $CONTAINER_ID:/app/data/workbench/outputs/. ../../data/workbench/outputs/

echo "Files copied successfully!"
ls -la ../../data/workbench/outputs/ 