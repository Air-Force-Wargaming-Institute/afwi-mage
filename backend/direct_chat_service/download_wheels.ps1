# PowerShell script to download Linux-compatible Python wheels for direct_chat_service
# Uses Docker for compatibility and copies required wheels locally.

param(
    [Parameter()]
    [switch]$AutoZip
)

$ServiceName = "direct_chat_service"
Write-Host "[$ServiceName] Downloading Linux-compatible wheels for airgapped installation..." -ForegroundColor Cyan

Write-Host "[$ServiceName] Cleaning up artifacts from previous runs..." -ForegroundColor DarkGray

# --- Path Definitions (early definitions for cleanup) ---
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$wheelsDirRelative = "../backend_wheels"
$localWheelsDirRelative = "./wheels"
$nltkDataDirRelative = "./nltk_data" # Standard location for NLTK data
$listFileName = "downloaded_wheels_list.txt"
$requirementsFile = "requirements.txt"
$deploymentZipsDirName = "DeploymentZIPs"
$logFileName = "${ServiceName}_pip_download.log"

# Resolve absolute paths for cleanup targets
$scriptDirAbsoluteForCleanup = (Resolve-Path -Path $scriptDir).Path
$localWheelsDirAbsoluteForCleanup = Join-Path -Path $scriptDirAbsoluteForCleanup -ChildPath $localWheelsDirRelative
$listFilePathForCleanup = Join-Path -Path $scriptDirAbsoluteForCleanup -ChildPath $listFileName

# Delete local wheels directory if it exists
if (Test-Path $localWheelsDirAbsoluteForCleanup -PathType Container) {
    Write-Host "[$ServiceName] Removing existing local wheels directory: $localWheelsDirAbsoluteForCleanup" -ForegroundColor DarkGray
    Remove-Item -Path $localWheelsDirAbsoluteForCleanup -Recurse -Force -ErrorAction SilentlyContinue
}

# Define and delete downloaded_wheels_list.txt if it exists
if (Test-Path $listFilePathForCleanup -PathType Leaf) {
    Write-Host "[$ServiceName] Removing existing downloaded wheels list: $listFilePathForCleanup" -ForegroundColor DarkGray
    Remove-Item -Path $listFilePathForCleanup -Force -ErrorAction SilentlyContinue
}

# Check if Docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "[$ServiceName] Error: Docker is required but not found in PATH. Please install Docker."
    exit 1
}

# --- Path Definitions ---
$scriptDirAbsolute = (Resolve-Path -Path $scriptDir).Path
$wheelsDirAbsolute = (Resolve-Path -Path (Join-Path -Path $scriptDirAbsolute -ChildPath $wheelsDirRelative)).Path
$nltkDataDirAbsolute = Join-Path -Path $scriptDirAbsolute -ChildPath $nltkDataDirRelative
$listFilePath = Join-Path -Path $scriptDirAbsolute -ChildPath $listFileName
$logFilePath = Join-Path -Path $scriptDirAbsolute -ChildPath $logFileName
$requirementsFileAbsolute = (Resolve-Path -Path (Join-Path -Path $scriptDirAbsolute -ChildPath $requirementsFile)).Path
$backendRootDir = (Resolve-Path (Join-Path -Path $scriptDirAbsolute -ChildPath "..")).Path
$deploymentZipsDirAbsolute = Join-Path -Path $backendRootDir -ChildPath $deploymentZipsDirName

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

# Ensure a fresh log file for each run by deleting the old one if it exists
Write-Host "[$ServiceName] Docker command output will be logged to: $logFilePath" -ForegroundColor Yellow
if (Test-Path $logFilePath -PathType Leaf) {
    Write-Host "[$ServiceName] Removing existing log file: $logFilePath" -ForegroundColor DarkGray
    Remove-Item -Path $logFilePath -Force -ErrorAction SilentlyContinue
}

$dockerCommandOutput = & docker @dockerArgs 2>&1 | Tee-Object -FilePath $logFilePath -Append | Tee-Object -Variable dockerFullOutputForLogging | ForEach-Object { Write-Host $_; $_ }

if ($LASTEXITCODE -ne 0) {
    Write-Warning "[$ServiceName] Docker command finished with a non-zero exit code: $LASTEXITCODE. Pip download might have failed for some packages. The generated wheel list might be incomplete."
} else {
    Write-Host "[$ServiceName] Docker wheel download command finished successfully." -ForegroundColor Green
}

# --- List Downloaded Wheels & Save List ---
# $allDownloadedFilesInCache = Get-ChildItem -Path $wheelsDirAbsolute # No longer primary source for the list

