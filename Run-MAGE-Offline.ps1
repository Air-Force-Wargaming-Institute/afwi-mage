# Run-MAGE-Offline.ps1 - Script to build and run MAGE in an offline environment

# --- Read Model Name from Config ---
$configPath = Join-Path $PSScriptRoot "backend/Config.env"
if (-not (Test-Path $configPath)) {
    Write-Error "Config file not found: $configPath"
    exit 1
}
$configContent = Get-Content $configPath
$modelLine = $configContent | Where-Object { $_ -like 'VLLM_Model_Folder=*' } | Select-Object -First 1
if (-not $modelLine) {
    Write-Error "VLLM_Model_Folder not found in $configPath"
    exit 1
}
$expectedModelSubfolder = ($modelLine -split '=', 2)[1].Trim()
Write-Host "Using model folder from config: $expectedModelSubfolder"

# --- Model Existence Check ---
$modelDir = "./backend/vLLM/models"
$relativeModelPath = Join-Path $modelDir $expectedModelSubfolder # Join relative parts first
$modelPath = Join-Path $PSScriptRoot $relativeModelPath      # Then join with the script root

Write-Host "Checking for model directory: $modelPath"
if (-not (Test-Path $modelPath -PathType Container)) {
    Write-Error "Model directory not found: $modelPath. Please ensure the model is downloaded and placed correctly."
    exit 1
}

Write-Host "Checking for .safetensors files in $modelPath"
$tensorFiles = Get-ChildItem -Path $modelPath -Filter *.safetensors

if ($tensorFiles.Count -eq 0) {
    # Optional: Add check for .bin files here if needed
    Write-Error "No .safetensors files found in $modelPath. Model files might be missing."
    exit 1
}

# --- Generate vLLM Dockerfile from Offline Template ---
$vllmTemplatePath = Join-Path $PSScriptRoot "backend/vLLM/Dockerfile.template.offline"
$vllmDockerfilePath = Join-Path $PSScriptRoot "backend/vLLM/Dockerfile"

Write-Host "Generating $vllmDockerfilePath from $vllmTemplatePath using model '$expectedModelSubfolder'..."

if (-not (Test-Path $vllmTemplatePath)) {
    Write-Error "vLLM offline Dockerfile template not found: $vllmTemplatePath"
    exit 1
}

$templateContent = Get-Content $vllmTemplatePath -Raw
$dockerfileContent = $templateContent -replace '__MODEL_SUBFOLDER__', $expectedModelSubfolder
Set-Content -Path $vllmDockerfilePath -Value $dockerfileContent -Encoding UTF8 -NoNewline

Write-Host "Successfully generated $vllmDockerfilePath"
# --- End Dockerfile Generation ---

# --- Offline Setup Steps ---
Write-Host "Checking for offline packages..." -ForegroundColor Cyan
if (-not (Test-Path -Path "offline_packages")) {
    Write-Error "offline_packages directory not found. Please ensure it was transferred to this machine."
    exit 1
}

# --- Loading Docker Images ---
Write-Host "Loading Docker images..." -ForegroundColor Cyan
& .\load_offline_images.ps1

# --- Unpacking Frontend Node Modules ---
Write-Host "Unpacking frontend node modules..." -ForegroundColor Cyan
& .\unpack_frontend_modules.ps1

# --- Modifying Backend Dockerfiles ---
Write-Host "Modifying backend Dockerfiles for offline use..." -ForegroundColor Cyan
& .\modify_backend_dockerfiles.ps1

# --- Build Custom Base Images ---
Write-Host "Using pre-built offline base images" -ForegroundColor Cyan

# --- Change to Backend Directory and Build Services ---
Write-Host "Building backend services..." -ForegroundColor Cyan
cd ./backend/

# Rename frontend Dockerfile to use offline version
$frontendDockerfilePath = Join-Path $PSScriptRoot "frontend/Dockerfile"
$frontendDockerfileBackupPath = Join-Path $PSScriptRoot "frontend/Dockerfile.original"
$frontendDockerfileOfflinePath = Join-Path $PSScriptRoot "frontend/Dockerfile.offline"

if (Test-Path $frontendDockerfileOfflinePath) {
    if (-not (Test-Path $frontendDockerfileBackupPath)) {
        Copy-Item -Path $frontendDockerfilePath -Destination $frontendDockerfileBackupPath
    }
    Copy-Item -Path $frontendDockerfileOfflinePath -Destination $frontendDockerfilePath
    Write-Host "Frontend Dockerfile replaced with offline version" -ForegroundColor Cyan
}

# Build and start the services
docker compose build
docker compose up -d

cd ..
Write-Host "Build script finished successfully." -ForegroundColor Green
Write-Host "MAGE is now running in offline mode." -ForegroundColor Green 