#!/bin/bash
set -e
# Check if model already exists
echo "Checking if model already exists..."
if ollama list 2>/dev/null | grep -q "nomic-embed-text"; then
    echo "Model nomic-embed-text already exists, skipping creation"
else
    # Start Ollama in background temporarily
    echo "Starting Ollama server temporarily..."
    ollama serve &
    SERVER_PID=$!

    # Wait for server to initialize
    echo "Waiting for server to initialize..."
    sleep 10

    # Create the model
    echo "Creating the nomic-embed-text model..."
    cd /root/.ollama/models
    if ollama create nomic-embed-text -f Modelfile; then
        echo "Successfully created nomic-embed-text model"
    else
        echo "Warning: Error during model creation, but continuing as model may still be usable"
    fi

    # Verify model was created
    echo "Verifying model was created:"
    ollama list

    # Stop the background server
    echo "Stopping temporary server..."
    kill $SERVER_PID
    wait $SERVER_PID || true
fi

# Start server in foreground for container to stay running
echo "Starting Ollama server in foreground..."
exec ollama serve
