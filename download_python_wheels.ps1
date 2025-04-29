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

# Construct the multi-line bash script content
$tempScriptName = "temp_download_script.sh"
$tempScriptHostPath = Join-Path $currentPath "offline_packages/$tempScriptName"
$tempScriptContainerPath = "/tmp/$tempScriptName"

# Escape single quotes within the extra requirements content for bash echo
$escapedExtraReqFileContent = $extraReqFileContent -replace "'", "'\''" 

# Start building the bash script content
$bashScriptContent = @"
#!/bin/bash
set -e
echo 'Upgrading pip, wheel, and installing pip-tools...'
pip install --upgrade pip wheel pip-tools

# Create file for extra requirements
echo '$escapedExtraReqFileContent' > /tmp/extra_reqs.in

echo 'Processing services...'
"@

foreach ($serviceDir in $serviceDirs) {
    $serviceName = $serviceDir.Name
    # Escape single quotes in service name just in case, for bash variable assignment
    $escapedServiceNameForBash = $serviceName -replace "'", "'\''" 
    
    Write-Host "  Processing $serviceName..." -ForegroundColor Cyan
    
    # Append commands for this service to the script content
    $bashScriptContent += @"

echo '--------------------------------------------------'
echo '  Processing service: $escapedServiceNameForBash'
# Define BASH variables for paths
SERVICE_NAME='$escapedServiceNameForBash'
REQ_FILE="/backend/$SERVICE_NAME/requirements.txt"
COMPILED_REQ_FILE="/backend/$SERVICE_NAME/requirements-compiled.txt"
WHEEL_DIR="/wheels/$SERVICE_NAME"

echo "  Using REQ_FILE: $REQ_FILE"
echo "  Using COMPILED_REQ_FILE: $COMPILED_REQ_FILE"
echo "  Using WHEEL_DIR: $WHEEL_DIR"

echo "  Compiling requirements for $SERVICE_NAME..."
mkdir -p "$WHEEL_DIR" # Use BASH variable with quotes
COMPILE_CMD1="pip-compile --allow-unsafe --resolver=backtracking --output-file=\"$COMPILED_REQ_FILE\" \"$REQ_FILE\" /tmp/extra_reqs.in"
COMPILE_CMD2="pip-compile --allow-unsafe --resolver=backtracking --output-file=\"$COMPILED_REQ_FILE\" \"$REQ_FILE\""
COMPILE_CMD3="pip-compile --allow-unsafe --resolver=backtracking --output-file=\"$COMPILED_REQ_FILE\" /tmp/extra_reqs.in"
COMPILE_EXIT_CODE=0

if [ -f "$REQ_FILE" ]; then
    $COMPILE_CMD1 2>/tmp/pip_compile_error.log || COMPILE_EXIT_CODE=$?
    if [ $COMPILE_EXIT_CODE -ne 0 ]; then
        echo "    WARN: pip-compile (with extra reqs) failed for $SERVICE_NAME with code $COMPILE_EXIT_CODE. Trying without..."
        echo "    Compile error log (if any):"
        cat /tmp/pip_compile_error.log || echo "    No error log found."
        COMPILE_EXIT_CODE=0 # Reset for next try
        $COMPILE_CMD2 2>/tmp/pip_compile_error.log || COMPILE_EXIT_CODE=$?
        if [ $COMPILE_EXIT_CODE -ne 0 ]; then
             echo "    ERROR: pip-compile (without extra reqs) also failed for $SERVICE_NAME with code $COMPILE_EXIT_CODE."
             echo "    Compile error log (if any):"
             cat /tmp/pip_compile_error.log || echo "    No error log found."
        fi
    fi
else
    echo "    INFO: No requirements.txt found for $SERVICE_NAME. Compiling only extra reqs."
    $COMPILE_CMD3 2>/tmp/pip_compile_error.log || COMPILE_EXIT_CODE=$?
    if [ $COMPILE_EXIT_CODE -ne 0 ]; then
        echo "    ERROR: pip-compile (only extra reqs) failed for $SERVICE_NAME with code $COMPILE_EXIT_CODE."
        echo "    Compile error log (if any):"
        cat /tmp/pip_compile_error.log || echo "    No error log found."
    fi
fi
rm -f /tmp/pip_compile_error.log # Clean up log file
echo "  Finished compiling for $SERVICE_NAME (Compile Exit Code: $COMPILE_EXIT_CODE)"


if [ -f "$COMPILED_REQ_FILE" ] && [ $COMPILE_EXIT_CODE -eq 0 ]; then
    echo "    Downloading wheels for $SERVICE_NAME based on $COMPILED_REQ_FILE..."
    DOWNLOAD_EXIT_CODE1=0
    DOWNLOAD_EXIT_CODE2=0
    pip download --dest "$WHEEL_DIR" -r "$COMPILED_REQ_FILE" --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: --no-deps 2>/tmp/pip_download_error.log || DOWNLOAD_EXIT_CODE1=$?
    if [ $DOWNLOAD_EXIT_CODE1 -ne 0 ]; then
        echo "    WARN: Failed to download some wheels with only-binary for $SERVICE_NAME (Exit Code: $DOWNLOAD_EXIT_CODE1). Retrying without restriction..."
        echo "    Download error log (if any):"
        cat /tmp/pip_download_error.log || echo "    No error log found."
        pip download --dest "$WHEEL_DIR" -r "$COMPILED_REQ_FILE" --platform manylinux2014_x86_64 --python-version 311 --no-deps 2>/tmp/pip_download_error.log || DOWNLOAD_EXIT_CODE2=$?
        if [ $DOWNLOAD_EXIT_CODE2 -ne 0 ]; then
             echo "    ERROR: Failed to download some wheels even without only-binary for $SERVICE_NAME (Exit Code: $DOWNLOAD_EXIT_CODE2)."
             echo "    Download error log (if any):"
             cat /tmp/pip_download_error.log || echo "    No error log found."
        fi
    fi
    rm -f /tmp/pip_download_error.log # Clean up log file
    echo "    Finished downloading wheels for $SERVICE_NAME."
else
    echo "    WARN: Skipping wheel download for $SERVICE_NAME (No compiled file or compile failed)."
fi
echo '--------------------------------------------------'

"@
}

