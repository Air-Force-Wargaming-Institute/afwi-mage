# First stage: Install dependencies from wheels
FROM afwi-mage-base:3.12-slim AS builder

WORKDIR /build

# Copy requirements and wheel files for installation
COPY requirements.txt /build/
COPY wheels/ /build/wheels/

# Install dependencies from local wheels
RUN pip install --no-cache-dir --no-index --find-links=/build/wheels -r requirements.txt

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
RUN mkdir -p /app/data/logs /app/data/builder

# Copy application code
COPY . /app/

# Ensure proper permissions
RUN chmod -R 755 /app

# Expose port for the service
EXPOSE 8001

# Start the service
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
