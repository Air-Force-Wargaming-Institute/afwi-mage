# Analysis Workbench Implementation Checklist

## Overview
The Analysis Workbench will provide analysts with a powerful interface to leverage LLMs for data analysis and visualization. It will be integrated into the AFWI Multi-Agent Generative Engine (MAGE) as part of the multi-agent portal.

## Core Functionality
- [ ] **Spreadsheet Integration**
   - [x] Read/write to cells and columns in local spreadsheets (Excel, CSV)
   - [x] Column-to-column LLM transformations with row-by-row processing (Frontend UI Complete, Backend Implementation Complete)
   - [x] Multi-output column generation from input columns (Frontend & Backend Complete)
   - [ ] Template-based spreadsheet processing for common transformations

- [ ] **Data Visualization**
   - [x] Generate visualization code through natural language requests
   - [x] Extract comprehensive data context from local Excel files
   - [x] Support both matplotlib and seaborn visualizations
   - [x] Enable code editing and visualization refinement
   - [ ] Export visualizations in various formats

- [ ] **Job Management**
   - [x] Basic API for job creation, status check, listing, cancellation (Marking only)
   - [x] Simple file-based job persistence
   - [x] Integration with transformation background tasks for status updates

## Implementation Checklist

### 1. Backend Microservice: `workbench_service`

#### 1.1 Service Structure
- [x] Create directory structure (Updated based on current state)
```
backend/workbench_service/
├── api/                    # API route definitions
│   ├── __pycache__/
│   ├── __init__.py
│   ├── jobs.py
│   ├── spreadsheet.py
│   └── visualization.py
├── core/                   # Core business logic
│   ├── __pycache__/
│   ├── llm/                # LLM integration
│   │   ├── __pycache__/
│   │   ├── __init__.py
│   │   ├── client.py
│   │   └── transformer.py
│   ├── spreadsheet/        # Spreadsheet processing
│   │   ├── __pycache__/
│   │   ├── __init__.py
│   │   ├── manager.py
│   │   └── processor.py
│   └── visualization/      # Chart generation
│       ├── __pycache__/
│       ├── execution.py
│       └── generation.py
├── models/                 # Data models (Currently empty or unused, Pydantic models in api/)
├── scripts/                # Utility scripts
│   └── copy_transformed_files.sh
├── tests/                  # Unit and integration tests
│   └── test_spreadsheet_api.py
├── utils/                  # Utility functions (Directory may not exist or is unused)
├── .gitignore              # Git ignore file (Implied)
├── app.py                  # Service entry point
├── config.py               # Configuration
├── Dockerfile              # Docker configuration
├── README.md               # Project README
└── requirements.txt        # Dependencies
```

#### 1.2 Key Dependencies
- [x] Set up requirements.txt with:
  - [x] FastAPI for API framework
  - [x] pandas for data processing
  - [x] matplotlib/seaborn for visualization
  - [x] openpyxl/xlrd for Excel processing
  - [x] langchain for LLM integration
  - [x] utiltize the applications central styling app.css files for styling of the components

#### 1.3 API Endpoints
- [x] Define and implement `/api/workbench/spreadsheets` routes (Core transformation logic pending)
- [x] Define and implement `/api/workbench/visualizations` routes
- [x] Define and implement `/api/workbench/jobs` routes (Implementation Pending)

#### 1.4 Docker Configuration
- [x] Create Dockerfile for workbench_service
- [x] Add service to `docker-compose.yml` with port 8020
- [x] Configure networking and volumes
- [ ] Test Docker build and run (unable to test due to system constraints)

### 2. Frontend Implementation

#### 2.1 Component Structure
- [x] Create directory structure
```
frontend/src/components/workbench/
├── WorkbenchDashboard.js       # Main container component
├── Sidebar.js                  # Left navigation
├── spreadsheet/                # Spreadsheet components
│   ├── SpreadsheetViewer.js    # View/edit spreadsheets
│   └── SpreadsheetTools.js     # LLM tools for spreadsheets
├── visualization/              # Visualization components
│   ├── ChartBuilder.js         # Chart creation UI
│   └── ChartGallery.js         # View generated charts
└── common/                     # Shared components
    ├── FileUploader.js         # File upload component
    ├── PromptBuilder.js        # LLM prompt creation
    └── JobMonitor.js           # Monitor long-running jobs
```

- [x] Create component files:
  - [x] WorkbenchDashboard.js
  - [x] Sidebar.js
  - [x] Spreadsheet components
    - [x] SpreadsheetViewer.js
    - [x] SpreadsheetTools.js
  - [x] Visualization components
    - [x] ChartBuilder.js
    - [ ] ChartGallery.js
  - [ ] Common components
    - [x] FileUploader.js
    - [ ] PromptBuilder.js
    - [x] JobMonitor.js

