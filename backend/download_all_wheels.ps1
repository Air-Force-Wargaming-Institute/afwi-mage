# Get the directory where the script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Define service directories (add or remove as needed)
# Note: Services without requirements.txt or download_wheels.ps1 will be skipped.
$ServiceDirs = @(
    "agent_service",
    "api_gateway",        # Skipped (no requirements.txt)
    "auth_service",
    "chat_service",
    "core_service",
    "direct_chat_service",
    "embedding_service",
    "extraction_service",   # Has NLTK
    "generation_service",
    "ollama",             # Skipped (no requirements.txt)
    "process_tracking_service", # Skipped (no requirements.txt)
    "review_service",
    "transcription_service",# Skipped (no requirements.txt)
    "upload_service",
    "vLLM",               # Skipped (no requirements.txt)
    "wargame_service",    # Skipped (empty requirements.txt)
    "workbench_service"
)

# Create the central wheels directory if it doesn't exist
$centralWheelsDirRelative = "backend_wheels"
$centralWheelsDirAbsolute = Join-Path -Path $ScriptDir -ChildPath $centralWheelsDirRelative
if (-not (Test-Path $centralWheelsDirAbsolute -PathType Container)) {
    Write-Host "Creating central wheels directory: $centralWheelsDirAbsolute" -ForegroundColor Yellow
    try {
        New-Item -ItemType Directory -Path $centralWheelsDirAbsolute -ErrorAction Stop | Out-Null
    } catch {
        Write-Error "Failed to create central wheels directory '$centralWheelsDirAbsolute': $_"
        # Optionally exit here if the central dir is critical before starting the loop
        # exit 1 
    }
}

# Loop through each service directory
foreach ($ServiceDir in $ServiceDirs) {
    $ServicePath = Join-Path -Path $ScriptDir -ChildPath $ServiceDir
    $WheelScriptPath = Join-Path -Path $ServicePath -ChildPath "download_wheels.ps1"

    # Check if the service directory exists
    if (Test-Path -Path $ServicePath -PathType Container) {
        Write-Host "Checking directory: $ServicePath"

        # Check if download_wheels.ps1 exists in the service directory
        if (Test-Path -Path $WheelScriptPath -PathType Leaf) {
            Write-Host "Found download_wheels.ps1 in $ServiceDir. Running script and auto-confirming zip..." -ForegroundColor Green
            # Change directory to the service directory
            Push-Location -Path $ServicePath
            try {
                # Execute the PowerShell script, passing the -AutoZip switch
                .\\download_wheels.ps1 -AutoZip

                # Check the exit code of the script
                if ($LASTEXITCODE -ne 0) {
                    Write-Warning "Script '$WheelScriptPath' finished with a non-zero exit code: $LASTEXITCODE. Check service-specific output for details."
                } else {
                    Write-Host "Successfully finished running download_wheels.ps1 in $ServiceDir."
                }
            } catch {
                Write-Error "Error executing '$WheelScriptPath': $_"
            }
            # Return to the original directory
            Pop-Location
        } else {
            Write-Host "download_wheels.ps1 not found in $ServiceDir. Skipping." -ForegroundColor Yellow
        }
    } else {
        Write-Warning "Directory not found: $ServicePath"
    }
    Write-Host "--------------------------------------------------"
}

Write-Host "Finished processing all specified service directories." 