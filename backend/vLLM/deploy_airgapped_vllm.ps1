# Check if model is available
./check_vllm_model.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Cannot start vLLM in airgapped mode due to missing model files." -ForegroundColor Red
    exit 1
}

# Ensure Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "Docker is not running or not properly configured." -ForegroundColor Red
    exit 1
}

# Start vLLM service using the dedicated compose file
Write-Host "Starting vLLM service in airgapped mode..." -ForegroundColor Cyan
docker-compose -f docker-compose.vllm.yml up -d

# Wait for service to start
Write-Host "Waiting for vLLM service to start (this may take a few minutes for model loading)..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# Check if service is up
$maxRetries = 10
$retryCount = 0
$serviceUp = $false

while (-not $serviceUp -and $retryCount -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8007/health" -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            $serviceUp = $true
            Write-Host "vLLM service is up and running in airgapped mode!" -ForegroundColor Green
        }
    } catch {
        $retryCount++
        Write-Host "Waiting for service to become available (attempt $retryCount of $maxRetries)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    }
}

if (-not $serviceUp) {
    Write-Host "vLLM service did not start properly. Check the logs with: docker-compose -f docker-compose.vllm.yml logs" -ForegroundColor Red
    exit 1
}

Write-Host "vLLM OpenAI-compatible API is available at: http://localhost:8007/v1/completions" -ForegroundColor Green
Write-Host "API documentation is available at: http://localhost:8007/docs" -ForegroundColor Green
exit 0 