FROM mage-base:latest

# Set working directory
WORKDIR /app

# Copy service-specific files
COPY . .

# Expose port for the service
EXPOSE 8009

# Make sure we're in the right directory and the app can be found
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8009"]