#### 2.2 State Management
- [x] Create WorkbenchContext.js
- [x] Implement development mode to handle missing backend connection
- [x] Implement state for:
  - [x] File uploads
  - [x] Processing state
  - [x] Results management

#### 2.3 Routing Changes
- [x] Update App.js with new routes
- [x] Modify Header.js to include Analysis Workbench tab

### 3. Integration Points

#### 3.1 Authentication & Authorization
- [x] Pass authentication to new endpoints
- [ ] Implement authorization checks for file access
- [ ] Test authentication flow

#### 3.2 File Handling
- [x] Create file storage directories
- [x] Implement upload mechanism
- [x] Set up secure file transfer
- [x] Add file validation
- [x] Implement spreadsheet duplication logic (in `manager.py`)

#### 3.3 LLM Integration
- [x] Configure LLM providers using ollama looking at the direct chat service config files for how ollama is accessed by the system (Using existing client, needs environment verification)
- [ ] Create prompt templates for:
  - [ ] Spreadsheet analysis
  - [ ] Data visualization with comprehensive Excel context

### 4. Development Phases

#### Phase 1: Infrastructure Setup (2 weeks)
- [x] Backend service skeleton
  - [x] Create base app structure
  - [x] Set up API router
  - [x] Configure middleware
- [x] Frontend components and routing
  - [x] Add routes to App.js
  - [x] Create placeholder components
  - [x] Update navigation
- [x] API contracts
  - [x] Define request/response models
  - [x] Document API endpoints
- [x] Docker configuration
  - [x] Create Dockerfile
  - [x] Update docker-compose.yml
  - [ ] Test service startup (unable to test due to system constraints)

#### Phase 2: Spreadsheet Functionality (3 weeks) - CURRENT PHASE (Backend Implementation Focus)
- [x] Backend implementation
  - [x] Implement SpreadsheetManager for file operations
  - [x] Create SpreadsheetProcessor class structure (Core logic pending)
  - [x] Set up API endpoints for spreadsheet operations (Validation working, processing logic pending)
- [x] Frontend integration with development mode
  - [x] Update SpreadsheetViewer with backend API connections
  - [x] Add proper error handling and loading states
  - [x] Enhance mock data for development mode
- [x] File upload/download
  - [x] Create upload UI with drag-and-drop support
  - [x] Implement backend storage
  - [x] Add download functionality
- [x] Spreadsheet viewing/editing
  - [x] Create spreadsheet viewer component
  - [x] Implement column selection interface (in SpreadsheetTools)
  - [x] Add data preview with pagination
  - [x] Create column mapping interface (input to output)

- [x] **Enhanced Column Transformation Workflow** _(New Requirements)_
  - [x] **Output Column Definition**
    - [x] Update UI to allow selecting existing columns OR creating new columns
    - [x] Add validation to prevent selecting the same column as both input and output
    - [x] Implement new field for specifying column name when creating new columns
    - [x] Store reference to whether output column is new or existing in transformation state
  
  - [x] **Per-Column LLM Instructions**
    - [x] Remove global "Transformation Instructions" field
    - [x] Convert description field next to each output column to be LLM instructions field
    - [x] Add clear labeling/guidance for users to write instructions for each output column
    - [x] Update backend API to process per-column instructions
  
  - [x] **Output Type Specification**
    - [x] Implement "Output Type" dropdown for each output column with options:
      - [x] Boolean (yes/no, true/false)
      - [x] List of options
      - [x] Free text
      - [x] Number (with format options)
    - [x] Add conditional UI elements based on selected output type:
      - [x] For Boolean: Fields to specify desired true/false values
      - [x] For List of options: Field for comma-separated options
      - [x] For Number: Dropdown for number format (currency, percentage, etc.)
    - [x] Update API schema to include output type specifications
    - [x] Modify backend LLM prompt construction to incorporate output type requirements
  
  - [x] **Preview and Refinement Workflow**
    - [x] Remove option to process all data or only first 10 rows
    - [x] Always process first 10 rows initially and show results as preview
    - [x] Add "Confirm & Continue Processing" button to continue with full dataset
    - [x] Add "Refine Options & Instructions" button to return to configuration
    - [x] Implement state management to track preview vs. full processing mode
    - [x] Add logic to handle rerunning against previously transformed columns/rows
    - [x] Update API to support preview mode and continuation
  
  - [x] **Spreadsheet Version Protection**
    - [x] Add toggle option for writing to existing spreadsheet vs. creating duplicate
    - [x] Set creating duplicate as the default option
    - [x] Implement backend logic to create spreadsheet duplicates before transformation
    - [x] Update spreadsheet metadata to include the new duplicate
    - [x] Add logic to reuse existing duplicate when refining options instead of creating new ones
    - [x] Implement proper error handling for duplicate creation
  
  - [x] **Backend API Updates**
    - [x] Update transformation API endpoint Pydantic models (`TransformationRequest`, `OutputColumnDefinition`)
    - [x] Update API endpoint validation logic for sheet/column existence
    - [x] Update API error handling to propagate `HTTPException` correctly
    - [ ] Modify LLM prompt construction (Pending `processor.py` implementation)
    - [x] Add placeholder support for preview mode (first N rows) and background job triggering
    - [ ] Implement actual spreadsheet duplication logic (Pending `manager.py` update and integration)
    - [ ] Add robust error handling and recovery for failed transformations (Pending `processor.py` implementation)
    - [x] Update response format to include preview data (dummy data currently) and job ID placeholders

