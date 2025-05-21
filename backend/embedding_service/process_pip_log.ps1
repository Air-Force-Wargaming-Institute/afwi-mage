#Requires -Version 5.1
<#
.SYNOPSIS
    Processes a pip download log file to extract .whl filenames and writes them to an output file.
.DESCRIPTION
    This script reads a specified pip download log file, filters for lines indicating a successful download
    or an already downloaded file, extracts the .whl filename from these lines, and writes the list of
    filenames to a specified output file. The output file is cleared at the beginning of each run.
.PARAMETER LogFilePath
    The full path to the pip download log file to process.
.PARAMETER OutputFilePath
    The full path to the file where the extracted .whl filenames will be written.
.EXAMPLE
    .\process_pip_log.ps1 -LogFilePath "C:\path\to\your\embedding_service_pip_download.log" -OutputFilePath "C:\path\to\your\downloaded_wheels_list.txt"
    This example processes the specified log file and writes the .whl filenames to the specified output file.
.NOTES
    Ensure you have read permissions for the log file and write permissions for the output file directory.
#>
param(
    [Parameter(Mandatory=$false)]
    [string]$LogFilePath = (Join-Path -Path (Split-Path -Parent $MyInvocation.MyCommand.Path) -ChildPath "embedding_service_pip_download.log"),

    [Parameter(Mandatory=$false)]
    [string]$OutputFilePath = (Join-Path -Path (Split-Path -Parent $MyInvocation.MyCommand.Path) -ChildPath "downloaded_wheels_list.txt")
)

# Resolve paths to be absolute to handle relative paths correctly
$LogFilePath = if ([System.IO.Path]::IsPathRooted($PSBoundParameters['LogFilePath'])) {
    $PSBoundParameters['LogFilePath']
} else {
    Join-Path -Path (Get-Location) -ChildPath $PSBoundParameters['LogFilePath']
}

if (-not (Test-Path $LogFilePath)) {
    Write-Error "Log file path does not exist: $LogFilePath"
    exit 1
}

# For output file, we need to handle both absolute and relative paths
$OutputFilePath = if ([System.IO.Path]::IsPathRooted($PSBoundParameters['OutputFilePath'])) {
    $PSBoundParameters['OutputFilePath']
} else {
    Join-Path -Path (Get-Location) -ChildPath $PSBoundParameters['OutputFilePath']
}

# Ensure the output directory exists
$OutputDirectory = Split-Path -Path $OutputFilePath -Parent
if (-not (Test-Path -Path $OutputDirectory)) {
    Write-Verbose "Creating output directory: $OutputDirectory"
    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
}

# Delete the output file if it exists to ensure a fresh start
if (Test-Path -Path $OutputFilePath) {
    Write-Verbose "Removing existing output file: $OutputFilePath"
    Remove-Item -Path $OutputFilePath -Force
}

Write-Verbose "Processing log file: $LogFilePath"
Write-Verbose "Output will be written to: $OutputFilePath"

$whlFiles = Get-Content -Path $LogFilePath |
    Where-Object { $_ -match "^\s*File was already" -or $_ -match "^\s*Saved" } |
    ForEach-Object {
        # Extract the full path of the .whl file
        $line = $_.TrimStart() # Trim leading spaces for simpler matching
        $filePath = ""
        if ($line -match "^File was already downloaded\s*(.*)") {
            $filePath = $matches[1].Trim()
        } elseif ($line -match "^Saved\s*(.*)") {
            $filePath = $matches[1].Trim()
        }

        # Get only the filename from the path
        if ($filePath -and $filePath.EndsWith(".whl")) {
            Split-Path -Path $filePath -Leaf
        } else {
            Write-Warning "Could not extract .whl file from line: $line"
            $null # Ensure no empty lines if extraction fails
        }
    } | Where-Object { $_ -ne $null } | Sort-Object -Unique # Filter out nulls from failed extractions and get unique names

if ($whlFiles.Count -gt 0) {
    Write-Verbose "Found $($whlFiles.Count) .whl files. Writing to output file."
    Set-Content -Path $OutputFilePath -Value $whlFiles
    Write-Host ".whl filenames extracted and written to $OutputFilePath"
} else {
    Write-Warning "No .whl files found in the log file matching the criteria."
    # Create an empty file as per the original logic of overwriting
    Set-Content -Path $OutputFilePath -Value $null
    Write-Host "Empty output file created at $OutputFilePath as no matching .whl files were found."
}

# Example of how to call this script (you would typically run this from the command line):
# Get-Location is used to make the paths relative to the script's current location for this example.
# $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
# $defaultLogFile = Join-Path -Path $scriptDir -ChildPath "embedding_service_pip_download.log"
# $defaultOutputFile = Join-Path -Path $scriptDir -ChildPath "downloaded_wheels_list.txt"
# .\process_pip_log.ps1 -LogFilePath $defaultLogFile -OutputFilePath $defaultOutputFile 