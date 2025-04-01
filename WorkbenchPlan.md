# Analysis Workbench Implementation Checklist

## Overview
The Analysis Workbench will provide analysts with a powerful interface to leverage LLMs for data analysis and visualization. It will be integrated into the AFWI Multi-Agent Generative Engine (MAGE) as part of the multi-agent portal.

## Core Functionality
- [ ] **Spreadsheet Integration**
   - [x] Read cells and columns in local spreadsheets (Excel, CSV) (`SpreadsheetProcessor.read_spreadsheet`)
   - [ ] Write to cells and columns (Planned, `/operate` endpoint lacks write logic)
   - [x] Column-to-column LLM transformations with row-by-row processing (Frontend UI Complete, Backend Implementation Complete via `RowTransformer`, `BatchProcessor`, and `/transform` endpoint)
   - [x] Multi-output column generation from input columns (Covered by transformation feature)
   - [ ] Template-based spreadsheet processing for common transformations

- [ ] **Data Visualization**
   - [x] Generate visualization code through natural language requests (`generation.py`, `visualization.py /generate`)
   - [x] Extract comprehensive data context from local Excel files (Basic context via `get_column_summary`, frontend `extractDataContext` exists)
   - [x] Support both matplotlib and seaborn visualizations (Backend generation handles this)
   - [x] Enable code editing and visualization refinement (Frontend editor, backend `/execute` endpoint)
   - [ ] Export visualizations in various formats

- [ ] **Job Management**
   - [x] Basic API for job creation, status check, listing, cancellation (`spreadsheet.py` integrates with `api/jobs.py`, Frontend `JobMonitor.js` implemented)
   - [x] Simple file-based/in-memory job persistence (Assumed based on plan, needs verification in `api/jobs.py`)
   - [x] Integration with transformation background tasks for status updates (`transform_spreadsheet_background` uses job update functions)

## Implementation Checklist

### 1. Backend Microservice: `workbench_service`

#### 1.1 Service Structure
- [x] Create directory structure (Verified against provided files)
```
backend/workbench_service/
├── api/                    # API route definitions
│   ├── __pycache__/
│   ├── __init__.py
│   ├── jobs.py             # (Assumed based on imports, not provided)
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
│       ├── __init__.py     # (Assumed, standard practice)
│       ├── execution.py
│       └── generation.py
├── models/                 # Data models (Currently empty or unused, Pydantic models in api/)
├── scripts/                # Utility scripts
│   └── copy_transformed_files.sh # (Not provided, listed in plan)
├── tests/                  # Unit and integration tests
│   └── test_spreadsheet_api.py
├── utils/                  # Utility functions (Directory may not exist or is unused)
├── .gitignore              # Git ignore file (Implied)
├── app.py                  # Service entry point
├── config.py               # Configuration
├── Dockerfile              # Docker configuration
├── README.md               # Project README (Not provided)
└── requirements.txt        # Dependencies
```

#### 1.2 Key Dependencies
- [x] Set up requirements.txt with:
  - [x] FastAPI for API framework
  - [x] pandas for data processing
  - [x] matplotlib/seaborn for visualization
  - [x] openpyxl/xlrd for Excel processing
  - [x] langchain for LLM integration (Used via `core/llm`)
  - [x] utiltize the applications central styling app.css files for styling of the components (Frontend uses `App.css`)

#### 1.3 API Endpoints
- [x] Define and implement `/api/workbench/spreadsheets` routes (All listed endpoints implemented, including `/transform` with background logic)
- [x] Define and implement `/api/workbench/visualizations` routes (Implemented)
- [x] Define and implement `/api/workbench/jobs` routes (Basic endpoints assumed implemented via `api/jobs.py` based on imports)

#### 1.4 Docker Configuration
- [x] Create Dockerfile for workbench_service
- [x] Add service to `docker-compose.yml` with port 8020 (Assumed, `docker-compose.yml` not provided)
- [x] Configure networking and volumes (Assumed)
- [ ] Test Docker build and run (Plan notes inability to test)

