# Airgapped deployment script for api_gateway (PowerShell version)
# This script facilitates the deployment of the api_gateway in a Windows airgapped environment

Write-Host "==== AFWI Multi-Agent Generative Engine - API Gateway ====" -ForegroundColor Cyan
Write-Host "==== Airgapped Deployment Helper (Windows) ====" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Docker is required but not installed." -ForegroundColor Red
    Write-Host "Please install Docker Desktop for Windows before proceeding."
    exit 1
}

# Create required directories
if (-not (Test-Path -Path "logs/traefik")) {
    New-Item -Path "logs/traefik" -ItemType Directory -Force | Out-Null
    Write-Host "Created logs directory: logs/traefik" -ForegroundColor Yellow
}

if (-not (Test-Path -Path "dynamic")) {
    New-Item -Path "dynamic" -ItemType Directory -Force | Out-Null
    Write-Host "Created dynamic directory" -ForegroundColor Yellow
}

# Check if required files exist
if (-not (Test-Path -Path "traefik.yaml")) {
    Write-Host "ERROR: traefik.yaml not found! Make sure you run this script from the api_gateway directory." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path -Path "dynamic_conf.yaml")) {
    Write-Host "ERROR: dynamic_conf.yaml not found! Make sure you run this script from the api_gateway directory." -ForegroundColor Red
    exit 1
}

# Check if Docker network exists
$networkExists = docker network inspect app-network 2>$null
if (-not $networkExists) {
    Write-Host "Creating Docker network: app-network" -ForegroundColor Yellow
    docker network create app-network
} else {
    Write-Host "Docker network app-network already exists" -ForegroundColor Yellow
}

# Build the Docker image
Write-Host "Building Docker image for api_gateway..." -ForegroundColor Yellow
docker build -t api_gateway .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker build failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

# Display success message and usage instructions
Write-Host ""
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "To run the gateway service, use the following command:" -ForegroundColor Yellow
Write-Host "docker run -d --name api_gateway -p 80:80 -p 8080:8080 -p 8082:8082 -p 8083:8083 --network app-network api_gateway" -ForegroundColor White
Write-Host ""
Write-Host "The Traefik dashboard will be available at http://localhost:8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "Additional options:" -ForegroundColor Yellow
Write-Host "- To mount configuration files: -v C:\path\to\traefik.yaml:/etc/traefik/traefik.yaml -v C:\path\to\dynamic_conf.yaml:/etc/traefik/dynamic/dynamic_conf.yaml" -ForegroundColor White
Write-Host "- To mount log directory: -v C:\path\to\logs:/var/log/traefik" -ForegroundColor White
Write-Host ""
Write-Host "To stop the service: docker stop api_gateway" -ForegroundColor Yellow
Write-Host "To remove the container: docker rm api_gateway" -ForegroundColor Yellow 