# PowerShell script to download Linux-compatible Python wheels for chat_service
# Uses Docker for compatibility and copies required wheels locally.

param(
    [Parameter()]
    [switch]$AutoZip
)

$ServiceName = "chat_service"
Write-Host "[$ServiceName] Downloading Linux-compatible wheels for airgapped installation..." -ForegroundColor Cyan

# Check if Docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "[$ServiceName] Error: Docker is required but not found in PATH. Please install Docker."
    exit 1
}

# --- Path Definitions ---
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$wheelsDirRelative = "../backend_wheels"
$localWheelsDirRelative = "./wheels"
$nltkDataDirRelative = "./nltk_data" # Standard location for NLTK data
$listFileName = "downloaded_wheels_list.txt"
$logFileName = "${ServiceName}_pip_download.log" # New
$requirementsFile = "requirements.txt"
$deploymentZipsDirName = "DeploymentZIPs"

# Resolve absolute paths
try {
    $scriptDirAbsolute = (Resolve-Path -Path $scriptDir).Path
    $wheelsDirAbsolute = (Resolve-Path -Path (Join-Path -Path $scriptDirAbsolute -ChildPath $wheelsDirRelative)).Path
    $localWheelsDirAbsolute = Join-Path -Path $scriptDirAbsolute -ChildPath $localWheelsDirRelative
    $nltkDataDirAbsolute = Join-Path -Path $scriptDirAbsolute -ChildPath $nltkDataDirRelative
    $listFilePath = Join-Path -Path $scriptDirAbsolute -ChildPath $listFileName
    $logFilePath = Join-Path -Path $scriptDirAbsolute -ChildPath $logFileName # New
    $requirementsFileAbsolute = (Resolve-Path -Path (Join-Path -Path $scriptDirAbsolute -ChildPath $requirementsFile)).Path
    # Construct the path for DeploymentZIPs directory (one level up from scriptDir)
    $backendRootDir = (Resolve-Path (Join-Path -Path $scriptDirAbsolute -ChildPath "..")).Path
    $deploymentZipsDirAbsolute = Join-Path -Path $backendRootDir -ChildPath $deploymentZipsDirName
} catch {
    Write-Error "[$ServiceName] Error resolving initial paths: $_"
    exit 1
}

# --- Pre-checks ---
# Clean up artifacts from previous runs
Write-Host "[$ServiceName] Cleaning up artifacts from previous runs..." -ForegroundColor DarkGray
if (Test-Path $localWheelsDirAbsolute -PathType Container) {
    Write-Host "[$ServiceName] Removing existing local wheels directory: $localWheelsDirAbsolute" -ForegroundColor DarkGray
    Remove-Item -Path $localWheelsDirAbsolute -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path $listFilePath -PathType Leaf) {
    Write-Host "[$ServiceName] Removing existing downloaded wheels list: $listFilePath" -ForegroundColor DarkGray
    Remove-Item -Path $listFilePath -Force -ErrorAction SilentlyContinue
}
if (Test-Path $logFilePath -PathType Leaf) {
    Write-Host "[$ServiceName] Removing existing log file: $logFilePath" -ForegroundColor DarkGray
    Remove-Item -Path $logFilePath -Force -ErrorAction SilentlyContinue
}

# Check for requirements.txt
if (-not (Test-Path $requirementsFileAbsolute -PathType Leaf)) {
    Write-Error "[$ServiceName] Error: requirements.txt not found at $requirementsFileAbsolute"
    exit 1
}

# Create central wheels directory if it doesn't exist
if (-not (Test-Path $wheelsDirAbsolute -PathType Container)) {
    Write-Host "[$ServiceName] Creating central wheels directory: $wheelsDirAbsolute" -ForegroundColor Yellow
    try {
        New-Item -ItemType Directory -Path $wheelsDirAbsolute -ErrorAction Stop | Out-Null
    } catch {
        Write-Error "[$ServiceName] Failed to create central wheels directory '$wheelsDirAbsolute': $_"
        exit 1
    }
} else {
    # Write-Host "[$ServiceName] Using existing central wheels directory: $wheelsDirAbsolute" -ForegroundColor DarkGray
}

# --- Download Wheels using Docker ---
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

# Define the bash command for Docker
# It will:
# 1. Upgrade pip
# 2. Run pip download to download all required packages and their dependencies
# 3. Return the exit code
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
Write-Host "[$ServiceName] Docker command output will be logged to: $logFilePath" -ForegroundColor Yellow
$dockerCommandOutput = & docker @dockerArgs 2>&1 | Tee-Object -FilePath $logFilePath -Append | Tee-Object -Variable dockerFullOutputForLogging | ForEach-Object { Write-Host $_; $_ }

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
    $wheelCount = ($allDownloadedFilesInCache | Where-Object { $_.Name -like "*.whl" }).Count
    $sdistCount = ($allDownloadedFilesInCache | Where-Object { $_.Name -like "*.tar.gz" -or $_.Name -like "*.zip" }).Count
    $otherCount = $allDownloadedFilesInCache.Count - $wheelCount - $sdistCount
    Write-Host "[$ServiceName] File types: $wheelCount wheels, $sdistCount source distributions, $otherCount other files."
}

