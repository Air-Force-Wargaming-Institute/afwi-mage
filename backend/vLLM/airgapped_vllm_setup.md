# Airgapped vLLM Deployment Guide

This guide describes how to set up the vLLM service in an airgapped environment without internet access.

## Prerequisites

Before moving to the airgapped environment, complete these steps on a system with internet access:

1. **Download the Docker Image**:
   ```powershell
   # Pull the vLLM image
   docker pull vllm/vllm-openai:latest
   
   # Save to a file
   docker save vllm/vllm-openai:latest -o vllm-openai-image.tar
   ```

1.5 **Install and setup NVIDIA CONTAINER TOOLKIT**:
   ```powershell
   # Update WSL
   wsl --update

   # Set WSL2 as default
   wsl --set-default-version 2

   # Open Ubuntu in WSL2
   wsl -d Ubuntu
   ```

   ```bash
   # Add NVIDIA package repositories
   curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

   curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
     sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
     sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

   # Update package listing
   sudo apt-get update

   # Install nvidia-container-toolkit
   sudo apt-get install -y nvidia-container-toolkit

   # Configure Docker
   sudo nvidia-ctk runtime configure --runtime=docker

   # Restart Docker daemon
   sudo systemctl restart docker
   ```

2. **Download the Model**:
   ```powershell
   # Install Git LFS
   git lfs install
   
   # Clone the model repository
   mkdir -p models/llama-2-7b-awq
   git clone https://huggingface.co/TheBloke/Llama-2-7B-AWQ models/llama-2-7b-awq
   ```

3. **Transfer Files to Airgapped Environment**:
   - Copy the Docker image tarball (`vllm-openai-image.tar`)
   - Copy the model files directory (`models/llama-2-7b-awq`)
   - Copy this repository including the vLLM directory

## Deployment in Airgapped Environment

1. **Load the Docker Image**:
   ```powershell
   docker load -i vllm-openai-image.tar
   ```

2. **Verify Model Files**:
   ```powershell
   # Check if the model files are available
   cd backend/vLLM
   ./check_vllm_model.ps1
   ```

3. **Start the vLLM Service**:
   ```powershell
   # Using the deployment script
   ./deploy_airgapped_vllm.ps1
   
   # Or manually with the dedicated docker-compose file
   docker-compose -f docker-compose.vllm.yml up -d
   ```

4. **Verify the Service**:
   - Check the OpenAI-compatible API at: http://localhost:8007/docs
   - Try a simple request:
     ```
     curl -X POST "http://localhost:8007/v1/completions" -H "Content-Type: application/json" -d '{
       "model": "llama-2-7b-awq",
       "prompt": "Hello, I am",
       "max_tokens": 50
     }'
     ```

## Troubleshooting

If the service doesn't start:

1. Check Docker logs:
   ```powershell
   docker-compose -f docker-compose.vllm.yml logs
   ```

2. Verify GPU access:
   ```powershell
   docker run --rm --gpus all nvidia/cuda:12.8.1-base-ubuntu24.04 nvidia-smi
   ```

3. Check model files integrity:
   - Make sure all required model files exist in the `/models/llama-2-7b-awq` directory
   - Key files include: `config.json`, `model.safetensors`, `tokenizer_config.json`

## File Structure

```
afwi-multi-agent-generative-engine/
├── backend/
│   ├── docker-compose.yml              # Main docker-compose file (references vLLM)
│   ├── vLLM/
│   │   ├── airgapped_vllm_setup.md     # This documentation
│   │   ├── check_vllm_model.ps1        # Windows model verification script
│   │   ├── check_vllm_model.sh         # Linux model verification script
│   │   ├── deploy_airgapped_vllm.ps1   # Windows deployment script
│   │   └── docker-compose.vllm.yml     # Dedicated vLLM docker-compose file
│   └── ...
├── models/
│   └── llama-2-7b-awq/                 # Model files directory
└── data/
```

## Integration with Main Deployment

The vLLM service is intentionally isolated from the main `docker-compose.yml` file to support airgapped deployments. If you want to include it in the main deployment:

1. **Option 1: Use the extension file**:
   ```powershell
   # From the backend directory
   docker-compose -f docker-compose.yml -f vLLM/docker-compose.vllm.yml up -d
   ```

2. **Option 2: Standalone deployment**:
   ```powershell
   # First deploy the main services
   docker-compose up -d
   
   # Then deploy vLLM separately
   cd vLLM
   ./deploy_airgapped_vllm.ps1
   ```

## Notes on Model Selection

For airgapped operation, we use a pre-quantized AWQ model that is:
- Compact (2-4x smaller than full models)
- Pre-quantized for faster loading and lower memory requirements
- Compatible with vLLM's quantization options

You can substitute other quantized models by:
1. Downloading them prior to airgapped deployment
2. Updating the model path in the `docker-compose.vllm.yml` file

## Example Model Alternatives

Additional models that work well in airgapped environments:

- `TheBloke/Mistral-7B-v0.1-AWQ`
- `TheBloke/Phi-2-AWQ`
- `TheBloke/Llama-3-8B-AWQ`

Download these in the same way as the default model and update the paths accordingly. 