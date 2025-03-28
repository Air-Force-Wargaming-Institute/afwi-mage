FROM mage-base:latest

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service-specific files
COPY . .

EXPOSE 8011

CMD uvicorn app:app --host 0.0.0.0 --port 8011 --reload --timeout-keep-alive 75 --limit-concurrency 100 --backlog 100