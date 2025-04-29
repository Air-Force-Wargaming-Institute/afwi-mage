# Script to download LLM model for offline use
# Run this on a machine with internet access

# Ensure git-lfs is installed
Write-Host "Checking git-lfs installation..." -ForegroundColor Cyan
git lfs install

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

# Create directory for the model
$modelDir = "backend/vLLM/models/$vllmModelFolder"
if (-not (Test-Path -Path $modelDir)) {
    New-Item -Path $modelDir -ItemType Directory -Force
}

# Clone the model repository
Write-Host "Cloning model repository: $vllmModelFolder..." -ForegroundColor Cyan
git clone "https://huggingface.co/huihui-ai/$vllmModelFolder" $modelDir

Write-Host "LLM model has been downloaded to $modelDir" -ForegroundColor Green 