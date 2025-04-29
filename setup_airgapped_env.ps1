# Master script for setting up the airgapped environment
# Run this on the airgapped machine

Write-Host "Starting airgapped environment setup..." -ForegroundColor Green

# Check if offline_packages directory exists
if (-not (Test-Path -Path "offline_packages")) {
    Write-Host "Error: offline_packages directory not found. Please ensure it was transferred to this machine." -ForegroundColor Red
    exit 1
}

# Load Docker images
Write-Host "Loading Docker images..." -ForegroundColor Cyan
& .\load_offline_images.ps1

# Unpack frontend node modules
Write-Host "Unpacking frontend node modules..." -ForegroundColor Cyan
& .\unpack_frontend_modules.ps1

Write-Host "Airgapped environment setup complete." -ForegroundColor Green
Write-Host "You can now build and run the application using Docker Compose." -ForegroundColor Green
Write-Host "Run 'docker compose build' to build the services using the offline artifacts." -ForegroundColor Green
Write-Host "Then run 'docker compose up -d' to start the services." -ForegroundColor Green 