# Stage 1: Copy wheels
FROM scratch as wheels_copier
COPY offline_packages/backend_wheels /wheels

# Stage 2: Copy NLTK data (if needed)
FROM scratch as nltk_data_copier
COPY offline_packages/nltk_data /nltk_data

# Stage 3: Actual build
FROM mage-common-offline:latest

WORKDIR /app

# Copy wheels from the first stage
COPY --from=wheels_copier /wheels /app/wheels

# Copy NLTK data (if needed)
COPY --from=nltk_data_copier /nltk_data /app/nltk_data

# Copy requirements and install using local wheels
COPY requirements.txt .
RUN pip install --no-index --find-links=/app/wheels -r requirements.txt

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
