# Script to prepare frontend node modules for offline use
# Run this on a machine with internet access

Write-Host "Starting to prepare frontend node modules..." -ForegroundColor Green

# Check if node_modules archive already exists
$archivePath = "offline_packages/frontend_node_modules.tar.gz"
if (Test-Path $archivePath) {
    Write-Host "Frontend node modules archive already exists at $archivePath" -ForegroundColor Yellow
    $skipPreparation = Read-Host "Do you want to skip preparation and use existing archive? (y/n)"
    if ($skipPreparation.ToLower() -eq 'y') {
        Write-Host "Using existing frontend node modules archive." -ForegroundColor Green
        exit 0
    }
    Write-Host "Continuing with preparation. Existing archive will be overwritten." -ForegroundColor Cyan
}

# Check if frontend directory exists
if (-not (Test-Path -Path "frontend")) {
    Write-Host "Error: frontend directory not found!" -ForegroundColor Red
    exit 1
}

# Navigate to frontend directory
try {
    Push-Location frontend
    
    # Check if package.json exists
    if (-not (Test-Path -Path "package.json")) {
        Write-Host "Error: package.json not found in frontend directory!" -ForegroundColor Red
        Pop-Location
        exit 1
    }

    # Ensure the package-lock.json is up-to-date
    Write-Host "Updating package-lock.json..." -ForegroundColor Cyan
    npm install --package-lock-only
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: npm install --package-lock-only completed with exit code $LASTEXITCODE" -ForegroundColor Yellow
    }

    # Install npm packages
    Write-Host "Installing npm packages..." -ForegroundColor Cyan
    npm ci
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: npm ci completed with exit code $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host "Trying npm install as fallback..." -ForegroundColor Yellow
        npm install
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Failed to install npm packages!" -ForegroundColor Red
            Pop-Location
            exit 1
        }
    }

    # Check that node_modules directory exists
    if (-not (Test-Path -Path "node_modules")) {
        Write-Host "Error: node_modules directory not found after npm install!" -ForegroundColor Red
        Pop-Location
        exit 1
    }

    # Create tar archive of node_modules
    Write-Host "Creating node_modules archive..." -ForegroundColor Cyan
    
    # Check for tar command
    $tarExists = $null
    try {
        $tarExists = Get-Command tar -ErrorAction SilentlyContinue
    } catch {
        $tarExists = $null
    }
    
    if ($tarExists) {
        # Use tar command if available
        tar -czf "../$archivePath" node_modules
    } else {
        # Fallback to PowerShell Compress-Archive (less ideal but works)
        Write-Host "tar command not found, using PowerShell compression instead..." -ForegroundColor Yellow
        
        # Create temporary zip file
        $tempZipPath = "../offline_packages/frontend_node_modules.zip"
        Compress-Archive -Path "node_modules" -DestinationPath $tempZipPath -Force
        
        Write-Host "Created zip archive at $tempZipPath" -ForegroundColor Cyan
        Write-Host "Note: For best compatibility, please manually convert this zip to tar.gz format." -ForegroundColor Yellow
    }

    # Return to original directory
    Pop-Location
    
    # Verify archive exists
    if (Test-Path $archivePath) {
        Write-Host "Frontend node modules have been prepared and archived to $archivePath" -ForegroundColor Green
    } else {
        Write-Host "Warning: Archive creation may have failed. Check $archivePath" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    # Make sure we get back to the original directory
    if ((Get-Location).Path -like "*frontend*") {
        Pop-Location
    }
    exit 1
} 