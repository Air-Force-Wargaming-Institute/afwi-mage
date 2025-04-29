# Script to download and save Docker images for offline use
# Run this on a machine with internet access

# Create directories if they don't exist
if (-not (Test-Path -Path "offline_packages/images")) {
    New-Item -Path "offline_packages/images" -ItemType Directory -Force
}

Write-Host "Starting to download and save Docker images..." -ForegroundColor Green

# List of images to download
$images = @(
    "postgres:13",
    "traefik:v3.3.4",
    "redis/redis-stack:7.4.0-v3-x86_64",
    "busybox:latest",
    "vllm/vllm-openai:latest",
    "node:18.20.8-slim",  # Updated from node:20-alpine to match frontend Dockerfile
    "python:3.11-slim"    # Base for mage-common
)

# Pull and save each image
foreach ($image in $images) {
    Write-Host "Pulling $image..." -ForegroundColor Cyan
    docker pull $image
    
    # Create a safe filename
    $safeImageName = $image -replace "[:/]", "_"
    
    Write-Host "Saving $image to offline_packages/images/${safeImageName}.tar..." -ForegroundColor Cyan
    docker save $image -o "offline_packages/images/${safeImageName}.tar"
}

# Build custom base images
Write-Host "Building mage-common-offline image..." -ForegroundColor Cyan
docker build -t mage-common-offline:latest -f Dockerfile-mage-common-offline .

Write-Host "Building mage-gpu-offline image..." -ForegroundColor Cyan
docker build -t mage-gpu-offline:latest -f Dockerfile-mage-gpu-offline .

# Save custom base images
Write-Host "Saving mage-common-offline image..." -ForegroundColor Cyan
docker save mage-common-offline:latest -o "offline_packages/images/mage_common_offline.tar"

Write-Host "Saving mage-gpu-offline image..." -ForegroundColor Cyan
docker save mage-gpu-offline:latest -o "offline_packages/images/mage_gpu_offline.tar"

Write-Host "All Docker images have been downloaded and saved to offline_packages/images/" -ForegroundColor Green 