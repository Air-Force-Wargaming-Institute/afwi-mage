# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies if needed
# RUN apt-get update && apt-get install -y --no-install-recommends some-package && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY . .

# Make port 8012 available to the world outside this container
EXPOSE 8012

# Define environment variable
ENV SERVICE_NAME WargameBuilderService

# Ensure the data directory exists
RUN mkdir -p /app/data/wargames

# Corrected CMD: Point Uvicorn to the 'app' object inside the 'app.py' file
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8012"] 