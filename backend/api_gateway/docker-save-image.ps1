# PowerShell script to save the Traefik Docker image for airgapped deployment

Write-Host "==== AFWI Multi-Agent Generative Engine - API Gateway ====" -ForegroundColor Cyan
Write-Host "==== Docker Image Preparation for Airgapped Deployment ====" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Docker is required but not found in PATH." -ForegroundColor Red
    Write-Host "Please install Docker before proceeding."
    exit 1
}

# Check if traefik image is available locally
$traefikExists = docker image inspect traefik:v2.10 2>$null
if (-not $traefikExists) {
    Write-Host "Pulling traefik:v2.10 image from Docker Hub..." -ForegroundColor Yellow
    docker pull traefik:v2.10
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to pull traefik image. Check your internet connection." -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Write-Host "Saving traefik:v2.10 image to traefik-v2.10.tar..." -ForegroundColor Yellow
docker save traefik:v2.10 -o traefik-v2.10.tar

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to save Docker image." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Creating archive with configuration files and Docker image..." -ForegroundColor Yellow

# Create a ZIP archive with all necessary files
Compress-Archive -Path traefik-v2.10.tar, traefik.yaml, dynamic_conf.yaml, Dockerfile, airgapped_deploy.ps1, README_AIRGAPPED.md -DestinationPath api_gateway_airgapped.zip -Force

Write-Host ""
Write-Host "Successfully created api_gateway_airgapped.zip for airgapped deployment." -ForegroundColor Green
Write-Host ""
Write-Host "To deploy in an airgapped environment:" -ForegroundColor Cyan
Write-Host "1. Transfer api_gateway_airgapped.zip to the target machine" -ForegroundColor White
Write-Host "2. Extract the ZIP file" -ForegroundColor White
Write-Host "3. Load Docker image: docker load -i traefik-v2.10.tar" -ForegroundColor White
Write-Host "4. Run the deployment script: .\airgapped_deploy.ps1" -ForegroundColor White 