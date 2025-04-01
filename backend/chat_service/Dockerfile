FROM python:3.11-slim


# No need to install dependencies as they're in the base image
COPY requirements.txt .
RUN pip install --cache-dir /tmp/pip-cache -r requirements.txt
# Copy service-specific files
COPY . .

# Expose port for the service
EXPOSE 8009

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8009"]