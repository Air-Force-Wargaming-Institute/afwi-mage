FROM mage-base:latest

# No need to install dependencies as they're in the base image

# Copy service-specific files
COPY . .

EXPOSE 8011

CMD uvicorn app:app --host 0.0.0.0 --port 8011 --reload --timeout-keep-alive 75 --limit-concurrency 100 --backlog 100