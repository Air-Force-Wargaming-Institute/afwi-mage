# airgapped_deploy.ps1
# Script to deploy services in an airgapped environment.
# Assumes this script is in the 'deployment_scripts' folder of the AirgapDeploymentPackage
# when executed on the airgapped machine.

param (
    [string]$ServiceName, # Optional: specific service to deploy by name (backend services or context names: vllm, ollama, frontend)
    [switch]$DeployAllServices, # Deploy all backend services and all contexts
    [switch]$ListServicesOnly,
    [switch]$DeployAllBackendServices, # Deploy all services from backend_services/
    [switch]$DeployAllContexts       # Deploy all from build_contexts/ and frontend_context/
)

$ErrorActionPreference = "Stop"

# --- Get Base Paths ---
# When run from within the deployed package, $MyInvocation.MyCommand.Path will point to its location.
try {
    $ScriptPath = $MyInvocation.MyCommand.Path
    $DeploymentScriptsDir = Split-Path -Path $ScriptPath -Parent
    $PackageBaseDir = Split-Path -Path $DeploymentScriptsDir -Parent
} catch {
    Write-Error "Could not determine script path. Ensure this script is run, not dot-sourced, from its intended location."
    Write-Warning "Assuming current directory is 'deployment_scripts' and package base is '..'"
    $DeploymentScriptsDir = Get-Location
    $PackageBaseDir = Join-Path -Path $DeploymentScriptsDir -ChildPath ".."
}

$BackendServicesZipsDir = Join-Path -Path $PackageBaseDir -ChildPath "backend_services"
$BuildContextsBaseDir = Join-Path -Path $PackageBaseDir -ChildPath "build_contexts"   # New
$VLLMContextDir = Join-Path -Path $BuildContextsBaseDir -ChildPath "vllm_context"
$OllamaContextDir = Join-Path -Path $BuildContextsBaseDir -ChildPath "ollama_context"
$FrontendContextDir = Join-Path -Path $PackageBaseDir -ChildPath "frontend_context"
$DockerImagesDir = Join-Path -Path $PackageBaseDir -ChildPath "docker_images"
$TempDeployRoot = Join-Path -Path $PackageBaseDir -ChildPath "temp_deployment_area" # For extracting zips

# --- Helper Functions ---
function Get-AvailableBackendServices {
    if (-not (Test-Path $BackendServicesZipsDir -PathType Container)) {
        Write-Warning "Backend services Zips directory not found: $BackendServicesZipsDir"
        return @()
    }
    $serviceZips = Get-ChildItem -Path $BackendServicesZipsDir -Filter "*_airgapped.zip"
    $availableServices = @()
    foreach ($zipFile in $serviceZips) {
        $serviceNameFromZip = $zipFile.BaseName -replace "_airgapped$", ""
        $availableServices += [pscustomobject]@{
            Name = $serviceNameFromZip
            Type = "BackendService"
            ZipPath = $zipFile.FullName
            ExtractedPath = Join-Path -Path $TempDeployRoot -ChildPath $serviceNameFromZip
            ContextPath = $null # Not applicable for zipped services
        }
    }
    return $availableServices
}

function Get-AvailableContextBuilds {
    $availableContexts = @()
    # VLLM Context
    if (Test-Path $VLLMContextDir -PathType Container) {
        if (Test-Path (Join-Path $VLLMContextDir "Dockerfile") -PathType Leaf) {
            $availableContexts += [pscustomobject]@{
                Name = "vllm"
                Type = "BuildContext"
                ZipPath = $null
                ExtractedPath = $null # Built directly from context
                ContextPath = $VLLMContextDir
            }
        } else { Write-Warning "Dockerfile not found in $VLLMContextDir. Skipping vLLM context build." }
    } else { Write-Warning "vLLM context directory not found: $VLLMContextDir"}

    # Ollama Context
    if (Test-Path $OllamaContextDir -PathType Container) {
        if (Test-Path (Join-Path $OllamaContextDir "Dockerfile") -PathType Leaf) {
            $availableContexts += [pscustomobject]@{
                Name = "ollama"
                Type = "BuildContext"
                ZipPath = $null
                ExtractedPath = $null
                ContextPath = $OllamaContextDir
            }
        } else { Write-Warning "Dockerfile not found in $OllamaContextDir. Skipping Ollama context build." }
    } else { Write-Warning "Ollama context directory not found: $OllamaContextDir"}
    
    # Frontend Context
    if (Test-Path $FrontendContextDir -PathType Container) {
        if (Test-Path (Join-Path $FrontendContextDir "Dockerfile") -PathType Leaf) {
            $availableContexts += [pscustomobject]@{
                Name = "frontend"
                Type = "BuildContext"
                ZipPath = $null
                ExtractedPath = $null 
                ContextPath = $FrontendContextDir
            }
        } else { Write-Warning "Dockerfile not found in $FrontendContextDir. Skipping frontend context build." }
    } else { Write-Warning "Frontend context directory not found: $FrontendContextDir"}

    return $availableContexts
}

