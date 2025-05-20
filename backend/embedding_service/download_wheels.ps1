# PowerShell script to download Linux-compatible Python wheels for embedding_service
# Uses Docker for compatibility and copies required wheels locally.

param(
    [Parameter()]
    [switch]$AutoZip
)

$ServiceName = "embedding_service"
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
$deploymentZipsDirName = "DeploymentZIPs"

# Resolve absolute paths
try {
    $scriptDirAbsolute = (Resolve-Path -Path $scriptDir).Path

    # --- Initial Cleanup (Added) ---
    Write-Host "[$ServiceName] Cleaning up artifacts from previous runs..." -ForegroundColor DarkGray
    $localWheelsDirForCleanup = Join-Path -Path $scriptDirAbsolute -ChildPath $localWheelsDirRelative # $localWheelsDirRelative is "./wheels" from later
    $listFileForCleanup = Join-Path -Path $scriptDirAbsolute -ChildPath $listFileName # $listFileName is "downloaded_wheels_list.txt" from later

    if (Test-Path $localWheelsDirForCleanup -PathType Container) {
        Write-Host "[$ServiceName] Removing existing local wheels directory: $localWheelsDirForCleanup" -ForegroundColor DarkGray
        Remove-Item -Path $localWheelsDirForCleanup -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $listFileForCleanup -PathType Leaf) {
        Write-Host "[$ServiceName] Removing existing downloaded wheels list: $listFileForCleanup" -ForegroundColor DarkGray
        Remove-Item -Path $listFileForCleanup -Force -ErrorAction SilentlyContinue
    }
    # --- End Initial Cleanup ---

    $wheelsDirAbsolute = (Resolve-Path -Path (Join-Path -Path $scriptDirAbsolute -ChildPath $wheelsDirRelative)).Path
    $localWheelsDirAbsolute = Join-Path -Path $scriptDirAbsolute -ChildPath $localWheelsDirRelative
    $nltkDataDirAbsolute = Join-Path -Path $scriptDirAbsolute -ChildPath $nltkDataDirRelative
    $listFilePath = Join-Path -Path $scriptDirAbsolute -ChildPath $listFileName
    $requirementsFileAbsolute = (Resolve-Path -Path (Join-Path -Path $scriptDirAbsolute -ChildPath $requirementsFile)).Path
    $backendRootDir = (Resolve-Path (Join-Path -Path $scriptDirAbsolute -ChildPath "..")).Path
    $deploymentZipsDirAbsolute = Join-Path -Path $backendRootDir -ChildPath $deploymentZipsDirName
} catch {
    Write-Error "[$ServiceName] Error resolving initial paths: $_"
    exit 1
}

# --- Pre-checks ---
if (-not (Test-Path $requirementsFileAbsolute -PathType Leaf)) {
    Write-Error "[$ServiceName] Error: requirements.txt not found at $requirementsFileAbsolute"
    exit 1
}

if (-not (Test-Path $wheelsDirAbsolute -PathType Container)) {
    Write-Host "[$ServiceName] Creating central wheels directory: $wheelsDirAbsolute" -ForegroundColor Yellow
    try {
        New-Item -ItemType Directory -Path $wheelsDirAbsolute -ErrorAction Stop | Out-Null
    } catch {
        Write-Error "[$ServiceName] Failed to create central wheels directory '$wheelsDirAbsolute': $_"
        exit 1
    }
}

# --- Download Wheels using Docker ---
Write-Host "[$ServiceName] Running Docker to download Linux-compatible wheels to $wheelsDirAbsolute..." -ForegroundColor Yellow

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

# --- Docker Log File Setup (Added) ---
$logFileName = "${ServiceName}_pip_download.log"
$logFilePath = Join-Path -Path $scriptDirAbsolute -ChildPath $logFileName
Write-Host "[$ServiceName] Docker command output will be logged to: $logFilePath" -ForegroundColor Yellow
if (Test-Path $logFilePath -PathType Leaf) {
    Write-Host "[$ServiceName] Removing existing log file: $logFilePath" -ForegroundColor DarkGray
    Remove-Item -Path $logFilePath -Force -ErrorAction SilentlyContinue
}
# --- End Docker Log File Setup ---

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

