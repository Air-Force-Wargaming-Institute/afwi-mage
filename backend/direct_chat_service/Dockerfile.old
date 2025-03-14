FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including CUDA support
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

ENV SERVICE_PORT=8011

# Expose the port the app runs on
EXPOSE ${SERVICE_PORT}

# Update CMD to include connection optimization settings
CMD uvicorn app:app --host 0.0.0.0 --port ${SERVICE_PORT} --reload --timeout-keep-alive 75 --limit-concurrency 100 --backlog 100
