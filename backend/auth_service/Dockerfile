FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including PostgreSQL client and dos2unix
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    postgresql-client \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Ensure scripts have Unix line endings and are executable
RUN dos2unix entrypoint.sh \
    && chmod +x entrypoint.sh \
    && dos2unix init_db.py \
    && chmod +x init_db.py

# Use a shell script to handle the entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
