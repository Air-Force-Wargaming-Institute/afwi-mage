# Stage 3: Actual build
FROM mage-common-offline:latest

WORKDIR /app

# For extraction_service, uncomment and adjust:
# RUN pip install --no-index --find-links=/app/wheels unstructured==0.10.16 unstructured-inference==0.6.6 --no-deps
# RUN pip install --no-index --find-links=/app/wheels "pytesseract>=0.3" "layoutparser[tesseract]>=0.3" --no-deps

# Copy application code
COPY . .

# For core_service, uncomment:
# RUN pip install --no-index --find-links=/app/wheels -e .

# Create necessary directories (adjust based on service needs)
RUN mkdir -p /app/data/uploads && chmod -R 777 /app/data

# Expose port (adjust based on service)
EXPOSE 8000

# Start the application (adjust based on service)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 
