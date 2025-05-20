# PowerShell Script to Copy Specific Wheels from a Central Cache to a Local Directory

# This script reads a list of required wheel filenames (one per line)
# from 'downloaded_wheels_list.txt' in the current directory.
# It then copies these wheels from a central cache (../backend_wheels) 
# to a local './wheels' directory, creating it if it doesn't exist.

$ErrorActionPreference = "Stop"

# Script's current directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServiceName = (Get-Item -Path $scriptDir).Name # Get service name from parent folder

# Define paths
$listFile = Join-Path -Path $scriptDir -ChildPath "downloaded_wheels_list.txt"
$localWheelsDir = Join-Path -Path $scriptDir -ChildPath "wheels"

# Resolve the central wheels cache directory path. Assumes it's one level up, then into 'backend_wheels'
$centralWheelsCachePath = Join-Path -Path $scriptDir -ChildPath "..\backend_wheels"
$centralWheelsCachePath = (Resolve-Path -Path $centralWheelsCachePath).Path

Write-Host "[$ServiceName] Starting wheel copy process..." -ForegroundColor Yellow

# Check if the central wheels cache directory exists
if (-not (Test-Path $centralWheelsCachePath -PathType Container)) {
    Write-Error "[$ServiceName] Central wheels cache directory not found at $centralWheelsCachePath. Ensure wheels have been downloaded there first."
    exit 1
}
Write-Host "[$ServiceName] Using central wheels cache: $centralWheelsCachePath" -ForegroundColor Gray

# Check if the list file exists
if (-not (Test-Path $listFile -PathType Leaf)) {
    Write-Error "[$ServiceName] Wheel list file not found: $listFile. Run the download_wheels script first."
    exit 1
}
Write-Host "[$ServiceName] Reading wheel list from: $listFile" -ForegroundColor Gray

# Create local wheels directory if it doesn't exist
if (-not (Test-Path $localWheelsDir -PathType Container)) {
    Write-Host "[$ServiceName] Creating local wheels directory: $localWheelsDir"
    New-Item -ItemType Directory -Path $localWheelsDir -Force | Out-Null
} else {
    Write-Host "[$ServiceName] Using existing local wheels directory: $localWheelsDir"
    # Optional: Clean the directory before copying if needed
    # Get-ChildItem -Path $localWheelsDir | Remove-Item -Recurse -Force
    # Write-Host "[$ServiceName] Cleaned existing local wheels directory." -ForegroundColor DarkGray
}

# Read the list of required wheels
$requiredWheels = Get-Content $listFile | Where-Object { $_.Trim() -ne "" }

if ($requiredWheels.Count -eq 0) {
    Write-Warning "[$ServiceName] No wheel names found in $listFile. Nothing to copy."
    exit 0 # Exit gracefully if there's nothing to copy
}

Write-Host "[$ServiceName] Found $($requiredWheels.Count) wheel(s) listed in $listFile to copy." -ForegroundColor Cyan

$copiedCount = 0
$notFoundCount = 0

foreach ($wheelName in $requiredWheels) {
    $sourceWheelPath = Join-Path -Path $centralWheelsCachePath -ChildPath $wheelName
    $destinationWheelPath = Join-Path -Path $localWheelsDir -ChildPath $wheelName

    if (Test-Path $sourceWheelPath -PathType Leaf) {
        Write-Host "[$ServiceName] Copying $wheelName to $localWheelsDir..." -ForegroundColor White
        Copy-Item -Path $sourceWheelPath -Destination $destinationWheelPath -Force
        $copiedCount++
    } else {
        Write-Warning "[$ServiceName] Wheel $wheelName not found in central cache $centralWheelsCachePath. Skipping."
        $notFoundCount++
    }
}

Write-Host "[$ServiceName] Wheel copy process finished." -ForegroundColor Yellow
Write-Host "[$ServiceName] Copied $copiedCount wheel(s) successfully." -ForegroundColor Green
if ($notFoundCount -gt 0) {
    Write-Warning "[$ServiceName] $notFoundCount wheel(s) listed in $listFile were not found in the central cache and were NOT copied."
    # Optionally, exit with an error code if missing wheels is critical
    # exit 1 
}

if ($copiedCount -eq 0 -and $requiredWheels.Count -gt 0) {
    Write-Warning "[$ServiceName] No wheels were actually copied, though $($requiredWheels.Count) were listed. Check paths and cache contents."
} 