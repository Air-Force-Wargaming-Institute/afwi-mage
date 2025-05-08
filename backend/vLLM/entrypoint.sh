#!/bin/bash
set -e

# Print GPU information
echo "GPU Information:"
nvidia-smi

# Print GPU memory status
echo "Available GPU memory:"
nvidia-smi --query-gpu=memory.total,memory.free,memory.used --format=csv

# Print environment variables
echo "Environment variables:"
env | grep -E "CUDA|GPU|MODEL|TENSOR"

echo "Starting vLLM server with tensor parallelism across 1 GPUs..."

# Force tensor parallelism to 2 regardless of arguments
ARGS=()
for ARG in "$@"; do
    if [[ "$ARG" == "--tensor-parallel-size="* ]]; then
        ARGS+=("--tensor-parallel-size=2")
    elif [[ "$ARG" == "--gpu-memory-utilization="* ]]; then
        ARGS+=("--gpu-memory-utilization=0.88")
    else
        ARGS+=("$ARG")
    fi
done

# Ensure tensor-parallel-size is set to 2
if [[ ! " ${ARGS[*]} " =~ "--tensor-parallel-size=" ]]; then
    ARGS+=("--tensor-parallel-size=2")
fi

# Ensure gpu-memory-utilization is set to 0.8
if [[ ! " ${ARGS[*]} " =~ "--gpu-memory-utilization=" ]]; then
    ARGS+=("--gpu-memory-utilization=0.88")
fi

# Execute the command with modified arguments
exec python3 -m vllm.entrypoints.openai.api_server "${ARGS[@]}"