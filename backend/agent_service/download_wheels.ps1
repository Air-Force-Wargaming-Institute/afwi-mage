# PowerShell script to download Linux-compatible Python wheels for airgapped installation
# This script uses Docker to ensure wheels are compatible with Linux environments

param(
    [Parameter()]
    [switch]$AutoZip
)

# Define the service name based on the directory name
$ServiceName = "agent_service"

Write-Host "Downloading Linux-compatible wheels for airgapped installation..." -ForegroundColor Cyan

# Check if Docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Docker is required but not found in PATH." -ForegroundColor Red
    Write-Host "Please install Docker before proceeding."
    exit 1
}

# Define the target wheels directory relative to the script location
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptDirAbsolute = (Resolve-Path -Path $scriptDir).Path # Get the full canonical path of script directory
$wheelsDirRelative = "../backend_wheels"
$wheelsDirAbsolute = Join-Path -Path $scriptDir -ChildPath $wheelsDirRelative
$wheelsDirAbsolute = (Resolve-Path -Path $wheelsDirAbsolute).Path # Get the full canonical path

# Create wheels directory if it doesn't exist
if (-not (Test-Path $wheelsDirAbsolute -PathType Container)) {
    New-Item -ItemType Directory -Path $wheelsDirAbsolute | Out-Null
    Write-Host "Created wheels directory: $wheelsDirAbsolute" -ForegroundColor Yellow
} else {
    Write-Host "Using existing wheels directory: $wheelsDirAbsolute" -ForegroundColor Yellow
}

# Define the requirements file path
$requirementsFile = "requirements.txt"
$requirementsFileAbsolute = Join-Path -Path $scriptDir -ChildPath $requirementsFile
$requirementsFileAbsolute = (Resolve-Path -Path $requirementsFileAbsolute).Path

# Use Docker to download Linux-compatible wheels
Write-Host "Running Docker to download Linux-compatible wheels..." -ForegroundColor Yellow

# Normalize paths for Docker volume mounting on Windows
# For wheels directory
$normalizedWheelsPath = $wheelsDirAbsolute.Replace("\", "/")
if ($IsWindows) {
    # Convert C:\... to /c/... format for Docker Desktop
    $driveLetter = $normalizedWheelsPath.Substring(0, 1).ToLower()
    $normalizedWheelsPath = "/$driveLetter" + $normalizedWheelsPath.Substring(2)
}

# For requirements file
$normalizedRequirementsPath = $requirementsFileAbsolute.Replace("\", "/")
if ($IsWindows) {
    # Convert C:\... to /c/... format for Docker Desktop
    $driveLetter = $normalizedRequirementsPath.Substring(0, 1).ToLower()
    $normalizedRequirementsPath = "/$driveLetter" + $normalizedRequirementsPath.Substring(2)
}

# Use double quotes for the whole command and single quotes for paths with colons in PowerShell
$dockerArgs = @(
    "run", "--rm",
    "-v", "$normalizedWheelsPath`:/wheels",
    "-v", "$normalizedRequirementsPath`:/reqs/requirements.txt:ro",
    "python:3.12-slim",
    "bash", "-c",
    'pip download --dest /wheels --only-binary=:all: --platform manylinux2014_x86_64 --python-version 3.12 -r /reqs/requirements.txt'
)
& docker @dockerArgs

if ($LASTEXITCODE -ne 0) {
    Write-Error "[$ServiceName] Error downloading wheels using Docker. Exit code: $LASTEXITCODE"
    exit $LASTEXITCODE
}

# List the downloaded wheels from the target directory
$wheels = Get-ChildItem -Path $wheelsDirAbsolute -Filter "*.whl"

Write-Host "Downloaded $($wheels.Count) Linux-compatible wheel files to $wheelsDirAbsolute" -ForegroundColor Green
foreach ($wheel in $wheels) {
    Write-Host "  - $($wheel.Name)" -ForegroundColor White
}

# Save the list of downloaded wheels to a file in the script's directory (agent_service)
$outputFileName = "downloaded_wheels_list.txt"
$outputFilePath = Join-Path -Path $scriptDir -ChildPath $outputFileName
try {
    $wheels.Name | Out-File -FilePath $outputFilePath -Encoding utf8
    Write-Host "List of downloaded wheels saved to: $outputFilePath" -ForegroundColor Green
} catch {
    Write-Host "Error saving wheel list to file: $_" -ForegroundColor Red
}

# Automatically run the script to copy wheels from the list to the local wheels directory
Write-Host ""
Write-Host "Attempting to copy downloaded wheels to the local ./wheels directory..." -ForegroundColor Yellow
$copyScriptPath = Join-Path -Path $scriptDir -ChildPath "copy_wheels_from_list.ps1"
if (Test-Path $copyScriptPath -PathType Leaf) {
    try {
        # Execute the copy script
        & $copyScriptPath
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "The copy_wheels_from_list.ps1 script finished with errors (Exit Code: $LASTEXITCODE)."
        } else {
            Write-Host "Local ./wheels directory populated successfully." -ForegroundColor Green
        }
    } catch {
        Write-Error "Failed to execute copy_wheels_from_list.ps1: $_"
    }
} else {
    Write-Warning "copy_wheels_from_list.ps1 not found in $scriptDir. Skipping local copy."
}

Write-Host ""
Write-Host "Wheels are located in: $wheelsDirAbsolute" -ForegroundColor Cyan
Write-Host "To use these wheels in an airgapped environment:" -ForegroundColor Cyan
Write-Host "1. Copy the agent_service directory AND the $wheelsDirAbsolute directory to the target machine" -ForegroundColor White
Write-Host "2. Update Dockerfile or build process to use the wheels from the shared location" -ForegroundColor Yellow # Added note
Write-Host "3. Run the deployment script: .\airgapped_deploy.ps1 (May need adjustment)" -ForegroundColor White # Added note
Write-Host "4. Start the container as instructed by the deployment script" -ForegroundColor White

# Create a package.zip file for easy transfer
$doZip = $false
if ($AutoZip) {
    $doZip = $true
    Write-Host "[$ServiceName] Auto-zipping enabled via parameter." -ForegroundColor DarkGray
} else {
    Write-Host ""
    Write-Host "[$ServiceName] Would you like to create a zip archive of the $ServiceName directory (including local wheels) for transfer? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq "Y" -or $response -eq "y") {
        $doZip = $true
    }
}

if ($doZip) {
    $zipFileName = "${ServiceName}_airgapped.zip"
    $zipFilePath = Join-Path -Path $scriptDirAbsolute -ChildPath $zipFileName
    Write-Host "[$ServiceName] Creating archive $zipFileName ..." -ForegroundColor Yellow
    try {
        # Ensure we are in the script's directory context for relative paths
        # Push-Location $scriptDirAbsolute # No longer needed with explicit path
        # Use explicit path and wildcard within that path
        Compress-Archive -Path (Join-Path $scriptDirAbsolute '*') -DestinationPath $zipFilePath -Force -ErrorAction Stop
        Write-Host "[$ServiceName] Created $zipFilePath" -ForegroundColor Green
        Write-Host "[$ServiceName] Transfer this file to your airgapped environment." -ForegroundColor Cyan
    } catch {
        Write-Error "[$ServiceName] Failed to create zip archive: $_"
    } # Removed finally Pop-Location as Push-Location is removed
}

Write-Host "[$ServiceName] Script finished." -ForegroundColor Cyan 