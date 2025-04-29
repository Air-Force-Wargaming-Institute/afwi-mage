# Script to download Python wheel packages for offline use, separated by service
# Run this on a machine with internet access

# Base directory for wheels
$baseWheelDir = "offline_packages/backend_wheels"
if (-not (Test-Path -Path $baseWheelDir)) {
    New-Item -Path $baseWheelDir -ItemType Directory -Force
}

Write-Host "Starting to download Python wheel packages per service..." -ForegroundColor Green

# Check if wheels have already been downloaded (check base dir, less precise now)
$baseWheelCount = (Get-ChildItem -Path $baseWheelDir -Recurse -Filter "*.whl" | Measure-Object).Count
if ($baseWheelCount -gt 0) {
    Write-Host "Found existing wheel packages ($baseWheelCount) in subdirectories." -ForegroundColor Cyan
    $skipDownload = Read-Host "Do you want to skip downloading and use existing packages? (y/n)"
    if ($skipDownload.ToLower() -eq 'y') {
        Write-Host "Using existing wheel packages." -ForegroundColor Green
        exit 0
    }
    Write-Host "Continuing with download. Existing packages will be kept." -ForegroundColor Cyan
}

# Get the absolute path to the current directory
$currentPath = (Get-Location).Path

# Find all service directories with a requirements.txt file
$backendPath = Join-Path $currentPath "backend"
$serviceDirs = Get-ChildItem -Path $backendPath -Directory | Where-Object { Test-Path -Path (Join-Path $_.FullName "requirements.txt") }

# Add extra requirements needed by some services but not always in requirements.txt (e.g., from template)
$extraRequirements = @(
    "pytesseract>=0.3",
    "layoutparser[tesseract]>=0.3" 
)
$extraReqFileContent = $extraRequirements -join "`n"

# Using Docker to ensure Linux compatibility and use pip-tools
Write-Host "Running pip-compile and pip download in Docker container for each service..." -ForegroundColor Cyan

# Construct the multi-line bash command for Docker
# Escape PowerShell variables ($) with backticks (`)
# Escape internal double quotes (") with backticks (`)
# Use single quotes within BASH echo to prevent interpretation of special chars like []

$escapedExtraReqFileContent = $extraReqFileContent -replace "'", "'\''" # Escape single quotes for BASH single-quoted string

$dockerCommand = @"
set -e
echo 'Upgrading pip, wheel, and installing pip-tools...'
pip install --upgrade pip wheel pip-tools

# Create file for extra requirements
# Use single quotes in BASH to treat content literally
echo '$escapedExtraReqFileContent' > /tmp/extra_reqs.in

echo 'Processing services...'
"@

foreach ($serviceDir in $serviceDirs) {
    $serviceName = $serviceDir.Name
    # Escape any characters in service name that might interfere with bash paths if necessary (unlikely for typical names)
    $reqFilePathInContainer = "/backend/$serviceName/requirements.txt"
    $compiledReqFilePathInContainer = "/backend/$serviceName/requirements-compiled.txt"
    $wheelOutputDirInContainer = "/wheels/$serviceName"
    
    Write-Host "  Processing $serviceName..." -ForegroundColor Cyan
    
    # Append commands for this service, ensuring variables are escaped for BASH
    $dockerCommand += @"

echo '  Compiling requirements for `$serviceName...'
mkdir -p `$wheelOutputDirInContainer

# Combine original requirements with extra requirements for compilation if needed
if [ -f `"$reqFilePathInContainer`" ]; then
    # Use -allow-unsafe for potential dependencies like tesseract variant of layoutparser
    # Use escaped variables `$compiledReqFilePathInContainer`, `$reqFilePathInContainer`
    pip-compile --allow-unsafe --resolver=backtracking --output-file=`$compiledReqFilePathInContainer `$reqFilePathInContainer /tmp/extra_reqs.in 2>/dev/null || echo `"    WARN: pip-compile failed for `$serviceName, trying without extra reqs`" && \
    pip-compile --allow-unsafe --resolver=backtracking --output-file=`$compiledReqFilePathInContainer `$reqFilePathInContainer
else
    # If service has no requirements.txt, compile only the extras
    pip-compile --allow-unsafe --resolver=backtracking --output-file=`$compiledReqFilePathInContainer /tmp/extra_reqs.in
fi

echo `"    Downloading wheels for `$serviceName based on `$compiledReqFilePathInContainer...`"
if [ -f `"$compiledReqFilePathInContainer`" ]; then
    # Use escaped variable `$wheelOutputDirInContainer`, `$compiledReqFilePathInContainer`
    pip download --dest `$wheelOutputDirInContainer -r `$compiledReqFilePathInContainer --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: --no-deps || echo `"    WARN: Failed to download some wheels with only-binary for `$serviceName`"`
    pip download --dest `$wheelOutputDirInContainer -r `$compiledReqFilePathInContainer --platform manylinux2014_x86_64 --python-version 311 --no-deps || echo `"    WARN: Failed to download some wheels for `$serviceName`"`
else
    echo `"    WARN: No compiled requirements file found for `$serviceName`"`
fi
"@
}

$dockerCommand += @"

echo 'Backend wheel downloads complete.'
"@

try {
    # Run the combined commands in Docker
    # Pass the command string directly to bash -c, ensure docker run is on one line
    docker run --rm -v "${currentPath}/offline_packages/backend_wheels:/wheels" -v "${backendPath}:/backend:ro" python:3.11-slim bash -c "$dockerCommand"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Docker command completed with exit code $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host "Some packages may not have been downloaded correctly." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error running Docker command: $_" -ForegroundColor Red
}

$finalWheelCount = (Get-ChildItem -Path $baseWheelDir -Recurse -Filter "*.whl" | Measure-Object).Count
Write-Host "Python wheel packages have been downloaded to service-specific subdirectories under $baseWheelDir ($finalWheelCount total packages)" -ForegroundColor Green 