# First stage: Install dependencies from wheels
FROM afwi-mage-base:3.12-slim AS builder

WORKDIR /build

# Copy requirements and wheel files for installation
COPY requirements.txt /build/
COPY wheels/ /build/wheels/

# Create a new virtual environment
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

# Install dependencies into the virtual environment with special handling
RUN pip install --no-cache-dir --no-index --find-links=/build/wheels -r requirements.txt

# Second stage: Create the final image
FROM afwi-mage-base:3.12-slim

WORKDIR /app

# Copy the virtual environment from the builder stage
COPY --from=builder /venv /venv
ENV PATH="/venv/bin:$PATH"

# Create necessary directories
RUN mkdir -p /app/data

# Copy application code
COPY . /app/

# Set environment variables
ENV PYTHONPATH=/app:/usr/lib/python3/dist-packages

# Expose port
EXPOSE 8000

# Start the API server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