Write-Host "[$ServiceName] Generating list of required wheels for ${listFilePath} by parsing log file: $logFilePath" -ForegroundColor Cyan
try {
    $requiredWheelsOutput = @{} # Use a hashtable to store unique wheel names
    $logFileContent = $null

    if (-not (Test-Path $logFilePath -PathType Leaf)) {
        Write-Warning "[$ServiceName] Log file $logFilePath not found. Cannot perform Priority 1 parsing from log."
    } else {
        $logFileContent = Get-Content -Path $logFilePath -ErrorAction SilentlyContinue
        if ($null -eq $logFileContent) {
            Write-Warning "[$ServiceName] Could not read the log file $logFilePath or it is empty for Priority 1 parsing."
        }
    }

    if ($null -ne $logFileContent) {
        # Priority 1: Explicitly mentioned wheel files (most reliable from log)
        foreach ($lineData_P1 in $logFileContent) { # Changed from $dockerCommandOutput
            $currentLine_P1 = [string]$lineData_P1 # Ensure it's a string
            $currentLine_P1 = $currentLine_P1.Trim() # ADDED: Trim the line first
            
            if ($currentLine_P1 -match 'packaging') { # Debug for packaging
                Write-Host "[$ServiceName] DEBUG: P1 Processing trimmed line containing 'packaging': '$($currentLine_P1)'" -ForegroundColor Magenta
            }

            if ($currentLine_P1 -match 'File was already downloaded /wheels/([^/]+\\.whl)') { # MODIFIED Regex
                $wheelName_P1 = $matches[1].Trim() # Trim captured name
                if ($wheelName_P1 -match 'packaging') { # Debug for packaging
                    Write-Host "[$ServiceName] DEBUG: P1 Matched 'File was already downloaded' for packaging: '$($wheelName_P1)'" -ForegroundColor Magenta
                }
                if (-not [string]::IsNullOrWhiteSpace($wheelName_P1)) {
                    $requiredWheelsOutput[$wheelName_P1] = $true
                } else {
                    # Write-Warning "[$ServiceName] DEBUG: P1 'File was already downloaded' matched on line '$($currentLine_P1.Substring(0, [System.Math]::Min($currentLine_P1.Length, 100)))...' but captured wheelName was empty." # Optional DEBUG
                }
            } elseif ($currentLine_P1 -match 'Saved /wheels/([^/]+\\.whl)') { # MODIFIED Regex
                $wheelName_P1 = $matches[1].Trim() # Trim captured name
                if ($wheelName_P1 -match 'packaging') { # Debug for packaging
                    Write-Host "[$ServiceName] DEBUG: P1 Matched 'Saved' for packaging: '$($wheelName_P1)'" -ForegroundColor Magenta
                }
                if (-not [string]::IsNullOrWhiteSpace($wheelName_P1)) {
                    $requiredWheelsOutput[$wheelName_P1] = $true
                } else {
                    # Write-Warning "[$ServiceName] DEBUG: P1 'Saved' matched on line '$($currentLine_P1.Substring(0, [System.Math]::Min($currentLine_P1.Length, 100)))...' but captured wheelName was empty." # Optional DEBUG
                }
            } elseif ($currentLine_P1 -match 'Downloading ([^/]+\\.whl)') {  # MODIFIED Regex
                $wheelName_P1 = $matches[1].Trim() # Trim captured name
                if ($wheelName_P1 -match 'packaging') { # Added debug for packaging
                    Write-Host "[$ServiceName] DEBUG: P1 Matched 'Downloading' for packaging: '$($wheelName_P1)'" -ForegroundColor Magenta
                }
                if (-not [string]::IsNullOrWhiteSpace($wheelName_P1)) {
                    $requiredWheelsOutput[$wheelName_P1] = $true
                } else {
                    # Write-Warning "[$ServiceName] DEBUG: P1 'Downloading' matched on line '$($currentLine_P1.Substring(0, [System.Math]::Min($currentLine_P1.Length, 100)))...' but captured wheelName was empty." # Optional DEBUG
                }
            }
        }
        # Write-Host "[$ServiceName] DEBUG: Priority 1 parsing complete. Found $($requiredWheelsOutput.Count) wheels." # Optional DEBUG
        # if ($requiredWheelsOutput.Count -gt 0) { $requiredWheelsOutput.Keys | ForEach-Object { Write-Host "[$ServiceName] DEBUG: Wheel from P1: $_" } } # Optional DEBUG
        
        # Specifically check if packaging-24.2 was captured by P1
        if ($requiredWheelsOutput.ContainsKey('packaging-24.2-py3-none-any.whl')) {
            Write-Host "[$ServiceName] DEBUG: P1 successfully captured 'packaging-24.2-py3-none-any.whl'" -ForegroundColor Magenta
        } else {
            Write-Warning "[$ServiceName] DEBUG: P1 DID NOT capture 'packaging-24.2-py3-none-any.whl'. Investigating why..."
            # Try to find the line again for diagnostics
            foreach ($lineData_Debug in $logFileContent) {
                $currentLine_Debug = [string]$lineData_Debug
                # Test on the raw line first for comparison
                if ($currentLine_Debug -match 'File was already downloaded /wheels/packaging-24\.2-py3-none-any\.whl') {
                    Write-Host "[$ServiceName] DEBUG: Found raw log line for packaging 24.2: '$($currentLine_Debug)'" -ForegroundColor DarkYellow
                    
                    $trimmedLine_Debug = $currentLine_Debug.Trim()
                    Write-Host "[$ServiceName] DEBUG: Trimmed debug line: '$($trimmedLine_Debug)'" -ForegroundColor DarkYellow

                    # Output character codes for the beginning of the string (original and trimmed)
                    $charOutput = "[$ServiceName] DEBUG: Char codes for start of RAW line: "
                    for ($i = 0; $i -lt [System.Math]::Min(5, $currentLine_Debug.Length); $i++) {
                        $charOutput += "$([int]$currentLine_Debug[$i]) "
                    }
                    Write-Host $charOutput -ForegroundColor DarkYellow
                    $charOutputTrimmed = "[$ServiceName] DEBUG: Char codes for start of TRIMMED line: "
                    for ($i = 0; $i -lt [System.Math]::Min(5, $trimmedLine_Debug.Length); $i++) {
                        $charOutputTrimmed += "$([int]$trimmedLine_Debug[$i]) "
                    }
                    Write-Host $charOutputTrimmed -ForegroundColor DarkYellow

                    # Test regex directly on the TRIMMED line
                    if ($trimmedLine_Debug -match 'File was already downloaded /wheels/([^/]+\\.whl)') { # MODIFIED Regex, Test on trimmed, without ^\\s*
                        Write-Host "[$ServiceName] DEBUG: Regex test (on trimmed line, no ^\\s*) successful. Match: $($matches[1])" -ForegroundColor DarkCyan
                    } else {
                        Write-Warning "[$ServiceName] DEBUG: Regex test (on trimmed line, no ^\\s*) FAILED."
                    }
                    break
                }
            }
        }
        
        # If the above captured nothing (e.g., all wheels were already in Docker layer, minimal output),
        # then try to use the "Successfully downloaded" line carefully.
        if ($requiredWheelsOutput.Count -eq 0) {
            Write-Warning "[$ServiceName] No wheels identified from direct 'downloaded/saved/downloading' lines from log (P1). Parsing 'Successfully downloaded...' line from log (P2)."
            $successfullyDownloadedPattern = 'Successfully downloaded\s+([a-zA-Z0-9._\s-]+)' # Capture the whole list of names
            
            if ($null -ne $logFileContent) {
                $logOutputString = $logFileContent -join [System.Environment]::NewLine # Use log content

                if ($logOutputString -match $successfullyDownloadedPattern) {
                    $packageListString = $matches[1].Trim()
                    $packageNames = $packageListString -split '\\s+' | Where-Object { $_ }

                    foreach ($packageNameToList in $packageNames) {
                        $pkgBaseName = $packageNameToList.Replace('_', '-').ToLower() # Normalize to hyphenated lowercase

                        # Find all wheels in cache that could match this package base name
                        $candidateWheels = $wheelsInCache | Where-Object { 
                            $_.Name.Replace('_', '-').ToLower() -like "$pkgBaseName-*" 
                        } | Sort-Object -Property Name -Descending # Get newest/highest version first

                        if ($candidateWheels.Count -gt 0) {
                            $chosenWheel = $candidateWheels[0] # Pick the "best" match (likely latest version)
                            if (-not $requiredWheelsOutput.ContainsKey($chosenWheel.Name)) {
                                $requiredWheelsOutput[$chosenWheel.Name] = $true
                                Write-Host "[$ServiceName] Added '$($chosenWheel.Name)' for package '$packageNameToList' from 'Successfully downloaded' list." -ForegroundColor DarkGray
                            }
                        } else {
                            Write-Warning "[$ServiceName] Package '$packageNameToList' from 'Successfully downloaded' list had no matching wheel in cache $wheelsDirAbsolute."
                        }
                    }
                } else {
                    Write-Warning "[$ServiceName] P2: Log file content was not available for 'Successfully downloaded' parsing."
                }
            } else {
                Write-Warning "[$ServiceName] P2: Log file content was not available for 'Successfully downloaded' parsing."
            }
        }
        
        # If still no wheels, then as a last resort, use the "Collecting" lines, but be very careful.
        # This is often the source of multiple versions or incorrect versions.
        if ($requiredWheelsOutput.Count -eq 0) {
            Write-Warning "[$ServiceName] Still no wheels (P1 & P2 failed). Parsing 'Collecting...' lines from log as a last resort (P3). This may be less accurate."
            if ($null -ne $logFileContent) { # Check if log content is available
                foreach ($line in $logFileContent) { # Changed from $dockerCommandOutput
                    if ($line -match '^Collecting ([a-zA-Z0-9._-]+)') {
                        $packageNameFromCollecting = $matches[1].Trim()
                        $pkgBaseName = $packageNameFromCollecting.Replace('_', '-').ToLower()

                        # Avoid adding if a variant of this package is already captured
                        $alreadyCaptured = $false
                        foreach ($existingWheelName in $requiredWheelsOutput.Keys) {
                            if ($existingWheelName.Replace('_', '-').ToLower() -like "$pkgBaseName-*") {
                                $alreadyCaptured = $true
                                break
                            }
                        }

                        if (-not $alreadyCaptured) {
                            $candidateWheels = $wheelsInCache | Where-Object { 
                                $_.Name.Replace('_', '-').ToLower() -like "$pkgBaseName-*"
                            } | Sort-Object -Property Name -Descending

                            if ($candidateWheels.Count -gt 0) {
                                $chosenWheel = $candidateWheels[0]
                                if (-not $requiredWheelsOutput.ContainsKey($chosenWheel.Name)) {
                                    $requiredWheelsOutput[$chosenWheel.Name] = $true
                                    Write-Host "[$ServiceName] Added '$($chosenWheel.Name)' for collecting package '$packageNameFromCollecting'." -ForegroundColor DarkGray
                                }
                            } else {
                                 Write-Warning "[$ServiceName] 'Collecting' line for '$packageNameFromCollecting', but no matching wheel found in cache."
                            }
                        }
                    }
                }
            } else {
                Write-Warning "[$ServiceName] P3: Log file content was not available for 'Collecting...' parsing."
            }
        }

        $requiredWheels = $requiredWheelsOutput.Keys | Sort-Object
        
        if ($requiredWheels.Count -eq 0) {
            Write-Error "[$ServiceName] CRITICAL: No wheels identified after all parsing attempts. The wheels list will be empty. Check Docker logs carefully."
        } else {
            Write-Host "[$ServiceName] Identified $($requiredWheels.Count) required wheel files after refined parsing." -ForegroundColor Green
        }
        
        $requiredWheels = $requiredWheels | Where-Object { $_ -notlike 'pip-*.whl' } # Exclude pip wheels
        $requiredWheels | Out-File -FilePath $listFilePath -Encoding utf8 -ErrorAction Stop
        Write-Host "[$ServiceName] List of required wheels saved to $listFilePath." -ForegroundColor Green

        # Retain source package listing if any were found by original script logic
        $sourcePackages = $allDownloadedFilesInCache | Where-Object { $_.Name -like "*.tar.gz" -or $_.Name -like "*.zip" }
        if ($sourcePackages.Count -gt 0) {
            Write-Host "[$ServiceName] The following packages were found as source packages in the cache:" -ForegroundColor Yellow
            foreach ($pkg in $sourcePackages) {
                Write-Host "  - $($pkg.Name)" -ForegroundColor Yellow
            }
            Write-Host "[$ServiceName] Ensure your Dockerfile includes necessary build tools (gcc, python-dev, etc.) if these are needed and not covered by wheels." -ForegroundColor Yellow
        }

    }

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
$nltkRequired = $false
try {
    $nltkRequired = Get-Content $requirementsFileAbsolute | Select-String -Pattern '^nltk\b' -Quiet
} catch { Write-Warning "[$ServiceName] Could not read requirements file to check for NLTK." }

if ($nltkRequired) {
    Write-Host "[$ServiceName] NLTK requirement detected." -ForegroundColor Yellow
    if (-not (Test-Path $nltkDataDirAbsolute -PathType Container)) {
        Write-Host "[$ServiceName] Creating NLTK data directory: $nltkDataDirAbsolute" -ForegroundColor Yellow
        try {
            New-Item -ItemType Directory -Path $nltkDataDirAbsolute -ErrorAction Stop | Out-Null
        } catch {
            Write-Error "[$ServiceName] Failed to create NLTK data directory '$nltkDataDirAbsolute': $_"
        }
    }
    Write-Warning "[$ServiceName] NLTK data download logic is not implemented yet. Please handle manually if needed for airgapped environment."
}

# --- Final Instructions --- 
Write-Host ""
Write-Host "[$ServiceName] Wheels and source packages are downloaded to central location: $wheelsDirAbsolute" -ForegroundColor Cyan
Write-Host "[$ServiceName] Required wheels copied to local location: $localWheelsDirAbsolute" -ForegroundColor Cyan
Write-Host "[$ServiceName] To use in airgapped environment:" -ForegroundColor Cyan
Write-Host "   1. Copy the '$ServiceName' directory (containing the local '$localWheelsDirRelative' folder) to the target machine." -ForegroundColor White
Write-Host "   2. If source packages are needed and listed above, ensure '$wheelsDirAbsolute' is also available or they are copied, and build tools are in Docker."
Write-Host "   3. In your Dockerfile, add build dependencies and install from the wheels/source packages:" -ForegroundColor White
Write-Host "      - FROM python:3.12-slim" -ForegroundColor White
Write-Host "      - COPY requirements.txt /app/" -ForegroundColor White
Write-Host "      - COPY $localWheelsDirRelative /wheels/" -ForegroundColor White 
Write-Host "      - RUN apt-get update && apt-get install -y build-essential gcc python3-dev cmake # Example build tools" -ForegroundColor White
Write-Host "      - RUN pip install --no-cache-dir --find-links=/wheels -r /app/requirements.txt" -ForegroundColor White
Write-Host "   4. Source packages will be built at install time with the build dependencies you installed" -ForegroundColor White

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
        Compress-Archive -Path (Join-Path $scriptDirAbsolute '*') -DestinationPath $zipFilePath -Force -ErrorAction Stop
        Write-Host "[$ServiceName] Created $zipFilePath" -ForegroundColor Green
        if (-not (Test-Path $deploymentZipsDirAbsolute -PathType Container)) {
            Write-Host "[$ServiceName] Creating deployment zips directory: $deploymentZipsDirAbsolute" -ForegroundColor Yellow
            try {
                New-Item -ItemType Directory -Path $deploymentZipsDirAbsolute -ErrorAction Stop | Out-Null
            } catch {
                Write-Error "[$ServiceName] Failed to create deployment zips directory '$deploymentZipsDirAbsolute': $_"
                throw
            }
        }
        $finalZipPath = Join-Path -Path $deploymentZipsDirAbsolute -ChildPath $zipFileName
        Move-Item -Path $zipFilePath -Destination $finalZipPath -Force -ErrorAction Stop
        Write-Host "[$ServiceName] Moved $zipFileName to $finalZipPath" -ForegroundColor Green
        Write-Host "[$ServiceName] Transfer this file from $deploymentZipsDirAbsolute for your airgapped environment." -ForegroundColor Cyan
    } catch {
        Write-Error "[$ServiceName] Failed to create or move zip archive: $_"
    }
}

Write-Host "[$ServiceName] Script finished." -ForegroundColor Cyan 