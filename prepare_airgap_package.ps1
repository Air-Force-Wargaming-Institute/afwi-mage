# PowerShell Script to Prepare Full Airgap Deployment Package
# This script should be run from the workspace root.

param(
    [string]$OutputDirectory = ".\\AirgapDeploymentPackage",
    [string[]]$BackendBaseImages = @(
        "python:3.12-slim",
        "postgres:15", # Main DB version
        "postgres:13", # Included for compatibility if older compose is used directly
        "afwi-mage-base:3.12-slim",
        "busybox:latest", # For init-data
        "traefik:v3.3.4", # For api_gateway
        "redis/redis-stack:7.4.0-v3-x86_64", # For redis
        "vllm/vllm-openai:v0.8.5", # Actual base for vLLM service (see backend/vLLM/Dockerfile)
        "ollama/ollama:0.6.7"  # For Ollama base/target (ensure backend/ollama/Dockerfile aligns or adjust this)
    ),
    [string[]]$FrontendBaseImages = @(
        "node:18-alpine" # Example for Frontend, ensure frontend/Dockerfile aligns
    )
)

$ErrorActionPreference = "Stop"

# Define the list of standard backend services to be packaged and included in docker-compose modifications.
# This list specifically EXCLUDES 'transcription' and 'wargame' services,
# and ensures 'report_builder' is INCLUDED.
$StandardBackendServicesToPackage = @(
    "core", "chat", "agent", "extraction", 
    "upload", "embedding", "workbench", "auth", "direct_chat_service", 
    "report_builder", "api_gateway"
)

# Get the absolute path for the output directory
$AbsoluteOutputDirectory = Resolve-Path -Path $OutputDirectory -ErrorAction SilentlyContinue
if (-not $AbsoluteOutputDirectory) {
    $AbsoluteOutputDirectory = Join-Path -Path (Get-Location) -ChildPath $OutputDirectory
}

Write-Host "Starting Airgap Package Preparation..." -ForegroundColor Yellow
Write-Host "Output will be in: $AbsoluteOutputDirectory"

# --- 0. Create Output Directories ---
$BackendServicesDir = Join-Path -Path $AbsoluteOutputDirectory -ChildPath "backend_services"
$BackendSupportDir = Join-Path -Path $AbsoluteOutputDirectory -ChildPath "backend_support"
$BuildContextsDir = Join-Path -Path $AbsoluteOutputDirectory -ChildPath "build_contexts" # New
$VLLMContextDir = Join-Path -Path $BuildContextsDir -ChildPath "vllm_context"       # New
$OllamaContextDir = Join-Path -Path $BuildContextsDir -ChildPath "ollama_context"   # New
$DbContextDir = Join-Path -Path $BuildContextsDir -ChildPath "db_context"         # NEW: For db build context
$FrontendContextDir = Join-Path -Path $AbsoluteOutputDirectory -ChildPath "frontend_context" # New (for frontend Dockerfile context)
$DockerImagesDir = Join-Path -Path $AbsoluteOutputDirectory -ChildPath "docker_images"
$DeploymentScriptsDir = Join-Path -Path $AbsoluteOutputDirectory -ChildPath "deployment_scripts"

foreach ($dir in @(
    $AbsoluteOutputDirectory, $BackendServicesDir, $BackendSupportDir, 
    $BuildContextsDir, $VLLMContextDir, $OllamaContextDir, $DbContextDir, $FrontendContextDir, # Added new dirs
    $DockerImagesDir, $DeploymentScriptsDir
)) {
    if (-not (Test-Path $dir -PathType Container)) {
        Write-Host "Creating directory: $dir"
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    } else {
        Write-Host "Directory already exists: $dir. Contents may be overwritten."
    }
}