- [ ] LLM integration for column operations (Backend Focus)
  - [ ] Implement row-by-row processing engine in `core/spreadsheet/processor.py`
    - [ ] Handle per-column instructions, types, and options
    - [ ] Construct dynamic LLM prompts
    - [ ] Integrate with LLM service (`core/llm`)
    - [ ] Parse and validate LLM outputs based on requested type
    - [ ] Implement logic for preview vs. full processing
    - [ ] Implement batching for efficiency
  - [x] Create transformation instruction interface (Frontend Complete)
  - [x] Add progress tracking and estimation (Frontend UI via JobMonitor Complete, Backend Logic Pending)
  - [x] Support multiple output column generation (Frontend Complete, Backend Logic Pending)
  - [ ] Implement template saving/loading
  - [x] Add selective processing options (filter rows) (Basic `include_headers` exists, further filtering pending)

#### Phase 3: Visualization Capabilities (3 weeks)
- [x] Excel Data Context Extraction
  - [x] Implement schema extraction (columns, types, missing values)
  - [x] Generate statistical summaries (min, max, mean, etc.)
  - [x] Create intelligent sampling algorithm
  - [x] Implement caching strategy for extracted context
- [x] Visualization Code Generation
  - [x] Develop LLM prompting strategy with extracted data context
  - [x] Create code validation and sanitization
  - [x] Implement toggle for matplotlib/seaborn preference
  - [x] Build context-aware error handling
- [x] Visualization Rendering
  - [x] Create secure Python code execution environment
  - [x] Implement real-time rendering of generated code
  - [x] Add support for interactive visualization elements
  - [x] Develop fallback visualization templates
- [x] Chart Builder UI
  - [x] Create chart type selector
  - [x] Implement data source mapping
  - [x] Add customization options
  - [x] Add code editor for manual adjustments
  - [x] Create split view showing code and visualization
  - [x] Implement natural language refinement interface
- [ ] Export functionality
  - [ ] Enable PNG/JPG/SVG export
  - [ ] Add PDF report generation
  - [ ] Implement code export options
- [x] LLM assistance for charts
  - [x] Create visualization recommendation system
  - [x] Implement progressive enhancement workflow
  - [x] Add code explanation feature
  - [x] Create visualization template system

#### Phase 4: Testing & Refinement (2 weeks)
- [ ] Comprehensive testing
  - [x] Write unit tests for backend components
  - [ ] Implement integration tests
  - [ ] Perform UI testing
- [ ] Performance optimization
  - [ ] Optimize file processing
  - [ ] Improve rendering performance
  - [ ] Enhance LLM response time
- [ ] User feedback
  - [ ] Collect initial feedback
  - [ ] Implement critical improvements
- [ ] Documentation
  - [x] Create user documentation
  - [x] Write developer documentation
  - [x] Add inline code comments

### 5. Technical Considerations

#### 5.1 Performance
- [ ] Implement job queuing system
- [ ] Create chunking for large files
- [ ] Optimize visualization rendering

#### 5.2 Security
- [x] Add file type validation
- [x] Implement input sanitization
- [x] Set up proper access controls

#### 5.3 Error Handling
- [x] Create robust error handling
- [x] Implement clear error messages
- [ ] Add retry mechanisms

#### 5.4 Development Mode
- [x] Implement auto-detection of backend availability
- [x] Create mock data for frontend development
- [x] Add development mode toggle in UI
- [x] Handle connection errors gracefully
- [x] Enhance mock data with domain-specific examples
- [ ] Fix runtime errors in ChartBuilder component

#### 5.5 Spreadsheet Processing Framework

- [x] **Column Mapping System**
  - [x] Input column selection (single or multiple)
  - [x] Output column designation (create new or use existing)
  - [x] Transformation instruction configuration
  - [ ] Format validation rules

