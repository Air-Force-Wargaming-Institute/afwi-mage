FROM python:3.12-slim

LABEL maintainer="AFWI MAGE Team" \
      description="Base image for AFWI Multi-Agent Generative Engine services"

# Install common system dependencies needed across services
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    python3-dev \
    libpq-dev \
    postgresql-client \
    libmagic1 \
    libreoffice \
    libreoffice-writer \
    python3-uno \
    tesseract-ocr \
    libtesseract-dev \
    poppler-utils \
    pkg-config \
    curl \
    git \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Update pip
RUN pip install --upgrade pip==25.1.1

# Set up LibreOffice environment
RUN mkdir -p /root/.config/libreoffice/4/user && \
    chmod -R 777 /root/.config/libreoffice

# Set environment variables for LibreOffice
ENV PATH="/usr/lib/libreoffice/program:${PATH}"
ENV URE_BOOTSTRAP="file:///usr/lib/libreoffice/program/fundamentalrc"
ENV UNO_PATH="/usr/lib/libreoffice/program"
ENV PYTHONPATH="/usr/lib/python3/dist-packages"

# Create common directories
RUN mkdir -p /app/data/uploads \
    /app/data/extraction \
    /app/data/vectorstores \
    /app/data/datasets \
    /app/data/outputs \
    /app/data/logs \
    /app/data/temp_conversions \
    /app/models/base_models \
    /app/doc_staging \
    /app/nltk_data \
    && chmod -R 777 /app/data

# Set working directory
WORKDIR /app

# Set environment variables for AI models
ENV CUDA_VISIBLE_DEVICES=-1
ENV PYTHONUNBUFFERED=1

# Create placeholder for service-specific files
RUN mkdir -p /app/service 