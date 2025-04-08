# AFWI Multi-Agent Generative Engine (MAGE) Project Structure

## Overview

The AFWI Multi-Agent Generative Engine (MAGE) is a sophisticated AI-powered platform developed for the Air Force Wargaming Institute (AFWI). It provides capabilities for multi-agent system building, document management, information extraction, and model fine-tuning.

## Project File Structure

```
/afwi-multi-agent-generative-engine
├── api_gateway/                       # API Gateway for service orchestration
│   ├── docs/                          # API Gateway documentation
│   │   ├── logging_strategy.md        # Logging strategy documentation
│   │   └── testing_strategy.md        # Testing strategy documentation
│   │
│   ├── tests/                         # API Gateway tests
│   │   └── test_gateway_config.py     # Gateway configuration tests
│   │
│   ├── README.md                      # API Gateway documentation
│   ├── dynamic_conf.yaml              # Dynamic configuration for API Gateway
│   ├── gateway_architecture_design.md # Gateway architecture documentation
│   ├── setup_gateway.sh               # Gateway setup script
│   ├── traefik.yaml                   # Traefik configuration
│   └── docker-compose.gateway.yml     # Docker Compose for Gateway
│
├── backend/                           # Backend services
│   ├── agent_service/                 # LLM Agent and Team management service
│   │   ├── agents/                    # Agent implementations
│   │   │   ├── teams/                 # Agent teams configurations
│   │   │   │   ├── teams.json         # Teams configuration data
│   │   │   │   └── .gitkeep           # Git placeholder file
│   │   │   │
│   │   │   ├── individual_agents/     # Individual agent configurations
│   │   │   │   ├── agents.json        # Agents configuration data
│   │   │   │   └── .gitkeep           # Git placeholder file
│   │   │   │
│   │   │   ├── system_agents/         # System agents directory
│   │   │   │
│   │   │   └── templates/             # Agent templates
│   │   │       ├── team_class_template.py # Team class template
│   │   │       └── agent_class_template.py # Agent class template
│   │   │
│   │   ├── routes/                    # API routes
│   │   │   └── agent_routes.py        # Agent routing implementation
│   │   │
│   │   ├── models/                    # Service data models
│   │   │
│   │   ├── shared/                    # Shared utilities
│   │   │
│   │   ├── data/                      # Service-specific data
│   │   ├── app.py                     # Main application entry point
│   │   ├── config.py                  # Service configuration
│   │   ├── requirements.txt           # Agent service dependencies
│   │   ├── Dockerfile                 # Docker build configuration
│   │   └── Dockerfile.old             # Legacy Docker configuration
│   │
│   ├── auth_service/                  # User authentication service
│   │   ├── auth_planning/             # Auth service planning documents
│   │   │   ├── authentication_design_decisions.md # Auth design decisions
│   │   │   ├── authentication_design.md # Auth design documentation
│   │   │   ├── token_validation_endpoint.py # Token validation implementation
│   │   │   ├── toggle_auth.sh         # Auth toggle script
│   │   │   ├── service_with_auth_labels.yml # Service auth labels
│   │   │   ├── auth_service_env.example # Example env file
│   │   │   └── auth_service_docker_compose.yml # Auth Docker compose
│   │   │
│   │   ├── data/                      # Auth service data
│   │   │   └── user.py                # User data model
│   │   │
│   │   ├── app.py                     # Auth service main application
│   │   ├── config.py                  # Auth configuration
│   │   ├── database.py                # Database connection setup
│   │   ├── init_db.py                 # Database initialization
│   │   ├── schemas.py                 # Auth data schemas
│   │   ├── user_routes.py             # User authentication routes
│   │   ├── Dockerfile                 # Auth service Docker config
│   │   ├── Dockerfile.old             # Legacy Docker configuration
│   │   ├── entrypoint.sh              # Docker entrypoint script
│   │   ├── .env                       # Environment variables
│   │   ├── .env.example               # Example environment variables
│   │   └── README.md                  # Auth service documentation
│   │
│   ├── chat_service/                  # LLM Chat handling
│   │   ├── multiagent/                # Multi-agent chat implementation
│   │   │   ├── agents/                # Agent implementations
│   │   │   │   ├── synthesis_agent.py # Synthesis agent implementation
│   │   │   │   ├── user_proxy_moderator.py # User proxy implementation
│   │   │   │   ├── Expert_Agent.py    # Expert agent implementation
│   │   │   │   ├── helpers.py         # Helper functions
│   │   │   │   └── librarian_agent.py # Librarian agent implementation
│   │   │   │
│   │   │   ├── graph/                 # Graph implementation
│   │   │   │   ├── createGraph.py     # Graph creation logic
│   │   │   │   └── routers.py         # Graph routing
│   │   │   │
│   │   │   ├── support_models/        # Support models
│   │   │   │   ├── team_class.py      # Team class implementation
│   │   │   │   ├── agent_class.py     # Agent class implementation
│   │   │   │   └── chat.py            # Chat implementation
│   │   │   │
│   │   │   ├── processQuestion.py     # Question processing
│   │   │   ├── session_manager.py     # Session management
│   │   │   ├── graphState.py          # Graph state management
│   │   │   └── retriever_manager.py   # Retriever management
│   │   │
│   │   ├── utils/                     # Chat utilities
│   │   │   ├── vector_store/          # Vector store utilities
│   │   │   │   └── vectorstore.py     # Vector store implementation
│   │   │   │
│   │   │   ├── conversation_manager.py # Conversation management
│   │   │   ├── llm_manager.py         # LLM management
│   │   │   ├── model_list.py          # Model listing
│   │   │   ├── conversation_tracking.py # Conversation tracking
│   │   │   └── prompt_manager.py      # Prompt management
│   │   │
│   │   ├── vectorstore2/              # Vector storage for chat
│   │   │   ├── vectorStore2/          # Vector store data
│   │   │   ├── index.pkl              # Index pickle file
│   │   │   └── index.faiss            # FAISS index file
│   │   │
│   │   ├── conversation_logs/         # Chat conversation logs
│   │   │
│   │   ├── chat_teams/                # Team chat configuration
│   │   │
│   │   ├── data/                      # Service data
│   │   │
│   │   ├── logs/                      # Service logs
│   │   │
│   │   ├── shared/                    # Shared utilities
│   │   ├── app.py                     # Chat service main application
│   │   ├── config.yaml                # Chat service configuration
│   │   ├── config_.py                 # Alternative configuration
│   │   ├── requirements.txt           # Service dependencies
│   │   ├── Dockerfile                 # Docker configuration
│   │   └── Dockerfile.old             # Legacy Docker configuration
│   │
│   ├── core_service/                  # Core business logic
│   │   ├── routes/                    # Core service API routes
│   │   │   ├── document_library.py    # Document library routes
│   │   │   ├── upload_routes.py       # Upload routes
│   │   │   ├── agent_routes.py        # Agent routes
│   │   │   ├── extraction_routes.py   # Extraction routes
│   │   │   └── generate_routes.py     # Generation routes
│   │   │
│   │   ├── app.py                     # Core service main application
│   │   ├── config.py                  # Core service configuration
│   │   ├── core_routes.py             # Core routing implementation
│   │   ├── main.py                    # Application entry point
│   │   ├── setup.py                   # Setup script
│   │   ├── requirements.txt           # Core service dependencies
│   │   ├── Dockerfile                 # Docker configuration
│   │   └── Dockerfile.old             # Legacy Docker configuration
│   │
│   ├── direct_chat_service/           # Direct chat implementation
│   │   ├── sessions/                  # Chat sessions
│   │   │   └── admin/                 # Admin sessions
│   │   │
│   │   ├── data/                      # Service data
│   │   ├── app.py                     # Direct chat service main app
│   │   ├── chat_logger.py             # Chat logging functionality
│   │   ├── config.py                  # Service configuration
│   │   ├── config.yaml                # YAML configuration
│   │   ├── requirements.txt           # Service dependencies
│   │   ├── Dockerfile                 # Docker configuration
│   │   └── Dockerfile.old             # Legacy Docker configuration
│   │
│   ├── embedding_service/             # Vector embeddings service
│   │   ├── api/                       # Embedding service API
│   │   │   ├── embedding.py           # Embedding generation API
│   │   │   ├── files.py               # File handling API
│   │   │   ├── jobs.py                # Background jobs API
│   │   │   ├── llm.py                 # LLM integration API
│   │   │   ├── maintenance.py         # Maintenance operations API
│   │   │   └── vectorstore.py         # Vector store operations API
│   │   │
│   │   ├── core/                      # Core embedding functionality
│   │   │   ├── document.py            # Document handling
│   │   │   ├── embedding.py           # Embedding generation
│   │   │   ├── job.py                 # Job processing
│   │   │   ├── llm.py                 # LLM integration
│   │   │   ├── maintenance.py         # Maintenance operations
│   │   │   ├── metadata.py            # Metadata management
│   │   │   └── vectorstore.py         # Vector store core functionality
│   │   │
│   │   ├── doc_staging/               # Document staging area
│   │   │
│   │   ├── models/                    # Data models
│   │   │   ├── embedding_models.py    # Embedding models
│   │   │   └── vectorstore_manager.py # Vector store manager
│   │   │
│   │   ├── routers/                   # FastAPI routers
│   │   │   └── embedding_router.py    # Embedding router
│   │   │
│   │   ├── tests/                     # Embedding service tests
│   │   │   ├── data/                  # Test data
│   │   │   ├── test_vectorstore_api.py # Vector store API tests
│   │   │   ├── test_metadata_pipeline.py # Metadata pipeline tests
│   │   │   ├── test_minimal_pipeline.py # Minimal pipeline tests
│   │   │   ├── test_simple_metadata.py # Simple metadata tests
│   │   │   ├── test_vectorstore.py    # Vector store tests
│   │   │   ├── integration_test_metadata.py # Metadata integration tests
│   │   │   ├── test_job.py            # Job tests
│   │   │   ├── test_job_api.py        # Job API tests
│   │   │   ├── test_metadata.py       # Metadata tests
│   │   │   ├── test_metadata_core.py  # Metadata core tests
│   │   │   ├── test_essential_api.py  # Essential API tests
│   │   │   ├── conftest.py            # Test configuration
│   │   │   └── README.md              # Tests README
│   │   │
│   │   ├── utils/                     # Utility functions
│   │   │   ├── document_loader.py     # Document loading utilities
│   │   │   └── metadata.py            # Metadata utilities
│   │   │
│   │   ├── data/                      # Service data
│   │   ├── config.py                  # Service configuration
│   │   ├── main.py                    # Main application entry point
│   │   ├── README.md                  # Service documentation
│   │   ├── MANUAL_TESTING.md          # Manual testing documentation
│   │   ├── embedding_refactor_plan.md # Refactoring plan
│   │   ├── fix-imports.py             # Import fixing utility
│   │   ├── docker-start.py            # Docker startup script
│   │   ├── run_app.sh                 # Application run script
│   │   ├── run_tests.py               # Test runner script
│   │   ├── run_metadata_test.sh       # Metadata test script
│   │   ├── test_metadata_handling.py  # Metadata handling tests
│   │   ├── requirements.txt           # Service dependencies
│   │   ├── Dockerfile                 # Docker configuration
│   │   └── Dockerfile.old             # Legacy Docker configuration
│   │
│   ├── extraction_service/            # Text extraction from documents
│   │   ├── utils/                     # Utility functions
│   │   │   └── file_utils.py          # File utility functions
│   │   │
│   │   ├── services/                  # Service implementations
│   │   │   └── extractor.py           # Text extractor implementation
│   │   │
│   │   ├── models/                    # Data models
│   │   ├── data/                      # Service data
│   │   ├── nltk_data/                 # NLTK data files
│   │   ├── extraction_routes.py       # Extraction routes
│   │   ├── app.py                     # Service main application
│   │   ├── config.py                  # Service configuration
│   │   ├── setup.py                   # Setup script
│   │   ├── requirements.txt           # Service dependencies
│   │   ├── Dockerfile                 # Docker configuration
│   │   └── Dockerfile.old             # Legacy Docker configuration
│   │
│   ├── generation_service/            # LLM Fine-tuning & dataset generation
│   │   ├── services/                  # Service implementations
│   │   │   └── llm_service.py         # LLM service implementation
│   │   │
│   │   ├── data/                      # Service data
│   │   ├── models/                    # Data models
│   │   ├── app.py                     # Service main application
│   │   ├── config.py                  # Service configuration
│   │   ├── generate_routes.py         # Generation routes
│   │   ├── requirements.txt           # Service dependencies
│   │   ├── Dockerfile                 # Docker configuration
│   │   └── Dockerfile.old             # Legacy Docker configuration
│   │
│   ├── review_service/                # Content review service
│   │   ├── models/                    # Data models
│   │   ├── data/                      # Service data
│   │   ├── app.py                     # Service main application
│   │   ├── config.py                  # Service configuration
│   │   ├── review_routes.py           # Review routes
│   │   ├── requirements.txt           # Service dependencies
│   │   ├── Dockerfile                 # Docker configuration
│   │   └── Dockerfile.old2            # Legacy Docker configuration
│   │
│   ├── upload_service/                # File upload handling
│   │   ├── utils/                     # Utility functions
│   │   │   └── validators.py          # Validation utilities
│   │   │
│   │   ├── models/                    # Data models
│   │   ├── data/                      # Service data
│   │   ├── app.py                     # Service main application
│   │   ├── config.py                  # Service configuration
│   │   ├── upload_routes.py           # Upload routes implementation
│   │   ├── docx_converter.py          # DOCX conversion utilities
│   │   ├── requirements.txt           # Service dependencies
│   │   ├── Dockerfile                 # Docker configuration 
│   │   └── Dockerfile.old             # Legacy Docker configuration
│   │
│   ├── shared-data-init/              # Shared data initialization
│   │
│   ├── models/                        # Shared models across services
│   │   ├── fine-tuned_models/         # Fine-tuned models
│   │   ├── base_models/               # Base foundation models
│   │   ├── fine-tuned models/         # Alternative fine-tuned models dir
│   │   └── base models/               # Alternative base models dir
│   │
│   ├── docker-compose.yml             # Docker compose for all backend services
│   ├── init-multiple-databases.sh     # Database initialization script
│   ├── setup_directories.sh           # Directory setup script
│   └── deploy_backend.sh              # Backend deployment script
│
├── frontend/                          # React frontend
│   ├── public/                        # Static assets
│   │   ├── favicon.ico                # Application favicon
│   │   ├── index.html                 # Main HTML file
│   │   └── manifest.json              # Web app manifest
│   │
│   ├── src/                           # Source code
│   │   ├── components/                # React components
│   │   │   ├── builder/               # Agent builder components
│   │   │   │   ├── AgentPortfolio.js  # Agent portfolio management
│   │   │   │   ├── AgentTeams.js      # Agent teams configuration
│   │   │   │   ├── ConversationTree.js # Conversation tree component
│   │   │   │   ├── LLMLibrary.js      # LLM model library
│   │   │   │   └── SystemPrompts.js   # System prompts management
│   │   │   │
│   │   │   ├── vectorstore/           # Vector store components
│   │   │   │   ├── DocumentSelector.js # Document selection interface
│   │   │   │   ├── ManageVectorStores.js # Vector store management
│   │   │   │   ├── MetadataDisplay.js # Metadata visualization
│   │   │   │   ├── QueryTester.js     # Vector store query testing
│   │   │   │   ├── VectorStoreDetails.js # Vector store detail view
│   │   │   │   └── VectorStoreEdit.js # Vector store editing
│   │   │   │
│   │   │   ├── AdminDashboard.js      # Admin dashboard component
│   │   │   ├── AuthenticatedRoutes.js # Authentication routes
│   │   │   ├── BuildRetrievalDatabases.js # Database building component
│   │   │   ├── CSVPreview.js          # CSV preview component
│   │   │   ├── DirectChat.js          # Direct chat interface
│   │   │   ├── DocumentLibrary.js     # Document library management
│   │   │   ├── ExtractComponent.js    # Information extraction component
│   │   │   ├── FileList.js            # File listing component
│   │   │   ├── FilePreview.js         # File preview component
│   │   │   ├── FineTune.js            # Fine-tuning interface
│   │   │   ├── FineTuneGuide.js       # Fine-tuning guide
│   │   │   ├── GenerateDataset.js     # Dataset generation component
│   │   │   ├── Header.js              # Application header
│   │   │   ├── Home.js                # Home page component
│   │   │   ├── HomeComponent.js       # Alternative home component
│   │   │   ├── LibrarianAgents.js     # Librarian agents interface
│   │   │   ├── LLMInteraction.js      # LLM interaction component
│   │   │   ├── LoadingScreen.js       # Loading screen component
│   │   │   ├── Login.js               # Login component
│   │   │   ├── MultiAgentBuilder.js   # Multi-agent system builder
│   │   │   ├── MultiAgentHILChat.js   # Human-in-the-loop chat interface
│   │   │   ├── Navigation.js          # Navigation component
│   │   │   ├── PDFPreview.js          # PDF preview component
│   │   │   ├── PrivateRoute.js        # Private route component
│   │   │   ├── RetrievalGuide.js      # Retrieval guide component
│   │   │   ├── Test.js                # Testing component
│   │   │   ├── UserGuide.js           # User guide component
│   │   │   └── VectorStore.js         # Vector store component
│   │   │
│   │   ├── contexts/                  # React contexts for state management
│   │   │   ├── AuthContext.js         # Authentication context
│   │   │   ├── ChatContext.js         # Chat state context
│   │   │   ├── DirectChatContext.js   # Direct chat context
│   │   │   ├── DocumentLibraryContext.js # Document library context
│   │   │   ├── ExtractionContext.js   # Extraction state context
│   │   │   ├── GenerationContext.js   # Generation state context
│   │   │   ├── HILChatContext.js      # Human-in-the-loop chat context
│   │   │   └── NavigationContext.js   # Navigation state context
│   │   │
│   │   ├── services/                  # Frontend services for API interaction
│   │   │   ├── directChatService.js   # Direct chat API service
│   │   │   ├── documentService.js     # Document management service
│   │   │   └── vectorStoreService.js  # Vector store API service
│   │   │
│   │   ├── styles/                    # CSS and styling
│   │   │   └── markdownStyles.js      # Markdown styling
│   │   │
│   │   ├── assets/                    # Frontend static assets
│   │   │   ├── background.jpg         # Background image
│   │   │   ├── robot-icon.png         # Robot icon
│   │   │   ├── agent-team.png         # Agent team icon
│   │   │   └── afwi_logo.png          # AFWI logo
│   │   │
│   │   ├── App.js                     # Main App component
│   │   ├── App.css                    # Main App styles
│   │   ├── config.js                  # Frontend configuration
│   │   ├── index.js                   # Entry point
│   │   ├── index.css                  # Global styles
│   │   └── reportWebVitals.js         # Performance monitoring
│   │
│   ├── node_modules/                  # Node.js dependencies (ignored in listing)
│   ├── .env.development               # Development environment variables
│   ├── package.json                   # Frontend dependencies and scripts
│   ├── package-lock.json              # Dependency lock file
│   └── start_dev.sh                   # Development startup script
│
├── data/                              # Data storage
│   ├── builder/                       # Builder data
│   │   ├── TEAMS/                     # Team configurations
│   │   │   ├── teams.json             # Teams data
│   │   │   ├── example.json           # Example team configuration
│   │   │   └── TEAM-TEMPLATE/         # Team template files
│   │   │       ├── team_config.yaml   # Team YAML configuration
│   │   │       ├── team_config.py     # Team Python configuration
│   │   │       ├── utils/             # Team utilities
│   │   │       │   ├── helpers.py     # Helper functions
│   │   │       │   ├── shared_state.py # Shared state management
│   │   │       │   └── vector_store/  # Vector store utilities
│   │   │       │       └── vectorstore.py # Vector store implementation
│   │   │       │
│   │   │       └── multiagent/        # Team multiagent implementation
│   │   │           ├── llm_manager.py # LLM management
│   │   │           ├── processQuestion.py # Question processing
│   │   │           ├── graphState.py  # Graph state management
│   │   │           ├── system_agents/ # System agents
│   │   │           │   ├── synthesis_agent.py # Synthesis agent
│   │   │           │   ├── user_proxy_moderator.py # User proxy
│   │   │           │   ├── conversation_history_manager.py # History manager
│   │   │           │   └── librarian_agent.py # Librarian agent
│   │   │           │
│   │   │           ├── team/         # Team implementation
│   │   │           │   └── routers.py # Team routing
│   │   │           │
│   │   │           └── agent_experts/ # Expert agents
│   │   │
│   │   └── AGENTS/                    # Agent configurations
│   │       ├── agents.json            # Agents data
│   │       ├── example.json           # Example agent configuration
│   │       ├── system_agents/         # System agent definitions
│   │       │   ├── synthesis_agent.py # Synthesis agent
│   │       │   ├── conversation_history_manager.py # History manager
│   │       │   ├── librarian_agent.py # Librarian agent
│   │       │   └── user_proxy_moderator.py # User proxy moderator
│   │       │
│   │       └── .gitkeep               # Git placeholder file
│   │
│   ├── conversation_logs/             # Conversation logs
│   ├── datasets/                      # Training datasets
│   ├── extraction/                    # Extracted document data
│   ├── logs/                          # System logs
│   ├── multiagent_sessions/           # Multi-agent session data
│   ├── outputs/                       # Output files
│   ├── system_prompts/                # System prompts for LLMs
│   │   └── system_prompts.json        # LLM system prompts configuration
│   ├── temp_conversions/              # Temporary conversion files
│   ├── uploads/                       # Uploaded documents
│   ├── vectorstore/                   # Vector store data
│   └── vectorstores/                  # Multiple vector stores
│
├── models/                            # AI model storage
│   └── base_models/                   # Base foundation models
│
├── Supplemental_READMEs/              # Additional documentation
│   ├── DockerPlan.md                  # Docker deployment planning
│   ├── OllamaREADME.md                # Ollama integration guide
│   ├── ProjectInstructions.md         # Project setup instructions
│   └── UnslothREADME.md               # Unsloth optimization guide
│
├── node_modules/                      # Node.js dependencies (ignored in listing)
├── .cursorrules                       # Cursor editor configuration
├── .gitignore                         # Git ignore patterns
├── .git/                              # Git repository data
├── .gitlab-ci.yml                     # GitLab CI/CD configuration
├── api-gateway-plan.md                # API Gateway planning documentation
├── build-base-image.sh                # Base Docker image build script
├── Dockerfile.base                    # Base Docker image configuration
├── embeddingPlan.md                   # Embedding service planning
├── game_of_life.py                    # Conway's Game of Life implementation
├── LICENSE                            # Project license
├── package.json                       # Root package configuration
├── package-lock.json                  # Dependency lock file
├── project_structure.md               # This file - project structure documentation
├── README.md                          # Main project documentation
└── requirements.txt                   # Python dependencies
```

## Service Ports

| Service                | Port |
|------------------------|------|
| Agent Service          | 8001 |
| Auth Service           | 8010 |
| Chat Service           | 8009 |
| Core Service           | 8000 |
| Upload Service         | 8005 |
| Extraction Service     | 8002 |
| Generation Service     | 8003 |
| Review Service         | 8004 |
| Embedding Service      | 8006 |

## Technology Stack

- **Backend**: FastAPI, LangChain, OpenAI
- **Frontend**: React, Material-UI
- **Database**: PostgreSQL
- **Storage**: File system + FAISS
- **Authentication**: JWT
- **Deployment**: Docker 