# PowerShell script to download Linux-compatible Python wheels for airgapped installation
# This script uses Docker to ensure wheels are compatible with Linux environments

Write-Host "Downloading Linux-compatible wheels for airgapped installation..." -ForegroundColor Cyan

# Check if Docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Docker is required but not found in PATH." -ForegroundColor Red
    Write-Host "Please install Docker before proceeding."
    exit 1
}

# Create wheels directory if it doesn't exist
$wheelsDir = "wheels"
$wheelsDirAbsolute = (Get-Item -Path "." -Verbose).FullName + "\$wheelsDir"
if (-not (Test-Path $wheelsDir)) {
    New-Item -ItemType Directory -Path $wheelsDir | Out-Null
    Write-Host "Created wheels directory: $wheelsDir" -ForegroundColor Yellow
}

# Use Docker to download Linux-compatible wheels
Write-Host "Running Docker to download Linux-compatible wheels..." -ForegroundColor Yellow

# Normalize path for Docker volume mounting on Windows
$normalizedWheelsPath = $wheelsDirAbsolute.Replace("\", "/").Replace("C:", "/c")
$normalizedRequirementsPath = (Get-Item -Path "requirements.txt" -Verbose).FullName.Replace("\", "/").Replace("C:", "/c")

# Use double quotes for the whole command and single quotes for paths with colons in PowerShell
$dockerCmd = "docker run --rm -v '$normalizedWheelsPath`:/wheels' -v '$normalizedRequirementsPath`:/requirements.txt' python:3.12-slim bash -c 'pip download --dest /wheels --only-binary=:all: --platform manylinux2014_x86_64 --python-version 3.12 -r /requirements.txt'"

Write-Host "Executing: $dockerCmd" -ForegroundColor DarkGray
Invoke-Expression $dockerCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error downloading wheels using Docker. Exit code: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

# List the downloaded wheels
$wheels = Get-ChildItem -Path $wheelsDir -Filter "*.whl"

Write-Host "Downloaded $($wheels.Count) Linux-compatible wheel files to $wheelsDir" -ForegroundColor Green
foreach ($wheel in $wheels) {
    Write-Host "  - $($wheel.Name)" -ForegroundColor White
}

Write-Host ""
Write-Host "To use these wheels in an airgapped environment:" -ForegroundColor Cyan
Write-Host "1. Copy the entire generation_service directory to the target machine" -ForegroundColor White
Write-Host "2. Run the deployment script: .\airgapped_deploy.ps1" -ForegroundColor White
Write-Host "3. Start the container as instructed by the deployment script" -ForegroundColor White

# Create a package.zip file for easy transfer
Write-Host ""
Write-Host "Would you like to create a zip archive of the generation_service for transfer? (Y/N)" -ForegroundColor Yellow
$response = Read-Host
if ($response -eq "Y" -or $response -eq "y") {
    Write-Host "Creating archive..." -ForegroundColor Yellow
    Compress-Archive -Path ./* -DestinationPath ./generation_service_airgapped.zip -Force
    Write-Host "Created generation_service_airgapped.zip" -ForegroundColor Green
    Write-Host "Transfer this file to your airgapped environment." -ForegroundColor Cyan
} 