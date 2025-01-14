FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Make the script executable
RUN chmod +x /app/entrypoint.sh

# Use a shell form of CMD to ensure proper command execution
CMD bash -c 'while ! python -c "import psycopg2; psycopg2.connect(host='\''db'\'', database='\''authdb'\'', user='\''postgres'\'', password='\''password'\'')" 2>/dev/null; do echo "Waiting for database..."; sleep 1; done && \
    echo "Database is ready!" && \
    python -c "from app import Base, engine; Base.metadata.create_all(bind=engine)" && \
    python init_db.py && \
    exec uvicorn app:app --host 0.0.0.0 --port 8010'
