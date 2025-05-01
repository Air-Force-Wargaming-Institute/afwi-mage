FROM mage-base:latest

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/data/workbench/spreadsheets

# Create a Docker environment marker file
RUN touch /.dockerenv

# Ensure proper permissions for data directories
RUN chmod -R 777 /app/data

# Set environment variables
ENV PYTHONPATH=/app
ENV HOST=0.0.0.0
ENV PORT=8020
ENV DEBUG=1
ENV WORKBENCH_SPREADSHEETS_DIR=/app/data/workbench/spreadsheets

# Expose port
EXPOSE 8020

# Run using uvicorn server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8020", "--reload"] 