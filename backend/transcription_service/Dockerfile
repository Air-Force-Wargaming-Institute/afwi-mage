FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=off
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
    git \
    ffmpeg \
    software-properties-common && \
    add-apt-repository -y ppa:deadsnakes/ppa && \
    apt-get install -y --no-install-recommends \
    python3.10 \
    python3.10-dev \
    python3.10-venv \
    python3-pip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN python3.10 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --upgrade pip

RUN pip install torch==2.1.2 torchvision==0.16.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cu118

RUN pip install setuptools-rust
RUN pip install git+https://github.com/m-bain/whisperX.git

WORKDIR /app

COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt

COPY . .

ENV MODEL_CACHE_DIR=/app/.cache/whisperx
ENV HF_HOME=/app/.cache/huggingface
ENV HF_TOKEN="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"
RUN mkdir -p ${MODEL_CACHE_DIR} && \
    mkdir -p ${HF_HOME} && \
    chmod -R 777 /app/.cache

ENV TRANSCRIPTION_SERVICE_PORT=8021

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8021", "--lifespan", "on"]