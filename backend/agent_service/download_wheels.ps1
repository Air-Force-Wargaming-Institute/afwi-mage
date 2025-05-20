# PowerShell script to download Linux-compatible Python wheels for airgapped installation
# This script uses Docker to ensure wheels are compatible with Linux environments

param(
    [Parameter()]
    [switch]$AutoZip
)

# Define the service name based on the directory name
$ServiceName = "agent_service"

Write-Host "[$ServiceName] Cleaning up artifacts from previous runs..." -ForegroundColor DarkGray

# Define the target wheels directory relative to the script location
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$localWheelsDirRelative = "wheels" # Local wheels dir for this service
$localWheelsDirAbsolute = Join-Path -Path $scriptDir -ChildPath $localWheelsDirRelative

# Delete local wheels directory if it exists
if (Test-Path $localWheelsDirAbsolute -PathType Container) {
    Write-Host "[$ServiceName] Removing existing local wheels directory: $localWheelsDirAbsolute" -ForegroundColor DarkGray
    Remove-Item -Path $localWheelsDirAbsolute -Recurse -Force -ErrorAction SilentlyContinue
}

# Define and delete downloaded_wheels_list.txt if it exists
$outputListFileName = "downloaded_wheels_list.txt"
$outputListFilePath = Join-Path -Path $scriptDir -ChildPath $outputListFileName
if (Test-Path $outputListFilePath -PathType Leaf) {
    Write-Host "[$ServiceName] Removing existing downloaded wheels list: $outputListFilePath" -ForegroundColor DarkGray
    Remove-Item -Path $outputListFilePath -Force -ErrorAction SilentlyContinue
}

# Define log file path (this part already includes deletion logic added previously)
$logFileName = "${ServiceName}_pip_download.log"
$logFilePath = Join-Path -Path $scriptDir -ChildPath $logFileName
# The log file deletion logic is handled later, right before docker execution, which is fine.

Write-Host "[$ServiceName] Downloading Linux-compatible wheels for airgapped installation..." -ForegroundColor Cyan

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

# Define log file path
$logFileName = "${ServiceName}_pip_download.log"
$logFilePath = Join-Path -Path $scriptDir -ChildPath $logFileName
Write-Host "[$ServiceName] Docker command output will be logged to: $logFilePath" -ForegroundColor Yellow

# Ensure a fresh log file for each run by deleting the old one if it exists
if (Test-Path $logFilePath -PathType Leaf) {
    Write-Host "[$ServiceName] Removing existing log file: $logFilePath" -ForegroundColor DarkGray
    Remove-Item -Path $logFilePath -Force -ErrorAction SilentlyContinue
}

# Execute Docker command and capture all output
Write-Host "[$ServiceName] Executing Docker command..."
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

Write-Host "[$ServiceName] Generating list of required wheels for ${outputFilePath} from log file: $logFilePath" -ForegroundColor Cyan
try {
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
        
        $requirementsFileForList = Join-Path -Path $scriptDir -ChildPath "requirements.txt"
        $directRequiredPackages = Get-Content $requirementsFileForList | Where-Object { $_ -notmatch '^(\s*#|\s*$)' } | ForEach-Object { 
            $pkgName = ($_ -split '[<>=!~\\\[\\]\\s]')[0].Trim()
            if ($pkgName) { $pkgName }
        }
        
        $tempFallbackWheels = @()
        foreach ($reqItem in $directRequiredPackages) {
            $escapedReqHyphen = [regex]::Escape($reqItem)
            $escapedReqUnderscore = [regex]::Escape($reqItem.Replace('-', '_'))

            $matchingWheelInstance = $wheelsInCache | Where-Object { 
                $_.Name -match "^${escapedReqHyphen}(-|_)" -or 
                $_.Name -match "^${escapedReqUnderscore}(-|_)" 
            } | Select-Object -First 1 # Select only one, preferably the highest version if multiple match (though this simplistic match won't guarantee highest)

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