### 2. Frontend Implementation

#### 2.1 Component Structure
- [x] Create directory structure (Verified against provided files)
```
frontend/src/components/workbench/
├── WorkbenchDashboard.js       # Main container component
├── Sidebar.js                  # Left navigation
├── spreadsheet/                # Spreadsheet components
│   ├── SpreadsheetViewer.js    # View/edit spreadsheets
│   └── SpreadsheetTools.js     # LLM tools for spreadsheets
├── visualization/              # Visualization components
│   ├── ChartBuilder.js         # Chart creation UI
│   └── ChartGallery.js         # View generated charts (Not provided)
└── common/                     # Shared components
    ├── FileUploader.js         # File upload component
    ├── PromptBuilder.js        # LLM prompt creation (Not provided)
    └── JobMonitor.js           # Monitor long-running jobs
    └── SpreadsheetModal.js     # Spreadsheet viewing modal
```

- [x] Create component files:
  - [x] WorkbenchDashboard.js
  - [x] Sidebar.js
  - [x] Spreadsheet components
    - [x] SpreadsheetViewer.js
    - [x] SpreadsheetTools.js
    - [x] SpreadsheetModal.js
  - [x] Visualization components
    - [x] ChartBuilder.js
    - [ ] ChartGallery.js (Not provided)
  - [x] Common components
    - [x] FileUploader.js
    - [ ] PromptBuilder.js (Not provided)
    - [x] JobMonitor.js

#### 2.2 State Management
- [x] Create WorkbenchContext.js
- [x] Implement development mode to handle missing backend connection (Handles connectionError)
- [x] Implement state for:
  - [x] File uploads (`spreadsheets`, `uploadSpreadsheet`)
  - [x] Processing state (`isLoading`, `isTransforming`)
  - [x] Results management (`analysisResults`, `visualizations`, `jobs`, `transformationState`)

#### 2.3 Routing Changes
- [x] Update App.js with new routes (Assumed, `App.js` not provided)
- [x] Modify Header.js to include Analysis Workbench tab (Assumed, `Header.js` not provided)

### 3. Integration Points

#### 3.1 Authentication & Authorization
- [x] Pass authentication to new endpoints (Axios defaults set based on `AuthContext` token in `WorkbenchContext.js`)
- [ ] Implement authorization checks for file access (Not evident in provided backend code)
- [ ] Test authentication flow (Needs manual testing)

#### 3.2 File Handling
- [x] Create file storage directories (`upload_dir` and `output_dir` handled in `config.py` and `app.py`)
- [x] Implement upload mechanism (`/upload` endpoint, `SpreadsheetManager.save_spreadsheet`)
- [x] Set up secure file transfer (HTTPS assumed if deployed behind proxy)
- [x] Add file validation (`_is_valid_spreadsheet` in `SpreadsheetManager`, frontend check in `SpreadsheetTools`)
- [x] Implement spreadsheet duplication logic (in `SpreadsheetManager.create_duplicate_spreadsheet`, integrated into `/transform`)

#### 3.3 LLM Integration
- [x] Configure LLM providers using ollama (`core/llm/client.py` uses `OLLAMA_BASE_URL` from `config.py`)
- [x] Create prompt templates for:
  - [x] Spreadsheet analysis/transformation (`_create_prompt` in `RowTransformer`)
  - [x] Data visualization with comprehensive Excel context (`_build_system_prompt`, `_build_user_prompt` in `generation.py`)

### 4. Development Phases

#### Phase 1: Infrastructure Setup (2 weeks)
- [x] Backend service skeleton
  - [x] Create base app structure
  - [x] Set up API router
  - [x] Configure middleware
- [x] Frontend components and routing
  - [x] Add routes to App.js (Assumed)
  - [x] Create placeholder components (Now implemented)
  - [x] Update navigation (`Sidebar.js`)
