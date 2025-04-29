FROM mage-gpu:latest

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
#ENV CUDA_VISIBLE_DEVICES=-1
ENV PYTHONUNBUFFERED=1

# Install main dependencies from requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

# Install unstructured with minimal dependencies
RUN --mount=type=cache,target=/root/.cache/pip pip install unstructured==0.10.16 unstructured-inference==0.6.6 --no-deps
#RUN --mount=type=cache,target=/root/.cache/pip pip install "pytesseract>=0.3"
#RUN --mount=type=cache,target=/root/.cache/pip pip install "layoutparser[tesseract]>=0.3"

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