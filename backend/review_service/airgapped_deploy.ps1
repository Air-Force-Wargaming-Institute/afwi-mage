# PowerShell script for airgapped deployment of review_service
# This script facilitates the deployment of the review_service in an airgapped environment

Write-Host "==== AFWI Multi-Agent Generative Engine - Review Service ====" -ForegroundColor Cyan
Write-Host "==== Airgapped Deployment Helper ====" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is available
try {
    $dockerVersion = docker --version
    Write-Host "Docker detected: $dockerVersion" -ForegroundColor Green
}
catch {
    Write-Host "Error: Docker is required but not installed." -ForegroundColor Red
    Write-Host "Please install Docker before proceeding."
    exit 1
}

# Check for wheel files
$wheelsDir = Join-Path $PSScriptRoot "wheels"
$wheels = Get-ChildItem -Path $wheelsDir -Filter "*.whl" -ErrorAction SilentlyContinue
if ($wheels.Count -eq 0) {
    Write-Host "Warning: No wheel files found in the $wheelsDir directory." -ForegroundColor Yellow
    Write-Host "You may need to run download_wheels.ps1 or download_wheels_windows.py first." -ForegroundColor Yellow
    $proceed = Read-Host "Do you want to proceed anyway? (y/n)"
    if ($proceed -ne "y") {
        exit 0
    }
}
else {
    Write-Host "Found $($wheels.Count) wheel files in $wheelsDir." -ForegroundColor Green
}

# Build the Docker image
Write-Host "`nBuilding Docker image for review_service..." -ForegroundColor Cyan
try {
    docker build -t review_service .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Docker build failed with exit code $LASTEXITCODE." -ForegroundColor Red
        exit 1
    }
    
    # Display success message and usage instructions
    Write-Host "`nBuild completed successfully!" -ForegroundColor Green
    Write-Host "`nTo run the service, use the following command:" -ForegroundColor Cyan
    Write-Host "docker run -d --name review_service -p 8004:8004 review_service" -ForegroundColor White
    Write-Host "`nThe service will be available at http://localhost:8004"
    Write-Host "`nAdditional options:"
    Write-Host "- To mount external data: -v /path/to/local/data:/app/data"
    Write-Host "- To view logs: docker logs -f review_service"
    Write-Host "`nTo stop the service: docker stop review_service"
    Write-Host "To remove the container: docker rm review_service"
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} 