$wheelsInCache = $allDownloadedFilesInCache | Where-Object { $_.Name -like "*.whl" }
if ($wheelsInCache.Count -eq 0) {
     Write-Warning "[$ServiceName] No wheel files found in central cache $wheelsDirAbsolute."
} else {
    Write-Host "[$ServiceName] Found $($wheelsInCache.Count) Linux-compatible wheel files in central cache $wheelsDirAbsolute." -ForegroundColor Green
}

Write-Host "[$ServiceName] Generating list of required wheels for ${listFilePath}" -ForegroundColor Cyan
try {
    # We'll extract wheel information from the Docker output by looking for package references
    $requiredWheels = @()
    $processedPackages = @{}  # Use a hashtable for faster lookups
    
    # Read the content of the log file created earlier
    if (-not (Test-Path $logFilePath -PathType Leaf)) {
        Write-Warning "[$ServiceName] Log file $logFilePath not found. Cannot parse for wheels."
    } else {
        $logFileContent = Get-Content -Path $logFilePath -ErrorAction SilentlyContinue
        if ($null -eq $logFileContent) {
            Write-Warning "[$ServiceName] Could not read the log file $logFilePath or it is empty. Wheel list might be incomplete."
        } else {
            Write-Host "[$ServiceName] Processing log file $logFilePath for specific wheel information..."
            foreach ($line in $logFileContent) { 
                $trimmedLine = $line.Trim()
                # Regex to capture filename from 'File was already downloaded /wheels/FILENAME.whl'
                if ($trimmedLine -match 'File was already downloaded /wheels/([^ ]+\.whl)') {
                    $wheelName = $matches[1]
                    if ($wheelName -notlike 'pip-*.whl') {
                        $processedPackages[$wheelName] = $true
                    }
                # Regex to capture filename from 'Downloading FILENAME.whl'
                } elseif ($trimmedLine -match 'Downloading ([^ ]+\.whl)') {
                    $wheelName = $matches[1]
                     if ($wheelName -notlike 'pip-*.whl') {
                        $processedPackages[$wheelName] = $true
                    }
                }
            }
        }
    }
    
    # Convert the hashtable keys to an array
    $requiredWheels = $processedPackages.Keys | Sort-Object
    
    # Fallback Condition: Only if log parsing yielded absolutely no wheels.
    if ($requiredWheels.Count -eq 0 -and (Test-Path $logFilePath -PathType Leaf)) { # Added check for log file existence for this condition
        Write-Warning "[$ServiceName] No specific wheel files identified from pip log messages ('File was already downloaded' or 'Downloading')."
        Write-Warning "[$ServiceName] Attempting fallback: Trying to match directly from requirements.txt against cache."
        
        $requirementsFileForList = Join-Path -Path $scriptDirAbsolute -ChildPath "requirements.txt" # Use absolute path
        $directRequiredPackages = Get-Content $requirementsFileForList | Where-Object { $_ -notmatch '^(\\s*#|\\s*$)' } | ForEach-Object { 
            $pkgName = ($_ -split '[<>=!~\[\]\\s]')[0].Trim() # Fixed regex: Removed extra backslashes
            if ($pkgName) { $pkgName }
        }
        
        $tempFallbackWheels = @()
        foreach ($reqItem in $directRequiredPackages) {
            # Escape special characters for regex matching in PowerShell
            $escapedReqHyphen = [regex]::Escape($reqItem)
            $escapedReqUnderscore = [regex]::Escape($reqItem.Replace('-', '_'))

            $matchingWheelInstance = $wheelsInCache | Where-Object { 
                $_.Name -match "^${escapedReqHyphen}(-|_)" -or 
                $_.Name -match "^${escapedReqUnderscore}(-|_)" 
            } | Select-Object -First 1

            if ($matchingWheelInstance) {
                if (-not ($tempFallbackWheels -contains $matchingWheelInstance.Name)) {
                    $tempFallbackWheels += $matchingWheelInstance.Name
                }
            } else {
                Write-Warning "[$ServiceName] Fallback (requirements.txt): No downloaded wheel found for direct requirement '$reqItem' in $wheelsDirAbsolute"
            }
        }
        $requiredWheels = $tempFallbackWheels | Sort-Object | Get-Unique
    }

    # Second Fallback Condition: If both log parsing and requirements.txt matching failed to find any wheels.
    if ($requiredWheels.Count -eq 0) {
        Write-Warning "[$ServiceName] No wheels were identified for requirements even after requirements.txt fallback. Using ALL wheels from cache as a last resort (this might include unused wheels)."
        $requiredWheels = $wheelsInCache | ForEach-Object { $_.Name } | Where-Object { $_ -notlike 'pip-*.whl' } | Sort-Object | Get-Unique
    } else {
        Write-Host "[$ServiceName] Using the identified $($requiredWheels.Count) wheels based on pip log and/or fallbacks." -ForegroundColor Green
    }
    
    $requiredWheels | Out-File -FilePath $listFilePath -Encoding utf8 -ErrorAction Stop
    Write-Host "[$ServiceName] List of required wheels saved to: $listFilePath." -ForegroundColor Green

} catch {
    Write-Error "[$ServiceName] Error generating or saving wheel list to file '$listFilePath': $_"
    # Continue to copy step if possible
}

