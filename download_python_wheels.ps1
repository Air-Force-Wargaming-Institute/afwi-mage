# Script to download Python wheel packages for offline use
# Run this on a machine with internet access

# Create directories if they don't exist
if (-not (Test-Path -Path "offline_packages/backend_wheels")) {
    New-Item -Path "offline_packages/backend_wheels" -ItemType Directory -Force
}

Write-Host "Starting to download Python wheel packages..." -ForegroundColor Green

# Check if wheels have already been downloaded
$wheelCount = (Get-ChildItem -Path "offline_packages/backend_wheels" -Filter "*.whl" | Measure-Object).Count
if ($wheelCount -gt 0) {
    Write-Host "Found $wheelCount wheel packages already downloaded." -ForegroundColor Cyan
    $skipDownload = Read-Host "Do you want to skip downloading and use existing packages? (y/n)"
    if ($skipDownload.ToLower() -eq 'y') {
        Write-Host "Using existing wheel packages." -ForegroundColor Green
        exit 0
    }
    Write-Host "Continuing with download. Existing packages will be kept." -ForegroundColor Cyan
}

# Get the absolute path to the current directory
$currentPath = (Get-Location).Path

# Create a temporary requirements file with all service requirements combined
$tempRequirementsFile = Join-Path $env:TEMP "combined_requirements.txt"
$serviceNames = @(
    "core_service",
    "chat_service",
    "auth_service",
    "agent_service",
    "upload_service",
    "wargame_service",
    "embedding_service",
    "workbench_service",
    "extraction_service",
    "generation_service",
    "direct_chat_service",
    "review_service"
)

# Create empty file
"# Combined requirements for all services" | Set-Content $tempRequirementsFile

foreach ($service in $serviceNames) {
    $requirementsPath = Join-Path $currentPath "backend/$service/requirements.txt"
    if (Test-Path $requirementsPath) {
        Write-Host "Adding requirements from $service..." -ForegroundColor Cyan
        Get-Content $requirementsPath | Add-Content $tempRequirementsFile
        # Add a separator for readability
        "`n# End of $service requirements`n" | Add-Content $tempRequirementsFile
    } else {
        Write-Host "Warning: Requirements file for $service not found at $requirementsPath" -ForegroundColor Yellow
    }
}

# Add pytesseract/layoutparser
"# Additional dependencies" | Add-Content $tempRequirementsFile
"pytesseract>=0.3" | Add-Content $tempRequirementsFile
"layoutparser[tesseract]>=0.3" | Add-Content $tempRequirementsFile

# Using Docker to ensure Linux compatibility
Write-Host "Running pip download in Docker container..." -ForegroundColor Cyan

# Copy the combined requirements to a location accessible by Docker
$dockerRequirementsPath = Join-Path $currentPath "offline_packages/combined_requirements.txt"
Copy-Item -Path $tempRequirementsFile -Destination $dockerRequirementsPath -Force

try {
    # Use Docker to download Python packages
    docker run --rm `
        -v "${currentPath}/offline_packages/backend_wheels:/wheels" `
        -v "${dockerRequirementsPath}:/requirements.txt" `
        python:3.11-slim bash -c "
            set -e
            echo 'Upgrading pip and wheel...'
            pip install --upgrade pip wheel
            echo 'Downloading packages...'
            pip download --dest /wheels -r /requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: || echo 'Some packages could not be downloaded as wheels, trying without binary restriction...'
            pip download --dest /wheels -r /requirements.txt --platform manylinux2014_x86_64 --python-version 311 || echo 'Some packages could not be downloaded.'
            echo 'Backend wheel downloads complete.'
        "

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Docker command completed with exit code $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host "Some packages may not have been downloaded correctly." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error running Docker command: $_" -ForegroundColor Red
} finally {
    # Clean up temporary files
    if (Test-Path $tempRequirementsFile) {
        Remove-Item -Path $tempRequirementsFile -Force
    }
    if (Test-Path $dockerRequirementsPath) {
        Remove-Item -Path $dockerRequirementsPath -Force
    }
}

$finalWheelCount = (Get-ChildItem -Path "offline_packages/backend_wheels" -Filter "*.whl" | Measure-Object).Count
Write-Host "Python wheel packages have been downloaded to offline_packages/backend_wheels/ ($finalWheelCount packages)" -ForegroundColor Green 