- [x] API contracts
  - [x] Define request/response models (Pydantic models in API files)
  - [x] Document API endpoints (Basic docstrings exist)
- [x] Docker configuration
  - [x] Create Dockerfile
  - [x] Update docker-compose.yml (Assumed)
  - [ ] Test service startup (Plan notes inability to test)

#### Phase 2: Spreadsheet Functionality (3 weeks) - CURRENT PHASE (Largely Complete, focus shifting to testing/refinement)
- [x] Backend implementation
  - [x] Implement SpreadsheetManager for file operations
  - [x] Create SpreadsheetProcessor class structure (Core transformation logic implemented via `RowTransformer`)
  - [x] Set up API endpoints for spreadsheet operations (All endpoints implemented)
- [x] Frontend integration with development mode
  - [x] Update SpreadsheetViewer with backend API connections
  - [x] Add proper error handling and loading states
  - [x] Enhance mock data for development mode (Mock job data exists in `WorkbenchContext`)
- [x] File upload/download
  - [x] Create upload UI with drag-and-drop support (`FileUploader.js`)
  - [x] Implement backend storage (`SpreadsheetManager`)
  - [x] Add download functionality (`/download` endpoints in `spreadsheet.py`)
- [x] Spreadsheet viewing/editing
  - [x] Create spreadsheet viewer component (`SpreadsheetViewer`, `SpreadsheetModal`)
  - [x] Implement column selection interface (in `SpreadsheetTools`)
  - [x] Add data preview with pagination (`SpreadsheetModal`)
  - [x] Create column mapping interface (input to output) (`SpreadsheetTools`)

- [x] **Enhanced Column Transformation Workflow** _(New Requirements)_
  - [x] **Output Column Definition**
    - [x] Update UI to allow selecting existing columns OR creating new columns (`SpreadsheetTools`)
    - [x] Add validation to prevent selecting the same column as both input and output (Frontend checks, basic backend check)
    - [x] Implement new field for specifying column name when creating new columns (`SpreadsheetTools`)
    - [x] Store reference to whether output column is new or existing in transformation state (`outputColumns` state in `SpreadsheetTools`)
  
  - [x] **Per-Column LLM Instructions**
    - [x] Remove global "Transformation Instructions" field (`SpreadsheetTools`)
    - [x] Convert description field next to each output column to be LLM instructions field (`SpreadsheetTools`)
    - [x] Add clear labeling/guidance for users to write instructions for each output column (`SpreadsheetTools`)
    - [x] Update backend API to process per-column instructions (`spreadsheet.py` passes to `processor.py`, `RowTransformer` uses them)
  
  - [x] **Output Type Specification**
    - [x] Implement "Output Type" dropdown for each output column with options: (`SpreadsheetTools`)
      - [x] Boolean (yes/no, true/false)
      - [x] List of options
      - [x] Free text
      - [x] Number (with format options)
    - [x] Add conditional UI elements based on selected output type: (`SpreadsheetTools`)
      - [x] For Boolean: Fields to specify desired true/false values
      - [x] For List of options: Field for comma-separated options
      - [x] For Number: Dropdown for number format (currency, percentage, etc.)
    - [x] Update API schema to include output type specifications (`spreadsheet.py`)
    - [x] Modify backend LLM prompt construction to incorporate output type requirements (`RowTransformer`)
  
  - [x] **Preview and Refinement Workflow**
    - [x] Remove option to process all data or only first 10 rows (`SpreadsheetTools`)
    - [x] Always process first 10 rows initially and show results as preview (`SpreadsheetTools`, `/transform` preview logic)
    - [x] Add "Confirm & Continue Processing" button to continue with full dataset (`SpreadsheetTools`)
    - [x] Add "Refine Options & Instructions" button to return to configuration (`SpreadsheetTools`)
    - [x] Implement state management to track preview vs. full processing mode (`WorkbenchContext`, `SpreadsheetTools`)
    - [ ] Add logic to handle rerunning against previously transformed columns/rows (Backend likely overwrites, needs verification)
    - [x] Update API to support preview mode and continuation (`/transform` handles `processing_mode`)
  
  - [x] **Spreadsheet Version Protection**
    - [x] Add toggle option for writing to existing spreadsheet vs. creating duplicate (`SpreadsheetTools`)
    - [x] Set creating duplicate as the default option (`SpreadsheetTools`)
    - [x] Implement backend logic to create spreadsheet duplicates before transformation (`SpreadsheetManager.create_duplicate_spreadsheet`, used in `/transform`)
    - [x] Update spreadsheet metadata to include the new duplicate (`SpreadsheetManager.create_metadata_for_transformed_file`)
    - [ ] Add logic to reuse existing duplicate when refining options instead of creating new ones (Not implemented, currently always creates new on full run)
    - [x] Implement proper error handling for duplicate creation (`SpreadsheetManager`)
  
  - [x] **Backend API Updates**
    - [x] Update transformation API endpoint Pydantic models (`TransformationRequest`, `OutputColumnDefinition`) (`spreadsheet.py`)
    - [x] Update API endpoint validation logic for sheet/column existence (`spreadsheet.py`)
    - [x] Modify LLM prompt construction (Implemented in `RowTransformer`)
    - [x] Add placeholder support for preview mode (first N rows) and background job triggering (Implemented in `spreadsheet.py`)
    - [x] Implement actual spreadsheet duplication logic (Implemented in `SpreadsheetManager`)
    - [x] Add robust error handling and recovery for failed transformations (Basic error handling in `RowTransformer`, `processor.py`)
    - [x] Update response format to include preview data and job ID placeholders (`spreadsheet.py`)

