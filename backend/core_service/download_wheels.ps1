# PowerShell script for downloading Linux-compatible Python wheels for airgapped installation
# This script uses Docker to ensure the wheels are compatible with the target Linux environment.

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
    
    # Separately download PyPDF4 which doesn't have binary distributions
    Write-Host "`nSeparately downloading PyPDF4 (source-only package)..." -ForegroundColor Cyan
    $pypdf4Cmd = "docker run --rm -v '$normalizedWheelsPath`:/wheels' python:3.12-slim pip download --dest /wheels PyPDF4>=1.27.0"
    
    try {
        Invoke-Expression $pypdf4Cmd
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Warning: Could not download PyPDF4." -ForegroundColor Yellow
            Write-Host "The build may fail if PyPDF4 is required." -ForegroundColor Yellow
        } else {
            Write-Host "PyPDF4 downloaded successfully as source package." -ForegroundColor Green
        }
    } catch {
        Write-Host "Warning: Error downloading PyPDF4: $_" -ForegroundColor Yellow
        Write-Host "The build may fail if PyPDF4 is required." -ForegroundColor Yellow
    }
    
    # List the downloaded wheels
    $wheels = Get-ChildItem -Path $wheelsDir -Filter "*.whl"
    $sourcePackages = @(Get-ChildItem -Path $wheelsDir -Filter "*.tar.gz") + @(Get-ChildItem -Path $wheelsDir -Filter "*.zip")
    
    Write-Host "`nDownloaded $($wheels.Count) wheel files to $wheelsDir`:" -ForegroundColor Green
    foreach ($wheel in $wheels) {
        Write-Host "  - $($wheel.Name)" -ForegroundColor Cyan
    }
    
    Write-Host "`nDownloaded $($sourcePackages.Count) source packages to $wheelsDir`:" -ForegroundColor Green
    foreach ($pkg in $sourcePackages) {
        Write-Host "  - $($pkg.Name)" -ForegroundColor Cyan
    }
    
    Write-Host "`nIMPORTANT NOTICE ABOUT AIRGAPPED DEPLOYMENT:" -ForegroundColor Yellow
    Write-Host "---------------------------------------------" -ForegroundColor Yellow
    Write-Host "1. This setup has been modified to be completely airgapped" -ForegroundColor Yellow
    Write-Host "2. The Dockerfile no longer requires internet access during build" -ForegroundColor Yellow
    Write-Host "3. All Python dependencies are provided as wheel files and source packages" -ForegroundColor Yellow
    Write-Host "4. Source-only packages like PyPDF4 are handled separately" -ForegroundColor Yellow
    Write-Host "`nTo use these packages in an airgapped environment:" -ForegroundColor Green
    Write-Host "1. Copy the entire core_service directory to the target machine" -ForegroundColor Green
    Write-Host "2. Build the Docker image using: docker build -t core_service ." -ForegroundColor Green
    Write-Host "3. Run the container using: docker run -p 8000:8000 core_service" -ForegroundColor Green
    
    # Offer to create a zip file for easy transfer
    Write-Host "`nWould you like to create a zip file of the core_service directory for transfer? (y/n)" -ForegroundColor Yellow
    $createZip = Read-Host
    
    if ($createZip -eq "y" -or $createZip -eq "Y") {
        $zipPath = Join-Path -Path $PSScriptRoot -ChildPath "core_service_airgapped.zip"
        Write-Host "Creating zip file at: $zipPath" -ForegroundColor Cyan
        Compress-Archive -Path "$PSScriptRoot\*" -DestinationPath $zipPath -Force
        Write-Host "Zip file created successfully." -ForegroundColor Green
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} 