# First stage: Install dependencies from wheels
FROM afwi-mage-base:3.12-slim AS builder

WORKDIR /build

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

# Set environment variables
ENV PYTHONPATH=/app:/usr/lib/python3/dist-packages

# Create necessary directories
RUN mkdir -p /app/data

# Copy application code
COPY . /app/

# Convert line endings to Unix format (LF)
RUN tr -d '\r' < /app/entrypoint.sh > /app/entrypoint_unix.sh && \
    mv /app/entrypoint_unix.sh /app/entrypoint.sh

# Make the script executable
RUN chmod +x /app/entrypoint.sh

# Ensure proper permissions
RUN chmod -R 755 /app

# Use the entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
