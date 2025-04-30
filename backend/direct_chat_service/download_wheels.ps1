# PowerShell script for downloading Linux-compatible Python wheels for airgapped installation
# This script uses Docker to ensure the wheels are compatible with the target Linux environment.
# IMPORTANT: We only download binary wheels to avoid compilation requirements in airgapped environments.

# Create wheels directory if it doesn't exist
$wheelsDir = Join-Path -Path $PSScriptRoot -ChildPath "wheels"
if (-not (Test-Path -Path $wheelsDir)) {
    New-Item -Path $wheelsDir -ItemType Directory | Out-Null
}

# Get absolute paths
$wheelsPath = (Get-Item -Path $wheelsDir).FullName
$requirementsPath = Join-Path -Path $PSScriptRoot -ChildPath "requirements.txt"

# Convert Windows paths to Docker-compatible format
$normalizedWheelsPath = $wheelsPath.Replace("\", "/").Replace("C:", "/c")
$normalizedRequirementsPath = $requirementsPath.Replace("\", "/").Replace("C:", "/c")

Write-Host "Downloading Linux-compatible wheels for airgapped installation..."
Write-Host "Wheels directory: $wheelsPath"
Write-Host "Requirements file: $requirementsPath"

# Docker command to download wheels inside a container
$dockerCmd = "docker run --rm -v '$normalizedWheelsPath`:/wheels' -v '$normalizedRequirementsPath`:/requirements.txt' python:3.12-slim bash -c 'pip download --dest /wheels --only-binary=:all: --platform manylinux2014_x86_64 --python-version 3.12 -r /requirements.txt'"

Write-Host "Running Docker to download Linux-compatible wheels..."
Write-Host "Docker Command: $dockerCmd"

try {
    # Execute Docker command
    Invoke-Expression $dockerCmd
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Docker command failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
    
    # Skip source package downloads to ensure true airgapped installation
    # without needing compilation tools
    
    # List the downloaded wheels
    $wheels = Get-ChildItem -Path $wheelsDir -Filter "*.whl"
    
    Write-Host "`nDownloaded $($wheels.Count) wheel files to $wheelsDir`:" -ForegroundColor Green
    foreach ($wheel in $wheels) {
        Write-Host "  - $($wheel.Name)" -ForegroundColor Cyan
    }
    
    Write-Host "`nIMPORTANT NOTICE ABOUT AIRGAPPED DEPLOYMENT:" -ForegroundColor Yellow
    Write-Host "---------------------------------------------" -ForegroundColor Yellow
    Write-Host "1. This setup has been modified to be completely airgapped" -ForegroundColor Yellow
    Write-Host "2. The Dockerfile no longer requires internet access during build" -ForegroundColor Yellow
    Write-Host "3. All Python dependencies are provided as pre-compiled wheel files" -ForegroundColor Yellow
    Write-Host "4. No gcc or build tools are required in the airgapped environment" -ForegroundColor Yellow
    Write-Host "`nTo use these packages in an airgapped environment:" -ForegroundColor Green
    Write-Host "1. Copy the entire direct_chat_service directory to the target machine" -ForegroundColor Green
    Write-Host "2. Build the Docker image using: docker build -t direct_chat_service ." -ForegroundColor Green
    Write-Host "3. Run the container using: docker run -p 8011:8011 -v ./data:/app/data -v ./sessions:/app/sessions direct_chat_service" -ForegroundColor Green
    
    # Offer to create a zip file for easy transfer
    Write-Host "`nWould you like to create a zip file of the direct_chat_service directory for transfer? (y/n)" -ForegroundColor Yellow
    $createZip = Read-Host
    
    if ($createZip -eq "y" -or $createZip -eq "Y") {
        $zipPath = Join-Path -Path $PSScriptRoot -ChildPath "direct_chat_service_airgapped.zip"
        Write-Host "Creating zip file at: $zipPath" -ForegroundColor Cyan
        Compress-Archive -Path "$PSScriptRoot\*" -DestinationPath $zipPath -Force
        Write-Host "Zip file created successfully." -ForegroundColor Green
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} 