# --- Copy Wheels Locally ---
Write-Host "[$ServiceName] Attempting to copy required wheels to the local ./wheels directory..." -ForegroundColor Yellow
$copyScriptPath = Join-Path -Path $scriptDirAbsolute -ChildPath "copy_wheels_from_list.ps1"

if (-not (Test-Path $listFilePath -PathType Leaf)) {
    Write-Warning "[$ServiceName] Cannot copy wheels: List file '$listFilePath' not found or not created."
} elseif (-not (Test-Path $copyScriptPath -PathType Leaf)) {
    Write-Warning "[$ServiceName] Cannot copy wheels: copy_wheels_from_list.ps1 not found in $scriptDirAbsolute."
} else {
    try {
        & $copyScriptPath
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "[$ServiceName] The copy_wheels_from_list.ps1 script finished with errors/warnings (Exit Code: $LASTEXITCODE). Check its output."
        } else {
            Write-Host "[$ServiceName] Local ./wheels directory populated successfully based on list." -ForegroundColor Green
        }
    } catch {
        Write-Error "[$ServiceName] Failed to execute copy_wheels_from_list.ps1: $_"
    }
}

# --- NLTK Data Handling (Placeholder) ---
# Check if NLTK is in requirements and handle data download if needed
$nltkRequired = $false
try {
    $nltkRequired = Get-Content $requirementsFileAbsolute | Select-String -Pattern '^nltk\b' -Quiet
} catch { Write-Warning "[$ServiceName] Could not read requirements file to check for NLTK." }

if ($nltkRequired) {
    Write-Host "[$ServiceName] NLTK requirement detected." -ForegroundColor Yellow
    # Ensure nltk_data directory exists
    if (-not (Test-Path $nltkDataDirAbsolute -PathType Container)) {
        Write-Host "[$ServiceName] Creating NLTK data directory: $nltkDataDirAbsolute" -ForegroundColor Yellow
        try {
            New-Item -ItemType Directory -Path $nltkDataDirAbsolute -ErrorAction Stop | Out-Null
        } catch {
            Write-Error "[$ServiceName] Failed to create NLTK data directory '$nltkDataDirAbsolute': $_"
        }
    }
    
    # Placeholder: Add logic here to download NLTK data (e.g., using another Docker command)
    # Example: Trigger a docker command to download 'punkt', 'stopwords' etc. into a volume mounted at $nltkDataDirAbsolute
    Write-Warning "[$ServiceName] NLTK data download logic is not implemented yet. Please handle manually if needed for airgapped environment."
    # Consider creating a separate script like download_nltk_data.ps1 and calling it here.
}

# --- Final Instructions --- 
Write-Host ""
Write-Host "[$ServiceName] Wheels are downloaded to central location: $wheelsDirAbsolute" -ForegroundColor Cyan
Write-Host "[$ServiceName] Required wheels copied to local location: $localWheelsDirAbsolute" -ForegroundColor Cyan
Write-Host "[$ServiceName] To use in airgapped environment:" -ForegroundColor Cyan
Write-Host "   1. Copy the '$ServiceName' directory (containing the local '$localWheelsDirRelative' folder) to the target machine." -ForegroundColor White
# Write-Host "   2. If NLTK is used, ensure the '$nltkDataDirRelative' folder is populated and copied."
Write-Host "   3. Update Dockerfile build process if necessary to use '$localWheelsDirRelative'." -ForegroundColor Yellow
Write-Host "   4. Run deployment scripts (e.g., airgapped_deploy.ps1) which should use the local wheels." -ForegroundColor White

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
    $zipFilePath = Join-Path -Path $scriptDirAbsolute -ChildPath $zipFileName
    Write-Host "[$ServiceName] Creating archive $zipFileName ..." -ForegroundColor Yellow
    try {
        # Use explicit path and wildcard within that path
        Compress-Archive -Path (Join-Path $scriptDirAbsolute '*') -DestinationPath $zipFilePath -Force -ErrorAction Stop
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
    }
}

Write-Host "[$ServiceName] Script finished." -ForegroundColor Cyan 