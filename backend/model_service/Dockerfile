FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create necessary directories
RUN mkdir -p /app/data/logs && \
    chmod -R 777 /app/data/logs

# Copy service-specific files
COPY . .

# Expose port for the service
EXPOSE 8008

# Run the service
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8008"] 