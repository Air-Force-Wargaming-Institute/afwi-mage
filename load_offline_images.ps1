# Script to load Docker images in an airgapped environment
# Run this on the airgapped machine

Write-Host "Starting to load Docker images..." -ForegroundColor Green

# Get list of currently installed Docker images
$existingImages = @()
try {
    $existingImages = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -ne "<none>:<none>" }
    Write-Host "Found $($existingImages.Count) existing Docker images" -ForegroundColor Cyan
} catch {
    Write-Host "Warning: Could not retrieve existing Docker images: $_" -ForegroundColor Yellow
}

# Load all Docker images from the offline_packages/images directory
$imageFiles = Get-ChildItem -Path "offline_packages/images" -Filter "*.tar"
$totalImages = $imageFiles.Count
$currentImage = 0

foreach ($imageFile in $imageFiles) {
    $currentImage++
    $imagePath = $imageFile.FullName
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($imagePath)
    Write-Host "[$currentImage/$totalImages] Processing $baseName..." -ForegroundColor Cyan
    
    # Determine image name from filename pattern
    $imageName = $null
    # Handle pattern like redis_redis-stack_7.4.0-v3-x86_64.tar
    if ($baseName -match "^([^_]+)_([^_]+)_(.+)$") {
        $imageName = "$($Matches[1])/$($Matches[2]):$($Matches[3])"
    }
    # Handle pattern like postgres_13.tar
    elseif ($baseName -match "^([^_]+)_([^_]+)$") {
        $imageName = "$($Matches[1]):$($Matches[2])"
    }
    # Simple case like mage-common-offline.tar
    else {
        $imageName = $baseName
        # If it doesn't contain a colon, assume it's "latest"
        if ($imageName -notmatch ":") {
            $imageName = "$imageName:latest"
        }
    }
    
    Write-Host "  Image name (from filename): $imageName" -ForegroundColor Gray
    
    # Check if any close matches exist in Docker
    $imageExists = $false
    $imageMatches = @()
    
    # Exact match
    if ($existingImages -contains $imageName) {
        $imageExists = $true
        $imageMatches += $imageName
    }
    
    # Match without registry prefix
    $simpleImageName = $imageName -replace "^.*\/", ""
    foreach ($existing in $existingImages) {
        $simpleExisting = $existing -replace "^.*\/", ""
        if ($simpleExisting -eq $simpleImageName) {
            $imageExists = $true
            $imageMatches += $existing
        }
    }
    
    if ($imageExists) {
        Write-Host "  Image already exists as: $($imageMatches -join ', ')" -ForegroundColor Yellow
        Write-Host "  Skipping..." -ForegroundColor Yellow
    } else {
        # Before image loading - get current repositories and tags
        $beforeImages = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -ne "<none>:<none>" }
        
        # Load the image
        Write-Host "  Loading image from $imagePath..." -ForegroundColor Cyan
        $output = docker load -i $imagePath
        
        # Extract the loaded image name from docker load output
        $loadedImageName = $null
        if ($output -match "Loaded image: (.+)") {
            $loadedImageName = $Matches[1]
            Write-Host "  Successfully loaded: $loadedImageName" -ForegroundColor Green
        }
        
        # If we couldn't get the name from output, check what's new
        if (-not $loadedImageName) {
            $afterImages = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object { $_ -ne "<none>:<none>" }
            $newImages = $afterImages | Where-Object { $_ -notin $beforeImages }
            
            if ($newImages.Count -gt 0) {
                foreach ($newImage in $newImages) {
                    Write-Host "  New image detected: $newImage" -ForegroundColor Green
                    $existingImages += $newImage
                }
            } else {
                Write-Host "  Warning: No new images detected after loading" -ForegroundColor Yellow
                
                # Special case check - might have been a duplicate that docker doesn't report
                if ($output -match "already exists") {
                    Write-Host "  Image appears to be already loaded (according to docker)" -ForegroundColor Yellow
                }
            }
        } else {
            # Add the successfully loaded image to our tracking list
            if ($loadedImageName -notin $existingImages) {
                $existingImages += $loadedImageName
            }
        }
    }
    
    Write-Host ""
}

Write-Host "All Docker images have been processed" -ForegroundColor Green 