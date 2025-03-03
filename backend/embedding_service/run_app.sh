#!/bin/bash
# Run the embedding service application with proper environment variables

# Set environment variables
export LOG_LEVEL=INFO
export DEBUG=true
export PORT=8002
export HOST="0.0.0.0"
export CORS_ORIGINS="*"

# Create data directories if they don't exist
mkdir -p data/uploads
mkdir -p data/vector_stores
mkdir -p data/jobs
mkdir -p data/staging

# Run the application
echo "Starting embedding service on $HOST:$PORT"
echo "Log level: $LOG_LEVEL"
echo "Debug mode: $DEBUG"
echo ""
python main.py 