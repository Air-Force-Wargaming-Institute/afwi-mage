# Script to modify the Dockerfiles for each backend service to use the offline template
# Run this on the airgapped machine

Write-Host "Starting to modify backend Dockerfiles for offline use..." -ForegroundColor Green

# Get all backend services (directories that contain a Dockerfile)
$services = Get-ChildItem -Path "backend" -Directory | 
    Where-Object { 
        Test-Path -Path (Join-Path -Path $_.FullName -ChildPath "Dockerfile") -PathType Leaf 
    }

# Template path
$templatePath = "backend/Dockerfile.service.offline.template"
if (-not (Test-Path -Path $templatePath)) {
    Write-Host "Error: Template file $templatePath not found" -ForegroundColor Red
    exit 1
}

# Read the template content
$templateContent = Get-Content -Path $templatePath -Raw

# Process each service
foreach ($service in $services) {
    $serviceName = $service.Name
    $dockerfilePath = Join-Path -Path $service.FullName -ChildPath "Dockerfile"
    $dockerfileBackupPath = Join-Path -Path $service.FullName -ChildPath "Dockerfile.original"
    
    Write-Host "Processing $serviceName..." -ForegroundColor Cyan
    
    # Backup original Dockerfile if backup doesn't already exist
    if (-not (Test-Path -Path $dockerfileBackupPath)) {
        Copy-Item -Path $dockerfilePath -Destination $dockerfileBackupPath
        Write-Host "  Original Dockerfile backed up to $dockerfileBackupPath" -ForegroundColor Gray
    }
    
    # Modify the template content based on the service
    $serviceContent = $templateContent
    
    # Customize for specific services
    switch ($serviceName) {
        "core_service" {
            $serviceContent = $serviceContent -replace "# For core_service, uncomment:", "# Installing package in development mode"
            $serviceContent = $serviceContent -replace "# RUN pip install --no-index --find-links=/app/wheels -e \.", "RUN pip install --no-index --find-links=/app/wheels -e ."
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8000"
        }
        "extraction_service" {
            $serviceContent = $serviceContent -replace "# For extraction_service, uncomment and adjust:", "# Installing extraction-specific dependencies"
            $serviceContent = $serviceContent -replace "# RUN pip install --no-index --find-links=/app/wheels unstructured==0.10.16 unstructured-inference==0.6.6 --no-deps", "RUN pip install --no-index --find-links=/app/wheels unstructured==0.10.16 unstructured-inference==0.6.6 --no-deps"
            $serviceContent = $serviceContent -replace "# RUN pip install --no-index --find-links=/app/wheels \"pytesseract>=0.3\" \"layoutparser\[tesseract\]>=0.3\" --no-deps", "RUN pip install --no-index --find-links=/app/wheels \"pytesseract>=0.3\" \"layoutparser[tesseract]>=0.3\" --no-deps"
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8002"
            $serviceContent = $serviceContent -replace "CMD \[\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"\]", "CMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8002\"]"
        }
        "embedding_service" {
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8006"
            $serviceContent = $serviceContent -replace "CMD \[\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"\]", "CMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8006\"]"
        }
        "agent_service" {
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8001"
            $serviceContent = $serviceContent -replace "CMD \[\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"\]", "CMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8001\"]"
        }
        "generation_service" {
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8003"
            $serviceContent = $serviceContent -replace "CMD \[\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"\]", "CMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8003\"]"
        }
        "review_service" {
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8004"
            $serviceContent = $serviceContent -replace "CMD \[\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"\]", "CMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8004\"]"
        }
        "upload_service" {
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8005"
            $serviceContent = $serviceContent -replace "CMD \[\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"\]", "CMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8005\"]"
        }
        "chat_service" {
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8009"
            $serviceContent = $serviceContent -replace "CMD \[\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"\]", "CMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8009\"]"
        }
        "direct_chat_service" {
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8011"
            $serviceContent = $serviceContent -replace "CMD \[\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"\]", "CMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8011\"]"
        }
        "workbench_service" {
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8020"
            $serviceContent = $serviceContent -replace "CMD \[\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"\]", "CMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8020\"]"
        }
        default {
            # No specific customizations for other services
        }
    }
    
    # Write the modified template to the service's Dockerfile
    $serviceContent | Set-Content -Path $dockerfilePath
    Write-Host "  Dockerfile updated for offline use" -ForegroundColor Gray
}

Write-Host "Backend Dockerfiles have been modified for offline use" -ForegroundColor Green
Write-Host "Original Dockerfiles have been backed up with .original extension" -ForegroundColor Green 