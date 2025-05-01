# PowerShell script to copy required wheels from a central location based on a list

# Get the directory where the script is located (agent_service)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Define paths relative to the script location
$listFileName = "downloaded_wheels_list.txt"
$listFilePath = Join-Path -Path $scriptDir -ChildPath $listFileName
$sourceWheelsDirRelative = "../backend_wheels"
$destWheelsDirRelative = "./wheels"

# Resolve absolute paths
$sourceWheelsDirAbsolute = (Resolve-Path -Path (Join-Path -Path $scriptDir -ChildPath $sourceWheelsDirRelative)).Path
$destWheelsDirAbsolute = (Resolve-Path -Path (Join-Path -Path $scriptDir -ChildPath $destWheelsDirRelative)).Path

# --- Pre-checks ---

# Check if the list file exists
if (-not (Test-Path $listFilePath -PathType Leaf)) {
    Write-Error "Wheel list file not found: $listFilePath"
    exit 1
}

# Check if the source wheels directory exists
if (-not (Test-Path $sourceWheelsDirAbsolute -PathType Container)) {
    Write-Error "Source wheels directory not found: $sourceWheelsDirAbsolute"
    Write-Error "Please ensure wheels have been downloaded using download_wheels.ps1 or similar."
    exit 1
}

# Ensure the destination wheels directory exists
if (-not (Test-Path $destWheelsDirAbsolute -PathType Container)) {
    Write-Host "Creating destination wheels directory: $destWheelsDirAbsolute" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $destWheelsDirAbsolute | Out-Null
}

# --- Copying Logic ---

Write-Host "Reading wheel list from: $listFilePath" -ForegroundColor Cyan
Write-Host "Source wheels directory: $sourceWheelsDirAbsolute" -ForegroundColor Cyan
Write-Host "Destination wheels directory: $destWheelsDirAbsolute" -ForegroundColor Cyan
Write-Host "Starting copy process..." -ForegroundColor Yellow

$copiedCount = 0
$notFoundCount = 0
$errorCount = 0

# Read the list of filenames
$wheelFilesToCopy = Get-Content -Path $listFilePath

foreach ($wheelFileName in $wheelFilesToCopy) {
    # Trim potential whitespace
    $wheelFileName = $wheelFileName.Trim()
    if ([string]::IsNullOrWhiteSpace($wheelFileName)) {
        continue # Skip empty lines
    }

    $sourceFilePath = Join-Path -Path $sourceWheelsDirAbsolute -ChildPath $wheelFileName
    $destFilePath = Join-Path -Path $destWheelsDirAbsolute -ChildPath $wheelFileName

    # Check if the source wheel file exists
    if (Test-Path $sourceFilePath -PathType Leaf) {
        try {
            Write-Host "Copying '$wheelFileName' ..." -ForegroundColor White
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
Write-Host "Copy process finished." -ForegroundColor Green
Write-Host "  Successfully copied: $copiedCount files" -ForegroundColor Green
if ($notFoundCount -gt 0) {
    Write-Host "  Not found in source: $notFoundCount files" -ForegroundColor Yellow
}
if ($errorCount -gt 0) {
    Write-Host "  Errors encountered: $errorCount files" -ForegroundColor Red
} 