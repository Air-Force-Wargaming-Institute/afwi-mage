# Script to unpack frontend node modules in an airgapped environment
# Run this on the airgapped machine

Write-Host "Starting to unpack frontend node modules..." -ForegroundColor Green

# Check if the archive exists
if (-not (Test-Path -Path "offline_packages/frontend_node_modules.tar.gz")) {
    Write-Host "Error: frontend_node_modules.tar.gz not found in offline_packages directory" -ForegroundColor Red
    exit 1
}

# Navigate to frontend directory
Push-Location frontend

# Unpack the node_modules archive
Write-Host "Unpacking node_modules archive..." -ForegroundColor Cyan
tar -xzf ../offline_packages/frontend_node_modules.tar.gz

# Return to original directory
Pop-Location

Write-Host "Frontend node modules have been unpacked to frontend/node_modules" -ForegroundColor Green 