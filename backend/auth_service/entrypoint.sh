#!/bin/bash

# Exit on error
set -e

# Function to wait for PostgreSQL
wait_for_postgres() {
    echo "Waiting for PostgreSQL..."
    local retries=30
    local count=0
    until pg_isready -h db -p 5432 -U postgres || [ $count -eq $retries ]; do
        echo "Waiting for PostgreSQL... ($((retries-count)) attempts remaining)"
        sleep 2
        count=$((count+1))
    done

    if [ $count -eq $retries ]; then
        echo "Error: PostgreSQL did not become ready in time"
        exit 1
    fi

    echo "PostgreSQL is ready!"
}

# Function to create database
create_database() {
    echo "Creating database if it doesn't exist..."
    if ! PGPASSWORD=password psql -h db -U postgres -lqt | cut -d \| -f 1 | grep -qw authdb; then
        PGPASSWORD=password psql -h db -U postgres -c "CREATE DATABASE authdb"
        echo "Database 'authdb' created successfully"
    else
        echo "Database 'authdb' already exists"
    fi
}

# Function to initialize database
init_database() {
    echo "Creating database tables..."
    python -c "
from app import Base, engine
Base.metadata.create_all(bind=engine)
"
    
    echo "Initializing admin user..."
    python init_db.py
}

# Main execution
echo "Starting Auth Service initialization..."

# Wait for PostgreSQL
wait_for_postgres

# Create and initialize database
create_database

# Wait a moment for the database to be fully ready
sleep 2

# Initialize database
init_database

echo "Auth Service initialization completed successfully"
echo "Starting Uvicorn server..."

# Start the application
exec uvicorn app:app --host 0.0.0.0 --port 8010 