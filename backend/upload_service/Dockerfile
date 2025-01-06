FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create necessary directories
RUN mkdir -p /app/data/uploads /app/data/extraction /app/data/datasets /app/data/outputs /app/data/logs /app/models/base_models

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8005"]
