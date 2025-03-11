FROM mage-base:latest

# No need to install dependencies as they're in the base image

# Copy service-specific files
COPY . .

# Expose port
EXPOSE 8000

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]