Write-Host "[$ServiceName] Parsing Docker output from log file to identify required wheels for ${listFilePath}" -ForegroundColor Cyan
try {
    $identifiedWheels = @()

    if (-not (Test-Path $logFilePath -PathType Leaf)) {
        Write-Warning "[$ServiceName] Log file $logFilePath not found. Cannot parse for wheels."
    } else {
        $logFileContent = Get-Content -Path $logFilePath -ErrorAction SilentlyContinue
        if ($null -eq $logFileContent) {
            Write-Warning "[$ServiceName] Could not read the log file $logFilePath or it is empty. Wheel list might be incomplete."
        } else {
            # Regex to find wheel files mentioned in Docker output from lines like:
            # "Saved /wheels/some_package-1.2.3-py3-none-any.whl"
            # "File was already downloaded /wheels/another_package-4.5.6-py3-none-any.whl"
            # "Collecting somepackage==1.0 (from -r /reqs/requirements.txt (line X))" followed by "Using cached some_package-1.0-py3-none-any.whl (9.0 kB)" or "File was already downloaded /wheels/..."
            # It's important to only get the basename of the .whl file.
            
            # First pass: Explicit "Saved" or "File was already downloaded"
            $logFileContent | ForEach-Object {
                if ($_ -match "(?i)Saved /wheels/([a-zA-Z0-9_.-]+\.whl)") { 
                    $wheelName = $Matches[1].Trim()
                    if ($wheelName -notcontains "..") {
                         $identifiedWheels += $wheelName
                    }
                } elseif ($_ -match "(?i)File was already downloaded /wheels/([a-zA-Z0-9_.-]+\.whl)") { 
                    $wheelName = $Matches[1].Trim()
                    if ($wheelName -notcontains "..") {
                         $identifiedWheels += $wheelName
                    }
                } elseif ($_ -match "(?i)Using cached ([a-zA-Z0-9_.-]+\.whl)") { 
                    $wheelName = $Matches[1].Trim()
                    if ($wheelName -notcontains "..") {
                        $identifiedWheels += $wheelName
                    }
                }
            }
            
            # Second pass: For lines like "Processing /wheels/numpy-1.26.4-cp312-cp312-manylinux_2_17_x86_64.manylinux2014_x86_64.whl"
            # and other lines that might just contain the path to a wheel file.
            $logFileContent | ForEach-Object {
                if ($_ -match "(?i)/wheels/([a-zA-Z0-9_.-]+\.whl)") { 
                    $wheelName = $Matches[1].Trim()
                    if ($wheelName -notcontains ".." -and $wheelName -notcontains " ") { 
                         $identifiedWheels += $wheelName
                    }
                }
            }
        }
    }
    # Deduplicate and sort
    $requiredWheels = $identifiedWheels | Sort-Object -Unique
    
    if ($requiredWheels.Count -eq 0) {
        # Fallback or error if parsing fails to find any wheels, 
        # but pip download might have still populated the cache.
        # This indicates a potential issue with parsing or pip output format change.
        Write-Warning "[$ServiceName] Could not identify specific wheels from Docker output. Will attempt to list ALL wheels from cache as a fallback. THIS MAY INCLUDE EXTRA WHEELS."
        
        # Fallback to original behavior IF NO WHEELS AT ALL were identified from output.
        # This is a safety net, but the goal is for the parsing above to work.
        $allWheelsInCacheFALLBACK = Get-ChildItem -Path $wheelsDirAbsolute -Filter "*.whl" | Select-Object -ExpandProperty Name
        if ($allWheelsInCacheFALLBACK.Count -gt 0) {
            $requiredWheels = $allWheelsInCacheFALLBACK | Sort-Object -Unique
            Write-Warning "[$ServiceName] Fallback: Identified $($requiredWheels.Count) wheels from the cache directory."
        } else {
            Write-Error "[$ServiceName] No wheels were identified from Docker output AND no wheels found in the cache directory $wheelsDirAbsolute. Check Docker output for errors."
            exit 1
        }
    } else {
        Write-Host "[$ServiceName] Identified $($requiredWheels.Count) specific wheel files from Docker output log for this service." -ForegroundColor Green
    }
    
    # Save the list to the file
    $requiredWheels | Out-File -FilePath $listFilePath -Encoding utf8 -ErrorAction Stop
    Write-Host "[$ServiceName] List of required wheels saved to $listFilePath." -ForegroundColor Green

    # Listing of source packages can remain as it's informational
    $allDownloadedFilesInCache = Get-ChildItem -Path $wheelsDirAbsolute # Still useful for sdist warning
    $sourcePackages = $allDownloadedFilesInCache | Where-Object { $_.Name -like "*.tar.gz" -or $_.Name -like "*.zip" }
    if ($sourcePackages.Count -gt 0) {
        Write-Host "[$ServiceName] The following packages were found as source packages in the cache:" -ForegroundColor Yellow
        foreach ($pkg in $sourcePackages) {
            Write-Host "  - $($pkg.Name)" -ForegroundColor Yellow
        }
        Write-Host "[$ServiceName] Ensure your Dockerfile includes necessary build tools (gcc, python-dev, etc.) if these are needed and not covered by wheels." -ForegroundColor Yellow
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
Write-Host "[$ServiceName] Wheels are downloaded to central location: $wheelsDirAbsolute" -ForegroundColor Cyan
Write-Host "[$ServiceName] Required wheels copied to local location: $localWheelsDirAbsolute" -ForegroundColor Cyan
Write-Host "[$ServiceName] To use in airgapped environment:" -ForegroundColor Cyan
Write-Host "   1. Copy the '$ServiceName' directory (containing the local '$localWheelsDirRelative' folder) to the target machine." -ForegroundColor White
Write-Host "   3. Update Dockerfile build process if necessary to use '$localWheelsDirRelative'." -ForegroundColor White
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