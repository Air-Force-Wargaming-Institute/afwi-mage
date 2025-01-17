#!/bin/bash

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
while ! pg_isready -h db -p 5432 -U postgres; do
    sleep 1
done

echo "PostgreSQL is ready!"

# Create database if it doesn't exist
echo "Creating database if it doesn't exist..."
PGPASSWORD=password psql -h db -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'authdb'" | grep -q 1 || \
    PGPASSWORD=password psql -h db -U postgres -c "CREATE DATABASE authdb"

# Wait a moment for the database to be ready
sleep 2

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