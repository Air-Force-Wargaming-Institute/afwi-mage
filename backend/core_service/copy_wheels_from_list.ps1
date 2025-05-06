# PowerShell script to copy required wheels from a central location based on a list
# Standardized version for all services.

# Get the directory where the script is located (e.g., service_name)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$currentServiceName = (Split-Path $scriptDir -Leaf) # Get the name of the parent directory

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
        Write-Error "Source wheels directory path does not exist: $sourceWheelsDirAbsoluteCheck (expected at an equivalent to '$($scriptDirAbsolute = (Resolve-Path -Path $scriptDir).Path; Join-Path $scriptDirAbsolute $sourceWheelsDirRelative)')"
        exit 1
    }

    # Destination might not exist yet, resolve script dir first for context if needed
    $scriptDirAbsolute = (Resolve-Path -Path $scriptDir).Path
    $destWheelsDirAbsolute = Join-Path -Path $scriptDirAbsolute -ChildPath $destWheelsDirRelative

} catch {
    Write-Error "Error resolving critical paths: $($_.Exception.Message)"
    exit 1
}

# --- Pre-checks ---

# Check if the list file exists
if (-not (Test-Path $listFilePath -PathType Leaf)) {
    Write-Error "Wheel list file not found: $listFilePath"
    exit 1
}

# Check if the source wheels directory exists
if (-not (Test-Path $sourceWheelsDirAbsolute -PathType Container)) {
    Write-Error "Source wheels directory not found: $sourceWheelsDirAbsolute"
    Write-Error "Please ensure wheels have been downloaded to the central backend_wheels directory."
    exit 1
}

# Ensure the destination wheels directory exists
if (-not (Test-Path $destWheelsDirAbsolute -PathType Container)) {
    Write-Host "Creating destination wheels directory for $currentServiceName: $destWheelsDirAbsolute" -ForegroundColor Yellow
    try {
        New-Item -ItemType Directory -Path $destWheelsDirAbsolute -ErrorAction Stop | Out-Null
    } catch {
        Write-Error "Failed to create destination directory '$destWheelsDirAbsolute': $($_.Exception.Message)"
        exit 1
    }
}

# --- Copying Logic ---

Write-Host "Reading wheel list from: $listFilePath" -ForegroundColor Cyan
Write-Host "Source wheels directory: $sourceWheelsDirAbsolute" -ForegroundColor Cyan
Write-Host "Destination wheels directory: $destWheelsDirAbsolute" -ForegroundColor Cyan
Write-Host "Starting wheel copy process for service: $currentServiceName..." -ForegroundColor Yellow

$copiedCount = 0
$notFoundCount = 0
$errorCount = 0
$skippedCount = 0

# Read the list of filenames
try {
    $wheelFilesToCopy = Get-Content -Path $listFilePath -ErrorAction Stop
} catch {
    Write-Error "Failed to read wheel list file '$listFilePath': $($_.Exception.Message)"
    exit 1
}

foreach ($wheelFileName in $wheelFilesToCopy) {
    $wheelFileName = $wheelFileName.Trim()
    if ([string]::IsNullOrWhiteSpace($wheelFileName)) {
        continue # Skip empty lines
    }

    $sourceFilePath = ""
    $destFilePath = ""
    try {
        if ($wheelFileName -match '[\\/:"*?<>|]') {
            Write-Warning "Skipping invalid filename found in list for $currentServiceName: '$wheelFileName'"
            $skippedCount++
            continue
        }
        $sourceFilePath = Join-Path -Path $sourceWheelsDirAbsolute -ChildPath $wheelFileName -ErrorAction Stop
        $destFilePath = Join-Path -Path $destWheelsDirAbsolute -ChildPath $wheelFileName -ErrorAction Stop
    } catch {
        Write-Error "Failed to construct path for '$wheelFileName' in $currentServiceName: $($_.Exception.Message)"
        $errorCount++
        continue
    }

    if (Test-Path $sourceFilePath -PathType Leaf) {
        try {
            # Write-Host "Copying '$wheelFileName' to $currentServiceName local wheels..." # Verbose, uncomment if needed
            Copy-Item -Path $sourceFilePath -Destination $destFilePath -Force -ErrorAction Stop
            $copiedCount++
        } catch {
            Write-Error "Failed to copy '$wheelFileName' for $currentServiceName: $($_.Exception.Message)"
            $errorCount++
        }
    } else {
        Write-Warning "Wheel file '$wheelFileName' not found in source directory '$sourceWheelsDirAbsolute' (listed by $currentServiceName)."
        $notFoundCount++
    }
}

# --- Summary ---
Write-Host "--------------------------------------------------" -ForegroundColor Cyan
Write-Host "Wheel copy process finished for service: $currentServiceName." -ForegroundColor Green
Write-Host "  Successfully copied: $copiedCount files." -ForegroundColor Green
if ($notFoundCount -gt 0) {
    Write-Host "  Not found in source: $notFoundCount files." -ForegroundColor Yellow
}
if ($errorCount -gt 0) {
    Write-Host "  Errors during copy: $errorCount files." -ForegroundColor Red
}
if ($skippedCount -gt 0) {
    Write-Host "  Skipped invalid filenames: $skippedCount files." -ForegroundColor Yellow
}

# Set exit code based on errors or missing files
if ($errorCount -gt 0 -or $notFoundCount -gt 0) {
    exit 1 # Indicate failure or incomplete copy
} else {
    exit 0 # Indicate success
} 