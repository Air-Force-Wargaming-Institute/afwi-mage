FROM mage-base:latest

# No need to install dependencies as they're in the base image
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy service-specific files
COPY . .

# Expose port
EXPOSE 8000

# Start the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]