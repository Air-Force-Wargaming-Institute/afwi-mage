# Master script to prepare for offline build
# Run this on a machine with internet access

Write-Host "Starting preparation for offline build..." -ForegroundColor Green

# Fix line endings in all scripts to prevent bash errors
Write-Host "Normalizing line endings in PowerShell scripts..." -ForegroundColor Cyan
Get-ChildItem -Path "*.ps1" | ForEach-Object {
    $content = Get-Content $_ -Raw
    if ($content -match "`r`n") {
        Write-Host "  Fixing line endings in $_..." -ForegroundColor Gray
        $content = $content.Replace("`r`n", "`n")
        Set-Content -Path $_ -Value $content -NoNewline
    }
}

# Create directory structure only if they don't exist
$dirs = @(
    "offline_packages",
    "offline_packages/images",
    "offline_packages/backend_wheels",
    "offline_packages/backend_debs",
    "offline_packages/nltk_data"
)

Write-Host "Creating directory structure..." -ForegroundColor Cyan
foreach ($dir in $dirs) {
    if (-not (Test-Path -Path $dir)) {
        Write-Host "  Creating directory $dir..." -ForegroundColor Gray
        New-Item -Path $dir -ItemType Directory -Force | Out-Null
    } else {
        Write-Host "  Directory $dir already exists" -ForegroundColor Gray
    }
}

# Run each preparation script with error handling
$scripts = @(
    "download_offline_images.ps1",
    "download_python_wheels.ps1",
    "download_nltk_data.ps1",
    "prepare_frontend_modules.ps1",
    "download_llm_model.ps1"
)

foreach ($script in $scripts) {
    if (Test-Path -Path ".\$script") {
        Write-Host "Running $script..." -ForegroundColor Cyan
        try {
            & ".\$script"
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Warning: $script completed with exit code $LASTEXITCODE" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Error running $script: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "Script $script not found!" -ForegroundColor Red
    }
}

Write-Host "Offline build preparation complete. All artifacts are in the offline_packages directory." -ForegroundColor Green
Write-Host "To use in an airgapped environment:" -ForegroundColor Green
Write-Host "1. Copy the entire project source code" -ForegroundColor Green
Write-Host "2. Copy the offline_packages directory" -ForegroundColor Green
Write-Host "3. Run the modified Docker builds using the offline artifacts" -ForegroundColor Green 