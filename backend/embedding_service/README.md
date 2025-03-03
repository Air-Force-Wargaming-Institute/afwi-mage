# Embedding Service

The Embedding Service is responsible for:
1. Processing documents and extracting their text content
2. Generating embeddings for document chunks
3. Storing document embeddings in vector stores
4. Querying vector stores for similar documents
5. Providing LLM-enhanced analysis of vector store content

## Architecture

The service has been completely refactored from a monolithic structure to a modular architecture with clean separation of concerns:

```
embedding_service/
├── api/                 # API layer - FastAPI endpoints
│   ├── embedding.py     # Embedding model endpoints
│   ├── files.py         # File management endpoints
│   ├── jobs.py          # Background job endpoints
│   ├── llm.py           # LLM integration endpoints
│   ├── maintenance.py   # System maintenance endpoints
│   └── vectorstore.py   # Vector store endpoints
├── core/                # Core business logic
│   ├── document.py      # Document processing
│   ├── embedding.py     # Embedding generation
│   ├── job.py           # Background job management
│   ├── maintenance.py   # System maintenance operations
│   ├── metadata.py      # Metadata handling
│   └── vectorstore.py   # Vector store operations
├── tests/               # Test modules
│   └── ...              # Various test files
├── utils/               # Utility functions
├── config.py            # Configuration management
├── main.py              # Main application entry point
├── Dockerfile           # Docker configuration
└── requirements.txt     # Dependencies
```

## Running the Service

### Local Development

To run the service locally for development:

```bash
cd afwi-multi-agent-generative-engine/backend/embedding_service
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8006
```

### Docker

To run using Docker:

```bash
cd afwi-multi-agent-generative-engine/backend
docker compose up embedding
```

## API Documentation

Once the service is running, you can access the Swagger UI documentation at:

```
http://localhost:8006/docs
```

## Key Features

### Metadata Preservation

The service ensures that document metadata (especially filenames and security classifications) is properly preserved throughout the entire pipeline, from document processing to query results.

### Vector Store Management

Create, update, query, and manage vector stores with proper handling of document metadata and security classifications.

### Embedding Models

Support for multiple embedding models, including Nomic and others.

### LLM Integration

Integration with LLMs for advanced content analysis and query enhancement.

### Background Jobs

Long-running operations are handled as background jobs with status tracking.

## Testing

To run the tests:

```bash
python test_metadata_handling.py
```

Or use the test runner script:

```bash
./run_metadata_test.sh
```

## Debugging and Maintenance

The service includes endpoints for system resource monitoring and backup management:

- System resources: `GET /api/embedding/system-resources`
- Cleanup backups: `POST /api/embedding/cleanup-backups`

## Docker Configuration

The service is containerized using Docker and can be run with Docker Compose. GPU support is enabled when available. 