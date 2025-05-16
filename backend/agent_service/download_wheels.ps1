# PowerShell script to download Linux-compatible Python wheels for airgapped installation
# This script uses Docker to ensure wheels are compatible with Linux environments

param(
    [Parameter()]
    [switch]$AutoZip
)

# Define the service name based on the directory name
$ServiceName = "agent_service"

Write-Host "Downloading Linux-compatible wheels for airgapped installation..." -ForegroundColor Cyan

# Check if Docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Docker is required but not found in PATH." -ForegroundColor Red
    Write-Host "Please install Docker before proceeding."
    exit 1
}

# Define the target wheels directory relative to the script location
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServiceName = (Get-Item -Path $scriptDir).Name # Define ServiceName
$wheelsDirRelative = "../backend_wheels"
$deploymentZipsDirName = "DeploymentZIPs" # New

$wheelsDirAbsolute = Join-Path -Path $scriptDir -ChildPath $wheelsDirRelative
$wheelsDirAbsolute = (Resolve-Path -Path $wheelsDirAbsolute).Path # Get the full canonical path

# Create wheels directory if it doesn't exist
if (-not (Test-Path $wheelsDirAbsolute -PathType Container)) {
    New-Item -ItemType Directory -Path $wheelsDirAbsolute | Out-Null
    Write-Host "Created wheels directory: $wheelsDirAbsolute" -ForegroundColor Yellow
} else {
    Write-Host "Using existing wheels directory: $wheelsDirAbsolute" -ForegroundColor Yellow
}

# Define the requirements file path
$requirementsFile = "requirements.txt"
$requirementsFileAbsolute = Join-Path -Path $scriptDir -ChildPath $requirementsFile
$requirementsFileAbsolute = (Resolve-Path -Path $requirementsFileAbsolute).Path

# Construct the path for DeploymentZIPs directory (one level up from scriptDir)
$backendRootDir = (Resolve-Path (Join-Path -Path $scriptDir -ChildPath "..")).Path
$deploymentZipsDirAbsolute = Join-Path -Path $backendRootDir -ChildPath $deploymentZipsDirName

# Use Docker to download Linux-compatible wheels
Write-Host "[$ServiceName] Running Docker to download Linux-compatible wheels to $wheelsDirAbsolute..." -ForegroundColor Yellow

