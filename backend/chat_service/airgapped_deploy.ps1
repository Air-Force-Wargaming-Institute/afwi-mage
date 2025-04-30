# PowerShell script for airgapped deployment of chat_service
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
if (-not (Test-Path -Path $wheelsDir) -or (Get-ChildItem -Path $wheelsDir -Filter "*.whl").Count -eq 0) {
    Write-Host "Error: wheels directory is missing or empty" -ForegroundColor Red
    Write-Host "Please run download_wheels.ps1 on a machine with internet access first" -ForegroundColor Red
    exit 1
}

# Build the Docker image
Write-Host "Building Docker image for chat_service (airgapped mode)..." -ForegroundColor Cyan
docker build -t chat_service .

# Check if the build was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "Docker image built successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To run the service, use:" -ForegroundColor Yellow
    Write-Host "docker run -p 8009:8009 -v C:/path/to/data:/app/data chat_service" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "For data persistence, mount a volume for /app/data:" -ForegroundColor Yellow
    Write-Host "docker run -p 8009:8009 -v ${PWD}/data:/app/data chat_service" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "The service will be available at: http://localhost:8009" -ForegroundColor Green
} else {
    Write-Host "Error: Docker build failed" -ForegroundColor Red
    exit 1
} 