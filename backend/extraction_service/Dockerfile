FROM mage-base:latest

# No need to install dependencies as they're in the base image

# Copy service-specific files
COPY . .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002"]