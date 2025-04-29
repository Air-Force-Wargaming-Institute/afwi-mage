# Script to download Python wheel packages for offline use
# Run this on a machine with internet access

# Create directories if they don't exist
if (-not (Test-Path -Path "offline_packages/backend_wheels")) {
    New-Item -Path "offline_packages/backend_wheels" -ItemType Directory -Force
}

Write-Host "Starting to download Python wheel packages..." -ForegroundColor Green

# Using Docker to ensure Linux compatibility
Write-Host "Running pip download in Docker container..." -ForegroundColor Cyan

# Get the absolute path to the current directory
$currentPath = (Get-Location).Path

# Use Docker to download Python packages
docker run --rm -v "${currentPath}/offline_packages/backend_wheels:/wheels" -v "${currentPath}/backend:/backend" python:3.11-slim bash -c "
    pip install --upgrade pip wheel &&
    pip download --dest /wheels -r /backend/core_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: &&
    pip download --dest /wheels -r /backend/chat_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: &&
    pip download --dest /wheels -r /backend/auth_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: &&
    pip download --dest /wheels -r /backend/agent_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: &&
    pip download --dest /wheels -r /backend/upload_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: &&
    pip download --dest /wheels -r /backend/wargame_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: &&
    pip download --dest /wheels -r /backend/embedding_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: &&
    pip download --dest /wheels -r /backend/workbench_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: &&
    pip download --dest /wheels -r /backend/extraction_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: &&
    pip download --dest /wheels -r /backend/generation_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: &&
    pip download --dest /wheels -r /backend/direct_chat_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: &&
    pip download --dest /wheels -r /backend/review_service/requirements.txt --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: &&
    # Add direct installs
    pip download --dest /wheels unstructured==0.10.16 unstructured-inference==0.6.6 llama-cpp-python==0.2.11 --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: &&
    # Add pytesseract/layoutparser if used
    pip download --dest /wheels 'pytesseract>=0.3' 'layoutparser[tesseract]>=0.3' --platform manylinux2014_x86_64 --python-version 311 --only-binary=:all: &&
    echo 'Backend wheel downloads complete.'
"

Write-Host "Python wheel packages have been downloaded to offline_packages/backend_wheels/" -ForegroundColor Green 