# PowerShell script to download Linux-compatible Python wheels for airgapped installation
# This script uses Docker to ensure the wheels are compatible with the target Linux environment.

# Ensure the wheels directory exists
$wheelsDir = Join-Path $PSScriptRoot "wheels"
if (-not (Test-Path $wheelsDir)) {
    New-Item -ItemType Directory -Path $wheelsDir | Out-Null
}

Write-Host "Downloading Linux-compatible wheels and source packages for airgapped installation..." -ForegroundColor Cyan

# Get absolute paths and normalize them for Docker
$wheelsPath = (Resolve-Path $wheelsDir).Path
$requirementsPath = Join-Path $PSScriptRoot "requirements.txt"

# Convert Windows paths to Docker-compatible format
$normalizedWheelsPath = $wheelsPath.Replace("\", "/")
$normalizedRequirementsPath = $requirementsPath.Replace("\", "/")

# Handle drive letter for Docker volume mapping
if ($normalizedWheelsPath -match "^([A-Za-z]):(.*)") {
    $normalizedWheelsPath = "/" + $matches[1].ToLower() + $matches[2]
}
if ($normalizedRequirementsPath -match "^([A-Za-z]):(.*)") {
    $normalizedRequirementsPath = "/" + $matches[1].ToLower() + $matches[2]
}

# Docker command to download wheels inside a container
$dockerCmd = "docker run --rm -v '$normalizedWheelsPath`:/wheels' -v '$normalizedRequirementsPath`:/requirements.txt' python:3.12-slim bash -c 'pip download --dest /wheels --platform manylinux2014_x86_64 --python-version 3.12 -r /requirements.txt'"

Write-Host "Running Docker to download Linux-compatible wheels and source packages..." -ForegroundColor Yellow
Write-Host "Command: $dockerCmd"

try {
    Invoke-Expression $dockerCmd
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error downloading packages. Docker command failed with exit code $LASTEXITCODE." -ForegroundColor Red
        exit 1
    }
    
    # List the downloaded packages
    $wheels = Get-ChildItem -Path $wheelsDir -Filter "*.whl"
    $tarballs = Get-ChildItem -Path $wheelsDir -Filter "*.tar.gz"
    $zips = Get-ChildItem -Path $wheelsDir -Filter "*.zip"
    
    $totalCount = $wheels.Count + $tarballs.Count + $zips.Count
    
    Write-Host "Downloaded $totalCount packages to $wheelsDir`:" -ForegroundColor Green
    Write-Host "  - $($wheels.Count) wheel files" -ForegroundColor White
    Write-Host "  - $($tarballs.Count) source tarballs" -ForegroundColor White
    Write-Host "  - $($zips.Count) zip archives" -ForegroundColor White
    
    foreach ($package in ($wheels + $tarballs + $zips)) {
        Write-Host "  - $($package.Name)" -ForegroundColor White
    }
    
    # Ask if user wants to create a zip file for easy transfer
    $createZip = Read-Host "`nWould you like to create a ZIP file of the entire service for airgapped transfer? (y/n)"
    if ($createZip -eq "y") {
        Write-Host "`nCreating ZIP file for airgapped transfer..." -ForegroundColor Cyan
        $zipFilename = "review_service_airgapped.zip"
        
        # Remove old zip if it exists
        if (Test-Path $zipFilename) {
            Remove-Item $zipFilename -Force
        }
        
        # Create new zip file
        $source = $PSScriptRoot
        $destination = Join-Path $PSScriptRoot $zipFilename
        
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::CreateFromDirectory($source, $destination)
        
        Write-Host "Created $zipFilename successfully." -ForegroundColor Green
    }
    
    Write-Host "`nIMPORTANT NOTICE ABOUT AIRGAPPED DEPLOYMENT:" -ForegroundColor Yellow
    Write-Host "---------------------------------------------" -ForegroundColor Yellow
    Write-Host "1. This setup has been modified to be completely airgapped"
    Write-Host "2. The Dockerfile no longer requires internet access during build"
    Write-Host "3. All Python dependencies are provided as wheel files or source packages"
    Write-Host "`nTo use these packages in an airgapped environment:"
    Write-Host "1. Copy the entire review_service directory to the target machine"
    Write-Host "2. Build the Docker image using: docker build -t review_service ."
    Write-Host "3. Run the container using the appropriate Docker command"
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} 