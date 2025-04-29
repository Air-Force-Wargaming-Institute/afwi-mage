# Script to download NLTK data for offline use
# Run this on a machine with internet access

# Create directories if they don't exist
if (-not (Test-Path -Path "offline_packages/nltk_data")) {
    New-Item -Path "offline_packages/nltk_data" -ItemType Directory -Force
}

Write-Host "Starting to download NLTK data..." -ForegroundColor Green

# Use Docker to download NLTK data
docker run --rm -v "${PWD}/offline_packages/nltk_data:/nltk_data" python:3.11-slim bash -c "
    pip install --upgrade pip nltk &&
    python -m nltk.downloader -d /nltk_data punkt averaged_perceptron_tagger &&
    echo 'NLTK data download complete.'
"

Write-Host "NLTK data has been downloaded to offline_packages/nltk_data/" -ForegroundColor Green 