function Deploy-ServiceOrContext {
    param (
        [Parameter(Mandatory=$true)]
        [psobject]$ItemInfo
    )

    Write-Host "`n--- Deploying $($ItemInfo.Type): $($ItemInfo.Name) ---" -ForegroundColor Yellow
    $buildContextPath = $null

    if ($ItemInfo.Type -eq "BackendService") {
        # 1. Ensure temp deploy root exists, clear previous if any for this service
        if (-not (Test-Path $TempDeployRoot -PathType Container)) {
            Write-Host "Creating temporary deployment root: $TempDeployRoot"
            New-Item -ItemType Directory -Path $TempDeployRoot -Force | Out-Null
        }
        if (Test-Path $ItemInfo.ExtractedPath -PathType Container) {
            Write-Host "Removing previous extraction for $($ItemInfo.Name) at $($ItemInfo.ExtractedPath)..."
            Remove-Item -Path $ItemInfo.ExtractedPath -Recurse -Force
        }
        Write-Host "Creating extraction directory: $($ItemInfo.ExtractedPath)"
        New-Item -ItemType Directory -Path $ItemInfo.ExtractedPath -Force | Out-Null

        # 2. Extract service package
        Write-Host "Extracting $($ItemInfo.ZipPath) to $($ItemInfo.ExtractedPath)..."
        try {
            Expand-Archive -Path $ItemInfo.ZipPath -DestinationPath $ItemInfo.ExtractedPath -Force
            Write-Host "Extraction complete."
            $buildContextPath = $ItemInfo.ExtractedPath
        } catch {
            Write-Error "Failed to extract service package $($ItemInfo.ZipPath). Error: $($_.Exception.Message)"
            return
        }
    } elseif ($ItemInfo.Type -eq "BuildContext") {
        $buildContextPath = $ItemInfo.ContextPath
        Write-Host "Preparing to build from context: $buildContextPath"
    } else {
        Write-Error "Unknown item type: $($ItemInfo.Type)"
        return
    }

    # 3. Build Docker image
    $dockerfilePath = Join-Path -Path $buildContextPath -ChildPath "Dockerfile"
    if (-not (Test-Path $dockerfilePath -PathType Leaf)) {
        Write-Error "Dockerfile not found at $dockerfilePath for $($ItemInfo.Name). Skipping build."
        return
    }

    $imageTagName = "$($ItemInfo.Name)-airgapped:latest" 
    Write-Host "Building Docker image '$imageTagName' for $($ItemInfo.Name) from context: $buildContextPath..."
    
    Push-Location $buildContextPath
    try {
        docker build -t $imageTagName . 
        if ($LASTEXITCODE -ne 0) {
            throw "Docker build failed with exit code $LASTEXITCODE. See Docker output above for details."
        }
        Write-Host "Successfully built Docker image '$imageTagName'." -ForegroundColor Cyan
        Write-Host "To run this service (as part of docker-compose), ensure the image name '$imageTagName' is referenced in the docker-compose.yml from the backend_support directory."
        Write-Host "Consult service-specific documentation or the main docker-compose.yml for run details."
    } catch {
        Write-Error "Failed to build Docker image for $($ItemInfo.Name). Error: $($_.Exception.Message)"
    } finally {
        Pop-Location
    }
    Write-Host "--- Deployment for $($ItemInfo.Type) '$($ItemInfo.Name)' Finished ---" -ForegroundColor Yellow
}

# --- Main Script Logic ---

Write-Host "Airgapped Deployment Script Started." -ForegroundColor Cyan
Write-Host "Expected Package Base Directory: $PackageBaseDir"

# Step 0: Load Docker Images
$shouldLoadImages = Read-Host "Do you want to load Docker images now? (y/n)"
if ($shouldLoadImages -eq 'y') {
    Write-Host "Invoking Docker image loader script..."
    try {
        $ImageLoaderScriptPath = Join-Path -Path $DeploymentScriptsDir -ChildPath "load_docker_images.ps1"
        if (Test-Path $ImageLoaderScriptPath -PathType Leaf) {
            # Pass the PackageBaseDir as a parameter to the image loader script
            & $ImageLoaderScriptPath -PackageBaseDirForImages $PackageBaseDir
        } else {
            Write-Error "Docker image loader script (load_docker_images.ps1) not found in $DeploymentScriptsDir."
            Write-Warning "Skipping Docker image loading. This might cause issues if images are not pre-loaded."
        }
    } catch {
        Write-Error "An error occurred while trying to run load_docker_images.ps1: $($_.Exception.Message)"
        Write-Warning "Proceeding without guaranteed image loading. This might cause issues."
    }
} else {
    Write-Host "Skipping Docker image loading based on user input." -ForegroundColor Yellow
}

