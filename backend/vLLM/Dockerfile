FROM vllm/vllm-openai:latest

# Default value for GPU count
ARG GPU_COUNT=1
ENV TP_SIZE=$GPU_COUNT

# Create an entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
RUN mkdir -p /models/DeepSeek-R1-Distill-llama-8b-abliterated
ADD ./DeepSeek-R1-Distill-Llama-8B-abliterated /models/DeepSeek-R1-Distill-llama-8b-abliterated

ENTRYPOINT ["/entrypoint.sh"]