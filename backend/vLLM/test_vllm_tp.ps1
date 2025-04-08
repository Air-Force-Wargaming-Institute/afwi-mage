#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Tests vLLM tensor parallelism configuration across multiple GPUs
.DESCRIPTION
    This script verifies that vLLM is properly using tensor parallelism across
    multiple GPUs by checking GPU utilization and logs.
#>

# Define colors for better readability
$ErrorColor = "Red"
$SuccessColor = "Green"
$InfoColor = "Cyan"
$WarningColor = "Yellow"

# Check if vLLM is running
Write-Host "Checking if vLLM service is running..." -ForegroundColor $InfoColor
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:8007/health" -TimeoutSec 5
    Write-Host "✅ vLLM service is running" -ForegroundColor $SuccessColor
} catch {
    Write-Host "❌ vLLM service is not running or not responding" -ForegroundColor $ErrorColor
    Write-Host "Please start the service with: .\deploy_airgapped_vllm.ps1" -ForegroundColor $WarningColor
    exit 1
}

# Check for tensor parallelism in logs
Write-Host "`nChecking vLLM logs for tensor parallelism configuration..." -ForegroundColor $InfoColor
$logs = docker-compose -f docker-compose.vllm.yml logs --tail 100
$tpLogs = $logs | Select-String "tensor_parallel_size"

if ($tpLogs) {
    Write-Host "✅ Tensor parallelism configuration found in logs" -ForegroundColor $SuccessColor
    Write-Host $tpLogs -ForegroundColor $InfoColor
} else {
    Write-Host "⚠️ Tensor parallelism configuration not explicitly found in recent logs" -ForegroundColor $WarningColor
    Write-Host "This doesn't necessarily mean it's not working, just that it's not in the recent log entries" -ForegroundColor $InfoColor
}

# Check GPU utilization
Write-Host "`nChecking GPU utilization..." -ForegroundColor $InfoColor
$nvidiaCommand = "docker exec $(docker ps -q --filter ancestor=vllm/vllm-openai:latest) nvidia-smi"

try {
    Invoke-Expression $nvidiaCommand | Out-Host
    Write-Host "`n✅ GPU information displayed above" -ForegroundColor $SuccessColor
} catch {
    Write-Host "❌ Failed to check GPU utilization" -ForegroundColor $ErrorColor
    Write-Host "Error: $_" -ForegroundColor $ErrorColor
}

# Send a test request to load the model on all GPUs
Write-Host "`nSending a test request to verify model loading across GPUs..." -ForegroundColor $InfoColor
$body = @{
    model = "/models/DeepSeek-R1-Distill-Qwen-14B-abliterated-v2"
    prompt = "Write a short story about a robot"
    max_tokens = 100
    temperature = 0.7
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8007/v1/completions" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 30
    Write-Host "✅ Successfully received response from vLLM" -ForegroundColor $SuccessColor
    
    # Check GPU utilization after request
    Write-Host "`nChecking GPU utilization after request..." -ForegroundColor $InfoColor
    Start-Sleep -Seconds 2 # Give a moment for GPU utilization to reflect
    Invoke-Expression $nvidiaCommand | Out-Host
    
    # Display response
    Write-Host "`nModel response:" -ForegroundColor $InfoColor
    Write-Host $response.choices[0].text -ForegroundColor $SuccessColor
} catch {
    Write-Host "❌ Failed to get response from vLLM" -ForegroundColor $ErrorColor
    Write-Host "Error: $_" -ForegroundColor $ErrorColor
}

# Verify tensor parallelism config in container
Write-Host "`nChecking tensor parallelism configuration in container..." -ForegroundColor $InfoColor
$configCheck = "docker exec $(docker ps -q --filter ancestor=vllm/vllm-openai:latest) env | grep TENSOR"

try {
    $tpConfig = Invoke-Expression $configCheck
    if ($tpConfig) {
        Write-Host "✅ Tensor parallelism environment variables found:" -ForegroundColor $SuccessColor
        Write-Host $tpConfig -ForegroundColor $InfoColor
    } else {
        Write-Host "⚠️ No tensor parallelism environment variables found" -ForegroundColor $WarningColor
        Write-Host "Checking command line arguments instead..." -ForegroundColor $InfoColor
        
        $cmdCheck = "docker inspect $(docker ps -q --filter ancestor=vllm/vllm-openai:latest) --format='{{.Args}}'"
        $cmdArgs = Invoke-Expression $cmdCheck
        
        if ($cmdArgs -match "tensor-parallel") {
            Write-Host "✅ Tensor parallelism command line arguments found:" -ForegroundColor $SuccessColor
            Write-Host $cmdArgs -ForegroundColor $InfoColor
        } else {
            Write-Host "⚠️ No tensor parallelism configuration found in command line arguments" -ForegroundColor $WarningColor
        }
    }
} catch {
    Write-Host "❌ Failed to check tensor parallelism configuration" -ForegroundColor $ErrorColor
    Write-Host "Error: $_" -ForegroundColor $ErrorColor
}

Write-Host "`nTest completed. If both GPUs show utilization above and tensor parallelism configuration is found, your setup is working correctly." -ForegroundColor $InfoColor 