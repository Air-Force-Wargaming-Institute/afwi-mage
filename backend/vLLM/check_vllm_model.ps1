$MODEL_DIR = "../../models/DeepSeek-R1-Distill-Qwen-14B-abliterated-v2"

if (-not (Test-Path -Path $MODEL_DIR -PathType Container)) {
    Write-Host "ERROR: Model directory $MODEL_DIR does not exist." -ForegroundColor Red
    Write-Host "Please download the model files before starting vLLM in airgapped mode." -ForegroundColor Red
    Write-Host "Run the following commands when internet access is available:" -ForegroundColor Yellow
    Write-Host "  mkdir -p $MODEL_DIR" -ForegroundColor Yellow
    Write-Host "  git lfs install" -ForegroundColor Yellow
    Write-Host "  git clone https://huggingface.co/DeepSeek-R1-Distill-Qwen-14B-abliterated-v2 $MODEL_DIR" -ForegroundColor Yellow
    exit 1
}

# Check for essential model files
$configFile = Join-Path -Path $MODEL_DIR -ChildPath "config.json"
$modelFile = Join-Path -Path $MODEL_DIR -ChildPath "model.safetensors"

if (-not ((Test-Path -Path $configFile -PathType Leaf) -and (Test-Path -Path $modelFile -PathType Leaf))) {
    Write-Host "ERROR: Essential model files are missing in $MODEL_DIR." -ForegroundColor Red
    Write-Host "The directory exists but may not contain a complete model." -ForegroundColor Red
    exit 1
}

Write-Host "Model files found. vLLM can be started in airgapped mode." -ForegroundColor Green
exit 0 