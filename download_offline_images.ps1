# Script to download and save Docker images for offline use
# Run this on a machine with internet access

# Create directories if they don't exist
if (-not (Test-Path -Path "offline_packages/images")) {
    New-Item -Path "offline_packages/images" -ItemType Directory -Force
}

Write-Host "Starting to download and save Docker images..." -ForegroundColor Green

# Function to pull and save Docker image
function Pull-And-Save-Image {
    param (
        [string]$image
    )
    
    # Create a safe filename
    $safeImageName = $image -replace "[:/]", "_"
    $tarFile = "offline_packages/images/${safeImageName}.tar"
    
    # Check if the image already exists
    if (Test-Path $tarFile) {
        Write-Host "Image $image already saved to $tarFile, skipping..." -ForegroundColor Yellow
        return
    }
    
    Write-Host "Pulling $image..." -ForegroundColor Cyan
    docker pull $image
    
    Write-Host "Saving $image to $tarFile..." -ForegroundColor Cyan
    docker save $image -o $tarFile
}

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
    Pull-And-Save-Image -image $image
}

# Build and save custom base images
$customImages = @(
    @{
        name = "mage-common-offline"
        dockerfile = "Dockerfile-mage-common-offline"
        tarFile = "offline_packages/images/mage_common_offline.tar"
    },
    @{
        name = "mage-gpu-offline"
        dockerfile = "Dockerfile-mage-gpu-offline"
        tarFile = "offline_packages/images/mage_gpu_offline.tar"
    }
)

foreach ($customImage in $customImages) {
    # Check if the image already exists
    if (Test-Path $customImage.tarFile) {
        Write-Host "Image $($customImage.name) already saved to $($customImage.tarFile), skipping..." -ForegroundColor Yellow
        continue
    }
    
    # Check if the dockerfile exists
    if (-not (Test-Path $customImage.dockerfile)) {
        Write-Host "Dockerfile $($customImage.dockerfile) not found, skipping build of $($customImage.name)..." -ForegroundColor Red
        continue
    }
    
    Write-Host "Building $($customImage.name) image..." -ForegroundColor Cyan
    
    try {
        docker build -t "$($customImage.name):latest" -f $customImage.dockerfile .
        
        Write-Host "Saving $($customImage.name) image to $($customImage.tarFile)..." -ForegroundColor Cyan
        docker save "$($customImage.name):latest" -o $customImage.tarFile
    }
    catch {
        Write-Host "Error building or saving $($customImage.name): $_" -ForegroundColor Red
    }
}

Write-Host "All Docker images have been downloaded and saved to offline_packages/images/" -ForegroundColor Green 