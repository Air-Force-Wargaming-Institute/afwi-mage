# PowerShell script to download Linux-compatible Python wheels for workbench_service
# Uses Docker for compatibility and copies required wheels locally.

param(
    [Parameter()]
    [switch]$AutoZip
)

$ServiceName = "workbench_service"
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
$requirementsFile = "requirements.txt"
$deploymentZipsDirName = "DeploymentZIPs" # New

# Resolve absolute paths
try {
    $scriptDirAbsolute = (Resolve-Path -Path $scriptDir).Path
    $wheelsDirAbsolute = (Resolve-Path -Path (Join-Path -Path $scriptDirAbsolute -ChildPath $wheelsDirRelative)).Path
    $localWheelsDirAbsolute = Join-Path -Path $scriptDirAbsolute -ChildPath $localWheelsDirRelative
    $nltkDataDirAbsolute = Join-Path -Path $scriptDirAbsolute -ChildPath $nltkDataDirRelative
    $listFilePath = Join-Path -Path $scriptDirAbsolute -ChildPath $listFileName
    $requirementsFileAbsolute = (Resolve-Path -Path (Join-Path -Path $scriptDirAbsolute -ChildPath $requirementsFile)).Path
    # Construct the path for DeploymentZIPs directory (one level up from scriptDir)
    $backendRootDir = (Resolve-Path (Join-Path -Path $scriptDirAbsolute -ChildPath "..")).Path
    $deploymentZipsDirAbsolute = Join-Path -Path $backendRootDir -ChildPath $deploymentZipsDirName
} catch {
    Write-Error "[$ServiceName] Error resolving initial paths: $_"
    exit 1
}

# --- Pre-checks ---
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

# Refactored to use argument array for robustness
$dockerArgs = @(
    "run", "--rm",
    "-v", "$normalizedWheelsPath`:/wheels",
    "-v", "$normalizedRequirementsPath`:/reqs/requirements.txt:ro",
    "python:3.12-slim",
    "bash", "-c",
    'python -m pip install --upgrade pip --root-user-action=ignore && python -m pip download --dest /wheels --prefer-binary --python-version 3.12 --only-binary=:all: --no-binary=:none: -r /reqs/requirements.txt || echo "Pip download finished, some packages might be source only."'
)

# Write-Host "[$ServiceName] Executing Docker command: docker $($dockerArgs -join ' ' )" -ForegroundColor DarkGray
$dockerCommandOutput = & docker @dockerArgs 2>&1 | Tee-Object -Variable dockerFullOutputForLogging | ForEach-Object { Write-Host $_; $_ }

if ($LASTEXITCODE -ne 0) {
    Write-Warning "[$ServiceName] Docker command finished with a non-zero exit code: $LASTEXITCODE. Pip download might have failed for some packages OR this might be due to the '|| echo' in the bash command. Check output carefully."
    # Don't exit immediately, still try to list/copy existing wheels if any
} else {
    Write-Host "[$ServiceName] Docker wheel download command finished." -ForegroundColor Green
}

# --- List Downloaded Wheels & Save List ---
Write-Host "[$ServiceName] Listing downloaded wheels from $wheelsDirAbsolute..." -ForegroundColor Cyan
$wheels = Get-ChildItem -Path $wheelsDirAbsolute -Filter "*.whl"

if ($wheels.Count -eq 0) {
     Write-Warning "[$ServiceName] No wheel files found in $wheelsDirAbsolute. Check Docker output for errors."
} else {
    Write-Host "[$ServiceName] Found $($wheels.Count) Linux-compatible wheel files in $wheelsDirAbsolute." -ForegroundColor Green
    # foreach ($wheel in $wheels) { Write-Host "  - $($wheel.Name)" -ForegroundColor DarkGray } # Verbose
}