# Normalize paths for Docker volume mounting
Function Normalize-DockerPath ($path) {
    $normalized = $path.Replace('\', '/')
    if ($IsWindows) {
        $driveLetter = $normalized.Substring(0, 1).ToLower()
        $normalized = "/$driveLetter" + $normalized.Substring(2)
    }
    return $normalized
}

$normalizedWheelsPath = Normalize-DockerPath -path $wheelsDirAbsolute
$normalizedRequirementsPath = Normalize-DockerPath -path $requirementsFileAbsolute

# Define the bash command for Docker using here-string (@'...'@) format for consistent line handling
$bashCommand = @'
python -m pip install --upgrade pip --root-user-action=ignore && \
python -m pip download --dest /wheels --prefer-binary --python-version 3.12 --only-binary=:all: --no-binary=:none: -r /reqs/requirements.txt
'@

$dockerArgs = @(
    "run", "--rm",
    "-v", "$normalizedWheelsPath`:/wheels",
    "-v", "$normalizedRequirementsPath`:/reqs/requirements.txt:ro",
    "python:3.12-slim",
    "bash", "-c",
    $bashCommand
)

# Execute Docker command and capture all output
$dockerCommandOutput = & docker @dockerArgs 2>&1 | Tee-Object -Variable dockerFullOutputForLogging | ForEach-Object { Write-Host $_; $_ }

if ($LASTEXITCODE -ne 0) {
    Write-Warning "[$ServiceName] Docker command finished with a non-zero exit code: $LASTEXITCODE. Pip download might have failed for some packages. The generated wheel list might be incomplete."
} else {
    Write-Host "[$ServiceName] Docker wheel download command finished successfully." -ForegroundColor Green
}

# --- List Downloaded Wheels & Save List ---
Write-Host "[$ServiceName] Listing ALL downloaded files (wheels and sdist) from $wheelsDirAbsolute (central cache)..." -ForegroundColor Cyan
$allDownloadedFilesInCache = Get-ChildItem -Path $wheelsDirAbsolute
if ($allDownloadedFilesInCache.Count -eq 0) {
    Write-Warning "[$ServiceName] No files (wheels or sdist) found in central cache $wheelsDirAbsolute. This is unusual if Docker command succeeded."
} else {
    Write-Host "[$ServiceName] Found $($allDownloadedFilesInCache.Count) files in ${wheelsDirAbsolute}."
    # Get count for each type
    $wheelCountInCache = ($allDownloadedFilesInCache | Where-Object { $_.Name -like "*.whl" }).Count
    $sdistCountInCache = ($allDownloadedFilesInCache | Where-Object { $_.Name -like "*.tar.gz" -or $_.Name -like "*.zip" }).Count
    $otherCountInCache = $allDownloadedFilesInCache.Count - $wheelCountInCache - $sdistCountInCache
    Write-Host "[$ServiceName] File types in cache: $wheelCountInCache wheels, $sdistCountInCache source distributions, $otherCountInCache other files."
}

$wheelsInCache = $allDownloadedFilesInCache | Where-Object { $_.Name -like "*.whl" }
if ($wheelsInCache.Count -eq 0) {
     Write-Warning "[$ServiceName] No wheel files found in central cache $wheelsDirAbsolute."
} else {
    Write-Host "[$ServiceName] Found $($wheelsInCache.Count) Linux-compatible wheel files in central cache $wheelsDirAbsolute." -ForegroundColor Green
}

# Save the list of downloaded wheels to a file in the script's directory
$outputFileName = "downloaded_wheels_list.txt"
$outputFilePath = Join-Path -Path $scriptDir -ChildPath $outputFileName

Write-Host "[$ServiceName] Generating list of required wheels for ${outputFilePath}" -ForegroundColor Cyan
try {
    # We'll extract wheel information from the Docker output by looking for package references
    $requiredWheels = @()
    $processedPackages = @{}  # Use a hashtable for faster lookups
    
    # Extract all wheel filenames directly mentioned in the output
    # Look for patterns like "File was already downloaded /wheels/package-name.whl"
    foreach ($line in $dockerCommandOutput) {
        # Match wheels directly mentioned in the output
        if ($line -match 'File was already downloaded /wheels/([^/]+\.whl)') {
            $wheelName = $matches[1]
            $processedPackages[$wheelName] = $true
        } elseif ($line -match 'Downloading ([^/]+\.whl)') { # Covers newly downloaded wheels
            $wheelName = $matches[1]
            $processedPackages[$wheelName] = $true
        }
        
        # Also try to match packages that pip is collecting
        # This will help find transitive dependencies mentioned in the output
        if ($line -match '^Collecting ([a-zA-Z0-9._-]+)(?:==|\[|$|\s)') { # Match package names from Collecting lines
            $packageName = $matches[1].Trim()
            # Convert dashes to underscores as needed in wheel filenames
            $packageNameUnderscore = $packageName.Replace('-', '_')
            
            # Find all wheels that match this package name in the central cache
            $matchingWheelsFromCache = $wheelsInCache | Where-Object { 
                $_.Name -like "$packageName-*.whl" -or 
                $_.Name -like "$packageNameUnderscore-*.whl"
            }
            
            foreach ($wheelInstance in $matchingWheelsFromCache) {
                if (-not $processedPackages.ContainsKey($wheelInstance.Name)) {
                    $processedPackages[$wheelInstance.Name] = $true
                }
            }
        }
    }
    
    # Convert the hashtable keys to an array
    $requiredWheels = $processedPackages.Keys | Sort-Object
    
    # If no wheels were found from parsing output, fall back to the requirements.txt direct matching as a last resort
    if ($requiredWheels.Count -eq 0) {
        Write-Warning "[$ServiceName] No wheels identified from pip output. Trying to match directly from requirements.txt against cache."
        
        $requirementsFileForList = Join-Path -Path $scriptDir -ChildPath "requirements.txt"
        $directRequiredPackages = Get-Content $requirementsFileForList | Where-Object { $_ -notmatch '^(#|\s*$)' } | ForEach-Object { 
            $pkgName = ($_ -split '[<>=!~\[\]\s]')[0].Trim()
            if ($pkgName) { $pkgName }
        }
        
        foreach ($reqItem in $directRequiredPackages) {
            $escapedReqHyphen = [regex]::Escape($reqItem)
            $escapedReqUnderscore = [regex]::Escape($reqItem.Replace('-', '_'))

            $matchingWheelInstance = $wheelsInCache | Where-Object { 
                $_.Name -match "^${escapedReqHyphen}(-|_)" -or 
                $_.Name -match "^${escapedReqUnderscore}(-|_)" 
            } | Select-Object -First 1

            if ($matchingWheelInstance) {
                if (-not ($requiredWheels -contains $matchingWheelInstance.Name)) {
                    $requiredWheels += $matchingWheelInstance.Name
                }
            } else {
                Write-Warning "[$ServiceName] Fallback: No downloaded wheel found for direct requirement '$reqItem' in $wheelsDirAbsolute"
            }
        }
        $requiredWheels = $requiredWheels | Sort-Object | Get-Unique
    }
    
    if ($requiredWheels.Count -eq 0) {
        Write-Warning "[$ServiceName] No wheels were identified for requirements even after fallback. Using ALL wheels from cache."
        $requiredWheels = $wheelsInCache | ForEach-Object { $_.Name } | Sort-Object | Get-Unique
    } else {
        Write-Host "[$ServiceName] Using the identified $($requiredWheels.Count) wheels based on pip output and requirements." -ForegroundColor Green
    }
    
    $requiredWheels | Out-File -FilePath $outputFilePath -Encoding utf8
    Write-Host "[$ServiceName] List of required wheels saved to: $outputFilePath" -ForegroundColor Green

} catch {
    Write-Error "[$ServiceName] Error generating or saving wheel list to file '$outputFilePath': $_"
}

# Automatically run the script to copy wheels from the list to the local wheels directory
Write-Host ""
Write-Host "Attempting to copy downloaded wheels to the local ./wheels directory..." -ForegroundColor Yellow
$copyScriptPath = Join-Path -Path $scriptDir -ChildPath "copy_wheels_from_list.ps1"
if (Test-Path $copyScriptPath -PathType Leaf) {
    try {
        # Execute the copy script
        & $copyScriptPath
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "The copy_wheels_from_list.ps1 script finished with errors (Exit Code: $LASTEXITCODE)."
        } else {
            Write-Host "Local ./wheels directory populated successfully." -ForegroundColor Green
        }
    } catch {
        Write-Error "Failed to execute copy_wheels_from_list.ps1: $_"
    }
} else {
    Write-Warning "copy_wheels_from_list.ps1 not found in $scriptDir. Skipping local copy."
}

