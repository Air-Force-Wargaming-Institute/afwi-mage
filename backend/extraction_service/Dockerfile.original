FROM mage-common:latest

WORKDIR /app

# Install necessary system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

# Create NLTK data directory and download only the necessary data
RUN mkdir -p /app/nltk_data
RUN python -m nltk.downloader -d /app/nltk_data punkt averaged_perceptron_tagger

COPY . .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002"]
