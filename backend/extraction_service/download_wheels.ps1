# PowerShell script to download Linux-compatible Python wheels for extraction_service
# Uses Docker for compatibility and copies required wheels locally.

param(
    [Parameter()]
    [switch]$AutoZip
)

$ServiceName = "extraction_service"
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
python -m pip download --dest /wheels --prefer-binary --platform manylinux2014_x86_64 --python-version 3.12 --only-binary=:all: --no-binary=:none: -r /reqs/requirements.txt
'@

$dockerArgs = @(
    "run", "--rm",
    "-v", "$normalizedWheelsPath`:/wheels",
    "-v", "$normalizedRequirementsPath`:/reqs/requirements.txt:ro",
    "python:3.12-slim",
    "bash", "-c",
    $bashCommand
)

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

Write-Host "[$ServiceName] Generating list of required wheels for ${listFilePath}" -ForegroundColor Cyan
try {
    # We'll extract wheel information from the Docker output by looking for package references
    $requiredWheels = @()
    $processedPackages = @{}  # Use a hashtable for faster lookups
    
    # Extract all wheel filenames directly mentioned in the output
    # Look for patterns like "File was already downloaded /wheels/package-name.whl"
    # or "Saved /wheels/package-name.whl" or "Downloading package-name.whl"
    foreach ($line in $dockerCommandOutput) {
        if ($line -match 'File was already downloaded /wheels/([^/]+\.whl)') {
            $wheelName = $matches[1]
            if (-not $processedPackages.ContainsKey($wheelName)) { $processedPackages[$wheelName] = $true }
        } elseif ($line -match 'Saved /wheels/([^/]+\.whl)') { # Common pattern for actual downloads
            $wheelName = $matches[1]
            if (-not $processedPackages.ContainsKey($wheelName)) { $processedPackages[$wheelName] = $true }
        } elseif ($line -match 'Downloading ([^/]+\.whl)') { # Another download pattern
            $wheelName = $matches[1]
            if (-not $processedPackages.ContainsKey($wheelName)) { $processedPackages[$wheelName] = $true }
        }
    }

    # From lines like "Successfully downloaded fastapi pydantic ...", extract those package names
    # and find the corresponding wheel files from $wheelsInCache.
    # This regex captures the package names after "Successfully downloaded"
    $successfullyDownloadedPattern = 'Successfully downloaded\\s+(.*)'
    $dockerOutputString = $dockerCommandOutput -join [System.Environment]::NewLine
    
    if ($dockerOutputString -match $successfullyDownloadedPattern) {
        $packageListString = $matches[1]
        $packageNames = $packageListString -split '\\s+' | Where-Object { $_ } # Split by space and remove empty strings
        
        foreach ($packageName in $packageNames) {
            $packageNameClean = $packageName.Trim()
            $packageNameUnderscore = $packageNameClean.Replace('-', '_') # Handle hyphen/underscore variations
            
            $matchingWheels = $wheelsInCache | Where-Object {
                $_.Name -like "$packageNameClean-*.whl" -or
                $_.Name -like "$packageNameUnderscore-*.whl"
            }
            
            foreach ($wheel in $matchingWheels) {
                if (-not $processedPackages.ContainsKey($wheel.Name)) {
                    $processedPackages[$wheel.Name] = $true
                }
            }
        }
    }
    
    # Convert the hashtable keys to an array and sort
    $requiredWheels = $processedPackages.Keys | Sort-Object
    
    # Fallback if pip output parsing yielded no wheels (e.g., all from cache, different log format)
    if ($requiredWheels.Count -eq 0) {
        Write-Warning "[$ServiceName] No wheels identified from primary pip output parsing. Attempting fallback: checking 'Collecting' lines."
        # Fallback: Try to match based on "Collecting" lines if the primary method failed
        foreach ($line in $dockerCommandOutput) {
            if ($line -match '^Collecting ([a-zA-Z0-9._-]+)') {
                $packageName = $matches[1].Trim()
                $packageNameUnderscore = $packageName.Replace('-', '_')
                
                $matchingWheels = $wheelsInCache | Where-Object {
                    $_.Name -like "$packageName-*.whl" -or
                    $_.Name -like "$packageNameUnderscore-*.whl"
                }
                foreach ($wheel in $matchingWheels) {
                    if (-not $processedPackages.ContainsKey($wheel.Name)) {
                        $processedPackages[$wheel.Name] = $true
                    }
                }
            }
        }
        $requiredWheels = $processedPackages.Keys | Sort-Object
    }

    if ($requiredWheels.Count -eq 0) {
        Write-Error "[$ServiceName] No wheels were identified from pip output parsing. This is unexpected. Check Docker logs. The list file will be empty or reflect all cache items as a last resort."
        # As a last resort if other methods fail, list all wheels in cache for this service,
        # though this defeats the purpose of precise listing. Or leave it empty.
        # For now, we'll leave it potentially empty or let it fail if no wheels, to highlight the issue.
        # Consider adding: $requiredWheels = $wheelsInCache | Select-Object -ExpandProperty Name | Sort-Object
        # if a full list is preferred over an empty one on complete failure of parsing.
        # However, the problem description implies we want *accurate* lists, so an empty list upon failure is more indicative.
    } else {
        Write-Host "[$ServiceName] Identified $($requiredWheels.Count) required wheel files by parsing pip output." -ForegroundColor Green
    }
    
    $requiredWheels | Out-File -FilePath $listFilePath -Encoding utf8 -ErrorAction Stop
    Write-Host "[$ServiceName] List of required wheels saved to $listFilePath." -ForegroundColor Green

} catch {
    Write-Error "[$ServiceName] Error saving wheel list to file '$listFilePath': $_"
    # Consider whether to exit or continue if list saving fails
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

# --- NLTK Data Handling ---
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
    
    if (Test-Path $nltkDataDirAbsolute -PathType Container) {
        $nltkPackages = @('punkt', 'averaged_perceptron_tagger')
        $nltkPackagesString = $nltkPackages -join ' '
        $normalizedNltkDataPath = Normalize-DockerPath -path $nltkDataDirAbsolute
        
        Write-Host "[$ServiceName] Downloading NLTK data ($nltkPackagesString) using Docker..." -ForegroundColor Yellow
        $nltkDockerArgs = @(
            "run", "--rm",
            "-v", "$normalizedNltkDataPath`:/usr/share/nltk_data",
            "python:3.12-slim",
            "bash", "-c",
            ('pip install --no-cache-dir nltk && python -m nltk.downloader -d /usr/share/nltk_data ' + $nltkPackagesString)
        )
        & docker @nltkDockerArgs
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "[$ServiceName] NLTK data download command failed with exit code $LASTEXITCODE. Check Docker logs."
        } else {
            Write-Host "[$ServiceName] NLTK data download completed successfully." -ForegroundColor Green
        }
    } else {
         Write-Error "[$ServiceName] Cannot download NLTK data because directory '$nltkDataDirAbsolute' could not be created or found."
    }
}

