# First stage: Install dependencies from wheels
FROM python:3.12-slim AS builder

WORKDIR /build

# Note: We rely on build tools already in the python:3.12-slim image
# For a true airgapped deployment, we don't use apt-get which requires internet

# Copy requirements and wheel files for installation
COPY requirements.txt /build/
COPY wheels/ /build/wheels/

# First install from requirements.txt (which excludes PyPDF4)
RUN pip install --no-cache-dir --no-index --find-links=/build/wheels -r requirements.txt

# Install any PyPDF4 package that might be in the wheels directory
# (This won't try to download from the internet because of --no-index)
RUN pip install --no-cache-dir --no-index --find-links=/build/wheels PyPDF4 || echo "PyPDF4 not found in wheels directory, skipping"

# Create a new virtual environment
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

# Install dependencies into the virtual environment
RUN pip install --no-cache-dir --no-index --find-links=/build/wheels -r requirements.txt
RUN pip install --no-cache-dir --no-index --find-links=/build/wheels PyPDF4 || echo "PyPDF4 not found in wheels directory, skipping"

# Second stage: Create the final image
FROM python:3.12-slim

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