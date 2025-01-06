FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Download NLTK data
RUN python -m nltk.downloader punkt averaged_perceptron_tagger

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002"]
