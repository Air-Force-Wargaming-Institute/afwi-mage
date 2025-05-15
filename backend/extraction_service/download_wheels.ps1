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

$dockerArgs = @(
    "run", "--rm",
    "-v", "$normalizedWheelsPath`:/wheels",
    "-v", "$normalizedRequirementsPath`:/reqs/requirements.txt:ro",
    "python:3.12-slim",
    "bash", "-c",
    'python -m pip install --upgrade pip && pip download --dest /wheels --prefer-binary --platform manylinux2014_x86_64 --python-version 3.12 --only-binary=:all: --no-binary=:none: -r /reqs/requirements.txt || echo "Pip download finished, some packages might be source only."'
)
& docker @dockerArgs

if ($LASTEXITCODE -ne 0) {
    Write-Warning "[$ServiceName] Docker command finished with non-zero exit code ($LASTEXITCODE). This might be okay if source packages were downloaded, check Docker logs."
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

Write-Host "[$ServiceName] Saving list of required wheels to: ${listFilePath}" -ForegroundColor Cyan
try {
    # Regenerate list based on requirements.txt, not just directory contents
    $requiredPackages = Get-Content $requirementsFileAbsolute | Where-Object { $_ -notmatch '^(#|\s*$)' } | ForEach-Object {
        $packageName = ($_ -split '[<>=!~\[\]\s]')[0].Trim() # Get base name, split by more delimiters
        if ($packageName) { $packageName } # Ensure we don't add empty strings
    }
    
    $foundWheels = @()
    foreach ($reqItem in $requiredPackages) {
        # Normalize current requirement name from list to underscores for matching against wheel names
        $escapedReqHyphen = [regex]::Escape($reqItem) # Original form (e.g., python-dotenv)
        $escapedReqUnderscore = [regex]::Escape($reqItem.Replace('-', '_')) # Underscore form (e.g., python_dotenv)

        $matchingWheel = $wheels | Where-Object { 
            $_.Name -match "^${escapedReqHyphen}(-|_)" -or 
            $_.Name -match "^${escapedReqUnderscore}(-|_)" 
        } | Select-Object -First 1 # Select first match if multiple (e.g. due to different wheel tags but same version)

        if ($matchingWheel) {
            $foundWheels += $matchingWheel.Name
        } else {
            Write-Warning "[$ServiceName] No downloaded wheel found for requirement '$reqItem' in $wheelsDirAbsolute"
        }
    }

    $foundWheels | Out-File -FilePath $listFilePath -Encoding utf8 -ErrorAction Stop
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

# --- NLTK Data Handling ---
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
    
    # Download required NLTK data using Docker
    if (Test-Path $nltkDataDirAbsolute -PathType Container) {
        $nltkPackages = @('punkt', 'averaged_perceptron_tagger') # Packages needed by this service
        $nltkPackagesString = $nltkPackages -join ' '
        $normalizedNltkDataPath = Normalize-DockerPath -path $nltkDataDirAbsolute
        
        Write-Host "[$ServiceName] Downloading NLTK data ($nltkPackagesString) using Docker..." -ForegroundColor Yellow
        # Mount to /usr/share/nltk_data which is a common place nltk looks
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

    # Placeholder: Remind user to handle NLTK data manually. - REMOVED
    # Write-Warning "[$ServiceName] NLTK data must be manually placed in the nltk_data folder for airgapped deployment." 
    # Write-Host "[$ServiceName] Please ensure required NLTK data packages (e.g., 'punkt', 'averaged_perceptron_tagger') exist in '$nltkDataDirAbsolute'.\" -ForegroundColor Yellow
}

# --- Final Instructions --- 
Write-Host ""
Write-Host "[$ServiceName] Wheels are downloaded to central location: $wheelsDirAbsolute" -ForegroundColor Cyan
Write-Host "[$ServiceName] Required wheels copied to local location: $localWheelsDirAbsolute" -ForegroundColor Cyan
if ($nltkRequired) {
    Write-Host "[$ServiceName] Required NLTK data downloaded to local location: $nltkDataDirAbsolute\" -ForegroundColor Cyan
}
Write-Host "[$ServiceName] To use in airgapped environment:" -ForegroundColor Cyan
Write-Host "   1. Copy the '$ServiceName' directory (containing the local '$localWheelsDirRelative' folder) to the target machine." -ForegroundColor White
if ($nltkRequired) {
    Write-Host "   2. Ensure the '$nltkDataDirRelative' folder is populated with required NLTK data and copied." -ForegroundColor Yellow
}

# Determine the step number based on whether NLTK is required
$stepNumDockerfile = 2
$stepNumDeployScript = 3
if ($nltkRequired) {
    $stepNumDockerfile = 3
    $stepNumDeployScript = 4
}

Write-Host "   $stepNumDockerfile. Update Dockerfile build process if necessary to use '$localWheelsDirRelative'. (Note: May need extra steps for source packages)" -ForegroundColor Yellow
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