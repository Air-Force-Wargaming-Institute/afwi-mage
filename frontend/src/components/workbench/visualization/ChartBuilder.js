import React, { useState, useContext, useEffect } from 'react';
import { WorkbenchContext } from '../../../contexts/WorkbenchContext';
import { 
  Box, 
  Typography, 
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Card,
  CardContent,
  Divider,
  Tab,
  Tabs,
  Switch,
  FormControlLabel,
  Alert,
  AlertTitle,
  Tooltip,
  CircularProgress,
  Chip
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import CodeIcon from '@mui/icons-material/Code';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FakePlotImage from '../../../assets/FakePlot.png'; // Import the fake plot image
import '../../../App.css'; // Import App.css for styling

// Sample mock visualization for development mode
const SAMPLE_VISUALIZATION_CODE = `import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np

# Create sample data
months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
product_a = [1000, 1500, 1200, 2000, 1800, 2200, 1500, 1800, 2000, 2300, 1900, 2100]
product_b = [800, 1200, 1500, 1800, 2000, 2300, 1600, 1900, 2200, 2500, 1800, 2000]
product_c = [1200, 1300, 1100, 1400, 1600, 1900, 1300, 1500, 1700, 1900, 1500, 1700]

# Create the visualization
plt.figure(figsize=(12, 8))

# Create line plots for each product
plt.plot(months, product_a, marker='o', linewidth=2, color='#223b8f', label='Product A')
plt.plot(months, product_b, marker='s', linewidth=2, color='#1a8693', label='Product B')
plt.plot(months, product_c, marker='^', linewidth=2, color='#ff9d9d', label='Product C')

# Add title and labels
plt.title('Sales Across Different Products', fontsize=16)
plt.xlabel('Months', fontsize=12)
plt.ylabel('Sales ($100k)', fontsize=12)
plt.grid(True)
plt.legend()
plt.tight_layout()`;

// Code editor component - can be replaced with a more robust solution
const CodeEditor = ({ code, setCode, readOnly }) => {
  return (
    <TextField
      fullWidth
      multiline
      rows={15}
      value={code}
      onChange={(e) => setCode(e.target.value)}
      InputProps={{
        readOnly: readOnly,
        style: { 
          fontFamily: 'monospace', 
          fontSize: '0.9rem',
          backgroundColor: '#f5f5f5'
        }
      }}
      variant="outlined"
    />
  );
};

const ChartBuilder = () => {
  const { 
    visualizations, 
    isLoading, 
    connectionError,
    developmentMode,
    generateVisualization,
    executeVisualizationCode,
    extractDataContext
  } = useContext(WorkbenchContext);
  
  const [tabValue, setTabValue] = useState(0);
  const [selectedFile, setSelectedFile] = useState('');
  const [chartType, setChartType] = useState('line');
  const [dataContext, setDataContext] = useState(null);
  const [vizRequest, setVizRequest] = useState('');
  const [visualizationCode, setVisualizationCode] = useState(SAMPLE_VISUALIZATION_CODE);
  const [codeResult, setCodeResult] = useState({ status: 'idle', error: null });
  const [sampleFiles, setSampleFiles] = useState([
    { id: 'sample-1', name: 'sales_data_2023.xlsx', description: 'Q1-Q4 Sales by Region' },
    { id: 'sample-2', name: 'inventory_2023.csv', description: 'Inventory levels by warehouse' },
    { id: 'sample-3', name: 'financial_metrics.xlsx', description: 'Financial performance metrics' }
  ]);
  
  // Ensure we have visualizations data when in development mode
  useEffect(() => {
    if (developmentMode && visualizations.length === 0) {
      // This will be caught by the context's useEffect to initialize mock data
      extractDataContext('sample-id');
    }
  }, [developmentMode, visualizations.length, extractDataContext]);
  
  // Handle file selection
  const handleFileSelect = async (fileId) => {
    setSelectedFile(fileId);
    
    if (!fileId) return;
    
    // In a real implementation, this would fetch the data context from the backend
    try {
      setDataContext({ loading: true });
      
      if (developmentMode) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Example data context that would be returned from backend
        setDataContext({
          loading: false,
          schema: [
            { name: 'Date', type: 'datetime', missing: false },
            { name: 'Region', type: 'categorical', missing: false },
            { name: 'Sales', type: 'numeric', missing: false },
            { name: 'Profit', type: 'numeric', missing: true },
          ],
          statistics: {
            'Sales': { min: 1000, max: 50000, mean: 15000, median: 12500 },
            'Profit': { min: 100, max: 15000, mean: 4500, median: 3800 },
          },
          sample: [
            ['2023-01-01', 'North', 12500, 3700],
            ['2023-01-02', 'South', 18000, 5400],
            ['2023-01-03', 'East', 9800, 2200],
            ['2023-01-04', 'West', 22000, 7800],
          ],
          row_count: 1200,
          file_info: {
            name: 'sales_data_2023.xlsx',
            sheets: ['Q1', 'Q2', 'Q3', 'Q4']
          }
        });
      } else {
        // Real API call would go here
        // ...
      }
    } catch (error) {
      setDataContext({ loading: false, error: 'Failed to analyze file' });
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle visualization generation
  const handleGenerateVisualization = async () => {
    if (!selectedFile || !vizRequest) return;
    
    try {
      setCodeResult({ status: 'loading', error: null });
      
      // This would be an actual API call in the real implementation
      const result = await generateVisualization({
        spreadsheet_id: selectedFile,
        prompt: vizRequest,
        use_seaborn: true,
        data_context: dataContext
      });
      
      // If in development mode, we'll get mock data back, otherwise real data
      if (result) {
        // Update the visualization code
        setVisualizationCode(result.code || SAMPLE_VISUALIZATION_CODE);
        setCodeResult({ status: 'success', error: null });
      }
      
      setTabValue(1); // Switch to the visualization tab
    } catch (error) {
      setCodeResult({ 
        status: 'error', 
        error: error.message || 'Failed to generate visualization'
      });
    }
  };
  
  // Handle code execution after manual edits
  const handleExecuteCode = async () => {
    // In a real implementation, this would send the code to the backend for execution
    try {
      setCodeResult({ status: 'loading', error: null });
      
      if (developmentMode) {
        // Simulate execution delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update the visualization image with the FakePlot image
        setDataContext({
          loading: false,
          schema: [
            { name: 'Date', type: 'datetime', missing: false },
            { name: 'Region', type: 'categorical', missing: false },
            { name: 'Sales', type: 'numeric', missing: false },
            { name: 'Profit', type: 'numeric', missing: true },
          ],
          statistics: {
            'Sales': { min: 1000, max: 50000, mean: 15000, median: 12500 },
            'Profit': { min: 100, max: 15000, mean: 4500, median: 3800 },
          },
          sample: [
            ['2023-01-01', 'North', 12500, 3700],
            ['2023-01-02', 'South', 18000, 5400],
            ['2023-01-03', 'East', 9800, 2200],
            ['2023-01-04', 'West', 22000, 7800],
          ],
          row_count: 1200,
          file_info: {
            name: 'sales_data_2023.xlsx',
            sheets: ['Q1', 'Q2', 'Q3', 'Q4']
          }
        });
      } else {
        // Real backend call would go here
        // ...
      }
      
      setCodeResult({ status: 'success', error: null });
    } catch (error) {
      setCodeResult({ 
        status: 'error', 
        error: error.message || 'Failed to execute code'
      });
    }
  };
  
  // Render data context information
  const renderDataContext = () => {
    if (!dataContext) return null;
    if (dataContext.loading) return <CircularProgress size={20} />;
    if (dataContext.error) return <Alert severity="error">{dataContext.error}</Alert>;
    
    return (
      <div style={{ marginTop: '16px', marginBottom: '16px' }}>
        {developmentMode && (
          <Chip 
            icon={<CodeIcon />} 
            label="Mock Data" 
            color="primary" 
            variant="outlined" 
            size="small"
            style={{ marginBottom: '8px' }} 
          />
        )}
        
        <Typography variant="subtitle2" gutterBottom>
          File Analysis Summary
        </Typography>
        <Typography variant="body2" className="text-secondary">
          {dataContext.file_info.name}: {dataContext.row_count} rows, {dataContext.schema.length} columns
        </Typography>
        <Typography variant="body2" className="text-secondary">
          Columns: {dataContext.schema.map(col => col.name).join(', ')}
        </Typography>
      </div>
    );
  };

  // Render connection error message
  const renderConnectionError = () => {
    if (!connectionError || developmentMode) return null;
    
    return (
      <Alert 
        severity="warning" 
        variant="outlined"
        icon={<ErrorOutlineIcon />}
        style={{ marginBottom: '24px' }}
      >
        <AlertTitle>Backend Connection Error</AlertTitle>
        <Typography variant="body2" paragraph>
          Unable to connect to backend services. The visualization features require the backend to be running.
        </Typography>
        <Typography variant="body2">
          You can still explore the interface, but visualization generation will not work until the backend is available.
        </Typography>
      </Alert>
    );
  };

  return (
    <div>
      <Typography variant="h5" component="h1" gutterBottom className="section-title">
        Data Visualization
      </Typography>
      
      <Typography variant="body1" paragraph>
        Create visualizations from Excel data using natural language requests.
      </Typography>
      
      {renderConnectionError()}
      
      <Grid container spacing={3}>
        {/* Left panel - Input */}
        <Grid item xs={12} md={5}>
          <Paper elevation={1} style={{ padding: '24px', height: '100%' }}>
            <Typography variant="h6" gutterBottom className="section-subtitle">
              Visualization Request
            </Typography>
            
            {developmentMode && (
              <Chip 
                icon={<CodeIcon />} 
                label="Development Mode" 
                color="primary" 
                variant="outlined" 
                style={{ marginBottom: '16px' }} 
              />
            )}
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Data Source</InputLabel>
                  <Select
                    value={selectedFile}
                    label="Data Source"
                    onChange={(e) => handleFileSelect(e.target.value)}
                    disabled={connectionError && !developmentMode}
                  >
                    <MenuItem value="">
                      <em>Select a file</em>
                    </MenuItem>
                    {/* Actual spreadsheets would be populated here */}
                    <MenuItem value="sample_data">Sample Sales Data (2023)</MenuItem>
                    <MenuItem value="upload">Upload New Data</MenuItem>
                  </Select>
                </FormControl>
                {renderDataContext()}
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Describe the visualization you want"
                  placeholder={connectionError && !developmentMode ? 
                    "Backend connection required for visualization generation" : 
                    "E.g., Create a line chart showing sales by product across months"}
                  multiline
                  rows={4}
                  value={vizRequest}
                  onChange={(e) => setVizRequest(e.target.value)}
                  disabled={connectionError && !developmentMode}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  fullWidth
                  className="upload-button"
                  disabled={(!selectedFile || !vizRequest || isLoading || codeResult.status === 'loading') && !developmentMode}
                  onClick={handleGenerateVisualization}
                >
                  {isLoading || codeResult.status === 'loading' ? (
                    <CircularProgress size={24} />
                  ) : (
                    'Generate Visualization'
                  )}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Right panel - Output */}
        <Grid item xs={12} md={7}>
          <Paper elevation={1} style={{ padding: '24px', height: '100%' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="visualization tabs"
              style={{ marginBottom: '16px' }}
            >
              <Tab icon={<CodeIcon />} label="Code" />
              <Tab icon={<VisibilityIcon />} label="Visualization" />
            </Tabs>
            
            {codeResult && codeResult.error && (
              <Alert severity="error" style={{ marginBottom: '16px' }}>
                {codeResult.error}
              </Alert>
            )}
            
            {tabValue === 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <Typography variant="subtitle1">
                    Python Visualization Code
                  </Typography>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<RefreshIcon />}
                    className="action-button"
                    onClick={handleExecuteCode}
                    disabled={(!visualizationCode || codeResult.status === 'loading') && !developmentMode}
                  >
                    Run Code
                  </Button>
                </div>
                <CodeEditor 
                  code={visualizationCode || (connectionError && !developmentMode ? 
                    "# Backend connection required to generate visualization code\n# Please start the backend services and reload this page" : 
                    "")} 
                  setCode={setVisualizationCode}
                  readOnly={connectionError && !developmentMode}
                />
              </div>
            )}
            
            {tabValue === 1 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <Typography variant="subtitle1">
                    Visualization Preview
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<SaveAltIcon />}
                    size="small"
                    className="action-button"
                    disabled={(!dataContext || connectionError) && !developmentMode}
                  >
                    Export
                  </Button>
                </div>
                
                {/* Visualization Output */}
                <div style={{ marginTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <Typography variant="subtitle1">
                      Visualization Output
                    </Typography>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      startIcon={<SaveAltIcon />}
                      className="action-button"
                      disabled={(!dataContext || connectionError) && !developmentMode}
                    >
                      Export
                    </Button>
                  </div>
                  
                  {dataContext && dataContext.loading ? (
                    <CircularProgress size={20} />
                  ) : dataContext && dataContext.error ? (
                    <Alert severity="error">{dataContext.error}</Alert>
                  ) : (
                    <Card>
                      {developmentMode && (
                        <Chip 
                          icon={<CodeIcon />} 
                          label="Mock Visualization" 
                          color="primary" 
                          variant="outlined" 
                          size="small"
                          style={{ margin: '8px' }} 
                        />
                      )}
                      <img
                        src={FakePlotImage}
                        alt="Generated visualization"
                        style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'contain' }}
                      />
                      <CardContent>
                        <Typography variant="body2" className="text-secondary">
                          {vizRequest || "Sales data across different products showing monthly trends"}
                        </Typography>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
};

export default ChartBuilder; 