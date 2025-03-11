FROM mage-base:latest

# No need to install dependencies as they're in the base image

# Copy service-specific files
COPY . .

# Ensure Python recognizes the directory as a package
RUN touch /app/__init__.py
RUN touch /app/api/__init__.py
RUN touch /app/core/__init__.py
RUN touch /app/utils/__init__.py

# Set environment variables
ENV UPLOAD_DIR="/app/data/uploads"
ENV VECTORSTORE_DIR="/app/data/vectorstores"
ENV DOC_STAGING_DIR="/app/doc_staging"

# Make scripts executable
RUN chmod +x /app/docker-start.py

# Run the application
CMD ["python3", "/app/docker-start.py"]