FROM mage-base:latest

# No need to install dependencies as they're in the base image

# Copy service-specific files
COPY . .

EXPOSE 8005

# Start LibreOffice in headless mode as a background service
CMD ["sh", "-c", "soffice --headless --accept='socket,host=127.0.0.1,port=8100;urp;' & uvicorn app:app --host 0.0.0.0 --port 8005"]