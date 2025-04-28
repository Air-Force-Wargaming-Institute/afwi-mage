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
env | grep -E "CUDA|GPU|MODEL|TENSOR|VLLM"

echo "Starting vLLM server using environment variables..."

# Build the command arguments from environment variables
CMD_ARGS=(
    --model "/models/${VLLM_Model_Folder}" \
    --tokenizer "/models/${VLLM_Model_Folder}" \
    --dtype=half \
    --gpu-memory-utilization="${GPU_MEMORY_UTILIZATION}" \
    --max-model-len="${MAX_MODEL_LEN}" \
    --tensor-parallel-size="${GPU_COUNT}"
)

# Execute the command
echo "Executing: python3 -m vllm.entrypoints.openai.api_server ${CMD_ARGS[@]}"
exec python3 -m vllm.entrypoints.openai.api_server "${CMD_ARGS[@]}"