FROM mage-base:latest

# No need to install dependencies as they're in the base image

# Copy service-specific files
COPY . .

# Expose port for the service
EXPOSE 8009

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8009"]