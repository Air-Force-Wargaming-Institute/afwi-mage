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

# --- Prepare Common Docker Execution Environment ---
Write-Host "Preparing Docker environment..." -ForegroundColor Cyan

# Define the content for the generic bash script template using a LITERAL Here-String
# This prevents PowerShell from trying to expand variables like $SERVICE_NAME inside
$scriptTemplateContent = @'
#!/bin/bash
# Generic script to compile and download wheels for ONE service
# Expects SERVICE_NAME environment variable to be set
set -e

if [ -z "$SERVICE_NAME" ]; then
    echo "ERROR: SERVICE_NAME environment variable is not set." >&2
    exit 1
fi

echo "--------------------------------------------------"
echo "Processing service: $SERVICE_NAME"

# Define BASH variables for paths based on ENV var
REQ_FILE="/backend/$SERVICE_NAME/requirements.txt"
COMPILED_REQ_FILE="/backend/$SERVICE_NAME/requirements-compiled.txt"
WHEEL_DIR="/wheels/$SERVICE_NAME"
EXTRA_REQ_FILE="/tmp/extra_reqs.in" # Path to extra reqs file (mounted)

echo "  Using REQ_FILE: $REQ_FILE"
echo "  Using COMPILED_REQ_FILE: $COMPILED_REQ_FILE"
echo "  Using WHEEL_DIR: $WHEEL_DIR"

echo "  Compiling requirements for $SERVICE_NAME..."
mkdir -p "$WHEEL_DIR"
# Define commands ensuring proper quoting for eval
COMPILE_CMD1="pip-compile --allow-unsafe --resolver=backtracking --output-file=\"$COMPILED_REQ_FILE\" \"$REQ_FILE\" \"$EXTRA_REQ_FILE\""
COMPILE_CMD2="pip-compile --allow-unsafe --resolver=backtracking --output-file=\"$COMPILED_REQ_FILE\" \"$REQ_FILE\""
COMPILE_CMD3="pip-compile --allow-unsafe --resolver=backtracking --output-file=\"$COMPILED_REQ_FILE\" \"$EXTRA_REQ_FILE\""
COMPILE_EXIT_CODE=0

if [ -f "$REQ_FILE" ]; then
    echo "  Attempting compile with extra requirements..."
    eval "$COMPILE_CMD1" 2>/tmp/pip_compile_error.log || COMPILE_EXIT_CODE=$?
    if [ $COMPILE_EXIT_CODE -ne 0 ]; then
        echo "    WARN: pip-compile (with extra reqs) failed for $SERVICE_NAME with code $COMPILE_EXIT_CODE. Trying without..."
        echo "    Compile error log (if any):"
        cat /tmp/pip_compile_error.log || echo "    No error log found."
        COMPILE_EXIT_CODE=0 # Reset for next try
        echo "  Attempting compile without extra requirements..."
        eval "$COMPILE_CMD2" 2>/tmp/pip_compile_error.log || COMPILE_EXIT_CODE=$?
        if [ $COMPILE_EXIT_CODE -ne 0 ]; then
             echo "    ERROR: pip-compile (without extra reqs) also failed for $SERVICE_NAME with code $COMPILE_EXIT_CODE."
             echo "    Compile error log (if any):"
             cat /tmp/pip_compile_error.log || echo "    No error log found."
        fi
    fi
else
    echo "    INFO: No requirements.txt found for $SERVICE_NAME. Compiling only extra reqs."
    eval "$COMPILE_CMD3" 2>/tmp/pip_compile_error.log || COMPILE_EXIT_CODE=$?
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
    echo "  Attempting download with --only-binary=:all:..."
    pip download --dest "$WHEEL_DIR" -r "$COMPILED_REQ_FILE" --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: --no-deps 2>/tmp/pip_download_error.log || DOWNLOAD_EXIT_CODE1=$?
    if [ $DOWNLOAD_EXIT_CODE1 -ne 0 ]; then
        echo "    WARN: Failed to download some wheels with only-binary for $SERVICE_NAME (Exit Code: $DOWNLOAD_EXIT_CODE1). Retrying without restriction..."
        echo "    Download error log (if any):"
        cat /tmp/pip_download_error.log || echo "    No error log found."
        echo "  Attempting download without --only-binary=:all:..."
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
echo "--------------------------------------------------"
'@

