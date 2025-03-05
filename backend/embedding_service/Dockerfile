FROM python:3.11-slim

WORKDIR /app

# Install only essential system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Set environment variables to prevent CUDA packages installation
ENV CUDA_VISIBLE_DEVICES=-1
ENV FORCE_CPU=1
ENV NO_CUDA=1

# Install llama-cpp-python with CPU support
RUN pip3 install --no-cache-dir llama-cpp-python==0.2.11 --verbose

# Create a modified requirements file without unstructured packages
RUN grep -v "unstructured" requirements.txt > requirements_nocuda.txt

# Install remaining requirements
RUN pip3 install --no-cache-dir -r requirements_nocuda.txt

# Install unstructured packages with --no-deps to avoid CUDA dependencies
RUN pip3 install --no-cache-dir --no-deps unstructured==0.10.16 unstructured-inference==0.6.6

# Install minimal dependencies for unstructured without CUDA components
RUN pip3 install --no-cache-dir "detectron2-cpu>=0.6" "layoutparser[tesseract]>=0.3" "pytesseract>=0.3"

# Create necessary directories
RUN mkdir -p /app/data/vectorstores /app/data/uploads /app/doc_staging

# Copy application code
COPY . .

# Ensure Python recognizes the directory as a package
RUN touch /app/__init__.py
RUN touch /app/api/__init__.py
RUN touch /app/core/__init__.py
RUN touch /app/utils/__init__.py

# Set environment variables
ENV PYTHONPATH="/app"
ENV HOST="0.0.0.0"
ENV PORT=8006
ENV UPLOAD_DIR="/app/data/uploads"
ENV VECTORSTORE_DIR="/app/data/vectorstores"
ENV DOC_STAGING_DIR="/app/doc_staging"

# Make scripts executable
RUN chmod +x /app/docker-start.py

# Run the application using our custom starter script
CMD ["python3", "/app/docker-start.py"]

