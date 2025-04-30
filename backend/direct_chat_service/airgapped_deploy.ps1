# PowerShell script for airgapped deployment of direct_chat_service
# This script builds the Docker image without internet access

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "Docker is installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Docker is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Docker before running this script" -ForegroundColor Red
    exit 1
}

# Check if the wheels directory exists and has content
$wheelsDir = Join-Path -Path $PSScriptRoot -ChildPath "wheels"
if (-not (Test-Path -Path $wheelsDir) -or (Get-ChildItem -Path $wheelsDir).Count -eq 0) {
    Write-Host "Error: wheels directory is missing or empty" -ForegroundColor Red
    Write-Host "Please run download_wheels.ps1 on a machine with internet access first" -ForegroundColor Red
    exit 1
}

# Count wheel files
$wheelFiles = @(Get-ChildItem -Path $wheelsDir -Filter "*.whl")

Write-Host "Found $($wheelFiles.Count) wheel files in the wheels directory" -ForegroundColor Cyan
Write-Host "Note: This deployment uses pre-compiled binary wheels only - no build tools required" -ForegroundColor Yellow

# Build the Docker image
Write-Host "Building Docker image for direct_chat_service (airgapped mode)..." -ForegroundColor Cyan
docker build -t direct_chat_service .

# Check if the build was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "Docker image built successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To run the service, use:" -ForegroundColor Yellow
    Write-Host "docker run -p 8011:8011 -v C:/path/to/data:/app/data -v C:/path/to/sessions:/app/sessions direct_chat_service" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "For data persistence, mount volumes for both data and sessions:" -ForegroundColor Yellow
    Write-Host "docker run -p 8011:8011 -v ${PWD}/data:/app/data -v ${PWD}/sessions:/app/sessions direct_chat_service" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "The service will be available at: http://localhost:8011" -ForegroundColor Green
} else {
    Write-Host "Error: Docker build failed" -ForegroundColor Red
    exit 1
} 