# PowerShell script to copy required wheels from a central location based on a list
# Service: chat_service

# Get the directory where the script is located (chat_service)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Define paths relative to the script location
$listFileName = "downloaded_wheels_list.txt"
$listFilePath = Join-Path -Path $scriptDir -ChildPath $listFileName
$sourceWheelsDirRelative = "../backend_wheels"
$destWheelsDirRelative = "./wheels"

# Resolve absolute paths
try {
    $sourceWheelsDirAbsoluteCheck = Join-Path -Path $scriptDir -ChildPath $sourceWheelsDirRelative
    if (Test-Path $sourceWheelsDirAbsoluteCheck) {
        $sourceWheelsDirAbsolute = (Resolve-Path -Path $sourceWheelsDirAbsoluteCheck).Path
    } else {
        Write-Error "Source wheels directory path does not exist: $sourceWheelsDirAbsoluteCheck"
        exit 1
    }

    $destWheelsDirAbsoluteCheck = Join-Path -Path $scriptDir -ChildPath $destWheelsDirRelative
    # Destination might not exist yet, resolve script dir first
    $scriptDirAbsolute = (Resolve-Path -Path $scriptDir).Path
    $destWheelsDirAbsolute = Join-Path -Path $scriptDirAbsolute -ChildPath $destWheelsDirRelative

} catch {
    Write-Error "Error resolving paths: $_"
    exit 1
}


# --- Pre-checks ---

# Check if the list file exists
if (-not (Test-Path $listFilePath -PathType Leaf)) {
    Write-Error "Wheel list file not found: $listFilePath"
    exit 1
}

# Check if the source wheels directory exists (redundant check, but safe)
if (-not (Test-Path $sourceWheelsDirAbsolute -PathType Container)) {
    Write-Error "Source wheels directory not found: $sourceWheelsDirAbsolute"
    Write-Error "Please ensure wheels have been downloaded using download_wheels.ps1 or similar."
    exit 1
}

# Ensure the destination wheels directory exists
if (-not (Test-Path $destWheelsDirAbsolute -PathType Container)) {
    Write-Host "Creating destination wheels directory: $destWheelsDirAbsolute" -ForegroundColor Yellow
    try {
        New-Item -ItemType Directory -Path $destWheelsDirAbsolute -ErrorAction Stop | Out-Null
    } catch {
        Write-Error "Failed to create destination directory '$destWheelsDirAbsolute': $_"
        exit 1
    }
}

# --- Copying Logic ---

Write-Host "Reading wheel list from: $listFilePath" -ForegroundColor Cyan
Write-Host "Source wheels directory: $sourceWheelsDirAbsolute" -ForegroundColor Cyan
Write-Host "Destination wheels directory: $destWheelsDirAbsolute" -ForegroundColor Cyan
Write-Host "Starting copy process for chat_service..." -ForegroundColor Yellow

$copiedCount = 0
$notFoundCount = 0
$errorCount = 0

# Read the list of filenames
try {
    $wheelFilesToCopy = Get-Content -Path $listFilePath -ErrorAction Stop
} catch {
    Write-Error "Failed to read wheel list file '$listFilePath': $_"
    exit 1
}


foreach ($wheelFileName in $wheelFilesToCopy) {
    # Trim potential whitespace
    $wheelFileName = $wheelFileName.Trim()
    if ([string]::IsNullOrWhiteSpace($wheelFileName)) {
        continue # Skip empty lines
    }

    $sourceFilePath = ""
    $destFilePath = ""
    try {
         # Check for invalid path characters in filename first
        if ($wheelFileName -match '[\\/:"*?<>|]') {
            Write-Warning "Skipping invalid filename found in list: '$wheelFileName'"
            $errorCount++
            continue
        }
        $sourceFilePath = Join-Path -Path $sourceWheelsDirAbsolute -ChildPath $wheelFileName -ErrorAction Stop
        $destFilePath = Join-Path -Path $destWheelsDirAbsolute -ChildPath $wheelFileName -ErrorAction Stop
    } catch {
        Write-Error "Failed to construct path for '$wheelFileName': $_"
        $errorCount++
        continue
    }


    # Check if the source wheel file exists
    if (Test-Path $sourceFilePath -PathType Leaf) {
        try {
            # Write-Host "Copying '$wheelFileName' ..." -ForegroundColor White # Verbose
            Copy-Item -Path $sourceFilePath -Destination $destFilePath -Force -ErrorAction Stop
            $copiedCount++
        } catch {
            Write-Error "Failed to copy '$wheelFileName': $_"
            $errorCount++
        }
    } else {
        Write-Warning "Wheel file not found in source directory: $sourceFilePath"
        $notFoundCount++
    }
}

# --- Summary ---
Write-Host "--------------------------------------------------" -ForegroundColor Cyan
Write-Host "Copy process finished for chat_service." -ForegroundColor Green
Write-Host "  Successfully copied: $copiedCount files" -ForegroundColor Green
if ($notFoundCount -gt 0) {
    Write-Host "  Not found in source: $notFoundCount files" -ForegroundColor Yellow
}
if ($errorCount -gt 0) {
    Write-Host "  Errors encountered: $errorCount files" -ForegroundColor Red
}

# Set exit code based on errors
if ($errorCount -gt 0 -or $notFoundCount -gt 0) {
    exit 1 # Indicate failure or incomplete copy
} else {
    exit 0 # Indicate success
} 