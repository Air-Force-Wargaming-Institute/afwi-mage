# Script to load Docker images in an airgapped environment
# Run this on the airgapped machine

Write-Host "Starting to load Docker images..." -ForegroundColor Green

# Get list of currently installed Docker images
$existingImages = @()
try {
    $existingImages = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -ne "<none>:<none>" }
    Write-Host "Found $($existingImages.Count) existing Docker images" -ForegroundColor Cyan
} catch {
    Write-Host "Warning: Could not retrieve existing Docker images: ${_}" -ForegroundColor Yellow
}

# Function to extract image name from tar file
function Get-ImageNameFromTar {
    param (
        [string]$tarPath
    )
    
    try {
        # Use docker inspect to get the image name without loading it
        $repoTagsLine = docker inspect --format='{{json .RepoTags}}' $tarPath 2>$null
        
        if ($repoTagsLine -and $repoTagsLine -ne "null") {
            # Extract the image name from the RepoTags JSON array
            $repoTags = $repoTagsLine | ConvertFrom-Json
            return $repoTags[0]  # Return the first repository:tag
        }
        
        # Alternative: Use a more direct approach to peek at the image name
        # Extract partial content to find the repository/tag
        $headerContent = & tar -xOf $tarPath manifest.json 2>$null | Select-Object -First 10
        if ($headerContent) {
            $manifest = $headerContent | ConvertFrom-Json
            if ($manifest.RepoTags -and $manifest.RepoTags.Count -gt 0) {
                return $manifest.RepoTags[0]
            }
        }
    } catch {
        Write-Host "Warning: Could not extract image name from ${tarPath}: ${_}" -ForegroundColor Yellow
    }
    
    # Default: If we can't extract the name, return the filename-based guess
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($tarPath)
    $name = $baseName -replace "_", ":"
    return $name
}

# Load all Docker images from the offline_packages/images directory
Get-ChildItem -Path "offline_packages/images" -Filter "*.tar" | ForEach-Object {
    $imagePath = $_.FullName
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($imagePath)
    
    # Try to get a reasonable guess at the image name
    $imageName = if ($baseName -match "^(.+)_([^_]+)$") {
        # Convert underscores back to colons and slashes to form image:tag format
        $baseName -replace "_", ":"
    } else {
        $baseName
    }
    
    # Check if the image already exists in Docker
    $imageExists = $existingImages | Where-Object { $_ -eq $imageName }
    
    if ($imageExists) {
        Write-Host "Image $imageName already exists in Docker, skipping..." -ForegroundColor Yellow
    } else {
        Write-Host "Loading image from $imagePath..." -ForegroundColor Cyan
        docker load -i $imagePath
        
        # Add the newly loaded image to our list of existing images
        $newImages = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -ne "<none>:<none>" -and $_ -notin $existingImages }
        foreach ($newImage in $newImages) {
            $existingImages += $newImage
            Write-Host "Loaded image: $newImage" -ForegroundColor Green
        }
    }
}

Write-Host "All Docker images have been loaded" -ForegroundColor Green 