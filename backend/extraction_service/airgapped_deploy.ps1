# PowerShell script for airgapped deployment of extraction_service
# For Windows environments

# Stop on any error
$ErrorActionPreference = "Stop"

Write-Host "Starting airgapped deployment for extraction_service..." -ForegroundColor Green

# Check Docker is installed
try {
    docker --version | Out-Null
} catch {
    Write-Host "Error: Docker is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Docker and try again." -ForegroundColor Red
    exit 1
}

# Check wheel files exist
$wheelsDir = Join-Path $PSScriptRoot "wheels"
$nltkDataDir = Join-Path $wheelsDir "nltk_data"

if (-not (Test-Path $wheelsDir) -or -not (Get-ChildItem -Path $wheelsDir -File | Where-Object { $_.Name -ne ".gitkeep" })) {
    Write-Host "Error: Wheels directory is empty or does not exist!" -ForegroundColor Red
    Write-Host "Run download_wheels.ps1 first in a connected environment." -ForegroundColor Red
    exit 1
}

# Check NLTK data exists
if (-not (Test-Path $nltkDataDir) -or -not (Get-ChildItem -Path $nltkDataDir)) {
    Write-Host "Error: NLTK data directory is empty or does not exist!" -ForegroundColor Red
    Write-Host "Run download_wheels.ps1 first in a connected environment." -ForegroundColor Red
    exit 1
}

# Count wheel files
$wheelCount = (Get-ChildItem -Path $wheelsDir -File | Where-Object { $_.Name -ne ".gitkeep" } | Measure-Object).Count
Write-Host "Found $wheelCount wheel/source files in $wheelsDir" -ForegroundColor Yellow
Write-Host "Found NLTK data in $nltkDataDir" -ForegroundColor Yellow

# Check requirements.txt exists
$requirementsPath = Join-Path $PSScriptRoot "requirements.txt"
if (-not (Test-Path $requirementsPath)) {
    Write-Host "Error: requirements.txt not found!" -ForegroundColor Red
    exit 1
}

# Build docker image
Write-Host "Building Docker image for extraction_service..." -ForegroundColor Yellow
docker build -t extraction-service:airgapped .

Write-Host "`n==========================" -ForegroundColor Green
Write-Host "Deployment Successful! 🚀" -ForegroundColor Green
Write-Host "==========================`n" -ForegroundColor Green

Write-Host "To run the service:" -ForegroundColor Cyan
Write-Host "docker run -d --name extraction-service -p 8002:8002 extraction-service:airgapped" -ForegroundColor White

Write-Host "`nTo mount a data volume:" -ForegroundColor Cyan
Write-Host "docker run -d --name extraction-service -p 8002:8002 -v C:/path/to/data:/app/data extraction-service:airgapped" -ForegroundColor White

Write-Host "`nTo view logs:" -ForegroundColor Cyan
Write-Host "docker logs extraction-service" -ForegroundColor White

Write-Host "`nTo stop the service:" -ForegroundColor Cyan
Write-Host "docker stop extraction-service" -ForegroundColor White 