Write-Host "[$ServiceName] Saving list of required wheels to: $listFilePath" -ForegroundColor Cyan
try {
    $requiredWheels = @() # Initialize as an empty array
    $processedPackages = @{}  # Use a hashtable for faster lookups and to ensure uniqueness

    # --- Primary Method: Parse explicit wheel filenames from pip output ---
    foreach ($line in $dockerCommandOutput) {
        if ($line -match 'File was already downloaded /wheels/([^/]+\.whl)') {
            $wheelName = $matches[1]
            if (-not $processedPackages.ContainsKey($wheelName)) { $processedPackages[$wheelName] = $true }
        } elseif ($line -match 'Saved /wheels/([^/]+\.whl)') { 
            $wheelName = $matches[1]
            if (-not $processedPackages.ContainsKey($wheelName)) { $processedPackages[$wheelName] = $true }
        } elseif ($line -match 'Downloading ([^/]+\.whl)') {
            $wheelName = $matches[1]
            if (-not $processedPackages.ContainsKey($wheelName)) { $processedPackages[$wheelName] = $true }
        }
    }

    # --- Fallback 1: Parse "Successfully downloaded package1 package2 ..." line ---
    # This is useful if pip lists packages it handled without explicit wheel filenames for each.
    if ($processedPackages.Count -eq 0) { # Only if primary method yielded nothing
        Write-Warning "[$ServiceName] No wheels directly identified. Parsing 'Successfully downloaded...' line from pip output."
        $successfullyDownloadedPattern = 'Successfully downloaded\s+(.*)' 
        $dockerOutputString = $dockerCommandOutput -join [System.Environment]::NewLine
        if ($dockerOutputString -match $successfullyDownloadedPattern) {
            $packageListString = $matches[1]
            $packageNames = $packageListString -split '\s+' | Where-Object { $_ } # Split by space and remove empty strings
            
            foreach ($packageNameInList in $packageNames) {
                $pkgNameClean = $packageNameInList.Trim()
                $pkgNameUnderscore = $pkgNameClean.Replace('-', '_')
                
                # Find the BEST single matching wheel in the cache for this package name
                $bestMatchWheel = $wheels | Where-Object {
                    ($_.Name -like "$pkgNameClean-*.whl" -or $_.Name -like "$pkgNameUnderscore-*.whl") 
                } | Sort-Object -Property Name -Descending | Select-Object -First 1 # Attempt to get latest version/best match

                if ($bestMatchWheel) {
                    if (-not $processedPackages.ContainsKey($bestMatchWheel.Name)) {
                        $processedPackages[$bestMatchWheel.Name] = $true
                    }
                } else {
                    Write-Warning "[$ServiceName] Could not find a cached wheel for package '$pkgNameClean' mentioned in 'Successfully downloaded' list."
                }
            }
        }
    }
    
    # --- Fallback 2: Parse "Collecting package_name" lines ---
    # This helps catch transitive dependencies or other packages pip considered.
    # We run this IN ADDITION to previous steps, as it might find dependencies missed by explicit names.
    # However, ensure it doesn't re-add if already processed or pick multiple versions for same core package.
    Write-Host "[$ServiceName] Parsing 'Collecting...' lines from pip output to identify further potential dependencies." -ForegroundColor DarkGray
    foreach ($line in $dockerCommandOutput) {
        if ($line -match '^Collecting ([a-zA-Z0-9._-]+)') {
            $packageNameFromCollecting = $matches[1].Trim()
            $packageNameUnderscore = $packageNameFromCollecting.Replace('-', '_')
            
            # Check if a wheel for this package (any version) is already processed
            $alreadyProcessed = $false
            foreach($existingWheelName in $processedPackages.Keys){
                if($existingWheelName -like "$packageNameFromCollecting-*" -or $existingWheelName -like "$packageNameUnderscore-*"){
                    $alreadyProcessed = $true
                    break
                }
            }

            if (-not $alreadyProcessed) {
                $bestMatchWheel = $wheels | Where-Object {
                    ($_.Name -like "$packageNameFromCollecting-*.whl" -or $_.Name -like "$packageNameUnderscore-*.whl")
                } | Sort-Object -Property Name -Descending | Select-Object -First 1

                if ($bestMatchWheel) {
                    if (-not $processedPackages.ContainsKey($bestMatchWheel.Name)) {
                        $processedPackages[$bestMatchWheel.Name] = $true
                        Write-Host "[$ServiceName] Added '$($bestMatchWheel.Name)' from 'Collecting' line." -ForegroundColor DarkGray
                    }
                } else {
                     Write-Warning "[$ServiceName] 'Collecting' line for '$packageNameFromCollecting', but no matching wheel found in cache."
                }
            }
        }
    }

    $requiredWheels = $processedPackages.Keys | Sort-Object
    
    # --- Fallback 3 (Original workbench logic): If still no wheels after all pip parsing, try requirements.txt matching ---
    if ($requiredWheels.Count -eq 0) {
        Write-Warning "[$ServiceName] No wheels identified from any pip output parsing. Falling back to matching requirements.txt directly against cache."
        $directRequiredPackages = Get-Content $requirementsFileAbsolute | Where-Object { $_ -notmatch '(^#|^\s*$)' } | ForEach-Object { 
            $pkgName = ($_ -split '[<>=!~\\\[\\\]\\s]')[0].Trim()
            if ($pkgName) { $pkgName }
        }
        foreach ($reqItem in $directRequiredPackages) {
            $escapedReqHyphen = [regex]::Escape($reqItem) 
            $escapedReqUnderscore = [regex]::Escape($reqItem.Replace('-', '_'))

            $matchingWheelInstance = $wheels | Where-Object { 
                $_.Name -match "^${escapedReqHyphen}(-|_)" -or 
                $_.Name -match "^${escapedReqUnderscore}(-|_)" 
            } | Sort-Object -Property Name -Descending | Select-Object -First 1 # Get best/latest if multiple simple matches

            if ($matchingWheelInstance) {
                if (-not $processedPackages.ContainsKey($matchingWheelInstance.Name)) { # Check processedPackages again
                    $processedPackages[$matchingWheelInstance.Name] = $true 
                }
            } else {
                Write-Warning "[$ServiceName] Requirements.txt fallback: No downloaded wheel found for '$reqItem' in $wheelsDirAbsolute"
            }
        }
        $requiredWheels = $processedPackages.Keys | Sort-Object # Re-evaluate $requiredWheels from $processedPackages
    }

    # Final check and output
    if ($requiredWheels.Count -eq 0) {
        Write-Error "[$ServiceName] CRITICAL: No wheels were identified even after all fallbacks. The wheels list will be empty. Check Docker output and requirements.txt."
    } else {
        Write-Host "[$ServiceName] Identified $($requiredWheels.Count) required wheel files after all parsing stages." -ForegroundColor Green
    }
    
    $requiredWheels | Out-File -FilePath $listFilePath -Encoding utf8 -ErrorAction Stop
    Write-Host "[$ServiceName] List saved successfully." -ForegroundColor Green

} catch {
    Write-Error "[$ServiceName] Error saving wheel list to file '$listFilePath': $_"
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
        # Ensure we are in the script's directory context for relative paths
        # Push-Location $scriptDirAbsolute # Removed for safety, path is explicit below
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
    } # Removed finally Pop-Location as Push-Location was removed
}

Write-Host "[$ServiceName] Script finished." -ForegroundColor Cyan 