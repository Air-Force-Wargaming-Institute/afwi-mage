# Script to download NLTK data for offline use
# Run this on a machine with internet access

# Create directories if they don't exist
if (-not (Test-Path -Path "offline_packages/nltk_data")) {
    New-Item -Path "offline_packages/nltk_data" -ItemType Directory -Force
}

Write-Host "Starting to download NLTK data..." -ForegroundColor Green

# Check if NLTK data already exists
$nltkDataExists = Test-Path -Path "offline_packages/nltk_data/tokenizers/punkt" -PathType Container
$taggerExists = Test-Path -Path "offline_packages/nltk_data/taggers/averaged_perceptron_tagger" -PathType Container

if ($nltkDataExists -and $taggerExists) {
    Write-Host "NLTK data already exists in offline_packages/nltk_data/" -ForegroundColor Yellow
    $skipDownload = Read-Host "Do you want to skip downloading and use existing data? (y/n)"
    if ($skipDownload.ToLower() -eq 'y') {
        Write-Host "Using existing NLTK data." -ForegroundColor Green
        exit 0
    }
    Write-Host "Continuing with download. Existing data will be overwritten." -ForegroundColor Cyan
}

# Use Docker to download NLTK data
try {
    Write-Host "Downloading NLTK data using Docker..." -ForegroundColor Cyan
    docker run --rm -v "${PWD}/offline_packages/nltk_data:/nltk_data" python:3.11-slim bash -c "
        set -e
        echo 'Installing NLTK...'
        pip install --upgrade pip nltk
        echo 'Downloading NLTK data packages...'
        python -m nltk.downloader -d /nltk_data punkt averaged_perceptron_tagger
        echo 'NLTK data download complete.'
    "
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Docker command completed with exit code $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host "NLTK data may not have been downloaded correctly." -ForegroundColor Yellow
    } else {
        Write-Host "NLTK data has been successfully downloaded to offline_packages/nltk_data/" -ForegroundColor Green
    }
} catch {
    Write-Host "Error running Docker command: $_" -ForegroundColor Red
}

# Verify the download
$nltkDataExists = Test-Path -Path "offline_packages/nltk_data/tokenizers/punkt" -PathType Container
$taggerExists = Test-Path -Path "offline_packages/nltk_data/taggers/averaged_perceptron_tagger" -PathType Container

if ($nltkDataExists -and $taggerExists) {
    Write-Host "NLTK data has been downloaded to offline_packages/nltk_data/" -ForegroundColor Green
} else {
    Write-Host "Warning: NLTK data verification failed. Some components may be missing." -ForegroundColor Red
    if (-not $nltkDataExists) {
        Write-Host "Missing: punkt tokenizer data" -ForegroundColor Red
    }
    if (-not $taggerExists) {
        Write-Host "Missing: averaged_perceptron_tagger data" -ForegroundColor Red
    }
} 