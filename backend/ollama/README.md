# Ollama Embedding Service (Airgapped Setup)

This directory contains the configuration and model files for running the Nomic Embed Text v1.5 model in an airgapped environment using Ollama.

## Directory Structure
```
ollama/
├── Dockerfile              # Container configuration
├── Modelfile              # Ollama model configuration
├── docker-compose.ollama.yml  # Service orchestration
├── entrypoint.sh          # Container startup script
├── nomic-embed-text-v1.5-GGUF  # GGUF model file (522MB)
└── README.md              # This file
```

## Offline Installation Process

### Prerequisites
- Docker with NVIDIA GPU support
- NVIDIA drivers installed on the host
- At least 2GB of free GPU memory
- The following files must be present:
  - `nomic-embed-text-v1.5-GGUF` (522MB)
  - All files listed in the directory structure above

### Step 1: Prepare Base Image
On a machine with internet access:
```bash
# Pull the base image
docker pull ollama/ollama:latest
# Save the image
docker save ollama/ollama:latest > ollama-base.tar
```

### Step 2: Transfer Files
Transfer to airgapped environment:
1. `ollama-base.tar`
2. The entire `ollama` directory with all files

### Step 3: Install in Airgapped Environment
```bash
# Load the base image
docker load < ollama-base.tar

# Build and start the service
cd /path/to/backend
docker compose -f ollama/docker-compose.ollama.yml up -d ollama
```

## API Endpoints

The service runs on port 11434. All endpoints are accessible via `http://localhost:11434/`.

### Main Endpoints

#### 1. Generate Embeddings
```http
POST /api/embeddings
Content-Type: application/json

{
  "model": "nomic-embed",
  "prompt": "Your text here"
}
```
Response:
```json
{
  "embedding": [...],  // Array of floating point numbers
  "dim": 768          // Embedding dimension
}
```

#### 2. Model Information
```http
GET /api/tags
```
Lists available models and their status.

#### 3. System Status
```http
GET /api/ps
```
Shows running model processes.

### Additional Endpoints

- `GET /`: Health check endpoint
- `GET /api/show`: Display model information
- `POST /api/pull`: Not used in airgapped mode
- `DELETE /api/delete`: Remove a model

## Technical Specifications

### Model Details
- Name: Nomic Embed Text v1.5
- Architecture: BERT
- Parameters: 137M
- Embedding Dimension: 768
- Context Length: 2048 tokens (maximized)
- Format: GGUF (F32)
- Size: 522MB
- GPU Memory Usage: ~1.2GB base (increased for max context), scales with batch size

### System Requirements and Configuration

#### Host System Configuration
Some optimizations require host-level configuration. Add these settings to `/etc/sysctl.conf` on the host machine:
```bash
vm.max_map_count=1048576
net.core.rmem_max=2097152
net.core.wmem_max=2097152
```

Apply settings with:
```bash
sudo sysctl -p
```

#### Container Configuration
```yaml
environment:
  # GPU Configuration
  - NVIDIA_VISIBLE_DEVICES=0    # Use specific GPU
  - NVIDIA_DRIVER_CAPABILITIES=compute,utility,video
  - CUDA_VISIBLE_DEVICES=0
  - CUDA_LAUNCH_BLOCKING=0
  # Performance Optimizations
  - OMP_NUM_THREADS=32
  - OLLAMA_CUDA_MALLOC=47GB    # Reserved GPU memory with buffer
  - OLLAMA_CUDA_MAX_SPLIT=32
  - OLLAMA_DEVICE=cuda
  # Context Length Optimizations
  - OLLAMA_CONTEXT_LENGTH=2048
  - OLLAMA_BATCH_SIZE=64
  - OLLAMA_NUM_GPU=1
  - OLLAMA_GPU_LAYERS=all
  - OLLAMA_F16=false
  # Service Configuration
  - OLLAMA_MODELS=/root/.ollama/models
  - OLLAMA_HOST=0.0.0.0:11434
  # Offline mode settings
  - OLLAMA_SKIP_UPDATE_CHECK=true
  - HF_DATASETS_OFFLINE=1
  - TRANSFORMERS_OFFLINE=1
  - HF_HUB_OFFLINE=1
```

#### Resource Requirements
- GPU Memory:
  - Total Available: 48GB
  - Allocated: 47GB (leaves 1GB buffer)
  - Base Usage: ~1.2GB for model
  - Scaling: Dynamically uses allocated memory for batches
- CPU Memory:
  - Container Limit: 32GB
  - Container Reservation: 16GB
- System Limits:
  - memlock: unlimited (-1)
  - stack: 67108864
- Network: Exposed on port 11434

#### GPU Configuration
The service is configured to use a specific GPU (device 0) through multiple settings:
- Docker level: `NVIDIA_VISIBLE_DEVICES=0`
- CUDA level: `CUDA_VISIBLE_DEVICES=0`
- Deploy configuration: `device_ids: ['0']`
- Driver capabilities: compute, utility, video

### Performance Characteristics
- Context Window: 2048 tokens (maximized)
- Batch Size: 64 (optimized for max context)
- Thread Count: 32
- Memory Allocation: 47GB with 1GB buffer
- GPU Layers: All layers on GPU
- Precision: F32 (F16 disabled for maximum accuracy)

### Performance Expectations
- Embedding Generation:
  - Single request (2048 tokens): < 15ms
  - Batch size 64 (max context): < 250ms
  - Throughput with max context: Up to 20,000 embeddings/second
- Model Loading: < 3 seconds
- Maximum concurrent requests: 128

## Troubleshooting

### Common Issues

1. **System-Level Optimization Errors**
   - Error: `sysctl: Read-only file system`
   - Solution: Apply system optimizations on the host machine
   - See "Host System Configuration" section above

2. **GPU Memory Warnings**
   - Warning: "Less than 48GB GPU memory available"
   - Not an error - indicates running on different GPU hardware
   - Service will adjust to available GPU memory

3. **Model Not Loading**
   - Check GPU memory availability
   - Verify model file exists in correct location
   - Check container logs: `docker compose logs ollama`

4. **Container Fails to Start**
   - Verify NVIDIA runtime is available
   - Check Docker daemon logs
   - Ensure all files are present
   - Verify GPU device 0 is available

### Health Checks
```bash
# Check service health
docker compose -f docker-compose.ollama.yml ps

# Check GPU allocation
nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv -l 1

# Test embedding generation
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed",
  "prompt": "Test embedding generation"
}'
```

## Security Notes

- Service runs without internet access
- No model updates or external calls
- All resources are contained within the container
- Uses Docker's GPU isolation
- Memory limits and reservations in place

## Maintenance

### Backup
Important files to backup:
- `nomic-embed-text-v1.5-GGUF`
- `Modelfile`
- Configuration files

### Updates
In an airgapped environment, updates require:
1. Downloading new versions on an internet-connected machine
2. Transferring files to the airgapped environment
3. Rebuilding and restarting the service 