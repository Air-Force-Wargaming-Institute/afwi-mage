# Script to download LLM model for offline use
# Run this on a machine with internet access

# Ensure git-lfs is installed
Write-Host "Checking git-lfs installation..." -ForegroundColor Cyan
try {
    git lfs install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: git-lfs installation failed. Please install git-lfs manually." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Please ensure git-lfs is installed on your system." -ForegroundColor Red
    exit 1
}

# Read Config.env to determine which model to download
$configPath = "backend/Config.env"
$vllmModelFolder = ""

if (Test-Path $configPath) {
    $configContent = Get-Content $configPath
    foreach ($line in $configContent) {
        if ($line -match "VLLM_Model_Folder=(.+)") {
            $vllmModelFolder = $matches[1]
            break
        }
    }
}

if ([string]::IsNullOrEmpty($vllmModelFolder)) {
    # Default model if not found in Config.env
    $vllmModelFolder = "DeepHermes-3-Llama-3-8B-Preview-abliterated"
    Write-Host "VLLM_Model_Folder not found in Config.env, using default: $vllmModelFolder" -ForegroundColor Yellow
} else {
    Write-Host "Found model folder in Config.env: $vllmModelFolder" -ForegroundColor Green
}

# Check if model directory already exists and contains model files
$modelDir = "backend/vLLM/models/$vllmModelFolder"
if (Test-Path -Path $modelDir) {
    # Check if model files exist
    $modelFiles = Get-ChildItem -Path $modelDir -Filter "*.safetensors" -Recurse
    
    if ($modelFiles.Count -gt 0) {
        Write-Host "Model files already exist in $modelDir" -ForegroundColor Yellow
        Write-Host "Found $($modelFiles.Count) safetensors files." -ForegroundColor Cyan
        
        $skipDownload = Read-Host "Do you want to skip downloading and use existing model? (y/n)"
        if ($skipDownload.ToLower() -eq 'y') {
            Write-Host "Using existing model." -ForegroundColor Green
            exit 0
        }
        
        Write-Host "Continuing with download. Existing model directory will be backed up." -ForegroundColor Cyan
        
        # Create backup of existing model directory
        $backupDir = "${modelDir}_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Write-Host "Creating backup of model directory at $backupDir" -ForegroundColor Cyan
        
        try {
            Move-Item -Path $modelDir -Destination $backupDir -Force
            Write-Host "Backup created successfully." -ForegroundColor Green
        } catch {
            Write-Host "Error creating backup: $_" -ForegroundColor Red
            $forceOverwrite = Read-Host "Do you want to overwrite the existing model without backup? (y/n)"
            if ($forceOverwrite.ToLower() -eq 'y') {
                Write-Host "Removing existing model directory..." -ForegroundColor Cyan
                Remove-Item -Path $modelDir -Recurse -Force
            } else {
                Write-Host "Download aborted." -ForegroundColor Red
                exit 1
            }
        }
    }
}

# Create model directory if it doesn't exist
if (-not (Test-Path -Path $modelDir)) {
    Write-Host "Creating model directory: $modelDir" -ForegroundColor Cyan
    New-Item -Path $modelDir -ItemType Directory -Force | Out-Null
}

# Clone the model repository
Write-Host "Cloning model repository: $vllmModelFolder..." -ForegroundColor Cyan
try {
    git clone "https://huggingface.co/huihui-ai/$vllmModelFolder" $modelDir
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Git clone command completed with exit code $LASTEXITCODE" -ForegroundColor Red
        Write-Host "Model download may have failed or been incomplete." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error cloning model repository: $_" -ForegroundColor Red
    exit 1
}

# Verify model download
$modelFiles = Get-ChildItem -Path $modelDir -Filter "*.safetensors" -Recurse

if ($modelFiles.Count -eq 0) {
    Write-Host "Error: No model files found after download. Model download may have failed." -ForegroundColor Red
    exit 1
} else {
    Write-Host "LLM model has been downloaded to $modelDir" -ForegroundColor Green
    Write-Host "Found $($modelFiles.Count) safetensors files." -ForegroundColor Green
} 