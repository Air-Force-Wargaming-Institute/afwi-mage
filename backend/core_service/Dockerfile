# First stage: Install dependencies from wheels
FROM afwi-mage-base:3.12-slim AS builder

WORKDIR /build

# Note: We rely on build tools already in the afwi-mage-base:3.12-slim image
# For a true airgapped deployment, we don't use apt-get which requires internet

# Copy requirements and wheel files for installation
COPY requirements.txt /build/
COPY wheels/ /build/wheels/

# Create a new virtual environment
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

# Install dependencies into the virtual environment
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

# Ensure proper permissions
RUN chmod -R 755 /app

# Expose port for the service
EXPOSE 8000

# Start the service
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