- [ ] **Row-by-Row Processing Engine**
  - [ ] Sequential row processing for accuracy
  - [ ] Optimized prompt construction per row
  - [x] Context management (include headers, adjacent rows if needed)
  - [x] Batched API calls to improve throughput
  - [ ] Output parsing and validation
  - [ ] Support for typed outputs (boolean, list, text, number formats, etc.)
  - [ ] Preview mode for first 10 rows before full processing

- [ ] **Processing Templates**
  - [ ] Save/load processing configurations
  - [ ] Pre-built templates for common transformations
  - [ ] Custom template creation and sharing

- [ ] **Advanced Features**
  - [x] Conditional processing (skip rows based on criteria)
  - [ ] Multi-stage processing pipelines
  - [x] Detect and handle errors during processing
  - [ ] Spreadsheet version protection with automatic duplication
  - [ ] Smart reprocessing without duplicate creation when refining options

### 6. Future Extensions
- [ ] Plan for external data source integration
- [ ] Research advanced statistical tools
- [ ] Design collaborative features
- [ ] Develop visualization templates library
- [ ] Add recommendation system for optimal visualization types
- [ ] Implement visualization history and versioning

## Current Status (April 2024)
- **Phase 1 (Infrastructure)**: Complete (100%)
  - All directory structures created
  - Basic frontend components implemented
  - API endpoints defined and implemented
  - Docker configuration set up

- **Frontend Implementation**: Complete (100%)
  - SpreadsheetViewer connected to backend APIs
  - Upload UI with proper error handling and drag-and-drop
  - Data preview with pagination
  - Library view of spreadsheets
  - Column Transformation UI implemented and completed with enhanced workflow
  - Step-by-step transformation workflow
  - File upload and download functionality added
  - Reusable FileUploader component created
  - UI scrolling issues fixed for better user experience
  - JobMonitor component implemented with real-time job tracking
  - Job management functions added to WorkbenchContext

- **Current Column Transformation Status**:
  - ✅ UI workflow completed with all steps
  - ✅ Spreadsheet selection and upload working
  - ✅ Input column selection functional
  - ✅ Output column definition UI complete with type selection
  - ✅ Per-column instructions interface completed
  - ✅ Advanced options simplified and enhanced
  - ✅ Preview workflow with confirm/refine options implemented
  - ✅ Spreadsheet duplication toggle added
  - ✅ Backend API validation layer updated and working (accepts new request format)
  - ✅ Basic JobMonitor integration on frontend complete (tracks job ID placeholder)
  - ⏳ Backend transformation processing logic (in `core/spreadsheet/processor.py`) needs implementation.
  - ⏳ Backend job management endpoints (`api/jobs.py`) and persistence need implementation.
  - ⏳ LLM integration (`core/llm`) needs configuration and integration into `processor.py`.
  - ⏳ Spreadsheet duplication logic (`core/spreadsheet/manager.py`) needs implementation.

## Next Steps (Consolidated Backend Focus)
1.  Implement the core row-by-row transformation logic in `core/spreadsheet/processor.py`, including LLM integration and output handling. (Implemented)
2.  Implement the job management API endpoints in `api/jobs.py` and the associated job status persistence mechanism. (Basic Endpoints & Persistence Done)
3.  Implement spreadsheet duplication logic in `core/spreadsheet/manager.py`. (Implemented)
4.  Integrate the processor, background tasks, job updates (`create_job_entry`, `update_job_in_store`), and duplication logic into the `/api/workbench/spreadsheets/transform` endpoint. (Implemented)
5.  Configure and test the LLM connection (`core/llm`). (Using existing client implementation, needs verification)
6.  **Perform end-to-end testing** of the entire transformation workflow (preview, full processing, job monitoring).
7.  **Refine error handling and performance** based on testing.
8.  **Address identified issues**:
   - [x] Implement correct spreadsheet_id passing to background task
   - [x] Create download endpoint for output files
   - [x] Fix async-in-sync pattern for preview processing
9.  **(Optional)** Implement true job cancellation.

## Ready for Testing

With the key issues addressed, the workbench transformation functionality is now ready for end-to-end testing:

1. **Preview Processing**: The preview mode now properly uses async/await patterns.
2. **Full Processing**: Background tasks now receive the correct spreadsheet_id parameter.
3. **Result Retrieval**: A new download endpoint for output files has been added.

The test procedure should include:
1. Uploading a spreadsheet
2. Configuring a transformation with various output types
3. Testing the preview process
4. Confirming and running the full processing
5. Monitoring job status via JobMonitor
6. Downloading the resulting file when complete
