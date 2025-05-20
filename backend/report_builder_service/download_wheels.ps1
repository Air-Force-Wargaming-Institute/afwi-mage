# PowerShell script to download Linux-compatible Python wheels for airgapped installation
# This script uses Docker to ensure wheels are compatible with Linux environments

param(
    [Parameter()]
    [switch]$AutoZip
)

# Define the service name based on the directory name
$ServiceName = "report_builder_service"

Write-Host "Downloading Linux-compatible wheels for airgapped installation..." -ForegroundColor Cyan

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
Write-Host "Running Docker to download Linux-compatible wheels..." -ForegroundColor Yellow

# Normalize paths for Docker volume mounting on Windows
# For wheels directory
$normalizedWheelsPath = $wheelsDirAbsolute.Replace("\", "/")
if ($IsWindows) {
    # Convert C:\... to /c/... format for Docker Desktop
    $driveLetter = $normalizedWheelsPath.Substring(0, 1).ToLower()
    $normalizedWheelsPath = "/$driveLetter" + $normalizedWheelsPath.Substring(2)
}

# For requirements file
$normalizedRequirementsPath = $requirementsFileAbsolute.Replace("\", "/")
if ($IsWindows) {
    # Convert C:\... to /c/... format for Docker Desktop
    $driveLetter = $normalizedRequirementsPath.Substring(0, 1).ToLower()
    $normalizedRequirementsPath = "/$driveLetter" + $normalizedRequirementsPath.Substring(2)
}

# Use double quotes for the whole command and single quotes for paths with colons in PowerShell
$dockerArgs = @(
    "run", "--rm",
    "-v", "$normalizedWheelsPath`:/wheels",
    "-v", "$normalizedRequirementsPath`:/reqs/requirements.txt:ro",
    "python:3.12-slim",
    "bash", "-c",
    'pip install --upgrade pip --root-user-action=ignore && pip download --dest /wheels --prefer-binary --platform manylinux2014_x86_64 --python-version 3.12 --only-binary=:all: -r /reqs/requirements.txt'
)
# Execute Docker command and capture all output
$dockerCommandOutput = & docker @dockerArgs 2>&1 | Tee-Object -Variable dockerFullOutputForLogging | ForEach-Object { Write-Host $_; $_ }

if ($LASTEXITCODE -ne 0) {
    Write-Warning "[$ServiceName] Docker command finished with a non-zero exit code: $LASTEXITCODE. Pip download might have failed for some packages or the command itself failed. The generated wheel list might be incomplete or inaccurate."
    # Potentially exit here if a completely successful download is critical
    # exit $LASTEXITCODE
} else {
    Write-Host "[$ServiceName] Docker wheel download command finished successfully." -ForegroundColor Green
}

# List the downloaded wheels from the target directory
$wheels = Get-ChildItem -Path $wheelsDirAbsolute -Filter "*.whl"

Write-Host "Downloaded $($wheels.Count) Linux-compatible wheel files to $wheelsDirAbsolute" -ForegroundColor Green
foreach ($wheel in $wheels) {
    Write-Host "  - $($wheel.Name)" -ForegroundColor White
}

# Save the list of downloaded wheels to a file in the script's directory (agent_service)
$outputFilePath = Join-Path -Path $scriptDir -ChildPath "downloaded_wheels_list.txt"

Write-Host "[$ServiceName] Generating list of required wheels for ${outputFilePath} based on Docker command output..." -ForegroundColor Cyan

try {
    $requiredWheelsFromOutput = @{} # Use a hashtable to store unique wheel names
    $VerbosePreference = "Continue" # Enable verbose output for debugging this block

    foreach ($line in $dockerCommandOutput) {
        # Write-Host "DEBUG Line: $line" # Uncomment for very detailed line-by-line debugging
        if ($line -match 'File was already downloaded\s*/wheels/\s*([^/]+\.whl)') {
            $wheelName = $matches[1].Trim()
            if (-not ([string]::IsNullOrWhiteSpace($wheelName)) -and (-not $requiredWheelsFromOutput.ContainsKey($wheelName))) {
                $requiredWheelsFromOutput[$wheelName] = $true
                Write-Verbose "[$ServiceName] Identified from 'already downloaded': $wheelName"
            }
        } elseif ($line -match 'Saved\s*/wheels/\s*([^/]+\.whl)') {
            $wheelName = $matches[1].Trim()
            if (-not ([string]::IsNullOrWhiteSpace($wheelName)) -and (-not $requiredWheelsFromOutput.ContainsKey($wheelName))) {
                $requiredWheelsFromOutput[$wheelName] = $true
                Write-Verbose "[$ServiceName] Identified from 'Saved': $wheelName"
            }
        }
    }
    $VerbosePreference = "SilentlyContinue" # Reset verbose preference

    $finalWheelList = $requiredWheelsFromOutput.Keys | Sort-Object
    
    if ($finalWheelList.Count -eq 0) {
        Write-Warning "[$ServiceName] No specific wheel files identified from 'File was already downloaded' or 'Saved' lines in pip output."
        Write-Warning "[$ServiceName] As a fallback, attempting to list all .whl files from the Docker output log."
        
        # Fallback: try to find any .whl file mentioned in the log that exists in the cache
        # This is less precise but better than nothing if primary parsing fails.
        $allWheelsInCache = Get-ChildItem -Path $wheelsDirAbsolute -Filter "*.whl" | Select-Object -ExpandProperty Name
        $potentialWheelsFromLog = @{}
        foreach ($line in $dockerCommandOutput) {
            if ($line -match '([a-zA-Z0-9._-]+?-\d+\.\d+(?:\.\d+)?(?:-[^-]+)?-py[23]\d?-none-any\.whl|[a-zA-Z0-9._-]+?-\d+\.\d+(?:\.\d+)?(?:-[^-]+)?-cp\d+-cp\d+m?-manylinux[^.]+\.whl)') {
                $foundWheelInLog = $matches[0] # The full wheel name
                if ($allWheelsInCache -contains $foundWheelInLog) {
                    if (-not $potentialWheelsFromLog.ContainsKey($foundWheelInLog)) {
                        $potentialWheelsFromLog[$foundWheelInLog] = $true
                        Write-Verbose "[$ServiceName] Fallback: Identified from general log and cache: $foundWheelInLog"
                    }
                }
            }
        }
        $finalWheelList = $potentialWheelsFromLog.Keys | Sort-Object

        if ($finalWheelList.Count -eq 0) {
            Write-Warning "[$ServiceName] Fallback also failed to identify specific wheels. The list might be incomplete or all wheels will be copied if using 'download_all_wheels.ps1' logic."
            # As an ultimate fallback, the script could list ALL wheels from $wheelsDirAbsolute, but this is usually too broad for a single service.
            # $finalWheelList = $allWheelsInCache
        }
    }

    if ($finalWheelList.Count -gt 0) {
        $finalWheelList | Out-File -FilePath $outputFilePath -Encoding utf8
        Write-Host "[$ServiceName] List of $($finalWheelList.Count) required wheels saved to: $outputFilePath" -ForegroundColor Green
        # Write-Host ($finalWheelList -join "`n") # Optionally print the list
    } else {
        Write-Warning "[$ServiceName] No wheels were identified to be written to $outputFilePath. The file will be empty or not updated."
        # Ensure an empty file is written if no wheels, so downstream doesn't use an old list
        Set-Content -Path $outputFilePath -Value "" -Encoding utf8
    }

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
Write-Host "1. Copy the report_builder_service directory AND the $wheelsDirAbsolute directory to the target machine" -ForegroundColor White
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
        Compress-Archive -Path (Join-Path $scriptDir \'*') -DestinationPath $zipFilePath -Force -ErrorAction Stop
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