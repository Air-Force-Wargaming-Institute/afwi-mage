# PowerShell script to download Python wheels for airgapped deployment
# This script is for Windows environments

# Stop on any error
$ErrorActionPreference = "Stop"

Write-Host "Starting wheel download process for extraction_service (PowerShell)..." -ForegroundColor Green

# Current directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$wheelsDir = Join-Path $scriptDir "wheels"
$nltkDataDir = Join-Path $wheelsDir "nltk_data"
$requirementsPath = Join-Path $scriptDir "requirements.txt"

# Check requirements file exists
if (-not (Test-Path $requirementsPath)) {
    Write-Host "Error: $requirementsPath not found!" -ForegroundColor Red
    exit 1
}

# Create wheels directory if it doesn't exist
if (-not (Test-Path $wheelsDir)) {
    New-Item -ItemType Directory -Path $wheelsDir | Out-Null
    Write-Host "Created wheels directory: $wheelsDir" -ForegroundColor Yellow
} else {
    # Clean existing wheels
    Write-Host "Cleaning existing wheels directory..." -ForegroundColor Yellow
    Get-ChildItem -Path $wheelsDir -File | Where-Object { $_.Name -ne ".gitkeep" } | ForEach-Object {
        Remove-Item $_.FullName -Force
    }
}

# Create NLTK data directory
if (-not (Test-Path $nltkDataDir)) {
    New-Item -ItemType Directory -Path $nltkDataDir | Out-Null
    Write-Host "Created NLTK data directory: $nltkDataDir" -ForegroundColor Yellow
}

# Convert paths for Docker
function ConvertTo-DockerPath {
    param (
        [string]$WindowsPath
    )
    
    # Replace backslashes with forward slashes
    $DockerPath = $WindowsPath.Replace("\", "/")
    
    # Handle drive letter (e.g., C: -> /c)
    if ($DockerPath -match "^([A-Za-z]):(.*)$") {
        $DriveLetter = $matches[1].ToLower()
        $RemainingPath = $matches[2]
        $DockerPath = "/$DriveLetter$RemainingPath"
    }
    
    return $DockerPath
}

$normalizedWheelsPath = ConvertTo-DockerPath $wheelsDir
$normalizedRequirementsPath = ConvertTo-DockerPath $requirementsPath
$normalizedNltkDataPath = ConvertTo-DockerPath $nltkDataDir

# Build Docker command (binary only, no source)
$dockerCmd = "docker run --rm -v '$normalizedWheelsPath`:/wheels' -v '$normalizedRequirementsPath`:/requirements.txt' " +
             "python:3.12-slim bash -c " +
             "'apt-get update && apt-get install -y build-essential && " +
             "pip download --only-binary=:all: --dest /wheels --platform manylinux2014_x86_64 --python-version 3.12 -r /requirements.txt'"

Write-Host "Running Docker to download wheels (binary only)..." -ForegroundColor Yellow
Write-Host "Command: $dockerCmd" -ForegroundColor Gray

try {
    Invoke-Expression $dockerCmd
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Wheel download failed with exit code $LASTEXITCODE!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error running Docker command: $_" -ForegroundColor Red
    exit 1
}

# Download NLTK data
$nltkCmd = "docker run --rm -v '$normalizedNltkDataPath`:/nltk_data' " +
           "python:3.12-slim bash -c " +
           "'pip install nltk && python -m nltk.downloader -d /nltk_data punkt averaged_perceptron_tagger'"

Write-Host "`nDownloading NLTK data..." -ForegroundColor Yellow
Write-Host "Command: $nltkCmd" -ForegroundColor Gray

try {
    Invoke-Expression $nltkCmd
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "NLTK data download failed with exit code $LASTEXITCODE!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error downloading NLTK data: $_" -ForegroundColor Red
    exit 1
}

# Count wheel files (excluding .gitkeep and nltk_data directory)
$wheelCount = (Get-ChildItem -Path $wheelsDir -File | Where-Object { $_.Name -ne ".gitkeep" } | Measure-Object).Count
Write-Host "Wheel download completed successfully!" -ForegroundColor Green
Write-Host "Downloaded $wheelCount binary wheel files to $wheelsDir" -ForegroundColor Green
Write-Host "Downloaded NLTK data to $nltkDataDir" -ForegroundColor Green

Write-Host "`nYou can now transfer the extraction_service directory to an airgapped environment." -ForegroundColor Cyan
Write-Host "Use airgapped_deploy.sh (Linux) or airgapped_deploy.ps1 (Windows) to deploy." -ForegroundColor Cyan 