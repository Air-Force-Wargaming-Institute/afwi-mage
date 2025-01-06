#!/bin/bash

# Wait for database to be ready
echo "Waiting for database..."
while ! python -c "import psycopg2; psycopg2.connect(host='db', database='authdb', user='postgres', password='password')" 2>/dev/null; do
    sleep 1
done

echo "Database is ready!"

# Create database tables
echo "Creating database tables..."
python -c "
from app import Base, engine
Base.metadata.create_all(bind=engine)
"

# Run database initialization
echo "Initializing admin user..."
python init_db.py

# Start the application
exec uvicorn app:app --host 0.0.0.0 --port 8010 