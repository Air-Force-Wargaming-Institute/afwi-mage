# AFWI MAGE Service Mapping

## Service Overview

| Service Name                                          | Port  | Main Purpose                           | Authentication Required |
|-------------------------------------------------------|-------|----------------------------------------|-------------------------|
| [Core Service](#core-service-port-8000)               | 8000  | Document management, central API hub   | Yes (when enabled)     |
| [Agent Service](#agent-service-port-8001)             | 8001  | Multi-agent team management            | Yes (when enabled)     |
| [Extraction Service](#extraction-service-port-8002)   | 8002  | Document text extraction               | Yes (when enabled)     |
| [Generation Service](#generation-service-port-8003)   | 8003  | LLM fine-tuning & dataset generation   | Yes (when enabled)     |
| [Review Service](#review-service-port-8004)           | 8004  | Content moderation and review          | Yes (when enabled)     |
| [Upload Service](#upload-service-port-8005)           | 8005  | File upload handling                   | Yes (when enabled)     |
| [Embedding Service](#embedding-service-port-8006)     | 8006  | Vector embeddings & similarity search  | Yes (when enabled)     |
| [Chat Service](#chat-service-port-8009)               | 8009  | Multi-agent chat interactions          | Yes (when enabled)     |
| [Auth Service](#auth-service-port-8010)               | 8010  | User authentication and authorization  | No (provides auth)     |
| [Direct Chat Service](#direct-chat-service-port-8011) | 8011+ | Direct chat with document context      | Yes (when enabled)     |

## Detailed Endpoint Mapping

### Core Service (Port 8000)

| Endpoint                                                    | Method | Description                                          | Usage Pattern  |
|-------------------------------------------------------------|--------|------------------------------------------------------|----------------|
| `/api/core/health`                                          | GET    | Health check endpoint for the API gateway            | Monitoring     |
| `/api/core/documents`                                       | GET    | List all documents and folders in the specified path | Regular access |
| `/api/core/documents/folders`                               | POST   | Create a new folder                                  | Regular access |
| `/api/core/documents/rename`                                | POST   | Rename a document or folder                          | Regular access |
| `/api/core/documents/move`                                  | POST   | Move documents or folders to a different folder      | Regular access |
| `/api/core/documents/upload`                                | POST   | Upload one or more documents                         | Regular access |
| `/api/core/documents/{document_id}/download`                | GET    | Download a single document                           | Regular access |
| `/api/core/documents/{document_id}`                         | DELETE | Delete a specific document                           | Regular access |
| `/api/core/documents/{document_id}/preview`                 | GET    | Get a preview of a document's content                | Regular access |
| `/api/core/documents/bulk-delete`                           | POST   | Delete multiple documents at once with tracking      | Regular access |
| `/api/core/documents/bulk-download`                         | POST   | Download multiple documents as a ZIP file            | Regular access |
| `/api/core/documents/bulk-operations/{operation_id}/status` | GET    | Get the status of a bulk operation                   | Regular access |

### Agent Service (Port 8001)

| Endpoint                              | Method | Description                                      | Usage Pattern  |
|---------------------------------------|--------|--------------------------------------------------|----------------|
| `/`                                   | GET    | Root                                             | Rare           |
| `/api/agent/health`                   | GET    | Health check endpoint for the API gateway        | Monitoring     |
| `/api/agent/list_agents/`             | GET    | List agents                                      | Regular access |
| `/api/agent/list_teams/`              | GET    | List teams                                       | Regular access |
| `/api/agent/available_teams/`         | GET    | Get available teams                              | Regular access |
| `/api/agent/list_vs/`                 | GET    | List all available vectorstores from directory   | Occasional     |
| `/api/agent/create_agent/`            | POST   | Create agent                                     | Occasional     |
| `/api/agent/create_team/`             | POST   | Create team                                      | Occasional     |
| `/api/agent/update_agent/{unique_id}` | PUT    | Update agent                                     | Occasional     |
| `/api/agent/update_team/{unique_id}`  | PUT    | Update team                                      | Occasional     |
| `/api/agent/delete_agent/{unique_id}` | DELETE | Delete agent                                     | Rare           |
| `/api/agent/delete_team/{unique_id}`  | DELETE | Delete team                                      | Rare           |

### Extraction Service (Port 8002)

| Endpoint                                | Method | Description                                   | Usage Pattern  |
|-----------------------------------------|--------|-----------------------------------------------|----------------|
| `/`                                     | GET    | Root                                          | Rare           |
| `/api/extraction/health`                | GET    | Health check endpoint for the API gateway     | Monitoring     |
| `/api/extraction/files/`                | GET    | List files                                    | Regular access |
| `/api/extraction/extract/`              | POST   | Extract file content                          | Regular access |
| `/api/extraction/csv-files/`            | GET    | Get CSV files                                 | Regular access |
| `/api/extraction/csv-preview/{filename}`| GET    | Get CSV preview                               | Regular access |
| `/api/extraction/rename-csv/`           | POST   | Rename CSV file                               | Occasional     |
| `/api/extraction/delete-csv/{filename}` | DELETE | Delete CSV file                               | Occasional     |
| `/api/extraction/update-csv/{filename}` | POST   | Update CSV file                               | Occasional     |

### Generation Service (Port 8003)

| Endpoint                                       | Method | Description                                 | Usage Pattern  |
|------------------------------------------------|--------|---------------------------------------------|----------------|
| `/`                                            | GET    | Root                                        | Rare           |
| `/api/generation/health`                       | GET    | Health check endpoint for the API gateway   | Monitoring     |
| `/api/generate/available-models/`              | GET    | Get available models                        | Regular access |
| `/api/generate/training-datasets/`             | GET    | Get training datasets                       | Regular access |
| `/api/generate/csv-preview/{filename}`         | GET    | Get CSV preview                             | Regular access |
| `/api/generate/generate-dataset/`              | POST   | Generate dataset                            | Occasional     |
| `/api/generate/initialize-model/{model_name}`  | POST   | Init model                                  | Occasional     |
| `/api/generate/chat-with-model/{model_name}`   | POST   | Chat                                        | Heavy usage    |
| `/api/generate/generate-text/{model_name}`     | POST   | Generate                                    | Heavy usage    |

### Review Service (Port 8004)

| Endpoint                       | Method | Description                               | Usage Pattern  |
|--------------------------------|--------|-------------------------------------------|----------------|
| `/`                            | GET    | Root                                      | Rare           |
| `/api/review/health`           | GET    | Health check endpoint for the API gateway | Monitoring     |
| `/api/review/file/{filename}`  | GET    | Get extracted content                     | Regular access |
| `/api/review/file/{filename}`  | POST   | Update extracted content                  | Occasional     |

### Upload Service (Port 8005)

| Endpoint                                 | Method | Description                                  | Usage Pattern  |
|------------------------------------------|--------|----------------------------------------------|----------------|
| `/`                                      | GET    | Root                                         | Rare           |
| `/api/upload/health`                     | GET    | Health check endpoint for the API gateway    | Monitoring     |
| `/api/upload/upload/`                    | POST   | Upload files                                 | Regular access |
| `/api/upload/files/`                     | GET    | List files                                   | Regular access |
| `/api/upload/files/{file_path}`          | GET    | Get file                                     | Regular access |
| `/api/upload/files/{filename}`           | DELETE | Delete file                                  | Occasional     |
| `/api/upload/create_folder/`             | POST   | Create folder                                | Occasional     |
| `/api/upload/rename_folder/`             | POST   | Rename folder                                | Occasional     |
| `/api/upload/rename_file/`               | POST   | Rename file                                  | Occasional     |
| `/api/upload/delete_folder/{folder_path}`| DELETE | Delete folder                                | Occasional     |
| `/api/upload/move-file/`                 | POST   | Move file                                    | Occasional     |
| `/api/upload/update-security/`           | POST   | Update security classification               | Occasional     |
| `/api/upload/bulk-delete/`               | POST   | Bulk delete                                  | Occasional     |
| `/api/upload/bulk-download/`             | POST   | Bulk download                                | Occasional     |
| `/api/upload/delete-pdf-page/`           | POST   | Delete PDF page                              | Rare           |
| `/api/upload/pdf-info/{file_path}`       | GET    | Get PDF info                                 | Regular access |
| `/api/upload/preview-docx/{file_path}`   | GET    | Preview DOCX                                 | Regular access |
| `/api/upload/preview-txt/{file_path}`    | GET    | Preview TXT                                  | Regular access |
| `/api/upload/preview-tabular/{file_path}`| GET    | Preview Excel (.xlsx, .xls) or CSV files     | Regular access |

### Embedding Service (Port 8006)

| Endpoint                                                    | Method | Description                                           | Usage Pattern  |
|-------------------------------------------------------------|--------|-------------------------------------------------------|----------------|
| `/api/embedding/health`                                     | GET    | API health check                                      | Monitoring     |
| `/api/embedding/system/status`                              | GET    | Get system status                                     | Monitoring     |
| `/api/embedding/config`                                     | GET    | Return current configuration (excluding sensitive)    | Occasional     |
| `/api/embedding/models`                                     | GET    | Get a list of available embedding models              | Occasional     |
| `/api/embedding/files`                                      | GET    | Get a list of files available for embedding           | Regular access |
| `/api/embedding/files{file_path}`                           | GET    | Get detailed information about a file                 | Regular access |
| `/api/embedding/files{file_path}`                           | DELETE | Delete a file and its associated metadata             | Regular access |
| `/api/embedding/status/{job_id}`                            | GET    | Get status of a background job                        | Regular access |
| `/api/embedding/jobs`                                       | GET    | List all jobs without filtering                       | Regular access |
| `/api/embedding/jobs/stats`                                 | GET    | Get job statistics                                    | Regular access |
| `/api/embedding/jobs/{job_id}`                              | GET    | Get the status of a job                               | Regular access |
| `/api/embedding/jobs/{job_id}`                              | DELETE | Cancel a running job                                  | Regular access |
| `/api/embedding/jobs/status/{job_id}`                       | GET    | Get job status by ID at the path the frontend expects | Regular access |
| `/api/embedding/llm/vectorstores/{vectorstore_id}/analyze`  | POST   | Analyze the content of a vector store using an LLM    | Regular access |
| `/api/embedding/llm/vectorstores/{vectorstore_id}/quert`    | POST   | Query a vectorstore and get an LLM response           | Regular access |
| `/api/embedding/vectorstores`                               | GET    | Get a list of all vector stores                       | Regular access |
| `/api/embedding/vectorstores`                               | POST   | Create a new vector store with specified files        | Occasional     |
| `/api/embedding/vectorstores/{vectorstore_id}`              | GET    | Get details of a specific vector store                | Regular access |
| `/api/embedding/vectorstores/{vectorstore_id}`              | PUT    | Update metadata for a vector store                    | Occasional     |
| `/api/embedding/vectorstores/{vectorstore_id}`              | DELETE | Delete a vector store                                 | Rare           |
| `/api/embedding/vectorstores/{vectorstore_id}/update`       | POST   | Update an existing vector store with new files        | Occasional     |
| `/api/embedding/vectorstores/{vectorstore_id}/batch_update` | POST   | Perform a batch update on a vector store              | Occasional     |
| `/api/embedding/vectorstores/{vectorstore_id}/query`        | POST   | Query a vector store with a text query                | Heavy usage    |
| `/api/embedding/vectorstores/{vectorstore_id}/llm-query`    | POST   | Query vector store and get LLM-enhanced responses     | Heavy usage    |
| `/api/embedding/vectorstores/{vectorstore_id}/analyze`      | POST   | Analyze the content of a vector store using LLM       | Occasional     |
| `/api/embedding/vectorstores/{vectorstore_id}/documents`    | DELETE | Remove documents from a vector store                  | Occasional     |
| `/api/embedding/maintenance/cleanup-backups`                | POST   | Clean up old backup files for all vector stores       | Occasional     |
| `/api/embedding/maintenance/system-resources`               | GET    | Get current system resource information               | Occasional     |

### Chat Service (Port 8009)

| Endpoint                                                  | Method | Description                                   | Usage Pattern  |
|-----------------------------------------------------------|--------|-----------------------------------------------|----------------|
| `/`                                                       | GET    | Root                                          | Root           |
| `/api/chat/health`                                        | GET    | Health check endpoint for the API gateway     | Monitoring     |
| `/api/chat/process`                                       | POST   | Chat endpoint                                 | Heavy usage    |
| `/api/chat/refine`                                        | POST   | Refine chat messages                          | Heavy usage    |
| `/api/chat/generate_session_id`                           | POST   | Generate session ID                           | Regular access |
| `/api/chat/sessions`                                      | GET    | List sessions                                 | Regular access |
| `/api/chat/sessions/{session_id}`                         | GET    | Get session                                   | Regular access |
| `/api/chat/sessions/{session_id}`                         | PUT    | Update session                                | Occasional     |
| `/api/chat/sessions/{session_id}`                         | DELETE | Delete session                                | Occasional     |
| `/api/chat/conversations/list`                            | GET    | Get a list of all conversations               | Regular access |
| `/api/chat/conversations/{conversation_id}`               | GET    | Get details of a specific conversation        | Regular access |
| `/api/chat/conversations/by-session/{session_id}`         | GET    | Get all conversations for a specific session  | Regular access |
| `/api/chat/models/ollama`                                 | GET    | Get a list of available Ollama models         | Occasional     |
| `/api/chat/prompts/list`                                  | GET    | Get all system prompts                        | Regular access |
| `/api/chat/prompts`                                       | POST   | Create a new system prompt                    | Occasional     |
| `/api/chat/prompts/{prompt_id}`                           | GET    | Get a specific prompt by ID                   | Regular access |
| `/api/chat/prompts/{prompt_id}`                           | PUT    | Update an existing system prompt              | Occasional     |
| `/api/chat/prompts/{prompt_id}`                           | DELETE | Delete a system prompt                        | Rare           |
| `/api/chat/prompts/{prompt_id}/variables`                 | GET    | Get variables for a specific prompt           | Rare           |
| `/api/chat/prompts/{prompt_id}/variables`                 | POST   | Add a new variable to a prompt                | Rare           |
| `/api/chat/prompts/{prompt_id}/variables/{variable_name}` | DELETE | Remove a variable from a prompt               | Rare           |

### Auth Service (Port 8010)

| Endpoint                         | Method | Description                            | Usage Pattern  |
|----------------------------------|--------|----------------------------------------|----------------|
| `/`                              | GET    | Root                                   | Rare           |
| `/api/auth/health`               | GET    | Health check                           | Monitoring     |
| `/api/auth/users/token`          | POST   | Login for access token                 | Heavy usage    |
| `/api/auth/users/validate-token` | GET    | Validate token                         | Heavy usage    |
| `/api/auth/users/`               | GET    | Read users                             | Occasional     |
| `/api/auth/users/`               | POST   | Create user                            | Occasional     |
| `/api/auth/users/me`             | GET    | Read users me                          | Regular access |
| `/api/auth/users/{user_id}`      | PUT    | Update user                            | Occasional     |
| `/api/auth/users/{user_id}`      | DELETE | Delete user                            | Rare           |

### Direct Chat Service (Port 8011)

| Endpoint                                                                       | Method | Description                                        | Usage Pattern  |
|--------------------------------------------------------------------------------|--------|----------------------------------------------------|----------------|
| `/api/direct_chat/health`                                                      | GET    | Health check endpoint for the API gateway          | Monitoring     |
| `/api/direct_chat/test/thinking-format`                                        | GET    | Test thinking format                               | Occasional     |
| `/api/direct_chat/vectorstores`                                                | GET    | List all available vectorstores in directory       | Occasional     |
| `/api/direct_chat/chat/message`                                                | POST   | Chat                                               | Heavy usage    |
| `/api/direct_chat/chat/sessions`                                               | GET    | Get chat sessions                                  | Regular access |
| `/api/direct_chat/chat/session`                                                | POST   | Create a new chat session                          | Regular access |
| `/api/direct_chat/chat/session/{session_id}`                                   | DELETE | Delete a session and all its files                 | Occasional     |
| `/api/direct_chat/chat/session/{session_id}/name`                              | PUT    | Update the name of a chat session                  | Occasional     |
| `/api/direct_chat/chat/session/{session_id}/metadata`                          | GET    | Get the metadata for a chat session                | Occasional     |
| `/api/direct_chat/chat/session/{session_id}/vectorstore`                       | PUT    | Set the vectorstore for retrieval in chat session  | Occasional     |
| `/api/direct_chat/chat/history/{session_id}`                                   | GET    | Get chat history                                   | Regular access |
| `/api/direct_chat/chat/session/{session_id}/documents/upload`                  | POST   | Upload a document and create its state             | Regular access |
| `/api/direct_chat/chat/session/{session_id}/documents/states`                  | GET    | Get all document states for a session              | Regular access |
| `/api/direct_chat/chat/session/{session_id}/documents/{doc_id}`                | DELETE | Delete a document and its files                    | Occasional     |
| `/api/direct_chat/chat/session/{session_id}/documents/{doc_id}/classification` | PUT    | Update document classification                     | Occasional     |
| `/api/direct_chat/chat/session/{session_id}/documents/{doc_id}/toggle`         | PUT    | Toggle the checked state of a document             | Occasional     |
| `/api/direct_chat/chat/session/{session_id}/documents/{doc_id}/status`         | GET    | Get the processing status of a document            | Occasional     |

### Workbench Service (Port 8020)

| Endpoint                                                                       | Method | Description                                             | Usage Pattern  |
|--------------------------------------------------------------------------------|--------|---------------------------------------------------------|----------------|
| `/api/workbench/health`                                                        | GET    | Health check endpoint for the API gateway               | Monitoring     |
| `/api/workbench/spreadsheets/list`                                             | GET    | List all available spreadsheets                         | Heavy usage    |
| `/api/workbench/spreadsheets/upload`                                           | POST   | Upload a new spreadsheet                                | Regular access |
| `/api/workbench/spreadsheets/{spreadsheet_id}/operate`                         | POST   | Perform an operation on cells in a spreadsheet          | Regular access |
| `/api/workbench/spreadsheets/{spreadsheet_id}/info`                            | GET    | Get information about a specifc spreadsheet             | Regular access |
| `/api/workbench/spreadsheets/{spreadsheet_id}/sheets`                          | GET    | Get the list of sheets in a spreadsheet                 | Regular access |
| `/api/workbench/spreadsheets/{spreadsheet_id}/summary`                         | GET    | Get a statistical summary of the data in a spreadsheet  | Regular access |
| `/api/workbench/spreadsheets/{spreadsheet_id}`                                 | DELETE | Delete a spreadsheet and its metadata                   | Occasional     |
| `/api/workbench/spreadsheets/{spreadsheet_id}`                                 | PATCH  | Update spreadsheet metadata                             | Regular access |
| `/api/workbench/spreadsheets/{spreadsheet_id}/download`                        | GET    | Download a spreadsheet file                             | Regular access |
| `/api/workbench/spreadsheets/{spreadsheet_id}transform`                        | POST   | Transform spreadsheet columns using LLM processing      | Regular access |
| `/api/workbench/visualizations/generate`                                       | POST   | Generate visualization code from natural language       | Regular access |
| `/api/workbench/visualizations/{visualization_id}/execute`                     | POST   | Execute modified visualization code                     | Regular access |
| `/api/workbench/visualizations/list`                                           | GET    | List all available visualizations                       | Regular access |
| `/api/workbench/visualizations/{visualization_id}`                             | GET    | Get information about a specific visualization          | Regular access |
| `/api/workbench/jobs/list`                                                     | GET    | List background jobs in creation date descending        | Regular access |
| `/api/workbench/jobs/{job_id}`                                                 | GET    | Get the status and details of a specific job            | Regular access |
| `/api/workbench/jobs/{job_id}/cancel`                                          | POST   | Request cancellation of a running job                   | Rare           |

## Traffic Distribution

Based on the service endpoints, here's the estimated traffic distribution:

- **High Traffic Services**
  - Chat Service (8009) - ~40% of traffic
  - Direct Chat Service (8011+) - ~30% of traffic
  - Embedding Service (8006) - ~15% of traffic

- **Medium Traffic Services**
  - Core Service (8000) - ~5% of traffic
  - Auth Service (8010) - ~5% of traffic
  - Upload Service (8005) - ~3% of traffic

- **Low Traffic Services**
  - Agent Service (8001) - ~1% of traffic
  - Extraction Service (8002) - ~0.5% of traffic
  - Generation Service (8003) - ~0.3% of traffic
  - Review Service (8004) - ~0.2% of traffic

## Base Routing Rules

Based on the service mapping, here are the suggested routing rules for the API Gateway:

```yaml
# Core Service Routes
- match: Path(`/api/core/documents`)
  kind: PathPrefix
  services:
    - name: core
      port: 8000

# Chat Service Routes
- match: PathPrefix(`/chat`) || PathPrefix(`/sessions`) || PathPrefix(`/conversations`) || PathPrefix(`/api/prompts`)
  kind: PathPrefix
  services:
    - name: chat
      port: 8009

# Direct Chat Service Routes
- match: PathPrefix(`/api/v1/chat`)
  kind: PathPrefix
  services:
    - name: direct_chat_service1
      port: 8011

# Auth Service Routes
- match: PathPrefix(`/api/users`) || Path(`/api/health`)
  kind: PathPrefix
  services:
    - name: auth
      port: 8010

# Upload Service Routes
- match: PathPrefix(`/api/upload`)
  kind: PathPrefix
  services:
    - name: upload
      port: 8005

# Agent Service Routes
- match: PathPrefix(`/api/agent`)
  kind: PathPrefix
  services:
    - name: agent
      port: 8001

# Embedding Service Routes
- match: PathPrefix(`/api/embedding`)
  kind: PathPrefix
  services:
    - name: embedding
      port: 8006

# Extraction Service Routes
- match: PathPrefix(`/api/extract`)
  kind: PathPrefix
  services:
    - name: extraction
      port: 8002

# Generation Service Routes
- match: PathPrefix(`/api/generate`)
  kind: PathPrefix
  services:
    - name: generation
      port: 8003

# Review Service Routes
- match: PathPrefix(`/api/review`)
  kind: PathPrefix
  services:
    - name: review
      port: 8004
```

## Security Considerations

- All service endpoints should be secured behind JWT authentication middleware when auth is enabled
- Rate limiting should be implemented based on traffic patterns:
  - High traffic endpoints: 100 req/min
  - Medium traffic endpoints: 50 req/min
  - Low traffic endpoints: 20 req/min
- File upload endpoints need special consideration for timeout settings and max file size limits
- Direct chat endpoints may require higher timeout values due to LLM processing time

## Next Steps

1. Validate all service endpoints with live system testing
2. Configure detailed route rules in Traefik
3. Implement authentication middleware
4. Set up rate limiting and circuit breaking rules 