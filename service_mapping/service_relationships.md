# AFWI MAGE Service Relationships

```mermaid
graph TD
    Client[Frontend Client] -->|HTTP| Gateway[API Gateway]
    
    %% Core Connections
    Gateway -->|/api/core/documents/| Core[Core Service :8000]
    Gateway -->|/api/users/| Auth[Auth Service :8010]
    Gateway -->|/chat/| Chat[Chat Service :8009]
    Gateway -->|/api/v1/chat/| DirectChat[Direct Chat Service :8011+]
    Gateway -->|/api/upload/| Upload[Upload Service :8005]
    Gateway -->|/api/agent/| Agent[Agent Service :8001]
    Gateway -->|/api/embed/| Embedding[Embedding Service :8006]
    Gateway -->|/api/extract/| Extraction[Extraction Service :8002]
    Gateway -->|/api/generate/| Generation[Generation Service :8003]
    Gateway -->|/api/review/| Review[Review Service :8004]
    
    %% Service-to-Service connections
    Chat -.->|Depends on| Core
    Chat -.->|Depends on| Agent
    DirectChat -.->|Depends on| Core
    Upload -.->|Depends on| Core
    Extraction -.->|Depends on| Core
    Generation -.->|Depends on| Core
    Embedding -.->|Depends on| Core
    Agent -.->|Depends on| Core
    Review -.->|Depends on| Core
    
    %% Auth verification for all services
    Auth -.->|JWT Verification| Gateway
    
    %% Data Flow
    subgraph Data Storage
        DocStorage[Document Storage]
        VectorStorage[Vector Storage]
        ModelStorage[Model Storage]
        SessionStorage[Session Storage]
    end
    
    Core -.->|Read/Write| DocStorage
    Extraction -.->|Read/Write| DocStorage
    Upload -.->|Write| DocStorage
    Embedding -.->|Read/Write| VectorStorage
    Generation -.->|Read/Write| ModelStorage
    Chat -.->|Read/Write| SessionStorage
    DirectChat -.->|Read/Write| SessionStorage
    
    %% Legend
    classDef highTraffic fill:#f96,stroke:#333,stroke-width:2px;
    classDef medTraffic fill:#9cf,stroke:#333,stroke-width:1px;
    classDef lowTraffic fill:#f9f,stroke:#333,stroke-width:1px;
    
    class Chat,DirectChat,Embedding highTraffic;
    class Core,Auth,Upload medTraffic;
    class Agent,Extraction,Generation,Review lowTraffic;
```

## Key Observations

1. **Central Dependencies**:
   - Core Service is a central dependency for most services
   - JWT authentication is a central dependency for the API Gateway

2. **Service Clusters**:
   - Chat Services (Chat + Direct Chat): User-facing conversational interfaces
   - Document Services (Upload + Extraction + Embedding): Document handling pipeline
   - AI Services (Agent + Generation): AI model and team management
   - Support Services (Auth + Review): Security and moderation

3. **Deployment Considerations**:
   - High-traffic services (Chat, Direct Chat, Embedding) should be prioritized for scaling
   - Core Service and Auth Service are critical path services that require high availability
   - Service-to-service communication happens internally via Docker network

4. **Potential Bottlenecks**:
   - Core Service is a central dependency - should be monitored closely
   - Auth Service validation can become a bottleneck - consider caching
   - File upload handling can consume significant resources - needs rate limiting

## Gateway Implementation Strategy

Given the service relationships, the API Gateway should:

1. Route requests based on path prefixes to the appropriate services
2. Implement JWT validation middleware for secured services
3. Apply service-specific rate limiting based on traffic patterns
4. Provide circuit breaking for service failure isolation
5. Implement retries for critical services like Core and Auth 