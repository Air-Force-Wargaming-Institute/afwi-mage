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

# Path for the generic script template on host and in container
$scriptTemplateName = "temp_download_script_template.sh"
$scriptTemplateHostPath = Join-Path $currentPath "offline_packages/$scriptTemplateName"
$scriptTemplateContainerPath = "/tmp/$scriptTemplateName"

# Path for the extra requirements file on host and in container
$extraReqFileName = "extra_reqs.in"
$extraReqFileHostPath = Join-Path $currentPath "offline_packages/$extraReqFileName"
$extraReqFileContainerPath = "/tmp/$extraReqFileName"

# Write the extra requirements to the host file
$extraReqFileContent | Out-File -FilePath $extraReqFileHostPath -Encoding Ascii -NoNewline

# Run a preliminary container to install pip-tools (avoids doing it repeatedly)
# We reuse the base image tag as the upgraded image tag
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

# Check if the script template exists
if (-not (Test-Path $scriptTemplateHostPath)) {
    Write-Error "Script template not found at $scriptTemplateHostPath. Please ensure it was created correctly."
    exit 1
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
        docker run --rm `
            -e "SERVICE_NAME=$serviceName" `
            -v "${currentPath}/offline_packages/backend_wheels:/wheels" `
            -v "${backendPath}:/backend:ro" `
            -v "${scriptTemplateHostPath}:${scriptTemplateContainerPath}:ro" `
            -v "${extraReqFileHostPath}:${extraReqFileContainerPath}:ro" `
            $upgradedImage bash "$scriptTemplateContainerPath"

        if ($LASTEXITCODE -ne 0) {
            Write-Host "Warning: Docker command for $serviceName completed with exit code $LASTEXITCODE" -ForegroundColor Yellow
            $overallSuccess = $false
        }
    } catch {
        Write-Host "Error running Docker command for $serviceName: $_" -ForegroundColor Red
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
    # Note: We leave the script template as it might be useful
}

# --- Final Summary ---
if (-not $overallSuccess) {
     Write-Host "Warning: One or more services failed during wheel download." -ForegroundColor Yellow
}

$finalWheelCount = (Get-ChildItem -Path $baseWheelDir -Recurse -Filter "*.whl" | Measure-Object).Count
Write-Host "Python wheel package download process complete. ($finalWheelCount total packages found in subdirectories)" -ForegroundColor Green 