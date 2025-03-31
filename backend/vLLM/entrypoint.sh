#!/bin/bash
set -e

# Try to detect GPU count at runtime
GPU_COUNT=$(nvidia-smi --query-gpu=name --format=csv,noheader | wc -l || echo "1")

# Make sure we have a valid number, default to 1 if detection fails
if [[ ! "$GPU_COUNT" =~ ^[0-9]+$ ]] || [ "$GPU_COUNT" -lt 1 ]; then
    GPU_COUNT=1
fi

echo "Detected $GPU_COUNT GPUs, using tensor parallel size: $GPU_COUNT"

# Replace tensor-parallel-size parameter in command arguments
ARGS=()
for ARG in "$@"; do
    if [[ "$ARG" == "--tensor-parallel-size="* ]]; then
        ARGS+=("--tensor-parallel-size=$GPU_COUNT")
    else
        ARGS+=("$ARG")
    fi
done

# If tensor-parallel-size wasn't in the arguments, add it
if [[ ! " ${ARGS[*]} " =~ "--tensor-parallel-size=" ]]; then
    ARGS+=("--tensor-parallel-size=$GPU_COUNT")
fi

# Execute the command with modified arguments
exec python3 -m vllm.entrypoints.openai.api_server "${ARGS[@]}"