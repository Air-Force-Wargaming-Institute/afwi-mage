# Master script to prepare for offline build
# Run this on a machine with internet access

Write-Host "Starting preparation for offline build..." -ForegroundColor Green

# Create directory structure
Write-Host "Creating directory structure..." -ForegroundColor Cyan
if (-not (Test-Path -Path "offline_packages")) {
    New-Item -Path "offline_packages" -ItemType Directory -Force
}
if (-not (Test-Path -Path "offline_packages/images")) {
    New-Item -Path "offline_packages/images" -ItemType Directory -Force
}
if (-not (Test-Path -Path "offline_packages/backend_wheels")) {
    New-Item -Path "offline_packages/backend_wheels" -ItemType Directory -Force
}
if (-not (Test-Path -Path "offline_packages/backend_debs")) {
    New-Item -Path "offline_packages/backend_debs" -ItemType Directory -Force
}
if (-not (Test-Path -Path "offline_packages/nltk_data")) {
    New-Item -Path "offline_packages/nltk_data" -ItemType Directory -Force
}

# Run each preparation script
Write-Host "Running download_offline_images.ps1..." -ForegroundColor Cyan
& .\download_offline_images.ps1

Write-Host "Running download_python_wheels.ps1..." -ForegroundColor Cyan
& .\download_python_wheels.ps1

Write-Host "Running download_nltk_data.ps1..." -ForegroundColor Cyan
& .\download_nltk_data.ps1

Write-Host "Running prepare_frontend_modules.ps1..." -ForegroundColor Cyan
& .\prepare_frontend_modules.ps1

Write-Host "Running download_llm_model.ps1..." -ForegroundColor Cyan
& .\download_llm_model.ps1

Write-Host "Offline build preparation complete. All artifacts are in the offline_packages directory." -ForegroundColor Green
Write-Host "To use in an airgapped environment:" -ForegroundColor Green
Write-Host "1. Copy the entire project source code" -ForegroundColor Green
Write-Host "2. Copy the offline_packages directory" -ForegroundColor Green
Write-Host "3. Run the modified Docker builds using the offline artifacts" -ForegroundColor Green 