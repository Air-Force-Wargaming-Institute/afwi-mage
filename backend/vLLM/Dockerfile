FROM vllm/vllm-openai:latest

# Default value for GPU count
ARG GPU_COUNT=1
ENV TP_SIZE=$GPU_COUNT

# Create an entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
RUN mkdir -p /models/DeepHermes-3-Llama-3-8B-Preview
ADD ./DeepHermes-3-Llama-3-8B-Preview /models/DeepHermes-3-Llama-3-8B-Preview

ENTRYPOINT ["/entrypoint.sh"]