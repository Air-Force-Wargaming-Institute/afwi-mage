# Report Builder Service

The Report Builder Service is responsible for creating, managing, and generating structured reports within the MAGE system. It provides a flexible templating system, AI-powered content generation, and export capabilities for different document formats.

## Service Overview

- **Port**: 8019
- **Dependencies**: 
  - Embedding Service
  - vLLM Service (for AI content generation)
  - Python 3.9

## Key Features

- **Report Management**: Create, read, update, and delete report documents
- **Template System**: Predefined report templates (Executive Summary, Bullet Background Paper, etc.)
- **AI Content Generation**: Integrate with LLMs to generate report sections
- **Document Export**: Convert reports to various formats (Markdown, Word)
- **Vector Store Integration**: Query vector stores for relevant content
- **WebSocket Support**: Real-time updates during report generation

## Architecture

The service follows a modular architecture:

```
report_builder_service/
├── api/                    # API endpoints (FastAPI routers)
│   ├── generation.py       # AI content generation endpoints
│   ├── reports.py          # Report management endpoints
│   ├── templates.py        # Template management endpoints 
│   ├── vectorstores.py     # Vector store integration
│   └── websockets.py       # WebSocket endpoints
├── models/                 # Data models
│   └── schemas.py          # Pydantic models for API
├── services/               # Business logic
│   ├── file_service.py     # File operations
│   ├── generation_service.py # LLM integration
│   └── websocket_service.py # WebSocket handling
├── utils/                  # Utility functions
├── data/                   # Data storage
│   ├── reports/            # Report JSON files
│   └── templates/          # Template JSON files
├── config.py               # Service configuration
├── main.py                 # Application entry point
├── init_templates.py       # Template initialization
└── Dockerfile              # Container configuration
```

## API Endpoints

The service exposes several API endpoints under `/api/report_builder/`:

- **Reports API**: 
  - `POST /reports`: Create a new report
  - `GET /reports`: List all reports
  - `GET /reports/{id}`: Get a specific report
  - `PUT /reports/{id}`: Update a report
  - `DELETE /reports/{id}`: Delete a report

- **Templates API**:
  - `GET /templates`: List available templates
  - `GET /templates/{id}`: Get a specific template

- **Generation API**:
  - `POST /generate/{report_id}`: Generate content for a report
  - `POST /generate/{report_id}/element/{element_id}`: Generate a specific report element
  - `POST /export/markdown/{report_id}`: Export report as Markdown
  - `POST /export/word/{report_id}`: Export report as Word document

- **Vector Store API**:
  - `GET /vectorstores`: List available vector stores

- **WebSocket API**:
  - `/ws/report-generation/{report_id}`: WebSocket for real-time generation updates

## Report and Element Structure

Reports consist of elements with the following types:

1. **Explicit Elements**: Static content defined by the user
   - Various formats: h1, h2, paragraph, bulletList, etc.

2. **Generative Elements**: AI-generated content
   - User provides instructions
   - System generates content using LLM

## Template System

The service includes predefined report templates:
- Executive Summary
- Bullet Background Paper (BBP)
- Background Paper (BP)
- Plus custom templates created by users

## LLM Integration

AI-generated content is created by:
1. Collecting relevant context from vector stores
2. Sending the context + user instructions to the LLM
3. Receiving and formatting the generated content

## Setup and Running

### Prerequisites
- Docker and Docker Compose
- Python 3.9+ (for local development)
- Pandoc (for Word document export)

### Environment Variables
- `PORT`: Service port (default: 8019)
- `EMBEDDING_SERVICE_URL`: URL for the embedding service
- `VLLM_CHAT_COMPLETIONS_URL`: URL for the vLLM service
- `VLLM_MODEL_NAME`: LLM model to use for generation
- `VLLM_MAX_TOKENS`: Maximum tokens for generation (default: 2048)
- `VLLM_TEMPERATURE`: Temperature setting (default: 0.7)

### Running with Docker
```bash
# From project root
docker compose up report_builder_service
```

### Running for Development
```bash
cd report_builder_service
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8019
```

## Airgapped Deployment

For airgapped environments, a PowerShell script is included to download all required Python wheel packages:
```powershell
.\download_wheels.ps1
```

## System Requirements
- CPU: 2+ cores
- RAM: 2GB+ (more for concurrent report generation)
- Disk: 500MB+ for service and dependencies
- Docker with volume mounts enabled 