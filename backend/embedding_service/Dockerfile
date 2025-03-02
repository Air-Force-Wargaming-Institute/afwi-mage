FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

WORKDIR /app

# Install Python and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3-pip \
    python3.11-dev \
    build-essential \
    wget \
    ninja-build \
    cmake \
    pkg-config \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set Python3.11 as the default python
RUN ln -sf /usr/bin/python3.11 /usr/bin/python
RUN ln -sf /usr/bin/python3.11 /usr/bin/python3

# Copy requirements first for better caching
COPY requirements.txt .

# Install llama-cpp-python first with CPU support only to avoid CUDA compilation issues
RUN pip3 install --no-cache-dir llama-cpp-python==0.2.11 --verbose

# Install other requirements
RUN pip3 install --no-cache-dir -r requirements.txt

# Install faiss-cpu instead of faiss-gpu (which isn't available on PyPI)
RUN pip3 install --no-cache-dir faiss-cpu>=1.7.0

# Verify CUDA installation AFTER dependencies are installed
RUN python3 -c "import torch; print('CUDA available:', torch.cuda.is_available())"

# Create necessary directories
RUN mkdir -p /app/data/vectorstores /app/data/uploads /app/doc_staging

# Copy application code directly to the app directory
COPY . .

# Set environment variables
ENV PYTHONPATH="/app"
ENV HOST="0.0.0.0"
ENV PORT=8006
ENV UPLOAD_DIR="/app/data/uploads"
ENV VECTORSTORE_DIR="/app/data/vectorstores"
ENV DOC_STAGING_DIR="/app/doc_staging"
ENV CUDA_VISIBLE_DEVICES="0"

# Run the application
CMD ["python3", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8006"]

