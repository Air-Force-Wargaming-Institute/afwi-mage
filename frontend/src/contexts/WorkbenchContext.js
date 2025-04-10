import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { getApiUrl } from '../config';

export const WorkbenchContext = createContext();

export const WorkbenchProvider = ({ children }) => {
  const { token } = useContext(AuthContext);
  
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [activeView, setActiveView] = useState('library');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [visualizations, setVisualizations] = useState([]);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [jobs, setJobs] = useState([]);
  const [activeJobId, setActiveJobId] = useState(null);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Column transformation persistent state
  const [transformationState, setTransformationState] = useState(() => {
    // Try to load saved state from localStorage on initial render
    const savedState = localStorage.getItem('workbench_transformation_state');
    if (savedState) {
      try {
        return JSON.parse(savedState);
      } catch (e) {
        console.error('Error parsing saved transformation state:', e);
        return null;
      }
    }
    return null;
  });

  // Save transformation state to localStorage whenever it changes
  useEffect(() => {
    if (transformationState) {
      localStorage.setItem('workbench_transformation_state', JSON.stringify(transformationState));
    }
  }, [transformationState]);

  // Update transformation state
  const updateTransformationState = useCallback((updates) => {
    setTransformationState(prevState => {
      const newState = { ...(prevState || {}), ...updates };
      // Avoid unnecessary state update if object is shallowly the same
      if (JSON.stringify(prevState) === JSON.stringify(newState)) {
        return prevState;
      }
      return newState;
    });
  }, []); // No dependencies needed as it only uses setTransformationState

  // Reset transformation state
  const resetTransformationState = useCallback(() => {
    localStorage.removeItem('workbench_transformation_state');
    setTransformationState(null);
  }, []); // No dependencies needed

  // Setup axios headers with authentication token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if backend is available when component mounts
  useEffect(() => {
    // Get API base URL
    const baseUrl = getApiUrl('WORKBENCH', '');
    console.log('Workbench API base URL:', baseUrl);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
    console.log('WORKBENCH_SERVICE_PORT:', process.env.REACT_APP_WORKBENCH_SERVICE_PORT);
    setApiBaseUrl(baseUrl);
    
    let isMounted = true; // Flag to prevent state updates on unmounted component

    const checkBackendConnection = async () => {
      try {
        const healthUrl = baseUrl.endsWith('/') ? `${baseUrl}health` : `${baseUrl}/health`;
        console.log('Checking backend connection at:', healthUrl);
        await axios.get(healthUrl, { timeout: 5000 }); // Slightly increased timeout

        if (isMounted) {
          console.log('Backend connection successful');
          setConnectionError(false); // Explicitly set to false only on success
          setError(null); // Clear any previous connection-related errors
        }
      } catch (error) {
        if (isMounted) {
          console.error('Backend connection check failed:', error);
          setConnectionError(true); // Set connection error on failure
          // Optionally set a general error message
          // setError('Initial connection to backend failed. Please ensure it is running.');
        }
      } finally {
        if (isMounted) {
          setInitialCheckDone(true); // Mark initial check as complete
        }
      }
    };
    
    checkBackendConnection();

    return () => {
      isMounted = false; // Cleanup function
    };
  }, []); // Keep dependency array empty to run only once on mount

  // Fetch spreadsheets from API
  const fetchSpreadsheets = useCallback(async () => {
    // Guard: If we know the connection failed previously, don't try again immediately.
    if (connectionError) {
      console.warn("Skipping fetchSpreadsheets due to existing connection error.");
      // Ensure loading is false if we skip
      setIsLoading(false);
      // Optionally set an error message, though the initial check might have already done so
      // setError('Cannot connect to backend services. Please ensure the backend is running.');
      return []; // Return empty array as the fetch didn't proceed
    }

    setIsLoading(true); // Indicate loading for this specific fetch
    setError(null); // Clear previous fetch errors

    try {
      // Ensure no double slashes in URL by using path.join logic
      const url = apiBaseUrl.endsWith('/')
        ? `${apiBaseUrl}api/workbench/spreadsheets/list`
        : `${apiBaseUrl}/api/workbench/spreadsheets/list`;
      
      console.log('Fetching spreadsheets from URL:', url);
      const response = await axios.get(url);
      console.log('Spreadsheets response:', response.data);

      // Ensure all spreadsheets have is_transformed flag set properly
      const processedSpreadsheets = response.data.map(sheet => ({
        ...sheet,
        is_transformed: !!sheet.is_transformed || !!sheet.original_id
      }));

      // Check if component is still mounted before setting state
      // Note: This specific useCallback doesn't have a direct isMounted flag,
      // rely on component-level checks where this is called if needed.
      setSpreadsheets(processedSpreadsheets);
      setIsLoading(false);
      // Clear connection error if fetch succeeds after potentially failing before
      setConnectionError(false);
      return processedSpreadsheets;
    } catch (error) {
      console.error('Error fetching spreadsheets:', error);
      // Log the URL that failed
      console.error('Failed URL:', apiBaseUrl.endsWith('/')
        ? `${apiBaseUrl}api/workbench/spreadsheets/list`
        : `${apiBaseUrl}/api/workbench/spreadsheets/list`);
      
      // Check if component is still mounted before setting state
      if (error.message === 'Network Error' || error.code === 'ECONNREFUSED') {
         setConnectionError(true); // Set connection error on network failure
         setError('Cannot connect to backend services. Please ensure the backend is running.');
      } else {
         setError('Failed to load spreadsheets. Please try again later.');
         // Clear connection error if it's a different type of error
         setConnectionError(false);
      }
      setIsLoading(false);
      return [];
    }
  }, [apiBaseUrl, connectionError]); // Add connectionError dependency

  // Helper function to join URL paths correctly
  const joinPaths = (base, path) => {
    return base.endsWith('/') 
      ? `${base}${path.startsWith('/') ? path.substring(1) : path}`
      : `${base}${path.startsWith('/') ? path : '/' + path}`;
  };

  // Transform spreadsheet columns with AI assistance
  const transformSpreadsheet = useCallback(async (spreadsheetId, transformationParams, options = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = joinPaths(apiBaseUrl, `api/workbench/spreadsheets/${spreadsheetId}/transform`);
      console.log('Transforming spreadsheet with URL:', url);
      console.log('Transformation parameters:', JSON.stringify(transformationParams, null, 2));
      
      // Log additional details about the enhanced transformation for debugging
      if (transformationParams.output_columns) {
        console.log('Enhanced output column configuration:');
        transformationParams.output_columns.forEach((col, index) => {
          console.log(`Column ${index + 1}: ${col.name} (${col.is_new ? 'New' : 'Existing'})`);
          console.log(`  Type: ${col.output_type || 'text'}`);
          console.log(`  Type Options:`, col.type_options || {});
          console.log(`  Instructions: ${col.description}`);
        });
      }
      
      if (transformationParams.create_duplicate !== undefined) {
        console.log('Creating duplicate spreadsheet:', transformationParams.create_duplicate);
      }
      
      const response = await axios.post(url, transformationParams, options);
      console.log('Transformation response:', response.data);
      setIsLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error transforming spreadsheet:', error);
      
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setError('Cannot connect to backend services. Please ensure the backend is running.');
      } else if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response from server:', error.response.data);
        setError(`Failed to transform spreadsheet: ${error.response.data?.detail || error.response.data?.error || 'Unknown server error'}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        setError('No response received from server. The request may have timed out.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError(`Failed to transform spreadsheet: ${error.message}`);
      }
      
      setIsLoading(false);
      throw error;
    }
  }, [apiBaseUrl]); // Depends on apiBaseUrl

  // Job management functions
  
  // Fetch job status from API
  const getJobStatus = useCallback(async (jobId, options = {}) => {
    setError(null);
    
    try {
      const url = joinPaths(apiBaseUrl, `api/workbench/jobs/${jobId}`);
      console.log('Fetching job status from URL:', url);
      const response = await axios.get(url, options);
      
      // Update job in the jobs array
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === jobId ? { ...job, ...response.data } : job
        )
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching job status for job ${jobId}:`, error);
      
      // If backend connection not available, use mock data for development
      if (connectionError || error.message === 'Network Error') {
        console.log('Using mock data for job status due to connection issue');
        
        // Find the job in our local state
        const job = jobs.find(j => j.id === jobId);
        if (job) {
          // Simulate progress update
          const updatedJob = { 
            ...job, 
            progress: Math.min(100, job.progress + 10),
            status: job.progress + 10 >= 100 ? 'completed' : 'running',
            completed_at: job.progress + 10 >= 100 ? new Date().toISOString() : null,
            message: job.progress + 10 >= 100 ? 'Successfully completed job' : 'Processing data...'
          };
          
          // Add result object when job completes
          if (updatedJob.status === 'completed' && !updatedJob.result) {
            updatedJob.result = {
              spreadsheet_id: 'mock-spreadsheet-' + jobId.substring(0, 4)
            };
          }
          
          // Update local state
          setJobs(prevJobs => prevJobs.map(j => j.id === jobId ? updatedJob : j));
          
          return updatedJob;
        }
      } else {
        setError(`Failed to fetch job status: ${error.message}`);
        throw error;
      }
    }
  }, [apiBaseUrl, connectionError, jobs]); // Added jobs dependency

  // List all jobs
  const listJobs = useCallback(async (filter = {}, options = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = joinPaths(apiBaseUrl, 'api/workbench/jobs/list');
      console.log('Listing jobs from URL:', url);
      const response = await axios.get(url, { params: filter, ...options });
      setJobs(response.data);
      setIsLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error fetching jobs:', error);
      
      // If backend connection not available, use mock data for development
      if (connectionError || error.message === 'Network Error') {
        console.log('Using mock data for jobs due to connection issue');
        
        // Create mock data for development
        const mockJobs = [
          {
            id: '123456',
            type: 'column_transformation',
            status: 'running',
            progress: 30,
            created_at: new Date(Date.now() - 240000).toISOString(), // 4 minutes ago
            parameters: { sheet_name: 'Sheet1' },
            message: 'Processing data...'
          },
          {
            id: '123455',
            type: 'column_transformation',
            status: 'completed',
            progress: 100,
            created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            completed_at: new Date(Date.now() - 3540000).toISOString(), // 59 minutes ago
            parameters: { sheet_name: 'Sheet2' },
            message: 'Successfully completed job',
            result: {
              spreadsheet_id: 'mock-spreadsheet-123'
            }
          }
        ];
        
        setJobs(mockJobs);
        setIsLoading(false);
        
        // Set the first job as active if not already set
        if (!activeJobId && mockJobs.length > 0) {
          setActiveJobId(mockJobs[0].id);
        }
        
        return mockJobs;
      } else {
        setError('Failed to fetch jobs. Please try again.');
        setIsLoading(false);
        throw error;
      }
    }
  }, [apiBaseUrl, connectionError, activeJobId]); // Added activeJobId

  // Cancel a job
  const cancelJob = useCallback(async (jobId, options = {}) => {
    setError(null);
    
    try {
      const url = joinPaths(apiBaseUrl, `api/workbench/jobs/${jobId}/cancel`);
      console.log('Cancelling job at URL:', url);
      const response = await axios.post(url, {}, options);
      
      // Update job in the jobs array
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === jobId ? { ...job, status: 'cancelled', message: 'Job cancelled by user' } : job
        )
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error cancelling job ${jobId}:`, error);
      
      // If backend connection not available, update local state for development
      if (connectionError || error.message === 'Network Error') {
        console.log('Using mock update for job cancellation due to connection issue');
        
        // Update job status in local state
        setJobs(prevJobs => 
          prevJobs.map(job => 
            job.id === jobId ? { ...job, status: 'cancelled', message: 'Job cancelled by user' } : job
          )
        );
        
        return { success: true, message: 'Job cancelled' };
      } else {
        setError(`Failed to cancel job: ${error.message}`);
        throw error;
      }
    }
  }, [apiBaseUrl, connectionError]);

  // Track a transformation job
  const trackTransformationJob = useCallback((jobId, parameters) => {
    // Create a new job object for tracking
    const newJob = {
      id: jobId,
      type: 'column_transformation',
      status: 'submitted',
      progress: 0,
      created_at: new Date().toISOString(),
      parameters,
      message: 'Job submitted, waiting to start processing'
    };
    
    // Add to jobs list
    setJobs(prevJobs => [...prevJobs, newJob]);
    
    // Set as active job
    setActiveJobId(jobId);
    
    console.log(`Tracking new transformation job: ${jobId}`);
    return newJob;
  }, []); // Only depends on setters

  // Upload a new spreadsheet
  const uploadSpreadsheet = useCallback(async (file, description = '') => {
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    
    try {
      const url = joinPaths(apiBaseUrl, 'api/workbench/spreadsheets/upload');
      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      await fetchSpreadsheets(); // Refresh the list
      setIsLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error uploading spreadsheet:', error);
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setError('Cannot connect to backend services. Please ensure the backend is running.');
      } else {
        setError('Failed to upload spreadsheet. Please try again.');
      }
      setIsLoading(false);
      throw error;
    }
  }, [apiBaseUrl, fetchSpreadsheets]); // Added fetchSpreadsheets dependency

  // Get details for a specific spreadsheet
  const getSpreadsheetDetails = useCallback(async (spreadsheetId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = joinPaths(apiBaseUrl, `api/workbench/spreadsheets/${spreadsheetId}/info`);
      const response = await axios.get(url);
      setSelectedSpreadsheet(response.data);
      setIsLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error fetching spreadsheet details:', error);
      
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setError('Cannot connect to backend services. Please ensure the backend is running.');
      } else {
        setError(`Failed to load spreadsheet details: ${error.message}`);
      }
      setIsLoading(false);
      throw error;
    }
  }, [apiBaseUrl]);

  // Get spreadsheet sheets
  const getSpreadsheetSheets = useCallback(async (spreadsheetId) => {
    try {
      const url = joinPaths(apiBaseUrl, `api/workbench/spreadsheets/${spreadsheetId}/sheets`);
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching spreadsheet sheets:', error);
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setError('Cannot connect to backend services. Please ensure the backend is running.');
      }
      throw error;
    }
  }, [apiBaseUrl]);

  // Get column summaries for a spreadsheet
  const getSpreadsheetSummary = useCallback(async (spreadsheetId, sheetName) => {
    try {
      let endpoint = `api/workbench/spreadsheets/${spreadsheetId}/summary`;
      if (sheetName) {
        endpoint += `?sheet_name=${encodeURIComponent(sheetName)}`;
      }
      const url = joinPaths(apiBaseUrl, endpoint);
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching spreadsheet summary:', error);
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setError('Cannot connect to backend services. Please ensure the backend is running.');
      }
      throw error;
    }
  }, [apiBaseUrl]);

  // Perform cell operations
  const performCellOperation = useCallback(async (spreadsheetId, operation) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = joinPaths(apiBaseUrl, `api/workbench/spreadsheets/${spreadsheetId}/operate`);
      const response = await axios.post(url, operation);
      setIsLoading(false);
      // Set results for potential display
      setAnalysisResults(response.data);
      return response.data;
    } catch (error) {
      console.error('Error performing cell operation:', error);
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setError('Cannot connect to backend services. Please ensure the backend is running.');
      } else {
        setError('Failed to process spreadsheet. Please try again.');
      }
      setIsLoading(false);
      throw error;
    }
  }, [apiBaseUrl]);
  
  // Generate visualization from data
  const generateVisualization = useCallback(async (request) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = joinPaths(apiBaseUrl, 'api/workbench/visualizations/generate');
      const response = await axios.post(url, request);
      setIsLoading(false);
      
      // Add to visualizations list if not already there
      const newVisualization = response.data;
      setVisualizations(prev => {
        if (!prev.find(v => v.id === newVisualization.id)) {
          return [...prev, newVisualization];
        }
        return prev;
      });
      
      return newVisualization;
    } catch (error) {
      console.error('Error generating visualization:', error);
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setError('Cannot connect to backend services. Please ensure the backend is running.');
      } else {
        setError('Failed to generate visualization. Please try again.');
      }
      setIsLoading(false);
      throw error;
    }
  }, [apiBaseUrl]);
  
  // Execute visualization code
  const executeVisualizationCode = useCallback(async (visualizationId, code) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = joinPaths(apiBaseUrl, `api/workbench/visualizations/${visualizationId}/execute`);
      const response = await axios.post(url, { code });
      setIsLoading(false);
      
      // Update visualizations list
      setVisualizations(prev => prev.map(viz => 
        viz.id === visualizationId 
          ? { ...viz, code, image_url: response.data.image_url } 
          : viz
      ));
      
      return response.data;
    } catch (error) {
      console.error('Error executing visualization code:', error);
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setError('Cannot connect to backend services. Please ensure the backend is running.');
      } else {
        setError('Failed to execute visualization code. Please check for errors in your code.');
      }
      setIsLoading(false);
      throw error;
    }
  }, [apiBaseUrl]);
  
  // Extract data context for visualization
  const extractDataContext = useCallback(async (spreadsheetId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = joinPaths(apiBaseUrl, `api/workbench/spreadsheets/${spreadsheetId}/context`);
      const response = await axios.get(url);
      setIsLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error extracting data context:', error);
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setError('Cannot connect to backend services. Please ensure the backend is running.');
      } else {
        setError('Failed to extract data context. Please try again.');
      }
      setIsLoading(false);
      throw error;
    }
  }, [apiBaseUrl]);

  // Delete a spreadsheet
  const deleteSpreadsheet = useCallback(async (spreadsheetId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = joinPaths(apiBaseUrl, `api/workbench/spreadsheets/${spreadsheetId}`);
      const response = await axios.delete(url);
      
      // Remove the spreadsheet from the local state
      setSpreadsheets(prev => prev.filter(sheet => sheet.id !== spreadsheetId));
      
      // If this was the selected spreadsheet, clear the selection
      if (selectedSpreadsheet && selectedSpreadsheet.id === spreadsheetId) {
        setSelectedSpreadsheet(null);
      }
      
      setIsLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error deleting spreadsheet:', error);
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setError('Cannot connect to backend services. Please ensure the backend is running.');
      } else {
        setError('Failed to delete spreadsheet. Please try again.');
      }
      setIsLoading(false);
      throw error;
    }
  }, [apiBaseUrl, selectedSpreadsheet]); // Added selectedSpreadsheet dependency

  // Update spreadsheet metadata (like filename)
  const updateSpreadsheet = useCallback(async (spreadsheetId, updates) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = joinPaths(apiBaseUrl, `api/workbench/spreadsheets/${spreadsheetId}`);
      const response = await axios.patch(url, updates);
      
      // Update the spreadsheet in the local state
      setSpreadsheets(prev => 
        prev.map(sheet => 
          sheet.id === spreadsheetId 
            ? { ...sheet, ...response.data } 
            : sheet
        )
      );
      
      // If this was the selected spreadsheet, update it
      if (selectedSpreadsheet && selectedSpreadsheet.id === spreadsheetId) {
        setSelectedSpreadsheet(prev => ({ ...prev, ...response.data }));
      }
      
      setIsLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error updating spreadsheet:', error);
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setError('Cannot connect to backend services. Please ensure the backend is running.');
      } else {
        setError('Failed to update spreadsheet. Please try again.');
      }
      setIsLoading(false);
      throw error;
    }
  }, [apiBaseUrl, selectedSpreadsheet]); // Added selectedSpreadsheet dependency

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []); // No dependencies needed as it only uses setError

  return (
    <WorkbenchContext.Provider value={{
      spreadsheets,
      selectedSpreadsheet,
      selectedTool,
      activeView,
      isLoading,
      error,
      connectionError,
      apiBaseUrl,
      analysisResults,
      visualizations,
      jobs,
      activeJobId,
      transformationState,
      setSelectedTool,
      setActiveView,
      fetchSpreadsheets,
      uploadSpreadsheet,
      getSpreadsheetDetails,
      getSpreadsheetSheets,
      getSpreadsheetSummary,
      performCellOperation,
      setSelectedSpreadsheet,
      generateVisualization,
      executeVisualizationCode,
      extractDataContext,
      deleteSpreadsheet,
      updateSpreadsheet,
      clearError,
      transformSpreadsheet,
      getJobStatus,
      listJobs,
      cancelJob,
      trackTransformationJob,
      setActiveJobId,
      updateTransformationState,
      resetTransformationState,
      initialCheckDone
    }}>
      {children}
    </WorkbenchContext.Provider>
  );
};

export default WorkbenchProvider; 