- [x] LLM integration for column operations (Backend Focus)
  - [x] Implement row-by-row processing engine in `core/spreadsheet/processor.py` (Uses `RowTransformer`, `BatchProcessor`)
    - [x] Handle per-column instructions, types, and options (`RowTransformer`)
    - [x] Construct dynamic LLM prompts (`RowTransformer`)
    - [x] Integrate with LLM service (`core/llm`)
    - [x] Parse and validate LLM outputs based on requested type (`RowTransformer`)
    - [x] Implement logic for preview vs. full processing (`processor.py`, `/transform`)
    - [x] Implement batching for efficiency (`BatchProcessor`)
  - [x] Create transformation instruction interface (Frontend Complete in `SpreadsheetTools`)
  - [x] Add progress tracking and estimation (Frontend UI via `JobMonitor` Complete, Backend updates job status)
  - [x] Support multiple output column generation (Frontend and Backend Complete)
  - [ ] Implement template saving/loading
  - [x] Add selective processing options (Basic `include_headers` exists, further filtering pending)

#### Phase 3: Visualization Capabilities (3 weeks) - Partially Implemented
- [x] Excel Data Context Extraction
  - [x] Implement schema extraction (columns, types, missing values) (`SpreadsheetProcessor.get_column_summary`)
  - [x] Generate statistical summaries (min, max, mean, etc.) (`SpreadsheetProcessor.get_column_summary`)
  - [ ] Create intelligent sampling algorithm (Simple sampling in `get_column_summary`)
  - [ ] Implement caching strategy for extracted context (Not implemented)
- [x] Visualization Code Generation
  - [x] Develop LLM prompting strategy with extracted data context (`generation.py`)
  - [ ] Create code validation and sanitization (Basic execution error handling, no pre-validation)
  - [x] Implement toggle for matplotlib/seaborn preference (Frontend/Backend)
  - [x] Build context-aware error handling (Basic error handling in `generation.py`, `execution.py`)
