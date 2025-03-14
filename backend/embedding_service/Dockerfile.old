FROM python:3.11-slim

WORKDIR /app

# Install essential system dependencies including tesseract for OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    tesseract-ocr \
    libtesseract-dev \
    poppler-utils \
    pkg-config \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Set environment variables for CPU-only operation
ENV CUDA_VISIBLE_DEVICES=-1
ENV PYTHONUNBUFFERED=1

# Install main dependencies from requirements.txt
RUN pip3 install --no-cache-dir -r requirements.txt

# Install PyTorch CPU version 
RUN pip3 install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install unstructured with minimal dependencies
RUN pip3 install --no-cache-dir unstructured==0.10.16 unstructured-inference==0.6.6 --no-deps
RUN pip3 install --no-cache-dir "pytesseract>=0.3"
RUN pip3 install --no-cache-dir "layoutparser[tesseract]>=0.3"

# Install llama-cpp-python with CPU support
RUN pip3 install --no-cache-dir llama-cpp-python==0.2.11

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

# Run the application
CMD ["python3", "/app/docker-start.py"] 