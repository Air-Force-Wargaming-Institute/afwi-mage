# Script to modify the Dockerfiles for each backend service to use the offline template
# Run this on the airgapped machine

Write-Host "Starting to modify backend Dockerfiles for offline use..." -ForegroundColor Green

# Define services to exclude from templating
$excludeServices = @("vLLM", "ollama")

# Get all backend services (directories that contain a Dockerfile)
$services = Get-ChildItem -Path "backend" -Directory | 
    Where-Object { 
        (Test-Path -Path (Join-Path -Path $_.FullName -ChildPath "Dockerfile") -PathType Leaf) -and `
        ($_.Name -notin $excludeServices) # Exclude specified services
    }

# Template path
$templatePath = "backend/Dockerfile.service.offline.template"
if (-not (Test-Path -Path $templatePath)) {
    Write-Host "Error: Template file $templatePath not found" -ForegroundColor Red
    exit 1
}

# Read the template content
$templateContent = Get-Content -Path $templatePath -Raw

Write-Host "Applying generic offline template to services (excluding: $($excludeServices -join ', '))..." -ForegroundColor Cyan

# Process each service
foreach ($service in $services) {
    $serviceName = $service.Name
    $dockerfilePath = Join-Path -Path $service.FullName -ChildPath "Dockerfile"
    $dockerfileBackupPath = Join-Path -Path $service.FullName -ChildPath "Dockerfile.original"
    
    Write-Host "  Processing $serviceName..." -ForegroundColor Gray
    
    # Backup original Dockerfile if backup doesn't already exist
    if (-not (Test-Path -Path $dockerfileBackupPath)) {
        Copy-Item -Path $dockerfilePath -Destination $dockerfileBackupPath
        Write-Host "    Original Dockerfile backed up to $dockerfileBackupPath" -ForegroundColor DarkGray
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
            # Add the NLTK data copy step specifically for extraction
            $nltkCopyLine = "# Copy NLTK data (specific to extraction_service)\nCOPY --from=nltk_data_copier /nltk_data /app/nltk_data"
            $serviceContent = $serviceContent -replace "# Copy requirements and install using local wheels, then cleanup wheels", "$nltkCopyLine`n`n# Copy requirements and install using local wheels, then cleanup wheels"

            $serviceContent = $serviceContent -replace "# For extraction_service, uncomment and adjust:", "# Installing extraction-specific dependencies"
            $serviceContent = $serviceContent -replace "# RUN pip install --no-index --find-links=/app/wheels unstructured==0.10.16 unstructured-inference==0.6.6 --no-deps", "RUN pip install --no-index --find-links=/app/wheels unstructured==0.10.16 unstructured-inference==0.6.6 --no-deps"
            # Fix the escaping for square brackets in pip install command
            $tesseractLine = '# RUN pip install --no-index --find-links=/app/wheels "pytesseract>=0.3" "layoutparser[tesseract]>=0.3" --no-deps'
            $fixedTesseractLine = 'RUN pip install --no-index --find-links=/app/wheels "pytesseract>=0.3" "layoutparser[tesseract]>=0.3" --no-deps'
            $serviceContent = $serviceContent -replace [regex]::Escape($tesseractLine), $fixedTesseractLine
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8002"
            # Fix the escaping for CMD directive
            $oldCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]'
            $newCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]'
            $serviceContent = $serviceContent -replace [regex]::Escape($oldCmd), $newCmd
        }
        "embedding_service" {
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8006"
            # Fix the escaping for CMD directive 
            $oldCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]'
            $newCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8006"]'
            $serviceContent = $serviceContent -replace [regex]::Escape($oldCmd), $newCmd
            # Also update to use mage-gpu-offline
            $serviceContent = $serviceContent -replace "FROM mage-common-offline:latest", "FROM mage-gpu-offline:latest"
        }
        "agent_service" {
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8001"
            # Fix the escaping for CMD directive
            $oldCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]'
            $newCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]'
            $serviceContent = $serviceContent -replace [regex]::Escape($oldCmd), $newCmd
        }
        "generation_service" {
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8003"
            # Fix the escaping for CMD directive
            $oldCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]'
            $newCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]'
            $serviceContent = $serviceContent -replace [regex]::Escape($oldCmd), $newCmd
        }
        "review_service" {
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8004"
            # Fix the escaping for CMD directive
            $oldCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]'
            $newCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"]'
            $serviceContent = $serviceContent -replace [regex]::Escape($oldCmd), $newCmd
        }
        "upload_service" {
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8005"
            # Fix the escaping for CMD directive
            $oldCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]'
            $newCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8005"]'
            $serviceContent = $serviceContent -replace [regex]::Escape($oldCmd), $newCmd
        }
        "chat_service" {
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8009"
            # Fix the escaping for CMD directive
            $oldCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]'
            $newCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8009"]'
            $serviceContent = $serviceContent -replace [regex]::Escape($oldCmd), $newCmd
        }
        "direct_chat_service" {
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8011"
            # Fix the escaping for CMD directive
            $oldCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]'
            $newCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8011"]'
            $serviceContent = $serviceContent -replace [regex]::Escape($oldCmd), $newCmd
        }
        "workbench_service" {
            $serviceContent = $serviceContent -replace "EXPOSE 8000", "EXPOSE 8020"
            # Fix the escaping for CMD directive
            $oldCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]'
            $newCmd = 'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8020"]'
            $serviceContent = $serviceContent -replace [regex]::Escape($oldCmd), $newCmd
        }
        default {
            # No specific customizations for other services
        }
    }
    
    # Write the modified template to the service's Dockerfile
    $serviceContent | Set-Content -Path $dockerfilePath
    Write-Host "    Dockerfile updated for offline use" -ForegroundColor DarkGray
}

Write-Host "Backend Dockerfiles modification complete (skipped excluded services)." -ForegroundColor Green
Write-Host "Original Dockerfiles have been backed up with .original extension (where applicable)." -ForegroundColor Green 