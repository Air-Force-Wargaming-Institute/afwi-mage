FROM mage-common:latest

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libmagic1 \
    libreoffice \
    libreoffice-writer \
    python3-uno \
    && rm -rf /var/lib/apt/lists/*

# Set up LibreOffice environment
RUN mkdir -p /root/.config/libreoffice/4/user && \
    chmod -R 777 /root/.config/libreoffice

ENV PATH="/usr/lib/libreoffice/program:${PATH}"
ENV URE_BOOTSTRAP="file:///usr/lib/libreoffice/program/fundamentalrc"
ENV UNO_PATH="/usr/lib/libreoffice/program"
ENV PYTHONPATH="${PYTHONPATH}:/usr/lib/python3/dist-packages:/app"

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

# Copy application code
COPY . .

# Install the package in development mode
RUN pip install -e .

# Create necessary directories
RUN mkdir -p /app/data/uploads /app/data/temp_conversions && \
    chmod -R 777 /app/data

# Expose port
EXPOSE 8000

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
