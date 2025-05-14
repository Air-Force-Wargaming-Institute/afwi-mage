FROM afwi-mage-base:3.12-slim AS builder

WORKDIR /build

# Install build dependencies for source packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and wheel files for installation
COPY requirements.txt /build/
COPY wheels/ /build/wheels/

# Create a new virtual environment
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

# Install dependencies into the virtual environment
RUN pip install --no-cache-dir --no-index --find-links=/build/wheels -r requirements.txt

# Create NLTK data directory and copy pre-downloaded data
RUN mkdir -p /build/nltk_data
# Copy pre-downloaded NLTK data from wheels directory
COPY nltk_data/ /build/nltk_data/

# Second stage: Create the final image
FROM afwi-mage-base:3.12-slim

WORKDIR /app

# Copy the virtual environment from the builder stage
COPY --from=builder /venv /venv
ENV PATH="/venv/bin:$PATH"

# Copy NLTK data
COPY --from=builder /build/nltk_data /app/nltk_data

# Copy application code
COPY . /app/

# Create necessary directories
RUN mkdir -p /app/data

# Set the command to run the API server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002"]
