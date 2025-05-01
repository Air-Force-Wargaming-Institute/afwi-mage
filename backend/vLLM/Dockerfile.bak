FROM vllm/vllm-openai:latest

# Default value for GPU count
ARG GPU_COUNT=1
ENV TP_SIZE=$GPU_COUNT

# Create an entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
RUN mkdir -p /models/DeepSeek-R1-Distill-Qwen-7B-abliterated-v2
ADD ./models/DeepSeek-R1-Distill-Qwen-7B-abliterated-v2 /models/DeepSeek-R1-Distill-Qwen-7B-abliterated-v2

ENTRYPOINT ["/entrypoint.sh"]