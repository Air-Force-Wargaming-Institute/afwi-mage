# Airgapped deployment script for workbench_service (PowerShell version)
# This script facilitates the deployment of the workbench_service in a Windows airgapped environment

Write-Host "==== AFWI Multi-Agent Generative Engine - Workbench Service ====" -ForegroundColor Cyan
Write-Host "==== Airgapped Deployment Helper (Windows) ====" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Docker is required but not installed." -ForegroundColor Red
    Write-Host "Please install Docker Desktop for Windows before proceeding."
    exit 1
}

# Create required directories if they don't exist
if (-not (Test-Path -Path "data/workbench/spreadsheets")) {
    New-Item -Path "data/workbench/spreadsheets" -ItemType Directory -Force | Out-Null
    Write-Host "Created data directory structure" -ForegroundColor Yellow
}

# Build the Docker image
Write-Host "Building Docker image for workbench_service..." -ForegroundColor Yellow
docker build -t workbench_service .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker build failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

# Display success message and usage instructions
Write-Host ""
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "To run the service, use the following command:" -ForegroundColor Yellow
Write-Host "docker run -d --name workbench_service -p 8020:8020 workbench_service" -ForegroundColor White
Write-Host ""
Write-Host "The service will be available at http://localhost:8020" -ForegroundColor Cyan
Write-Host ""
Write-Host "Additional options:" -ForegroundColor Yellow
Write-Host "- To mount data volume for persistence: -v C:\path\to\data:/app/data" -ForegroundColor White
Write-Host "- To view logs: docker logs -f workbench_service" -ForegroundColor White
Write-Host ""
Write-Host "To stop the service: docker stop workbench_service" -ForegroundColor Yellow
Write-Host "To remove the container: docker rm workbench_service" -ForegroundColor Yellow 