# --- 1. Backend Preparation ---
Write-Host "
=== Preparing Backend Services (Python Wheels & Zips) ===" -ForegroundColor Green
$backendDir = Join-Path -Path (Get-Location) -ChildPath "backend"
if (-not (Test-Path $backendDir -PathType Container)) {
    Write-Error "Backend directory not found at $backendDir. Ensure script is run from workspace root."
    exit 1
}

Push-Location $backendDir
try {
    Write-Host "Cleaning up previous wheel artifacts for backend services..." -ForegroundColor Cyan
    $allPotentialServiceDirs = Get-ChildItem -Path "." -Directory # Current location is $backendDir
    foreach ($serviceSubDir in $allPotentialServiceDirs) {
        $serviceName = $serviceSubDir.Name
        # Exclude known non-standard-service directories or output directories from this specific cleanup
        if ($serviceName -eq "DeploymentZIPs" -or $serviceName -eq "vLLM" -or $serviceName -eq "ollama") {
            Write-Host "  Skipping wheel cleanup for special directory: $serviceName"
            continue
        }

        Write-Host "  Processing service: $serviceName for wheel artifact cleanup"
        $wheelsListFilePath = Join-Path -Path $serviceSubDir.FullName -ChildPath "downloaded_wheels_list.txt"
        $wheelsDirPath = Join-Path -Path $serviceSubDir.FullName -ChildPath "wheels"

        if (Test-Path $wheelsListFilePath -PathType Leaf) {
            Write-Host "    Deleting file: $wheelsListFilePath"
            Remove-Item -Path $wheelsListFilePath -Force -ErrorAction SilentlyContinue
        } else {
            Write-Host "    File not found (no action needed): $wheelsListFilePath"
        }

        if (Test-Path $wheelsDirPath -PathType Container) {
            Write-Host "    Deleting directory: $wheelsDirPath"
            Remove-Item -Path $wheelsDirPath -Recurse -Force -ErrorAction SilentlyContinue
        } else {
            Write-Host "    Directory not found (no action needed): $wheelsDirPath"
        }
    }
    Write-Host "Backend service wheel artifact cleanup finished." -ForegroundColor Green

    Write-Host "Running download_all_wheels.ps1 for backend..."
    if (Test-Path ".\\download_all_wheels.ps1") {
        .\\download_all_wheels.ps1 # This should populate ./DeploymentZIPs/
        Write-Host "download_all_wheels.ps1 completed."

        $sourceDeploymentZipsDir = Join-Path -Path $backendDir -ChildPath "DeploymentZIPs"
        if (Test-Path $sourceDeploymentZipsDir -PathType Container) {
            Write-Host "Copying selected backend service packages from $sourceDeploymentZipsDir to $BackendServicesDir..."
            foreach ($serviceKey in $StandardBackendServicesToPackage) {
                $actualServiceNameForZip = $serviceKey
                if ($serviceKey -ne "direct_chat_service") {
                    $actualServiceNameForZip = "${serviceKey}_service"
                }
                $serviceZipFile = "${actualServiceNameForZip}_airgapped.zip"
                
                $logServiceName = $serviceKey # For consistent warning messages

                $sourceServiceZipPath = Join-Path -Path $sourceDeploymentZipsDir -ChildPath $serviceZipFile
                
                if (Test-Path $sourceServiceZipPath -PathType Leaf) {
                    Write-Host "  Copying $serviceZipFile (for service $logServiceName)..."
                    Copy-Item -Path $sourceServiceZipPath -Destination $BackendServicesDir -Force
                } else {
                    Write-Warning "  Package '$serviceZipFile' for service '$logServiceName' not found in $sourceDeploymentZipsDir. Skipping."
                }
            }
        } else {
            Write-Warning "Backend DeploymentZIPs directory not found after running download_all_wheels.ps1."
        }
    } else {
        Write-Warning ".\\download_all_wheels.ps1 not found in $backendDir. Skipping backend Python dependency packaging."
    }

    # Copy backend support files (docker-compose and related)
    Write-Host "Copying backend support files (docker-compose.yml, etc.) to $BackendSupportDir ..."
    $dockerComposeFile = Join-Path -Path $backendDir -ChildPath "docker-compose.yml"
    $dbInitScript = Join-Path -Path $backendDir -ChildPath "init-multiple-databases.sh"
    $vllmComposePart = Join-Path -Path $backendDir -ChildPath "vLLM/docker-compose.vllm.yml"
    $ollamaComposePart = Join-Path -Path $backendDir -ChildPath "ollama/docker-compose.ollama.yml"

    if (Test-Path $dockerComposeFile) {
        Copy-Item -Path $dockerComposeFile -Destination $BackendSupportDir -Force
        # Modify the main docker-compose.yml for airgapped use
        $airgapComposePath = Join-Path -Path $BackendSupportDir -ChildPath "docker-compose.yml"
        Write-Host "Modifying $airgapComposePath for airgapped environment..."
        $composeContent = Get-Content $airgapComposePath -Raw
        
        # Change include paths
        $composeContent = $composeContent -replace 'include:\s*\n\s*-\s*vLLM/docker-compose.vllm.yml', "include:`r`n  - ./compose_parts/docker-compose.vllm.yml"
        $composeContent = $composeContent -replace 'include:\s*\n\s*-\s*ollama/docker-compose.ollama.yml', "include:`r`n  - ./compose_parts/docker-compose.ollama.yml"
        
        # Modify build directives to image directives for services listed in $StandardBackendServicesToPackage
        foreach ($service in $StandardBackendServicesToPackage) {
            # Regex to find 'build: ./service_name' or 'build: path: ./service_name' etc. and replace
            $buildRegex = "(\n\s*${service}:\s*(?:[^#\n]*\n)*?\s*)build:\s*.*?(\n\s*(?:ports:|volumes:|environment:|depends_on:|networks:|command:|container_name:|image:|extra_hosts:|healthcheck:|restart:|deploy:|shm_size:|ipc:|ulimits:|$))"
            $replaceWith = "`$1image: ${service}-airgapped:latest`$2" # Use PowerShell string expansion carefully
            $composeContent = [regex]::Replace($composeContent, $buildRegex, $replaceWith, [System.Text.RegularExpressions.RegexOptions]::Singleline)
        }
        # For vLLM and Ollama (which will also be built by airgapped_deploy)
        # These are handled in their respective included files if modification is needed there
        
        # NEW: Modify build directive for 'db' service to point to its new context
        $dbBuildRegex = '(\n\s*db:\s*(?:[^#\n]*\n)*?\s*build:\s*)context:\s*\.(?:\s*\n\s*dockerfile:\s*db/Dockerfile)?'
        $dbReplaceWith = "`$1build: ../build_contexts/db_context" # Point to the new context directory
        $composeContent = [regex]::Replace($composeContent, $dbBuildRegex, $dbReplaceWith, [System.Text.RegularExpressions.RegexOptions]::Singleline)
        
        Set-Content -Path $airgapComposePath -Value $composeContent -Encoding UTF8
        Write-Host "Modified $airgapComposePath."
    }
    if (Test-Path $dbInitScript) {
        Copy-Item -Path $dbInitScript -Destination $BackendSupportDir -Force
    }
    
    $composePartsDir = Join-Path -Path $BackendSupportDir -ChildPath "compose_parts"
    if (-not (Test-Path $composePartsDir)) { New-Item -ItemType Directory -Path $composePartsDir -Force | Out-Null }

    if (Test-Path $vllmComposePart) {
        Copy-Item -Path $vllmComposePart -Destination (Join-Path $composePartsDir "docker-compose.vllm.yml") -Force
        $airgapVLLMComposePath = Join-Path $composePartsDir "docker-compose.vllm.yml"
        $vllmComposeContent = Get-Content $airgapVLLMComposePath -Raw
        $vllmBuildRegex = "(\n\s*vllm:\s*(?:[^#\n]*\n)*?\s*)build:\s*.*?(\n\s*(?:ports:|volumes:|environment:|depends_on:|networks:|command:|container_name:|image:|extra_hosts:|healthcheck:|restart:|deploy:|shm_size:|ipc:|ulimits:|$))"
        $vllmReplaceWith = "`$1image: vllm-airgapped:latest`$2"
        $vllmComposeContent = [regex]::Replace($vllmComposeContent, $vllmBuildRegex, $vllmReplaceWith, [System.Text.RegularExpressions.RegexOptions]::Singleline)
        Set-Content -Path $airgapVLLMComposePath -Value $vllmComposeContent -Encoding UTF8
        Write-Host "Modified VLLM compose part for airgapped environment."
    }
    if (Test-Path $ollamaComposePart) {
        Copy-Item -Path $ollamaComposePart -Destination (Join-Path $composePartsDir "docker-compose.ollama.yml") -Force
        $airgapOllamaComposePath = Join-Path $composePartsDir "docker-compose.ollama.yml"
        $ollamaComposeContent = Get-Content $airgapOllamaComposePath -Raw
        $ollamaBuildRegex = "(\n\s*ollama:\s*(?:[^#\n]*\n)*?\s*)build:\s*.*?(\n\s*(?:ports:|volumes:|environment:|depends_on:|networks:|command:|container_name:|image:|extra_hosts:|healthcheck:|restart:|deploy:|shm_size:|ipc:|ulimits:|$))"
        $ollamaReplaceWith = "`$1image: ollama-airgapped:latest`$2"
        $ollamaComposeContent = [regex]::Replace($ollamaComposeContent, $ollamaBuildRegex, $ollamaReplaceWith, [System.Text.RegularExpressions.RegexOptions]::Singleline)
        Set-Content -Path $airgapOllamaComposePath -Value $ollamaComposeContent -Encoding UTF8
        Write-Host "Modified Ollama compose part for airgapped environment."
    }
    
    # Copy vLLM and Ollama build contexts
    $vllmSourceDir = Join-Path -Path $backendDir -ChildPath "vLLM"
    if (Test-Path $vllmSourceDir -PathType Container) {
        Write-Host "Copying vLLM build context from $vllmSourceDir to $VLLMContextDir ..."
        Copy-Item -Path (Join-Path $vllmSourceDir "*") -Destination $VLLMContextDir -Recurse -Force
    } else { Write-Warning "vLLM source directory ($vllmSourceDir) not found."}

    $ollamaSourceDir = Join-Path -Path $backendDir -ChildPath "ollama"
    if (Test-Path $ollamaSourceDir -PathType Container) {
        Write-Host "Copying Ollama build context from $ollamaSourceDir to $OllamaContextDir ..."
        Copy-Item -Path (Join-Path $ollamaSourceDir "*") -Destination $OllamaContextDir -Recurse -Force
    } else { Write-Warning "Ollama source directory ($ollamaSourceDir) not found."}

    # NEW: Copy db build context
    $dbSourceDir = Join-Path -Path $backendDir -ChildPath "db"
    if (Test-Path $dbSourceDir -PathType Container) {
        Write-Host "Copying db build context from $dbSourceDir to $DbContextDir ..."
        Copy-Item -Path (Join-Path $dbSourceDir "*") -Destination $DbContextDir -Recurse -Force
    } else { Write-Warning "db source directory ($dbSourceDir) not found."}

} finally {
    Pop-Location
}
Write-Host "Backend preparation finished."

