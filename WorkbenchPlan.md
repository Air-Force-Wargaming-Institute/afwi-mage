# Analysis Workbench Implementation Checklist

## Overview
The Analysis Workbench will provide analysts with a powerful interface to leverage LLMs for data analysis and visualization. It will be integrated into the AFWI Multi-Agent Generative Engine (MAGE) as part of the multi-agent portal.

## Core Functionality
- [ ] **Spreadsheet Integration**
   - [x] Read/write to cells and columns in local spreadsheets (Excel, CSV)
   - [x] Column-to-column LLM transformations with row-by-row processing
   - [x] Multi-output column generation from input columns
   - [ ] Template-based spreadsheet processing for common transformations

- [ ] **Data Visualization**
   - [x] Generate visualization code through natural language requests
   - [x] Extract comprehensive data context from local Excel files
   - [x] Support both matplotlib and seaborn visualizations
   - [x] Enable code editing and visualization refinement
   - [ ] Export visualizations in various formats

## Implementation Checklist

### 1. Backend Microservice: `workbench_service`

#### 1.1 Service Structure
- [x] Create directory structure
```
backend/workbench_service/
├── api/                    # API route definitions
├── core/                   # Core business logic
│   ├── spreadsheet/        # Spreadsheet processing
│   ├── visualization/      # Chart generation
│   └── llm/                # LLM integration
├── models/                 # Data models
├── utils/                  # Utility functions
├── tests/                  # Unit and integration tests
├── app.py                  # Service entry point
├── config.py               # Configuration
├── Dockerfile              # Docker configuration
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
- [x] Define and implement `/api/workbench/spreadsheets` routes
- [x] Define and implement `/api/workbench/visualizations` routes
- [x] Define and implement `/api/workbench/jobs` routes

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

#### 3.3 LLM Integration
- [ ] Configure LLM providers using ollama looking at the direct chat service config files for how ollama is accessed by the system 
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

#### Phase 2: Spreadsheet Functionality (3 weeks) - CURRENT PHASE
- [x] Backend implementation
  - [x] Implement SpreadsheetManager for file operations
  - [x] Create SpreadsheetProcessor for data reading
  - [x] Set up API endpoints for spreadsheet operations
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
    - [x] Update transformation API endpoint to handle the new request format
    - [x] Modify LLM prompt construction to use per-column instructions and output types
    - [x] Add support for preview mode (first 10 rows) and full processing
    - [x] Implement spreadsheet duplication logic
    - [x] Add proper error handling and recovery for failed transformations
    - [x] Update response format to include preview data and transformation status

- [ ] LLM integration for column operations
  - [ ] Implement row-by-row processing engine
  - [x] Create transformation instruction interface
  - [x] Add progress tracking and estimation
  - [x] Support multiple output column generation
  - [ ] Implement template saving/loading
  - [x] Add selective processing options (filter rows)

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
  - ✅ JobMonitor integration for tracking long-running transformations
  - ❌ Backend does not support the enhanced transformation features yet

## Next Steps

1. **Backend Implementation**:
   - Implement backend API endpoints for job management (/api/workbench/jobs/*)
   - Create job storage and retrieval mechanism
   - Enhance transformation API to return job IDs for long-running operations
   - Implement progress tracking and reporting

2. **Testing and Refinement**:
   - Test JobMonitor with real backend responses (once implemented)
   - Improve error handling and recovery
   - Add support for cancellation and pausing of jobs

3. **Additional Features**:
   - Implement job history view for all past transformations
   - Add notification system for job completion
   - Create job templates for common transformation patterns
   - Add job filtering and searching capabilities

## Backend API Updates Required

The following changes are needed in the backend to support our enhanced column transformation workflow:

1. **Update OutputColumnDefinition Model**:
   ```python
   class OutputColumnDefinition(BaseModel):
       """Definition of an output column for transformation."""
       name: str = Field(..., description="Name of the output column")
       description: str = Field(..., description="Instructions for transforming this column")
       is_new: bool = Field(True, description="Whether this is a new column or existing one")
       output_type: str = Field("text", description="Output data type: 'text', 'boolean', 'list', or 'number'")
       type_options: Dict[str, Any] = Field(default_factory=dict, description="Type-specific options")
   ```

2. **Update TransformationRequest Model**:
   ```python
   class TransformationRequest(BaseModel):
       """Request to perform a column transformation."""
       sheet_name: str = Field(..., description="Name of the sheet to operate on")
       input_columns: List[str] = Field(..., description="List of input column names")
       output_columns: List[OutputColumnDefinition] = Field(..., description="List of output column definitions")
       include_headers: bool = Field(True, description="Whether to include column headers in context")
       processing_mode: str = Field("preview", description="Processing mode: 'all' or 'preview'") 
       error_handling: str = Field("continue", description="Error handling strategy: 'continue', 'stop', or 'retry'")
       create_duplicate: bool = Field(True, description="Create a duplicate of the spreadsheet before transforming")
   ```

3. **Update RowTransformer Class**:
   - Modify to handle per-column instructions instead of global instructions
   - Add support for typed outputs (boolean, list, text, number)
   - Implement stronger validation for output formats

4. **Update transform_spreadsheet Function**:
   - Add support for the create_duplicate parameter
   - Modify duplicate file naming for better traceability
   - Handle different output types in the response

5. **Update Response Format**:
   - Ensure preview data maintains output type information 
   - Add file duplication information to the response

## JobMonitor Component Implementation Plan

The JobMonitor component will provide a centralized way to track and manage long-running operations in the Analysis Workbench, with a particular focus on column transformation jobs.

### 1. Context Updates Required

Add the following to WorkbenchContext.js:

```javascript
// Job state management
const [jobs, setJobs] = useState([]);
const [activeJobId, setActiveJobId] = useState(null);

