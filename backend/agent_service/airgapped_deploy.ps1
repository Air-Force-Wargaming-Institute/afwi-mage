# Airgapped deployment script for agent_service (PowerShell version)
# This script facilitates the deployment of the agent_service in a Windows airgapped environment

Write-Host "==== AFWI Multi-Agent Generative Engine - Agent Service ====" -ForegroundColor Cyan
Write-Host "==== Airgapped Deployment Helper (Windows) ====" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Docker is required but not installed." -ForegroundColor Red
    Write-Host "Please install Docker Desktop for Windows before proceeding."
    exit 1
}

# Build the Docker image
Write-Host "Building Docker image for agent_service..." -ForegroundColor Yellow
docker build -t agent_service .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker build failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

# Display success message and usage instructions
Write-Host ""
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "To run the service, use the following command:" -ForegroundColor Yellow
Write-Host "docker run -d --name agent_service -p 8001:8001 agent_service" -ForegroundColor White
Write-Host ""
Write-Host "The service will be available at http://localhost:8001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Additional options:" -ForegroundColor Yellow
Write-Host "- To mount external data: -v C:\path\to\local\data:/app/data" -ForegroundColor White
Write-Host "- To view logs: docker logs -f agent_service" -ForegroundColor White
Write-Host ""
Write-Host "To stop the service: docker stop agent_service" -ForegroundColor Yellow
Write-Host "To remove the container: docker rm agent_service" -ForegroundColor Yellow 