#!/bin/bash

# Script to build the MAGE base image
echo "Building MAGE base image..."

# Set image name and tag
IMAGE_NAME="mage-base"
IMAGE_TAG="latest"

# Build the base image
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -f Dockerfile.base .

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "Successfully built ${IMAGE_NAME}:${IMAGE_TAG}"
    echo "You can now use this as a base image in your service Dockerfiles with:"
    echo "FROM ${IMAGE_NAME}:${IMAGE_TAG}"
else
    echo "Failed to build ${IMAGE_NAME}:${IMAGE_TAG}"
    exit 1
fi

echo "Build process completed." 