// Fetch job status from API
const getJobStatus = async (jobId) => {
  setError(null);
  
  try {
    const url = joinPaths(apiBaseUrl, `api/workbench/jobs/${jobId}`);
    const response = await axios.get(url);
    
    // Update job in the jobs array
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId ? { ...job, ...response.data } : job
      )
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching job status for job ${jobId}:`, error);
    if (error.message === 'Network Error') {
      setConnectionError(true);
      setError('Cannot connect to backend services. Please ensure the backend is running.');
    } else {
      setError(`Failed to fetch job status: ${error.message}`);
    }
    throw error;
  }
};

// List all jobs
const listJobs = async (filter = {}) => {
  setIsLoading(true);
  setError(null);
  
  try {
    const url = joinPaths(apiBaseUrl, 'api/workbench/jobs/list');
    const response = await axios.get(url, { params: filter });
    setJobs(response.data);
    setIsLoading(false);
    return response.data;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    if (error.message === 'Network Error') {
      setConnectionError(true);
      setError('Cannot connect to backend services. Please ensure the backend is running.');
    } else {
      setError('Failed to fetch jobs. Please try again.');
    }
    setIsLoading(false);
    throw error;
  }
};

// Cancel a job
const cancelJob = async (jobId) => {
  setError(null);
  
  try {
    const url = joinPaths(apiBaseUrl, `api/workbench/jobs/${jobId}/cancel`);
    const response = await axios.post(url);
    
    // Update job in the jobs array
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId ? { ...job, status: 'cancelled' } : job
      )
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error cancelling job ${jobId}:`, error);
    if (error.message === 'Network Error') {
      setConnectionError(true);
      setError('Cannot connect to backend services. Please ensure the backend is running.');
    } else {
      setError(`Failed to cancel job: ${error.message}`);
    }
    throw error;
  }
};

// Add job to tracking state when created from transformation
const trackTransformationJob = (jobId, parameters) => {
  const newJob = {
    id: jobId,
    type: 'column_transformation',
    status: 'submitted',
    progress: 0,
    created_at: new Date().toISOString(),
    parameters,
    result: null
  };
  
  setJobs(prevJobs => [...prevJobs, newJob]);
  setActiveJobId(jobId);
  
  return newJob;
};
```

Export these functions in the context provider:

```javascript
<WorkbenchContext.Provider value={{
  // ... existing values
  jobs,
  activeJobId,
  getJobStatus,
  listJobs,
  cancelJob,
  trackTransformationJob,
  setActiveJobId
}}>
```

### 2. Component Implementation

Create a new component at `frontend/src/components/workbench/common/JobMonitor.js`:

```javascript
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { WorkbenchContext } from '../../../contexts/WorkbenchContext';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  LinearProgress,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Collapse,
  Chip,
  Divider,
  Alert,
  Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CancelIcon from '@mui/icons-material/Cancel';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';