# --- 2. Frontend Preparation ---
Write-Host "
=== Preparing Frontend Application ===" -ForegroundColor Green
# Assuming frontend is at the same level as backend, or at workspace root
$frontendSourceDirRoot = Join-Path -Path (Get-Location) -ChildPath "frontend" 
if (-not (Test-Path $frontendSourceDirRoot -PathType Container)) { # Check if it's at root
    $parentOfCurrent = Split-Path (Get-Location) -Parent
    $frontendSourceDirRoot = Join-Path -Path $parentOfCurrent -ChildPath "frontend" # Check if it's one level up, then in frontend
}


if (Test-Path $frontendSourceDirRoot -PathType Container) {
    Write-Host "Found frontend directory: $frontendSourceDirRoot"
    Write-Host "Copying frontend build context to $FrontendContextDir ..."
    if(Test-Path (Join-Path $frontendSourceDirRoot "Dockerfile")) {
         Copy-Item -Path (Join-Path $frontendSourceDirRoot "*") -Destination $FrontendContextDir -Recurse -Force
         Write-Host "Frontend context (including Dockerfile) copied."
         Write-Host "Ensure its base image (e.g., node:18-alpine) is in \$FrontendBaseImages or \$BackendBaseImages."
    } else {
        Write-Warning "Dockerfile not found in $frontendSourceDirRoot. Cannot package frontend as a build context."
        Write-Warning "Copying frontend directory to $AbsoluteOutputDirectory/frontend_app (as static files) instead for now."
        $StaticFrontendDir = Join-Path -Path $AbsoluteOutputDirectory -ChildPath "frontend_app"
        if (-not (Test-Path $StaticFrontendDir)) { New-Item -ItemType Directory -Path $StaticFrontendDir -Force | Out-Null }
        Copy-Item -Path (Join-Path $frontendSourceDirRoot "*") -Destination $StaticFrontendDir -Recurse -Force -ErrorAction SilentlyContinue

    }
} else {
    Write-Warning "Frontend directory ($frontendSourceDirRoot, or one level up from script location) not found. Skipping frontend preparation."
}
Write-Host "Frontend preparation finished (or skipped)."


