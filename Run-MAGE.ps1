# --- Read Model Name from Config ---
$configPath = Join-Path $PSScriptRoot "backend/Config.env"
if (-not (Test-Path $configPath)) {
    Write-Error "Config file not found: $configPath"
    exit 1
}
$configContent = Get-Content $configPath
$modelLine = $configContent | Where-Object { $_ -like 'VLLM_Model_Folder=*' } | Select-Object -First 1
if (-not $modelLine) {
    Write-Error "VLLM_Model_Folder not found in $configPath"
    exit 1
}
$expectedModelSubfolder = ($modelLine -split '=', 2)[1].Trim()
Write-Host "Using model folder from config: $expectedModelSubfolder"

# --- Check if Model Check is Needed ---
$skipModelCheck = $false
$lastBuildInfoPath = Join-Path $PSScriptRoot "VLLM-Build.last"
if (Test-Path $lastBuildInfoPath) {
    $lastModelUsed = Get-Content $lastBuildInfoPath | Select-Object -First 1
    if ($lastModelUsed -eq $expectedModelSubfolder) {
        Write-Host "Last build used the same model ($expectedModelSubfolder). Skipping model file check."
        $skipModelCheck = $true
    } else {
        Write-Host "Configured model ($expectedModelSubfolder) differs from last build model ($lastModelUsed). Model check required."
    }
} else {
    Write-Host "VLLM-Build.last not found. Model check required."
}

# --- Model Existence Check ---
if (-not $skipModelCheck) {
    Write-Host "Performing model file check..."
    $modelDir = "./backend/vLLM/models"
    $relativeModelPath = Join-Path $modelDir $expectedModelSubfolder # Join relative parts first
    $modelPath = Join-Path $PSScriptRoot $relativeModelPath      # Then join with the script root

    Write-Host "Checking for model directory: $modelPath"
    if (-not (Test-Path $modelPath -PathType Container)) {
        Write-Error "Model directory not found: $modelPath. Please ensure the model is downloaded and placed correctly."
        exit 1
    }

    Write-Host "Checking for .safetensors files in $modelPath"
    $tensorFiles = Get-ChildItem -Path $modelPath -Filter *.safetensors

    if ($tensorFiles.Count -eq 0) {
        # Optional: Add check for .bin files here if needed
        Write-Error "No .safetensors files found in $modelPath. Model files might be missing."
        exit 1
    } else {
        # Try to determine the expected number of shards from the first filename
        $firstFileName = $tensorFiles[0].Name
        $match = [regex]::Match($firstFileName, '-of-(\d+)\.safetensors$') # Regex to find "-of-NUMBER.safetensors" at the end

        if ($match.Success) {
            $expectedCount = [int]$match.Groups[1].Value
            Write-Host "Detected sharded model format. Expecting $expectedCount tensor files based on '$firstFileName'."

            if ($tensorFiles.Count -ne $expectedCount) {
                Write-Error "Incorrect number of tensor files found. Expected $expectedCount based on naming convention, but found $($tensorFiles.Count)."
                exit 1
            } else {
                Write-Host "Correct number of tensor files ($expectedCount) found."
            }
        } else {
            # Handle non-sharded models or different naming conventions
            Write-Host "Could not determine expected shard count from filename '$firstFileName'. Assuming single file or different naming. Found $($tensorFiles.Count) file(s)."
            # Uncomment the next two lines if ONLY the sharded format is expected:
            # Write-Error "Filename '$firstFileName' does not match expected '-of-XXXXX.safetensors' format."
            # exit 1
        }
    }
    Write-Host "Model checks passed."
} # End of if (-not $skipModelCheck)
# --- End Model Check ---

# --- Generate vLLM Dockerfile from Template ---
$vllmTemplatePath = Join-Path $PSScriptRoot "backend/vLLM/Dockerfile.template"
$vllmDockerfilePath = Join-Path $PSScriptRoot "backend/vLLM/Dockerfile"

Write-Host "Generating $vllmDockerfilePath from $vllmTemplatePath using model '$expectedModelSubfolder'..."

if (-not (Test-Path $vllmTemplatePath)) {
    Write-Error "vLLM Dockerfile template not found: $vllmTemplatePath"
    exit 1
}

$templateContent = Get-Content $vllmTemplatePath -Raw
$dockerfileContent = $templateContent -replace '__MODEL_SUBFOLDER__', $expectedModelSubfolder
Set-Content -Path $vllmDockerfilePath -Value $dockerfileContent -Encoding UTF8 -NoNewline

Write-Host "Successfully generated $vllmDockerfilePath"
# --- End Dockerfile Generation ---

docker build -t mage-common:latest -f Dockerfile-multistage .

docker build -t mage-gpu:latest -f Dockerfile-multistage .

cd ./backend/

docker compose build

docker compose up -d

# --- Write Last Build Info ---
$lastBuildInfoPath = Join-Path $PSScriptRoot "VLLM-Build.last"
Write-Host "Writing model name $expectedModelSubfolder to $lastBuildInfoPath"
Set-Content -Path $lastBuildInfoPath -Value $expectedModelSubfolder
cd ..
Write-Host "Build script finished successfully."



