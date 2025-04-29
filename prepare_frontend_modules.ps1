# Script to prepare frontend node modules for offline use
# Run this on a machine with internet access

Write-Host "Starting to prepare frontend node modules..." -ForegroundColor Green

# Navigate to frontend directory
Push-Location frontend

# Ensure the package-lock.json is up-to-date
Write-Host "Updating package-lock.json..." -ForegroundColor Cyan
npm install --package-lock-only

# Install npm packages
Write-Host "Installing npm packages..." -ForegroundColor Cyan
npm ci

# Create tar archive of node_modules
Write-Host "Creating node_modules archive..." -ForegroundColor Cyan
tar -czf ../offline_packages/frontend_node_modules.tar.gz node_modules

# Return to original directory
Pop-Location

Write-Host "Frontend node modules have been prepared and archived to offline_packages/frontend_node_modules.tar.gz" -ForegroundColor Green 