# --- Final Instructions --- 
Write-Host ""
Write-Host "[$ServiceName] Wheels are downloaded to central location: $wheelsDirAbsolute" -ForegroundColor Cyan
Write-Host "[$ServiceName] Required wheels copied to local location: $localWheelsDirAbsolute" -ForegroundColor Cyan
if ($nltkRequired) {
    Write-Host "[$ServiceName] Required NLTK data downloaded to local location: $nltkDataDirAbsolute" -ForegroundColor Cyan
}
Write-Host "[$ServiceName] To use in airgapped environment:" -ForegroundColor Cyan
Write-Host "   1. Copy the '$ServiceName' directory (containing the local '$localWheelsDirRelative' folder) to the target machine." -ForegroundColor White
if ($nltkRequired) {
    Write-Host "   2. Ensure the '$nltkDataDirRelative' folder is populated with required NLTK data and copied." -ForegroundColor White
}

$stepNumDockerfile = if ($nltkRequired) { 3 } else { 2 }
$stepNumDeployScript = if ($nltkRequired) { 4 } else { 3 }

Write-Host "   $stepNumDockerfile. Update Dockerfile build process if necessary to use '$localWheelsDirRelative'. (Note: May need extra steps for source packages)" -ForegroundColor White
Write-Host "   $stepNumDeployScript. Run deployment scripts (e.g., airgapped_deploy.ps1) which should use the local wheels/data." -ForegroundColor White

# Create a package.zip file for easy transfer
$doZip = $false
if ($AutoZip) {
    $doZip = $true
    Write-Host "[$ServiceName] Auto-zipping enabled via parameter." -ForegroundColor DarkGray
} else {
    Write-Host ""
    Write-Host "[$ServiceName] Would you like to create a zip archive of the $ServiceName directory (including local wheels/data) for transfer? (Y/N)" -ForegroundColor Yellow
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