# Add final message to the script content
$bashScriptContent += @"

echo 'Backend wheel downloads complete.'
"@

# Write the bash script to the temporary file
Write-Host "Writing temporary bash script to $tempScriptHostPath" -ForegroundColor Gray
$bashScriptContent | Set-Content -Path $tempScriptHostPath -Encoding Ascii -NoNewline

try {
    # Run the container, mounting the script and executing it
    Write-Host "Executing script in Docker container..." -ForegroundColor Cyan
    # Put docker run on a single line to avoid PowerShell parsing issues
    docker run --rm -v "${currentPath}/offline_packages/backend_wheels:/wheels" -v "${backendPath}:/backend:ro" -v "${tempScriptHostPath}:${tempScriptContainerPath}:ro" python:3.11-slim bash "$tempScriptContainerPath"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Docker command completed with exit code $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host "Some packages may not have been downloaded correctly." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error running Docker command: $_" -ForegroundColor Red
} finally {
    # Clean up the temporary script file
    if (Test-Path $tempScriptHostPath) {
        Write-Host "Cleaning up temporary script: $tempScriptHostPath" -ForegroundColor Gray
        Remove-Item -Path $tempScriptHostPath -Force
    }
}

$finalWheelCount = (Get-ChildItem -Path $baseWheelDir -Recurse -Filter "*.whl" | Measure-Object).Count
Write-Host "Python wheel packages have been downloaded to service-specific subdirectories under $baseWheelDir ($finalWheelCount total packages)" -ForegroundColor Green 