# --- 3. Docker Image Saving ---
Write-Host "
=== Saving Docker Images ===" -ForegroundColor Green
$AllBaseImages = $BackendBaseImages + $FrontendBaseImages
if ($AllBaseImages.Count -eq 0) {
    Write-Warning "No base Docker images specified to save."
} else {
    $uniqueImages = $AllBaseImages | Sort-Object -Unique
    Write-Host "Will attempt to save the following unique images: $($uniqueImages -join ', ')"
    foreach ($imageName in $uniqueImages) {
        if ([string]::IsNullOrWhiteSpace($imageName)) { continue }
        Write-Host "Processing Docker image: $imageName"
        try {
            Write-Host "  Pulling $imageName ..."
            docker pull $imageName
            $mangledImageName = $imageName.Replace(":", "_").Replace("/", "-") # Create a safe filename
            $imageTarPath = Join-Path -Path $DockerImagesDir -ChildPath "${mangledImageName}.tar"
            Write-Host "  Saving $imageName to $imageTarPath ..."
            docker save $imageName -o $imageTarPath
            Write-Host "  Saved $imageName successfully."
        } catch {
            Write-Error "Failed to pull or save Docker image $imageName. Error: $($_.Exception.Message)"
        }
    }
}
Write-Host "Docker image saving finished."

