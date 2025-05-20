# Airgapped deployment script for report_builder_service (PowerShell version)
# This script facilitates the deployment of the report_builder_service in a Windows airgapped environment

param(
    [string]$ImageName = "report_builder_service",
    [string]$ImageTag = "latest"
)

Write-Host "==== AFWI Multi-Agent Generative Engine - Report Builder Service ====" -ForegroundColor Cyan
Write-Host "==== Airgapped Deployment Helper (Windows) ====" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Docker is required but not installed." -ForegroundColor Red
    Write-Host "Please install Docker Desktop for Windows before proceeding."
    exit 1
}

$FullImageName = "${ImageName}:${ImageTag}"

# Build the Docker image
Write-Host "Building Docker image for report_builder_service as $FullImageName ..." -ForegroundColor Yellow
Write-Host "Context: $PSScriptRoot"
docker build -t $FullImageName $PSScriptRoot

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker build failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

# Display success message
Write-Host ""
Write-Host "Build completed successfully! Image $FullImageName is ready." -ForegroundColor Green
Write-Host ""
Write-Host "This script only builds the image. To run it, you would typically use docker-compose" 
Write-Host "with the main docker-compose.yml from the airgap package (backend_support directory)," 
Write-Host "which should be configured to use this image name ($FullImageName or a similar name like report_builder-airgapped:latest)." -ForegroundColor Cyan
Write-Host "Example standalone run (less common for multi-service app, ensure port is correct for your setup):" -ForegroundColor Yellow
Write-Host "docker run -d --name report_builder_service -p 8019:8019 $FullImageName" -ForegroundColor White 