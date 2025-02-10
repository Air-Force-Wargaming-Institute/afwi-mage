FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create NLTK data directory and download all data
RUN mkdir -p /app/nltk_data
RUN python -m nltk.downloader -d /app/nltk_data all

COPY . .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002"]
