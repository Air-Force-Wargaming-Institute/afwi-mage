# load_docker_images.ps1
# Script to load Docker images from a specified directory within the airgap package.

param (
    [string]$PackageBaseDirForImages # Optional: For flexibility if called from different contexts
)

$ErrorActionPreference = "Stop"

# --- Determine Paths ---
$ScriptPath = $MyInvocation.MyCommand.Path
$DeploymentScriptsDir = Split-Path -Path $ScriptPath -Parent

if ([string]::IsNullOrWhiteSpace($PackageBaseDirForImages)) {
    $PackageBaseDirForImages = Split-Path -Path $DeploymentScriptsDir -Parent
}

$DockerImagesDir = Join-Path -Path $PackageBaseDirForImages -ChildPath "docker_images"

# --- Helper Function ---
function Load-DockerImagesInternal {
    Write-Host "--- Loading Docker Images from $DockerImagesDir ---" -ForegroundColor Green
    if (-not (Test-Path $DockerImagesDir -PathType Container)) {
        Write-Warning "Docker images directory not found: $DockerImagesDir"
        return
    }
    $imageTars = Get-ChildItem -Path $DockerImagesDir -Filter "*.tar"
    if ($imageTars.Count -eq 0) {
        Write-Warning "No Docker image .tar files found in $DockerImagesDir."
        return
    }
    foreach ($tarFile in $imageTars) {
        Write-Host "Loading image from $($tarFile.FullName)..."
        try {
            docker load -i $tarFile.FullName
            Write-Host "Successfully loaded $($tarFile.Name)." -ForegroundColor Cyan
        } catch {
            Write-Error "Failed to load Docker image $($tarFile.FullName). Error: $($_.Exception.Message)"
        }
    }
    Write-Host "--- Docker Image Loading Complete ---" -ForegroundColor Green
}

# --- Main Script Logic ---
Write-Host "Executing Docker Image Loader Script..." -ForegroundColor Cyan
Load-DockerImagesInternal
Write-Host "Docker Image Loader Script Finished." -ForegroundColor Cyan 