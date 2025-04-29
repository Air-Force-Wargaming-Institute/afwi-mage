# Stage 1: Wheels (REMOVED - Copying directly in main stage)
# FROM scratch as wheels_copier
# COPY offline_packages/backend_wheels /wheels

# Stage 2: Copy NLTK data (if needed - NOW ONLY COPIED BY SPECIFIC SERVICES)
FROM scratch as nltk_data_copier
COPY offline_packages/nltk_data /nltk_data

# Stage 3: Actual build
ARG SERVICE_NAME # Argument to specify which service's wheels to copy
FROM mage-common-offline:latest

WORKDIR /app

# Copy service-specific wheels directly into this stage
COPY offline_packages/backend_wheels/${SERVICE_NAME} /app/wheels

# REMOVED: General NLTK data copy - will be added specifically for extraction_service
# COPY --from=nltk_data_copier /nltk_data /app/nltk_data

# Copy requirements and install using local wheels, then cleanup wheels
COPY requirements.txt .
# Ensure the wheels dir exists even if no wheels were copied (for rm -rf)
RUN mkdir -p /app/wheels \
    && pip install --no-index --find-links=/app/wheels -r requirements.txt \
    && rm -rf /app/wheels # Clean up wheels after installation

# For extraction_service, uncomment and adjust:
# RUN pip install --no-index --find-links=/app/wheels unstructured==0.10.16 unstructured-inference==0.6.6 --no-deps
# RUN pip install --no-index --find-links=/app/wheels "pytesseract>=0.3" "layoutparser[tesseract]>=0.3" --no-deps

# Copy application code
COPY . .

# Installing package in development mode
RUN pip install --no-index --find-links=/app/wheels -e .

# Create necessary directories (adjust based on service needs)
RUN mkdir -p /app/data/uploads && chmod -R 777 /app/data

# Expose port (adjust based on service)
EXPOSE 8000

# Start the application (adjust based on service)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 
