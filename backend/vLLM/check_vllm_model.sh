#!/bin/bash

MODEL_DIR="../../models/Llama-3.2-1B-Instruct-abliterated"

if [ ! -d "$MODEL_DIR" ]; then
  echo "ERROR: Model directory $MODEL_DIR does not exist."
  echo "Please download the model files before starting vLLM in airgapped mode."
  echo "Run the following commands when internet access is available:"
  echo "  mkdir -p $MODEL_DIR"
  echo "  git lfs install"
  echo "  git clone https://huggingface.co/google/Llama-3.2-1B-Instruct-abliterated $MODEL_DIR"
  exit 1
fi

# Check for essential model files
if [ ! -f "$MODEL_DIR/config.json" ] || [ ! -f "$MODEL_DIR/model.safetensors" ]; then
  echo "ERROR: Essential model files are missing in $MODEL_DIR."
  echo "The directory exists but may not contain a complete model."
  exit 1
fi

echo "Model files found. vLLM can be started in airgapped mode."
exit 0 