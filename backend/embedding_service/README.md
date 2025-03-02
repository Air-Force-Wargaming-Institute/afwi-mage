# Embedding Service Test Script

This directory contains a test script for the embedding service API, specifically for testing vector store creation, update, and job status tracking.

## Recent Fixes

### 2025-03-01: Fixed Chunking Method Parameter Issue

The server code in `app.py` had an inconsistency where it was trying to access `request.chunking_method` in the `process_vectorstore_creation` function, but the `CreateVectorStoreRequest` model defined `use_paragraph_chunking` as a boolean parameter instead. 

The fix involved:

1. Modifying the `process_vectorstore_creation` function to correctly use `request.use_paragraph_chunking` instead of trying to access a non-existent `chunking_method` parameter.
2. Adding code to determine the `chunking_method` string based on the boolean value of `use_paragraph_chunking`.
3. Updating the test script to use the correct parameters when creating and updating vector stores.

## Running the Test Script

The test script performs the following operations:

1. Checks if the embedding service is healthy
2. Creates test files for initial vector store creation
3. Creates a vector store with the initial files
4. Monitors the job status until completion or timeout
5. Creates additional test files for vector store update
6. Updates the vector store with the additional files
7. Monitors the update job status
8. Cleans up all test files

To run the test script:

```bash
python test_job_status.py
```

## API Endpoints

The script uses the following API endpoints:

- Health check: `GET /health`
- Create vector store: `POST /api/embedding/vectorstores`
- Update vector store: `POST /api/embedding/vectorstores/{vectorstore_id}/update`
- Get job status: `GET /api/embedding/status/{job_id}`

## Configuration

The script uses the following configuration:

- API base URL: `http://localhost:8006` (default)
- Upload directory: `<project_root>/data/uploads` 