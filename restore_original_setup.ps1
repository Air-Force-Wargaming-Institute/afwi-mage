# Script to restore the original setup after using offline mode

Write-Host "Starting to restore original setup..." -ForegroundColor Green

# Restore backend service Dockerfiles
Write-Host "Restoring backend service Dockerfiles..." -ForegroundColor Cyan
Get-ChildItem -Path "backend" -Directory | ForEach-Object {
    $serviceName = $_.Name
    $dockerfilePath = Join-Path -Path $_.FullName -ChildPath "Dockerfile"
    $dockerfileBackupPath = Join-Path -Path $_.FullName -ChildPath "Dockerfile.original"
    
    if (Test-Path $dockerfileBackupPath) {
        Write-Host "  Restoring original Dockerfile for $serviceName" -ForegroundColor Gray
        Copy-Item -Path $dockerfileBackupPath -Destination $dockerfilePath -Force
    }
}

# Restore frontend Dockerfile
$frontendDockerfilePath = "frontend/Dockerfile"
$frontendDockerfileBackupPath = "frontend/Dockerfile.original"
if (Test-Path $frontendDockerfileBackupPath) {
    Write-Host "Restoring frontend Dockerfile..." -ForegroundColor Cyan
    Copy-Item -Path $frontendDockerfileBackupPath -Destination $frontendDockerfilePath -Force
}

# Restore vLLM Dockerfile
$vllmDockerfilePath = "backend/vLLM/Dockerfile"
if (Test-Path "backend/vLLM/Dockerfile.template") {
    Write-Host "Regenerating vLLM Dockerfile from original template..." -ForegroundColor Cyan
    
    # Read model name from Config.env
    $configPath = "backend/Config.env"
    $modelSubfolder = ""
    if (Test-Path $configPath) {
        $configContent = Get-Content $configPath
        $modelLine = $configContent | Where-Object { $_ -like 'VLLM_Model_Folder=*' } | Select-Object -First 1
        if ($modelLine) {
            $modelSubfolder = ($modelLine -split '=', 2)[1].Trim()
        }
    }
    
    if ($modelSubfolder -ne "") {
        $templateContent = Get-Content "backend/vLLM/Dockerfile.template" -Raw
        $dockerfileContent = $templateContent -replace '__MODEL_SUBFOLDER__', $modelSubfolder
        Set-Content -Path $vllmDockerfilePath -Value $dockerfileContent -Encoding UTF8 -NoNewline
        Write-Host "  vLLM Dockerfile regenerated using original template" -ForegroundColor Gray
    } else {
        Write-Host "  Could not determine model subfolder, vLLM Dockerfile not regenerated" -ForegroundColor Yellow
    }
}

Write-Host "Original setup has been restored" -ForegroundColor Green
Write-Host "You can now run 'docker compose build' and 'docker compose up -d' to rebuild with the original configuration." -ForegroundColor Green 