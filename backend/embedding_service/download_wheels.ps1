# PowerShell script to download Linux-compatible Python wheels for airgapped installation
# This script uses Docker to ensure wheels are compatible with Linux environments

Write-Host "Downloading Linux-compatible wheels for airgapped installation..." -ForegroundColor Cyan

# Check if Docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Docker is required but not found in PATH." -ForegroundColor Red
    Write-Host "Please install Docker before proceeding."
    exit 1
}

# Create wheels directory if it doesn't exist
$wheelsDir = "wheels"
$wheelsDirAbsolute = (Get-Item -Path "." -Verbose).FullName + "\$wheelsDir"
if (-not (Test-Path $wheelsDir)) {
    New-Item -ItemType Directory -Path $wheelsDir | Out-Null
    Write-Host "Created wheels directory: $wheelsDir" -ForegroundColor Yellow
}

# Create a modified requirements file that excludes problematic packages
$originalRequirements = Get-Content -Path "requirements.txt" -Raw
$modifiedRequirements = $originalRequirements -replace "unstructured-inference==0.6.6", "# unstructured-inference==0.6.6 (handled separately)"
$modifiedRequirementsPath = Join-Path -Path (Get-Location) -ChildPath "requirements_temp.txt"
Set-Content -Path $modifiedRequirementsPath -Value $modifiedRequirements

try {
    # Use Docker to download Linux-compatible wheels
    Write-Host "Running Docker to download Linux-compatible wheels..." -ForegroundColor Yellow

    # Normalize path for Docker volume mounting on Windows
    $normalizedWheelsPath = $wheelsDirAbsolute.Replace("\", "/").Replace("C:", "/c")
    $normalizedRequirementsPath = (Get-Item -Path $modifiedRequirementsPath -Verbose).FullName.Replace("\", "/").Replace("C:", "/c")

    # Use double quotes for the whole command and single quotes for paths with colons in PowerShell
    $dockerCmd = "docker run --rm -v '$normalizedWheelsPath`:/wheels' -v '$normalizedRequirementsPath`:/requirements.txt' python:3.12-slim bash -c 'pip download --dest /wheels --only-binary=:all: --platform manylinux2014_x86_64 --python-version 3.12 -r /requirements.txt'"

    Write-Host "Executing: $dockerCmd" -ForegroundColor DarkGray
    Invoke-Expression $dockerCmd

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error downloading wheels using Docker. Exit code: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    
    # Separately download unstructured-inference and its dependencies
    Write-Host "`nSeparately downloading unstructured-inference and onnx..." -ForegroundColor Cyan
    
    # Download unstructured-inference without specific onnx constraint
    $uiCmd = "docker run --rm -v '$normalizedWheelsPath`:/wheels' python:3.12-slim bash -c 'pip download --dest /wheels unstructured-inference==0.6.6 --no-deps'"
    Write-Host "Executing: $uiCmd" -ForegroundColor DarkGray
    Invoke-Expression $uiCmd
    
    # Download latest onnx version that's compatible
    $onnxCmd = "docker run --rm -v '$normalizedWheelsPath`:/wheels' python:3.12-slim bash -c 'pip download --dest /wheels onnx>=1.16.0'"
    Write-Host "Executing: $onnxCmd" -ForegroundColor DarkGray
    Invoke-Expression $onnxCmd
    
    # List the downloaded wheels
    $wheels = Get-ChildItem -Path $wheelsDir -Filter "*.whl"
    $sourcePackages = @(Get-ChildItem -Path $wheelsDir -Filter "*.tar.gz") + @(Get-ChildItem -Path $wheelsDir -Filter "*.zip")

    Write-Host "Downloaded $($wheels.Count) Linux-compatible wheel files to $wheelsDir" -ForegroundColor Green
    foreach ($wheel in $wheels) {
        Write-Host "  - $($wheel.Name)" -ForegroundColor White
    }
    
    if ($sourcePackages.Count -gt 0) {
        Write-Host "`nDownloaded $($sourcePackages.Count) source packages to $wheelsDir" -ForegroundColor Green
        foreach ($pkg in $sourcePackages) {
            Write-Host "  - $($pkg.Name)" -ForegroundColor White
        }
    }

    Write-Host ""
    Write-Host "To use these wheels in an airgapped environment:" -ForegroundColor Cyan
    Write-Host "1. Copy the entire embedding_service directory to the target machine" -ForegroundColor White
    Write-Host "2. Build the Docker image using: docker build -t embedding_service ." -ForegroundColor White
    Write-Host "3. Run the container using the appropriate Docker command" -ForegroundColor White

    # Create a package.zip file for easy transfer
    Write-Host ""
    Write-Host "Would you like to create a zip archive of the embedding_service for transfer? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq "Y" -or $response -eq "y") {
        Write-Host "Creating archive..." -ForegroundColor Yellow
        Compress-Archive -Path ./* -DestinationPath ./embedding_service_airgapped.zip -Force
        Write-Host "Created embedding_service_airgapped.zip" -ForegroundColor Green
        Write-Host "Transfer this file to your airgapped environment." -ForegroundColor Cyan
    }
}
finally {
    # Clean up the temporary requirements file
    if (Test-Path $modifiedRequirementsPath) {
        Remove-Item -Path $modifiedRequirementsPath -Force
    }
} 