const JobMonitor = ({ onViewResults, showAll = false }) => {
  const {
    jobs,
    activeJobId,
    getJobStatus,
    listJobs,
    cancelJob,
    setActiveJobId,
    isLoading
  } = useContext(WorkbenchContext);
  
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  
  // Function to format relative time
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const jobTime = new Date(timestamp);
    const diffSeconds = Math.floor((now - jobTime) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hours ago`;
    return `${Math.floor(diffSeconds / 86400)} days ago`;
  };
  
  // Toggle job details expansion
  const toggleJobExpansion = (jobId) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };
  
  // Poll for job updates
  const pollJobStatus = useCallback(async () => {
    if (!activeJobId) return;
    
    const activeJob = jobs.find(job => job.id === activeJobId);
    if (!activeJob) return;
    
    // Only poll for jobs that are not in a terminal state
    if (['completed', 'failed', 'cancelled'].includes(activeJob.status)) {
      // Clear polling interval for completed jobs
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      return;
    }
    
    try {
      await getJobStatus(activeJobId);
    } catch (error) {
      console.error('Error polling job status:', error);
    }
  }, [activeJobId, jobs, getJobStatus, pollingInterval]);
  
  // Set up polling when activeJobId changes
  useEffect(() => {
    if (activeJobId) {
      // Poll immediately
      pollJobStatus();
      
      // Set up interval for polling
      if (!pollingInterval) {
        const interval = setInterval(pollJobStatus, 3000); // Poll every 3 seconds
        setPollingInterval(interval);
      }
    }
    
    // Cleanup function to clear interval
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };
  }, [activeJobId, pollJobStatus, pollingInterval]);
  
  // Initial load of jobs
  useEffect(() => {
    listJobs();
  }, [listJobs]);
  
  // Handle job cancellation
  const handleCancelJob = async (jobId) => {
    try {
      await cancelJob(jobId);
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  };
  
  // Helper to get color based on job status
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'cancelled': return 'warning';
      case 'running': return 'primary';
      default: return 'default';
    }
  };
  
  // Helper to get icon based on job status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon color="success" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'cancelled': return <CancelIcon color="warning" />;
      case 'running': return <PlayArrowIcon color="primary" />;
      case 'paused': return <PauseIcon color="info" />;
      default: return <CircularProgress size={20} />;
    }
  };
  
  // Filter jobs to show
  const jobsToShow = showAll ? jobs : jobs.filter(job => job.id === activeJobId);
  
  // Render no jobs message
  if (jobsToShow.length === 0) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="body1" align="center" color="textSecondary">
          No active jobs to display.
        </Typography>
        <Box display="flex" justifyContent="center" mt={1}>
          <Button 
            startIcon={<RefreshIcon />}
            onClick={() => listJobs()}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </Box>
      </Paper>
    );
  }
  
  return (
    <Paper sx={{ mb: 2, overflow: 'hidden' }}>
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 1.5 }}>
        <Typography variant="h6">
          {showAll ? 'All Jobs' : 'Active Job'}
        </Typography>
      </Box>
      
      <List disablePadding>
        {jobsToShow.map(job => (
          <React.Fragment key={job.id}>
            <ListItem
              button
              onClick={() => toggleJobExpansion(job.id)}
              selected={job.id === activeJobId}
            >
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center">
                    {getStatusIcon(job.status)}
                    <Typography variant="body1" sx={{ ml: 1 }}>
                      {job.type === 'column_transformation' ? 'Column Transformation' : job.type}
                    </Typography>
                    <Chip 
                      label={job.status} 
                      size="small" 
                      color={getStatusColor(job.status)} 
                      sx={{ ml: 1 }}
                    />
                  </Box>
                }
                secondary={formatRelativeTime(job.created_at)}
              />
              <ListItemSecondaryAction>
                {job.status === 'running' && (
                  <IconButton
                    edge="end"
                    aria-label="cancel"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelJob(job.id);
                    }}
                  >
                    <CancelIcon />
                  </IconButton>
                )}
                {expandedJobId === job.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemSecondaryAction>
            </ListItem>
            
            <Collapse in={expandedJobId === job.id} timeout="auto" unmountOnExit>
              <Box p={2} bgcolor="background.level1">
                {/* Progress indicator */}
                {['running', 'submitted'].includes(job.status) && (
                  <Box mb={2}>
                    <Typography variant="body2" gutterBottom>
                      Progress: {job.progress || 0}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={job.progress || 0} 
                      color="primary"
                    />
                  </Box>
                )}
                
                {/* Job details */}
                <Typography variant="subtitle2" gutterBottom>
                  Job Details:
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2">
                    ID: {job.id}
                  </Typography>
                  <Typography variant="body2">
                    Created: {new Date(job.created_at).toLocaleString()}
                  </Typography>
                  {job.completed_at && (
                    <Typography variant="body2">
                      Completed: {new Date(job.completed_at).toLocaleString()}
                    </Typography>
                  )}
                  {job.message && (
                    <Alert severity={job.status === 'failed' ? 'error' : 'info'} sx={{ mt: 1 }}>
                      {job.message}
                    </Alert>
                  )}
                </Box>
                
                {/* Actions based on job status */}
                <Box display="flex" justifyContent="flex-end" mt={2}>
                  {job.status === 'completed' && job.result_url && (
                    <Tooltip title="Download results">
                      <Button
                        startIcon={<DownloadIcon />}
                        onClick={() => window.open(job.result_url, '_blank')}
                      >
                        Download
                      </Button>
                    </Tooltip>
                  )}
                  
                  {job.status === 'completed' && onViewResults && (
                    <Button
                      onClick={() => onViewResults(job)}
                      color="primary"
                      variant="contained"
                      sx={{ ml: 1 }}
                    >
                      View Results
                    </Button>
                  )}
                </Box>
              </Box>
            </Collapse>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default JobMonitor;
```

### 3. Backend API Requirements

To support the JobMonitor component, we need to implement the following endpoints:

1. **GET /api/workbench/jobs/list**
   - List all jobs for the current user
   - Support filtering by status, type, and date range
   - Return a list of job metadata objects

2. **GET /api/workbench/jobs/{job_id}**
   - Get detailed information about a specific job
   - Return job status, progress, results if available, error messages if any

3. **POST /api/workbench/jobs/{job_id}/cancel**
   - Cancel a running job
   - Return success/failure status

### 4. Integration with SpreadsheetTools

Update the SpreadsheetTools component to incorporate job monitoring for transformation operations:

1. **Import JobMonitor component**:
   ```javascript
   import JobMonitor from '../common/JobMonitor';
   ```

2. **Add job tracking in `generateOutputPreview`**:
   ```javascript
   // Inside the function after receiving the response
   if (result.success) {
     if (result.preview) {
       setOutputPreview(result.preview);
       // If we're in preview mode, set a success message
       if (processingMode === 'preview') {
         setTransformationResults({
           status: 'preview_success',
           previewRows: result.preview.length - 1 // Subtract 1 for header row
         });
       } else if (result.job_id) {
         // Track the job when processing full dataset
         trackTransformationJob(result.job_id, transformationParams);
         setTransformationResults({
           job_id: result.job_id,
           status: 'submitted'
         });
       }
     }
   }
   ```

3. **Add JobMonitor component to the UI**:
   ```jsx
   {/* After the transformation preview section, add job monitor */}
   {transformationResults?.job_id && (
     <Box mt={4}>
       <Typography variant="subtitle1" gutterBottom>Job Status</Typography>
       <JobMonitor 
         onViewResults={(job) => {
           // Handle viewing results - e.g., refreshing the spreadsheet data
           if (job.status === 'completed') {
             // Refresh the spreadsheet list
             fetchSpreadsheets();
           }
         }} 
       />
     </Box>
   )}
   ```

### 5. Development Tasks for JobMonitor

The following tasks are needed to complete the JobMonitor component:

- [ ] **Backend Implementation**
  - [ ] Define job models in `backend/workbench_service/models/jobs.py`
  - [ ] Implement job API routes in `backend/workbench_service/api/jobs.py`
  - [ ] Extend transformation API to return and update job status
  - [ ] Add job storage mechanism (database or file-based)

- [x] **Frontend Implementation**
  - [x] Create JobMonitor.js component as specified
  - [x] Add job management functions to WorkbenchContext.js
  - [x] Integrate JobMonitor with SpreadsheetTools.js
  - [x] Add job polling mechanism for real-time updates
  - [x] Implement development mode with mock data for testing without backend

- [ ] **Testing**
  - [ ] Test job creation with large spreadsheets
  - [ ] Test job polling and status updates
  - [ ] Test job cancellation
  - [ ] Test error handling in job processing

## Next Steps
1. Implement the backend API changes for enhanced column transformation
2. Create the JobMonitor component for tracking transformation operations
3. Update WorkbenchContext with job management functions
4. Integrate JobMonitor with the column transformation UI
5. Test the enhanced workflow end-to-end
6. Implement real LLM integration for the row-by-row processing
7. Add support for template saving/loading
