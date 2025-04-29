# Script to load Docker images in an airgapped environment
# Run this on the airgapped machine

Write-Host "Starting to load Docker images..." -ForegroundColor Green

# Load all Docker images from the offline_packages/images directory
Get-ChildItem -Path "offline_packages/images" -Filter "*.tar" | ForEach-Object {
    $imagePath = $_.FullName
    Write-Host "Loading image from $imagePath..." -ForegroundColor Cyan
    docker load -i $imagePath
}

Write-Host "All Docker images have been loaded" -ForegroundColor Green 