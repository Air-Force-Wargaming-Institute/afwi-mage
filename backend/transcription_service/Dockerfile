# Use an official NVIDIA CUDA runtime image as a parent image
FROM nvidia/cuda:12.8.1-cudnn-devel-ubuntu24.04 AS base

# Set environment variables to prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PATH="/opt/venv/bin:$PATH"
ENV HF_HOME=/app/.cache/huggingface

# Install system dependencies including Python, pip, git, and ffmpeg
# Use default python3 packages for Ubuntu 24.04 (which is Python 3.12)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 python3-pip python3-dev git ffmpeg wget curl python3-venv && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment
RUN python3 -m venv /opt/venv

# Update pip within the virtual environment
RUN pip install --no-cache-dir --upgrade pip

# Set the working directory
WORKDIR /app

# --- Air-Gapped Dependency Installation ---
# 1. PREPARATION (Online Machine): 
#    - Download all wheels: pip download --platform manylinux2014_x86_64 --python-version 3.12 --only-binary=:all: --extra-index-url https://download.pytorch.org/whl/cu126 -r requirements.txt -d ./wheels
#    - Ensure torch/torchaudio match CUDA version if not using cu126 wheels.
#    - Transfer the 'wheels' directory to this build context.
# 2. OFFLINE BUILD: Uncomment the following two lines:
# COPY wheels /app/wheels
# RUN pip install --no-cache-dir --no-index --find-links=/app/wheels -r requirements.txt

# --- Online Dependency Installation (Comment out for Air-Gapped Build) ---
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cu126
# -----------------------------------------

# Copy the rest of the application code
COPY . .

# Create cache directories. Model files MUST be provided via volume mounts at runtime.
ENV MODEL_CACHE_DIR=/app/.cache/whisperx
ENV HF_TOKEN=""
RUN mkdir -p ${MODEL_CACHE_DIR} && \
    mkdir -p ${HF_HOME} && \
    chmod -R 777 /app/.cache # Ensure write permissions for cache directories

# Make port available to the world outside this container
EXPOSE 8012

# Define environment variable for the port (can be overridden)
ENV TRANSCRIPTION_SERVICE_PORT=8012

# Run the application using the venv python
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8012"] 