# Step 1: Discover Available Items
$AvailableBackendServices = Get-AvailableBackendServices
$AvailableContextBuilds = Get-AvailableContextBuilds
$AllDeployableItems = $AvailableBackendServices + $AvailableContextBuilds

if ($AllDeployableItems.Count -eq 0) {
    Write-Warning "No backend service packages or buildable contexts found. Please check package structure."
    exit 1
}

Write-Host "`nAvailable items for deployment:" -ForegroundColor Green
$AllDeployableItems | ForEach-Object { Write-Host "- $($_.Name) ($($_.Type))" }

if ($ListServicesOnly.IsPresent) {
    Write-Host "`nListing items only. Exiting."
    exit 0
}

# Step 2: Determine which items to deploy
$ItemsToDeploy = @()
if ($DeployAllServices.IsPresent) {
    Write-Host "`nDeploying ALL available backend services and build contexts." -ForegroundColor Green
    $ItemsToDeploy = $AllDeployableItems
} elseif ($DeployAllBackendServices.IsPresent) {
    Write-Host "`nDeploying ALL available backend services (from zips)." -ForegroundColor Green
    $ItemsToDeploy += $AvailableBackendServices
} elseif ($DeployAllContexts.IsPresent) {
    Write-Host "`nDeploying ALL available build contexts (vllm, ollama, frontend)." -ForegroundColor Green
    $ItemsToDeploy += $AvailableContextBuilds
}

if (-not [string]::IsNullOrWhiteSpace($ServiceName)) {
    $selectedItemInfo = $AllDeployableItems | Where-Object { $_.Name -eq $ServiceName }
    if ($selectedItemInfo) {
        if (-not ($ItemsToDeploy.Name -contains $ServiceName)) { # Avoid duplicates if combined with -DeployAll*
            $ItemsToDeploy += $selectedItemInfo
        }
        Write-Host "`nSelected item via parameter: $($ServiceName) ($($selectedItemInfo.Type))" -ForegroundColor Green
    } else {
        Write-Error "Item '$ServiceName' not found in available packages or contexts."
        if ($ItemsToDeploy.Count -eq 0) { exit 1 } # Exit if this was the only selection and it failed
    }
} 

if ($ItemsToDeploy.Count -eq 0 -and -not $DeployAllBackendServices -and -not $DeployAllContexts -and -not $DeployAllServices) { # Interactive selection if no flags/specific service picked
    Write-Host "`nPlease choose items to deploy." -ForegroundColor Green
    Write-Host "Enter numbers separated by commas (e.g., 1,3), 'all', or press Enter to skip."
    for ($i = 0; $i -lt $AllDeployableItems.Count; $i++) {
        Write-Host "  $($i+1). $($AllDeployableItems[$i].Name) ($($AllDeployableItems[$i].Type))"
    }
    $choice = Read-Host "Enter your choice(s)"
    if ([string]::IsNullOrWhiteSpace($choice)) {
        Write-Host "No selection made. Exiting."
        exit 0
    }
    if ($choice -eq 'all') {
        $ItemsToDeploy = $AllDeployableItems
    } else {
        $indices = $choice -split ',' | ForEach-Object { $_.Trim() }
        foreach ($indexStr in $indices) {
            if ($indexStr -match "^\d+$") {
                $idx = [int]$indexStr - 1
                if ($idx -ge 0 -and $idx -lt $AllDeployableItems.Count) {
                    if(-not ($ItemsToDeploy.Name -contains $AllDeployableItems[$idx].Name)) {
                        $ItemsToDeploy += $AllDeployableItems[$idx]
                    }
                } else {
                    Write-Warning "Invalid selection number: $indexStr. It's out of range. Skipping."
                }
            } else {
                Write-Warning "Invalid input: '$indexStr'. Please enter numbers or 'all'. Skipping."
            }
        }
    }
}

if ($ItemsToDeploy.Count -eq 0) {
    Write-Warning "`nNo items selected or matched for deployment. Exiting."
    exit 0
}

# Step 3: Deploy selected items
Write-Host "`n--- Starting Deployment Process for Selected Items ---" -ForegroundColor Magenta
$ItemsToDeploy | ForEach-Object { Write-Host "- $($_.Name) ($($_.Type))" }

foreach ($itemInfoToDeploy in $ItemsToDeploy) {
    Deploy-ServiceOrContext -ItemInfo $itemInfoToDeploy
}

Write-Host "`n--- Airgapped Deployment Script Finished ---" -ForegroundColor Magenta
Write-Host "All selected images should now be built or loaded."
Write-Host "To start the services, navigate to the '../backend_support/' directory from here,"
Write-Host "and use the modified 'docker-compose.yml' file. Example: docker compose up -d"