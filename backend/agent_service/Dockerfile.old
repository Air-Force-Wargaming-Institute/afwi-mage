FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure the agents directory is copied
COPY agents /app/agents

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]