FROM vllm/vllm-openai:latest

# Default value for GPU count
ARG GPU_COUNT=1
ENV TP_SIZE=$GPU_COUNT

# Create an entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]