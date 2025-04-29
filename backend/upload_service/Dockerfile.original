FROM mage-common:latest

WORKDIR /app

# Install system dependencies and LibreOffice
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libmagic1 \
    libreoffice \
    libreoffice-writer \
    python3-uno \
    && rm -rf /var/lib/apt/lists/*

# Create LibreOffice user profile directory and set permissions
RUN mkdir -p /root/.config/libreoffice/4/user && \
    chmod -R 777 /root/.config/libreoffice

# Add LibreOffice Python path to PYTHONPATH
ENV PYTHONPATH="${PYTHONPATH}:/usr/lib/python3/dist-packages"

# Set LibreOffice environment variables
ENV PATH="/usr/lib/libreoffice/program:${PATH}"
ENV URE_BOOTSTRAP="file:///usr/lib/libreoffice/program/fundamentalrc"
ENV UNO_PATH="/usr/lib/libreoffice/program"

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

COPY . .

# Create necessary directories and set permissions
RUN mkdir -p /app/data/uploads /app/data/extraction /app/data/datasets /app/data/outputs /app/data/logs /app/models/base_models /app/data/temp_conversions && \
    chmod -R 777 /app/data

# Start LibreOffice in headless mode as a background service
CMD ["sh", "-c", "soffice --headless --accept='socket,host=127.0.0.1,port=8100;urp;' & uvicorn app:app --host 0.0.0.0 --port 8005"]