# --- 4. Copy Deployment Scripts & Supporting Files ---
Write-Host "
=== Copying Deployment Scripts ===" -ForegroundColor Green
$airgapDeployPs1Source = Join-Path -Path (Get-Location) -ChildPath "airgapped_deploy.ps1" 
$airgapDeployShSource = Join-Path -Path (Get-Location) -ChildPath "airgapped_deploy.sh"   
$loadImageScriptSource = Join-Path -Path (Get-Location) -ChildPath "load_docker_images.ps1"

if (Test-Path $airgapDeployPs1Source) {
    Copy-Item -Path $airgapDeployPs1Source -Destination $DeploymentScriptsDir -Force
} else {
    Write-Warning "$airgapDeployPs1Source not found at workspace root. It should be created there."
}
if (Test-Path $airgapDeployShSource) {
    Copy-Item -Path $airgapDeployShSource -Destination $DeploymentScriptsDir -Force
} else {
    Write-Warning "$airgapDeployShSource not found at workspace root. It should be created there."
}

if (Test-Path $loadImageScriptSource) {
    Copy-Item -Path $loadImageScriptSource -Destination $DeploymentScriptsDir -Force
} else {
    Write-Warning "$loadImageScriptSource not found at workspace root. It should be created there."
}

# Create a README for the package
$packageReadmeContent = @"
Airgap Deployment Package Contents:
===================================