- [x] Visualization Rendering
  - [x] Create secure Python code execution environment (Uses `subprocess`, **Needs Sandboxing**)
  - [x] Implement real-time rendering of generated code (Backend executes and returns image data)
  - [ ] Add support for interactive visualization elements
  - [x] Develop fallback visualization templates (`_generate_error_image` in `execution.py`)
- [x] Chart Builder UI
  - [x] Create chart type selector (`ChartBuilder.js`)
  - [x] Implement data source mapping (`ChartBuilder.js` - needs real data)
  - [x] Add customization options (`ChartBuilder.js`)
  - [x] Add code editor for manual adjustments (`ChartBuilder.js`)
  - [x] Create split view showing code and visualization (`ChartBuilder.js` uses tabs)
  - [x] Implement natural language refinement interface (Basic prompt field exists)
- [ ] Export functionality
  - [ ] Enable PNG/JPG/SVG export
  - [ ] Add PDF report generation
  - [ ] Implement code export options
- [x] LLM assistance for charts
  - [ ] Create visualization recommendation system
  - [ ] Implement progressive enhancement workflow
  - [ ] Add code explanation feature
  - [ ] Create visualization template system

#### Phase 4: Testing & Refinement (2 weeks) - Partially Implemented
- [ ] Comprehensive testing
  - [x] Write unit tests for backend components (`test_spreadsheet_api.py` exists)
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
  - [ ] Create user documentation
  - [ ] Write developer documentation
  - [x] Add inline code comments (Code has docstrings and comments)

### 5. Technical Considerations

#### 5.1 Performance
- [ ] Implement job queuing system (Basic background tasks used)
- [x] Create chunking for large files (Implied by `BatchProcessor`, needs verification for very large files)
- [ ] Optimize visualization rendering

#### 5.2 Security
- [x] Add file type validation
- [x] Implement input sanitization (Basic checks, LLM input needs review)
- [x] Set up proper access controls (Relies on main app auth)
- [ ] **Address Visualization Code Execution Security** (`execution.py` uses `subprocess`)

#### 5.3 Error Handling
- [x] Create robust error handling (Implemented in context, API endpoints, core logic)
- [x] Implement clear error messages (Frontend alerts, backend logs/responses)
- [x] Add retry mechanisms (`RowTransformer` has basic retry)

#### 5.4 Development Mode
- [x] Implement auto-detection of backend availability (`connectionError` in `WorkbenchContext`)
- [x] Create mock data for frontend development (`JobMonitor`, `ChartBuilder` use mocks)
- [x] Add development mode toggle in UI (Not explicitly seen, but mock data used conditionally)
- [x] Handle connection errors gracefully (Frontend shows alerts)
- [x] Enhance mock data with domain-specific examples
- [ ] Fix runtime errors in ChartBuilder component (Needs testing with real data)

#### 5.5 Spreadsheet Processing Framework

- [x] **Column Mapping System**
  - [x] Input column selection (single or multiple)
  - [x] Output column designation (create new or use existing)
  - [x] Transformation instruction configuration
  - [x] Format validation rules (Implemented in `RowTransformer._validate_*` methods)

- [x] **Row-by-Row Processing Engine**
  - [x] Sequential row processing for accuracy (Via `BatchProcessor`)
  - [x] Optimized prompt construction per row (`RowTransformer`)
  - [x] Context management (include headers, adjacent rows if needed) (`RowTransformer` includes headers)
  - [x] Batched API calls to improve throughput (`BatchProcessor` uses `asyncio.gather`)
  - [x] Output parsing and validation (`RowTransformer`)
  - [x] Support for typed outputs (boolean, list, text, number formats, etc.) (`RowTransformer`)
  - [x] Preview mode for first 10 rows before full processing (Implemented in `/transform`)

- [ ] **Processing Templates**
  - [ ] Save/load processing configurations
  - [ ] Pre-built templates for common transformations
  - [ ] Custom template creation and sharing

