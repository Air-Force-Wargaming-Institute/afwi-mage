#!/bin/bash

# Check if model is available
./check_vllm_model.sh
if [ $? -ne 0 ]; then
    echo -e "\e[31mCannot start vLLM in airgapped mode due to missing model files.\e[0m"
    exit 1
fi

# Ensure Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "\e[31mDocker is not running or not properly configured.\e[0m"
    exit 1
fi

# Start vLLM service using the dedicated compose file
echo -e "\e[36mStarting vLLM service in airgapped mode...\e[0m"
docker-compose -f docker-compose.vllm.yml up -d

# Wait for service to start
echo -e "\e[36mWaiting for vLLM service to start (this may take a few minutes for model loading)...\e[0m"
sleep 30

# Check if service is up
max_retries=10
retry_count=0
service_up=false

while [ "$service_up" = false ] && [ $retry_count -lt $max_retries ]; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:8007/health" | grep -q "200"; then
        service_up=true
        echo -e "\e[32mvLLM service is up and running in airgapped mode!\e[0m"
    else
        retry_count=$((retry_count + 1))
        echo -e "\e[33mWaiting for service to become available (attempt $retry_count of $max_retries)...\e[0m"
        sleep 30
    fi
done

if [ "$service_up" = false ]; then
    echo -e "\e[31mvLLM service did not start properly. Check the logs with: docker-compose -f docker-compose.vllm.yml logs\e[0m"
    exit 1
fi

echo -e "\e[32mvLLM OpenAI-compatible API is available at: http://localhost:8007/v1/completions\e[0m"
echo -e "\e[32mAPI documentation is available at: http://localhost:8007/docs\e[0m"
exit 0 