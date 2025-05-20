FROM ollama/ollama:latest

# Create directory for models and ensure permissions
RUN mkdir -p /root/.ollama/models && \
    chmod 755 /root/.ollama/models

# Copy the GGUF model and configuration files
COPY nomic-embed-text-v1.5.f32.gguf /root/.ollama/models/
# COPY Modelfile /root/.ollama/models/Modelfile
COPY entrypoint.sh /entrypoint.sh

# Convert Windows line endings (CRLF) to Unix line endings (LF)
RUN sed -i 's/\r$//' /entrypoint.sh

RUN chmod +x /entrypoint.sh

# Set offline environment variables and optimizations
ENV OLLAMA_SKIP_UPDATE_CHECK=true \
    HF_DATASETS_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1 \
    HF_HUB_OFFLINE=1 \
    CURL_CA_BUNDLE= \
    SSL_CERT_FILE= \
    CUDA_VISIBLE_DEVICES=1 \
    CUDA_LAUNCH_BLOCKING=0 \
    OMP_NUM_THREADS=32 \
    OLLAMA_CUDA_MALLOC=2GB \
    OLLAMA_CUDA_MAX_SPLIT=32 \
    OLLAMA_DEVICE=cuda \
    OLLAMA_CONTEXT_LENGTH=2048 \
    OLLAMA_BATCH_SIZE=64 \
    OLLAMA_NUM_GPU=1 \
    OLLAMA_GPU_LAYERS=all \
    OLLAMA_F16=false

EXPOSE 11434

ENTRYPOINT ["/entrypoint.sh"]