import React, { createContext, useState, useContext, useEffect } from 'react';
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
    
    // Function to check backend connection
    const checkBackendConnection = async () => {
      try {
        // Construct health endpoint URL properly - avoid double slashes
        const healthUrl = baseUrl.endsWith('/') ? `${baseUrl}health` : `${baseUrl}/health`;
        console.log('Checking backend connection at:', healthUrl);
        
        // Change from HEAD to GET request since the endpoint doesn't support HEAD
        await axios.get(healthUrl, { timeout: 2000 });
        // If successful, backend is available
        console.log('Backend connection successful');
        setConnectionError(false);
      } catch (error) {
        // If error, backend is not available
        console.error('Backend connection check failed:', error);
        setConnectionError(true);
      }
    };
    
    // Perform the check
    checkBackendConnection();
  }, []);

  // Fetch spreadsheets from API
  const fetchSpreadsheets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Ensure no double slashes in URL by using path.join logic
      const url = apiBaseUrl.endsWith('/') 
        ? `${apiBaseUrl}api/workbench/spreadsheets/list`
        : `${apiBaseUrl}/api/workbench/spreadsheets/list`;
      
      console.log('Fetching spreadsheets from URL:', url);
      const response = await axios.get(url);
      console.log('Spreadsheets response:', response.data);
      setSpreadsheets(response.data);
      setIsLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error fetching spreadsheets:', error);
      // Log the URL that failed
      console.error('Failed URL:', apiBaseUrl.endsWith('/') 
        ? `${apiBaseUrl}api/workbench/spreadsheets/list`
        : `${apiBaseUrl}/api/workbench/spreadsheets/list`);
      
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setError('Cannot connect to backend services. Please ensure the backend is running.');
      } else {
        setError('Failed to load spreadsheets. Please try again later.');
      }
      setIsLoading(false);
      return [];
    }
  };

  // Helper function to join URL paths correctly
  const joinPaths = (base, path) => {
    return base.endsWith('/') 
      ? `${base}${path.startsWith('/') ? path.substring(1) : path}`
      : `${base}${path.startsWith('/') ? path : '/' + path}`;
  };

  // Transform spreadsheet columns with AI assistance
  const transformSpreadsheet = async (spreadsheetId, transformationParams, options = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = joinPaths(apiBaseUrl, `api/workbench/spreadsheets/${spreadsheetId}/transform`);
      console.log('Transforming spreadsheet with URL:', url);
      console.log('Transformation parameters:', transformationParams);
      
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
  };

  // Upload a new spreadsheet
  const uploadSpreadsheet = async (file, description = '') => {
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
  };

  // Get details for a specific spreadsheet
  const getSpreadsheetDetails = async (spreadsheetId) => {
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
  };

  // Get spreadsheet sheets
  const getSpreadsheetSheets = async (spreadsheetId) => {
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
  };

  // Get column summaries for a spreadsheet
  const getSpreadsheetSummary = async (spreadsheetId, sheetName) => {
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
  };

  // Perform cell operations
  const performCellOperation = async (spreadsheetId, operation) => {
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
  };
  
  // Generate visualization from data
  const generateVisualization = async (request) => {
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
  };
  
  // Execute visualization code
  const executeVisualizationCode = async (visualizationId, code) => {
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
  };
  
  // Extract data context for visualization
  const extractDataContext = async (spreadsheetId) => {
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
  };

  // Delete a spreadsheet
  const deleteSpreadsheet = async (spreadsheetId) => {
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
  };

  // Update spreadsheet metadata (like filename)
  const updateSpreadsheet = async (spreadsheetId, updates) => {
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
  };

  // Clear error state
  const clearError = () => {
    setError(null);
  };

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
      transformSpreadsheet
    }}>
      {children}
    </WorkbenchContext.Provider>
  );
};

export default WorkbenchProvider; 