# Path for the generic script template on host and in container
$scriptTemplateName = "temp_download_script_template.sh"
$scriptTemplateHostPath = Join-Path $currentPath "offline_packages/$scriptTemplateName"
$scriptTemplateContainerPath = "/tmp/$scriptTemplateName"

# Write the script template content to the host file (using UTF8 without BOM)
Write-Host "Creating/Overwriting script template: $scriptTemplateHostPath" -ForegroundColor Gray
Set-Content -Path $scriptTemplateHostPath -Value $scriptTemplateContent -Encoding UTF8 -Force

# Path for the extra requirements file on host and in container
$extraReqFileName = "extra_reqs.in"
$extraReqFileHostPath = Join-Path $currentPath "offline_packages/$extraReqFileName"
$extraReqFileContainerPath = "/tmp/$extraReqFileName"

# Write the extra requirements to the host file
$extraReqFileContent | Out-File -FilePath $extraReqFileHostPath -Encoding Ascii -NoNewline

# Run a preliminary container to install pip-tools (avoids doing it repeatedly)
$baseImage = "python:3.11-slim"
$upgradedImage = "python:3.11-slim-pip-tools"
Write-Host "Checking/Creating Python image with pip-tools ($upgradedImage)..." -ForegroundColor Cyan
if (-not (docker image inspect $upgradedImage -f '{{.Id}}' 2>$null)) {
    Write-Host "  Building $upgradedImage..." -ForegroundColor Gray
    $dockerBuildCmd = "FROM $baseImage
RUN pip install --upgrade pip wheel pip-tools"
    $dockerBuildCmd | docker build -t $upgradedImage - 
} else {
    Write-Host "  Image $upgradedImage already exists." -ForegroundColor Gray
}

# --- Loop Through Services and Run Docker ---
Write-Host "Running Docker container for each service..." -ForegroundColor Cyan
$overallSuccess = $true

foreach ($serviceDir in $serviceDirs) {
    $serviceName = $serviceDir.Name
    Write-Host "--------------------------------------------------" -ForegroundColor Cyan
    Write-Host "  Processing $serviceName..." -ForegroundColor Cyan

    try {
        # Run the container for this specific service, passing SERVICE_NAME as env var
        # Put docker run on a single line
        docker run --rm -e "SERVICE_NAME=$serviceName" -v "${currentPath}/offline_packages/backend_wheels:/wheels" -v "${backendPath}:/backend:ro" -v "${scriptTemplateHostPath}:${scriptTemplateContainerPath}:ro" -v "${extraReqFileHostPath}:${extraReqFileContainerPath}:ro" $upgradedImage bash "$scriptTemplateContainerPath"

        if ($LASTEXITCODE -ne 0) {
            Write-Host "Warning: Docker command for $serviceName completed with exit code $LASTEXITCODE" -ForegroundColor Yellow
            $overallSuccess = $false
        }
    } catch {
        Write-Host "Error running Docker command for $($serviceName): $_" -ForegroundColor Red
        $overallSuccess = $false
    }
}

# --- Cleanup ---
finally {
    # Clean up the temporary extra requirements file
    if (Test-Path $extraReqFileHostPath) {
        Write-Host "Cleaning up temporary file: $extraReqFileHostPath" -ForegroundColor Gray
        Remove-Item -Path $extraReqFileHostPath -Force
    }
    # Clean up the script template file 
    if (Test-Path $scriptTemplateHostPath) {
        Write-Host "Cleaning up temporary script: $scriptTemplateHostPath" -ForegroundColor Gray
        Remove-Item -Path $scriptTemplateHostPath -Force
    }
}

# --- Final Summary ---
if (-not $overallSuccess) {
     Write-Host "Warning: One or more services failed during wheel download." -ForegroundColor Yellow
}

$finalWheelCount = (Get-ChildItem -Path $baseWheelDir -Recurse -Filter "*.whl" | Measure-Object).Count
Write-Host "Python wheel package download process complete. ($finalWheelCount total packages found in subdirectories)" -ForegroundColor Green 