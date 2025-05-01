#!/bin/bash

# Build the base image
IMAGE_NAME="afwi-mage-base"
IMAGE_TAG="3.12-slim"

echo "Building base image: ${IMAGE_NAME}:${IMAGE_TAG}"
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

echo "Build complete!"
echo "To use this image, reference it in your Dockerfile as:"
echo "FROM ${IMAGE_NAME}:${IMAGE_TAG}" 