- backend_services/   : Contains zipped Python service packages (code & wheels).
- backend_support/    : Contains supporting files (e.g., modified docker-compose.yml for airgapped use, db init scripts).
                        The docker-compose.yml here is INTENDED for use in the airgapped environment AFTER running the deployment scripts.
- build_contexts/     : Contains build contexts for services like vLLM, Ollama.
  - vllm_context/
  - ollama_context/
- frontend_context/   : Contains the build context for the frontend application (if Dockerfile was found).
                        If no Dockerfile was found for frontend, see 'frontend_app/' instead.
- frontend_app/       : Contains static frontend files if no Dockerfile was found in the frontend source.
- docker_images/      : Contains .tar files of required base Docker images.
- deployment_scripts/ : Contains scripts (`airgapped_deploy.ps1`, `airgapped_deploy.sh`) to load images and build/deploy services.

Basic Deployment Steps on Airgapped Machine:
--------------------------------------------
1. Transfer this entire package to the airgapped machine.
2. Ensure Docker is running on the airgapped machine.
3. Navigate to the `deployment_scripts` folder within this package.
4. Run the appropriate deployment script (e.g., `.\\\\airgapped_deploy.ps1 -DeployAllServices` or `./airgapped_deploy.sh -a`).
   This script will:
     a. Load all base Docker images from `../docker_images/`.
     b. Extract and build images for services in `../backend_services/` (e.g., core-airgapped:latest).
     c. Build images for contexts in `../build_contexts/` (e.g., vllm-airgapped:latest, ollama-airgapped:latest).
     d. Build an image for `../frontend_context/` if present (e.g., frontend-airgapped:latest).
5. Once the deployment script finishes and images are built/loaded, you can use the modified `docker-compose.yml` located in the `../backend_support/` directory to start all services.
   Example: `cd ../backend_support/` then `docker compose up -d`

Note: The deployment scripts build and tag images with an '-airgapped:latest' suffix. The provided docker-compose.yml in backend_support is modified to use these image names.
"@
$packageReadmePath = Join-Path -Path $AbsoluteOutputDirectory -ChildPath "README_AirgapPackage.txt"
$packageReadmeContent | Out-File -FilePath $packageReadmePath -Encoding utf8
Write-Host "Created package README at $packageReadmePath"

Write-Host "Deployment scripts and supporting files copied."


# --- 5. Final Bundling (Optional) ---
# Add optional step to zip the entire $AbsoluteOutputDirectory
# Example:
# $finalArchiveName = "AFWI_MAGE_Airgap_Package_$(Get-Date -Format 'yyyyMMddHHmmss').zip"
# $finalArchivePath = Join-Path -Path (Get-Location) -ChildPath $finalArchiveName # Save to workspace root
# Write-Host "=== Creating Final Airgap Archive ===" -ForegroundColor Green
# Write-Host "Archiving $AbsoluteOutputDirectory to $finalArchivePath ..."
# Compress-Archive -Path (Join-Path $AbsoluteOutputDirectory "*") -DestinationPath $finalArchivePath -Force
# Write-Host "Final airgap package created: $finalArchivePath" -ForegroundColor Cyan

Write-Host "Airgap Package Preparation Script Finished!" -ForegroundColor Yellow
Write-Host "Package ready at: $AbsoluteOutputDirectory" 