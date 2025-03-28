# AFWI MAGE Service Mapping

## Service Overview

| Service Name        | Port  | Main Purpose                           | Authentication Required |
|---------------------|-------|---------------------------------------|-------------------------|
| Core Service        | 8000  | Document management, central API hub   | Yes (when enabled)     |
| Chat Service        | 8009  | Multi-agent chat interactions          | Yes (when enabled)     |
| Direct Chat Service | 8011+ | Direct chat with document context      | Yes (when enabled)     |
| Agent Service       | 8001  | Multi-agent team management            | Yes (when enabled)     |
| Extraction Service  | 8002  | Document text extraction               | Yes (when enabled)     |
| Generation Service  | 8003  | LLM fine-tuning & dataset generation   | Yes (when enabled)     |
| Review Service      | 8004  | Content moderation and review          | Yes (when enabled)     |
| Upload Service      | 8005  | File upload handling                   | Yes (when enabled)     |
| Embedding Service   | 8006  | Vector embeddings & similarity search  | Yes (when enabled)     |
| Auth Service        | 8010  | User authentication and authorization  | No (provides auth)     |

## Detailed Endpoint Mapping

### Core Service (Port 8000)

| Endpoint                 | Method | Description                            | Usage Pattern  |
|--------------------------|--------|----------------------------------------|----------------|
| `/`                      | GET    | Health check                           | Monitoring     |
| `/api/core/documents/*`       | Various| Document library management            | Regular access |

### Chat Service (Port 8009)

| Endpoint                    | Method | Description                          | Usage Pattern  |
|-----------------------------|--------|--------------------------------------|----------------|
| `/chat/refine`              | POST   | Refine chat messages                 | Heavy usage    |
| `/chat/process`             | POST   | Process chat messages with agents    | Heavy usage    |
| `/chat/generate_session_id` | POST   | Create new chat session              | Regular access |
| `/sessions/{session_id}`    | GET    | Get session information              | Regular access |
| `/sessions`                 | GET    | List all sessions                    | Regular access |
| `/sessions/{session_id}`    | DELETE | Delete a session                     | Occasional     |
| `/sessions/{session_id}`    | PUT    | Update session details               | Occasional     |
| `/models/ollama`            | GET    | List available Ollama models         | Occasional     |
| `/api/prompts/list`         | GET    | List system prompts                  | Regular access |
| `/api/prompts/{prompt_id}`  | GET    | Get specific prompt                  | Regular access |
| `/api/prompts`              | POST   | Create a new prompt                  | Occasional     |
| `/api/prompts/{prompt_id}`  | PUT    | Update an existing prompt            | Occasional     |
| `/api/prompts/{prompt_id}`  | DELETE | Delete a prompt                      | Rare           |
| `/conversations/list`       | GET    | List all conversations               | Regular access |
| `/conversations/{id}`       | GET    | Get specific conversation            | Regular access |

### Direct Chat Service (Port 8011+)

| Endpoint                                                | Method | Description                    | Usage Pattern  |
|---------------------------------------------------------|--------|--------------------------------|----------------|
| `/api/v1/health`                                        | GET    | Health check                   | Monitoring     |
| `/api/v1/chat/message`                                  | POST   | Send message to chat           | Heavy usage    |
| `/api/v1/chat/history/{session_id}`                     | GET    | Get chat history               | Regular access |
| `/api/v1/chat/session`                                  | POST   | Create new session             | Regular access |
| `/api/v1/chat/sessions`                                 | GET    | List all sessions              | Regular access |
| `/api/v1/chat/session/{session_id}/name`                | PUT    | Update session name            | Occasional     |
| `/api/v1/chat/session/{session_id}`                     | DELETE | Delete session                 | Occasional     |
| `/api/v1/chat/session/{session_id}/documents/upload`    | POST   | Upload document                | Regular access |
| `/api/v1/chat/session/{session_id}/documents/{doc_id}`  | DELETE | Delete document                | Occasional     |
| `/api/v1/chat/session/{session_id}/documents/states`    | GET    | Get document states            | Regular access |
| `/api/v1/vectorstores`                                  | GET    | List available vector stores   | Occasional     |

### Auth Service (Port 8010)

| Endpoint                 | Method | Description                            | Usage Pattern  |
|--------------------------|--------|----------------------------------------|----------------|
| `/`                      | GET    | Welcome message                        | Rare           |
| `/api/auth/health`            | GET    | Health check endpoint                  | Monitoring     |
| `/api/auth/users/register`    | POST   | Register new user                      | Occasional     |
| `/api/auth/users/login`       | POST   | User login                             | Heavy usage    |
| `/api/auth/users/me`          | GET    | Get current user info                  | Regular access |

### Upload Service (Port 8005)

| Endpoint                 | Method | Description                            | Usage Pattern  |
|--------------------------|--------|----------------------------------------|----------------|
| `/`                      | GET    | Welcome message                        | Rare           |
| `/api/upload/document`   | POST   | Upload document                        | Regular access |
| `/api/upload/documents`  | GET    | List uploaded documents                | Regular access |

### Agent Service (Port 8001)

| Endpoint                 | Method | Description                            | Usage Pattern  |
|--------------------------|--------|----------------------------------------|----------------|
| `/api/agent/teams`      | GET    | List agent teams                       | Regular access |
| `/api/agent/team/{id}`  | GET    | Get specific team                      | Regular access |
| `/api/agent/create`     | POST   | Create new agent                       | Occasional     |

### Embedding Service (Port 8006)

| Endpoint                     | Method | Description                        | Usage Pattern  |
|------------------------------|--------|------------------------------------|----------------|
| `/api/embed/document/{id}`   | POST   | Create embeddings for document     | Regular access |
| `/api/embed/search`          | POST   | Search document embeddings         | Heavy usage    |
| `/api/embed/status`          | GET    | Check embedding service status     | Monitoring     |

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
- match: PathPrefix(`/api/embed`)
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