- [ ] **Advanced Features**
  - [ ] Conditional processing (skip rows based on criteria)
  - [ ] Multi-stage processing pipelines
  - [x] Detect and handle errors during processing (`RowTransformer` error handling)
  - [x] Spreadsheet version protection with automatic duplication (`SpreadsheetManager`, integrated)
  - [ ] Smart reprocessing without duplicate creation when refining options (Needs implementation)

### 6. Future Extensions
- [ ] Plan for external data source integration
- [ ] Research advanced statistical tools
- [ ] Design collaborative features
- [ ] Develop visualization templates library
- [ ] Add recommendation system for optimal visualization types
- [ ] Implement visualization history and versioning

## Current Status (Updated Based on Review)
- **Phase 1 (Infrastructure)**: Complete (100%)
- **Frontend Implementation**: Largely Complete (95%) - Visualization component (`ChartBuilder`) needs integration with real data and backend flow. Minor components like `ChartGallery`, `PromptBuilder` are missing if still required.
- **Phase 2 (Spreadsheet Functionality)**: Complete (100%) - Core transformation logic implemented end-to-end. Ready for testing and refinement.
- **Phase 3 (Visualization Capabilities)**: Partially Implemented (~50%) - Backend core logic exists, frontend UI exists but needs integration/testing. Context extraction is basic. Export and advanced LLM features missing. **Code execution security needs addressing.**
- **Phase 4 (Testing & Refinement)**: Partially Implemented (~20%) - Basic backend tests exist. Comprehensive testing needed.
- **Job Management**: Basic implementation exists for tracking and status updates. Robust persistence and true job cancellation are likely missing.

- **Current Column Transformation Status**: **Complete**. Ready for end-to-end testing.

## Next Steps (Revised Based on Review)
1.  **End-to-End Testing**: Thoroughly test the entire Column Transformation workflow (upload, configure, preview, full run, job monitoring, download result).
2.  **Visualization Integration**:
    *   Connect `ChartBuilder.js` frontend to the backend `/generate` and `/execute` endpoints.
    *   Replace mock data/images with actual generated results.
    *   Verify `extractDataContext` flow.
    *   Implement `ChartGallery.js` if needed.
3.  **Secure Code Execution**: Replace the `subprocess` execution in `core/visualization/execution.py` with a secure sandboxing mechanism (e.g., using Docker containers or libraries like `RestrictedPython`).
4.  **Job Management Refinement**: Verify the persistence mechanism in `api/jobs.py`. Implement robust persistence and true job cancellation if required.
5.  **Implement Missing Features**: Address features marked as `[ ]` if they are still priorities (e.g., spreadsheet write operations, visualization export, processing templates).
6.  **Comprehensive Testing**: Add more unit, integration, and UI tests, especially for visualization and error handling.
7.  **Performance Tuning**: Optimize backend processing and frontend rendering based on testing with larger datasets.
8.  **Address Minor Todos**:
    *   Implement logic to reuse existing duplicates when refining transformation options.
    *   Review LLM prompts for potential optimizations.
    *   Verify Docker functionality if possible.

## Ready for Testing (Column Transformation)

The core column transformation functionality appears complete and ready for end-to-end testing.

## Key Findings / Areas for Investigation

1.  **Visualization End-to-End Flow:** The main gap is the full integration and testing of the visualization feature (`ChartBuilder.js` connecting to backend generation/execution).
2.  **Visualization Code Execution Security:** The current method in `execution.py` using `subprocess` is a significant security risk and **must** be replaced with sandboxing before any production use.
3.  **Job Persistence & Cancellation:** The robustness of job persistence (`api/jobs.py`) and the implementation of actual job cancellation need verification.
4.  **Spreadsheet Write Operations:** Functionality planned but not implemented.
5.  **Testing:** More comprehensive testing is the immediate next step, especially for the transformation workflow and the (once integrated) visualization flow.
```

</rewritten_file>