Write-Host ""
Write-Host "Wheels are located in: $wheelsDirAbsolute" -ForegroundColor Cyan
Write-Host "To use these wheels in an airgapped environment:" -ForegroundColor Cyan
Write-Host "1. Copy the agent_service directory AND the $wheelsDirAbsolute directory to the target machine" -ForegroundColor White
Write-Host "2. Update Dockerfile or build process to use the wheels from the shared location" -ForegroundColor Yellow # Added note
Write-Host "3. Run the deployment script: .\airgapped_deploy.ps1 (May need adjustment)" -ForegroundColor White # Added note
Write-Host "4. Start the container as instructed by the deployment script" -ForegroundColor White

# Create a package.zip file for easy transfer
$doZip = $false
if ($AutoZip) {
    $doZip = $true
    Write-Host "[$ServiceName] Auto-zipping enabled via parameter." -ForegroundColor DarkGray
} else {
    Write-Host ""
    Write-Host "[$ServiceName] Would you like to create a zip archive of the $ServiceName directory (including local wheels) for transfer? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq "Y" -or $response -eq "y") {
        $doZip = $true
    }
}

if ($doZip) {
    $zipFileName = "${ServiceName}_airgapped.zip"
    $zipFilePath = Join-Path -Path $scriptDir -ChildPath $zipFileName
    Write-Host "[$ServiceName] Creating archive $zipFileName ..." -ForegroundColor Yellow
    try {
        # Ensure we are in the script\'s directory context for relative paths
        # Push-Location $scriptDirAbsolute # No longer needed with explicit path
        # Use explicit path and wildcard within that path
        Compress-Archive -Path (Join-Path $scriptDir '*') -DestinationPath $zipFilePath -Force -ErrorAction Stop
        Write-Host "[$ServiceName] Created $zipFilePath" -ForegroundColor Green
        
        # Ensure DeploymentZIPs directory exists
        if (-not (Test-Path $deploymentZipsDirAbsolute -PathType Container)) {
            Write-Host "[$ServiceName] Creating deployment zips directory: $deploymentZipsDirAbsolute" -ForegroundColor Yellow
            try {
                New-Item -ItemType Directory -Path $deploymentZipsDirAbsolute -ErrorAction Stop | Out-Null
            } catch {
                Write-Error "[$ServiceName] Failed to create deployment zips directory '$deploymentZipsDirAbsolute': $_"
                throw # Re-throw to stop script if dir creation fails
            }
        }

        # Move the zip file
        $finalZipPath = Join-Path -Path $deploymentZipsDirAbsolute -ChildPath $zipFileName
        Move-Item -Path $zipFilePath -Destination $finalZipPath -Force -ErrorAction Stop
        Write-Host "[$ServiceName] Moved $zipFileName to $finalZipPath" -ForegroundColor Green
        Write-Host "[$ServiceName] Transfer this file from $deploymentZipsDirAbsolute for your airgapped environment." -ForegroundColor Cyan
    } catch {
        Write-Error "[$ServiceName] Failed to create or move zip archive: $_"
    } # Removed finally Pop-Location as Push-Location is removed
}

Write-Host "[$ServiceName] Script finished." -ForegroundColor Cyan 