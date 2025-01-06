FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Download all necessary NLTK data
RUN python -m nltk.downloader -d /usr/local/share/nltk_data all

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002"]
