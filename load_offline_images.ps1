# Script to load Docker images in an airgapped environment
# Run this on the airgapped machine

Write-Host "Starting to load Docker images..." -ForegroundColor Green

# Get list of currently installed Docker images with their IDs
$existingImages = @()
$existingImageDetails = @{}
try {
    # Collect both format and ID information
    $imageData = docker images --format "{{.Repository}}:{{.Tag}}|{{.ID}}"
    foreach ($item in $imageData) {
        if ($item -match "^(.+)\|(.+)$") {
            $repoTag = $Matches[1]
            $imageId = $Matches[2]
            
            if ($repoTag -ne "<none>:<none>") {
                $existingImages += $repoTag
                $existingImageDetails[$repoTag] = $imageId
                
                # Also store normalized versions (for handling registry URLs, etc.)
                $normalizedName = $repoTag -replace "^.*\/", "" # Remove registry/namespace
                $existingImageDetails[$normalizedName] = $imageId
            }
        }
    }
    Write-Host "Found $($existingImages.Count) existing Docker images" -ForegroundColor Cyan
} catch {
    Write-Host "Warning: Could not retrieve existing Docker images: ${_}" -ForegroundColor Yellow
}

# Load all Docker images from the offline_packages/images directory
Get-ChildItem -Path "offline_packages/images" -Filter "*.tar" | ForEach-Object {
    $imagePath = $_.FullName
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($imagePath)
    
    # Get actual image name by loading the first part of the tar file's manifest
    $imageName = ""
    try {
        # Extract image name from manifest.json in the tar file
        $manifestJson = & tar -xOf $imagePath manifest.json 2>$null | Select-Object -First 1
        if ($manifestJson) {
            $manifest = $manifestJson | ConvertFrom-Json
            if ($manifest.RepoTags -and $manifest.RepoTags.Count -gt 0) {
                $imageName = $manifest.RepoTags[0]
                Write-Host "  Found image name in tar: $imageName" -ForegroundColor Gray
            }
        }
    } catch {
        Write-Host "  Warning: Could not extract image name from tar: ${_}" -ForegroundColor Yellow
    }
    
    # If we couldn't get the name from the tar, try to guess from filename
    if (-not $imageName) {
        # Handle the common naming pattern we use in the tar files
        if ($baseName -match "(.+?)_(.+)$") {
            # This handles cases like "redis_redis-stack_7.4.0-v3-x86_64"
            if ($baseName -match "^([^_]+)_(.+?)_(.+)$") {
                $imageName = "$($Matches[1])/$($Matches[2]):$($Matches[3])"
            } else {
                # Standard case like "postgres_13"
                $imageName = "$($Matches[1]):$($Matches[2])"
            }
        } else {
            # Just replace underscores with colons as a last resort
            $imageName = $baseName -replace "_", ":"
        }
        Write-Host "  Using filename-based image name: $imageName" -ForegroundColor Gray
    }
    
    # Check multiple variations of the image name
    $imageExists = $false
    $existingImageName = ""
    
    # 1. Check exact match
    if ($existingImages -contains $imageName) {
        $imageExists = $true
        $existingImageName = $imageName
    }
    
    # 2. Check without registry prefix
    if (-not $imageExists) {
        $simpleName = $imageName -replace "^.*\/", ""
        if ($existingImages -contains $simpleName) {
            $imageExists = $true
            $existingImageName = $simpleName
        }
    }
    
    # 3. Check normalized versions (registry/namespace variations)
    if (-not $imageExists) {
        foreach ($existing in $existingImages) {
            $normalizedExisting = $existing -replace "^.*\/", ""
            $normalizedCurrent = $imageName -replace "^.*\/", ""
            
            if ($normalizedExisting -eq $normalizedCurrent) {
                $imageExists = $true
                $existingImageName = $existing
                break
            }
        }
    }
    
    if ($imageExists) {
        Write-Host "Image $imageName already exists as $existingImageName in Docker, skipping..." -ForegroundColor Yellow
    } else {
        Write-Host "Loading image from $imagePath..." -ForegroundColor Cyan
        
        # Store the list of image IDs before loading
        $beforeIds = docker images -q
        
        # Load the image
        docker load -i $imagePath
        
        # Get the new images that were loaded
        $afterIds = docker images -q
        $newIds = $afterIds | Where-Object { $_ -notin $beforeIds }
        
        if ($newIds) {
            foreach ($newId in $newIds) {
                $newImageInfo = docker images --filter "id=$newId" --format "{{.Repository}}:{{.Tag}}"
                foreach ($newImage in $newImageInfo) {
                    if ($newImage -ne "<none>:<none>") {
                        $existingImages += $newImage
                        $existingImageDetails[$newImage] = $newId
                        Write-Host "Loaded image: $newImage" -ForegroundColor Green
                    }
                }
            }
        } else {
            Write-Host "Warning: No new images detected after loading $imagePath" -ForegroundColor Yellow
        }
    }
}

Write-Host "All Docker images have been loaded" -ForegroundColor Green 