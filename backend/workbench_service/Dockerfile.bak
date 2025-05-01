# First stage: Install dependencies from wheels
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies for potential source packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and wheel files for installation
COPY requirements.txt /build/
COPY wheels/ /build/wheels/

# Create a new virtual environment
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

# Install dependencies from local wheels
RUN pip install --no-cache-dir --no-index --find-links=/build/wheels -r requirements.txt

# Second stage: Create the final image
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Copy the virtual environment from the builder stage
COPY --from=builder /venv /venv
ENV PATH="/venv/bin:$PATH"

# Copy application code
COPY . /app/

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
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8020"] 