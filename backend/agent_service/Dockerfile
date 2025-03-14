FROM mage-base:latest

# No need to install dependencies as they're in the base image

# Copy service-specific files
COPY . .

# Ensure the agents directory is copied
COPY agents /app/agents

# Expose port for the service
EXPOSE 8001

# Start the service
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"] 