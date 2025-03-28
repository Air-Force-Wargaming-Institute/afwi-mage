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
    spreadsheets,
    fetchSpreadsheets,
    connectionError,
    isLoading,
    error,
    apiBaseUrl,
    visualizations,
    extractDataContext,
    generateVisualization,
    executeVisualizationCode
  } = useContext(WorkbenchContext);
  
  const [tabValue, setTabValue] = useState(0);
  const [selectedFile, setSelectedFile] = useState('');
  const [selectedChartType, setSelectedChartType] = useState('line');
  const [dataContext, setDataContext] = useState(null);
  const [vizRequest, setVizRequest] = useState('');
  const [visualizationCode, setVisualizationCode] = useState(SAMPLE_VISUALIZATION_CODE);
  const [codeResult, setCodeResult] = useState({ status: 'idle', error: null });
  const [localError, setLocalError] = useState(null);
  const [useSeaborn, setUseSeaborn] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState('default');
  const [selectedPalette, setSelectedPalette] = useState('Set1');
  const [sampleFiles, setSampleFiles] = useState([
    { id: 'sample-1', name: 'sales_data_2023.xlsx', description: 'Q1-Q4 Sales by Region' },
    { id: 'sample-2', name: 'inventory_2023.csv', description: 'Inventory levels by warehouse' },
    { id: 'sample-3', name: 'financial_metrics.xlsx', description: 'Financial performance metrics' }
  ]);
  
  // Fetch data on component mount
  useEffect(() => {
    // Fetch spreadsheets only once when component mounts
    fetchSpreadsheets();
    // Empty dependency array means this only runs once on mount
    // DO NOT add fetchSpreadsheets to dependencies or it will cause infinite loops
  }, []);
  
  // Extract data context when selected file changes
  useEffect(() => {
    if (selectedFile) {
      extractDataContext(selectedFile)
        .then(context => setDataContext(context))
        .catch(err => {
          console.error('Error extracting data context:', err);
          setLocalError('Failed to extract data context: ' + err.message);
        });
    }
  }, [selectedFile, extractDataContext]);
  
  // Handle file selection
  const handleFileSelected = async (fileId) => {
    setSelectedFile(fileId);
    setCodeResult({status: 'idle', data: null});
    // Data context will be extracted by the useEffect that depends on selectedFile
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle visualization generation
  const handleGenerateVisualization = async () => {
    setLocalError(null);
    setCodeResult({status: 'loading', data: null});
    
    const request = {
      spreadsheet_id: selectedFile,
      visualization_type: selectedChartType,
      description: vizRequest,
      preferences: {
        use_seaborn: useSeaborn,
        style: selectedStyle,
        color_palette: selectedPalette
      }
    };
    
    try {
      const result = await generateVisualization(request);
      setVisualizationCode(result.code);
      setCodeResult({
        status: 'success',
        data: result
      });
    } catch (err) {
      console.error('Error generating visualization:', err);
      setLocalError('Failed to generate visualization: ' + err.message);
      setCodeResult({status: 'error', data: null});
    }
  };
  
  // Handle code execution after manual edits
  const handleRunCode = async () => {
    if (!codeResult.data || !visualizationCode) return;
    
    setCodeResult({...codeResult, status: 'loading'});
    
    try {
      const result = await executeVisualizationCode(
        codeResult.data.id, 
        visualizationCode
      );
      
      setCodeResult({
        status: 'success',
        data: {
          ...codeResult.data,
          image_url: result.image_url
        }
      });
    } catch (err) {
      console.error('Error executing code:', err);
      setLocalError('Failed to execute code: ' + err.message);
      setCodeResult({...codeResult, status: 'error'});
    }
  };
  
  // Render data context information
  const renderDataContext = () => {
    if (!dataContext) return null;
    if (dataContext.loading) return <CircularProgress size={20} />;
    if (dataContext.error) return <Alert severity="error">{dataContext.error}</Alert>;
    
    return (
      <div style={{ marginTop: '16px', marginBottom: '16px' }}>
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
    if (!connectionError) return null;
    
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
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Data Source</InputLabel>
                  <Select
                    value={selectedFile}
                    label="Data Source"
                    onChange={(e) => handleFileSelected(e.target.value)}
                    disabled={connectionError}
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
                  placeholder={connectionError ? 
                    "Backend connection required for visualization generation" : 
                    "E.g., Create a line chart showing sales by product across months"}
                  multiline
                  rows={4}
                  value={vizRequest}
                  onChange={(e) => setVizRequest(e.target.value)}
                  disabled={connectionError}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth style={{ marginBottom: '16px' }}>
                  <InputLabel>Chart Type</InputLabel>
                  <Select
                    value={selectedChartType}
                    label="Chart Type"
                    onChange={(e) => setSelectedChartType(e.target.value)}
                    disabled={connectionError}
                  >
                    <MenuItem value="line">Line Chart</MenuItem>
                    <MenuItem value="bar">Bar Chart</MenuItem>
                    <MenuItem value="scatter">Scatter Plot</MenuItem>
                    <MenuItem value="pie">Pie Chart</MenuItem>
                    <MenuItem value="heatmap">Heatmap</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useSeaborn}
                      onChange={(e) => setUseSeaborn(e.target.checked)}
                      disabled={connectionError}
                    />
                  }
                  label="Use Seaborn (enhanced styling)"
                />
              </Grid>
              
              {useSeaborn && (
                <>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Style</InputLabel>
                      <Select
                        value={selectedStyle}
                        label="Style"
                        onChange={(e) => setSelectedStyle(e.target.value)}
                        disabled={connectionError}
                      >
                        <MenuItem value="default">Default</MenuItem>
                        <MenuItem value="whitegrid">White Grid</MenuItem>
                        <MenuItem value="darkgrid">Dark Grid</MenuItem>
                        <MenuItem value="ticks">Ticks</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Color Palette</InputLabel>
                      <Select
                        value={selectedPalette}
                        label="Color Palette"
                        onChange={(e) => setSelectedPalette(e.target.value)}
                        disabled={connectionError}
                      >
                        <MenuItem value="Set1">Set1</MenuItem>
                        <MenuItem value="Set2">Set2</MenuItem>
                        <MenuItem value="viridis">Viridis</MenuItem>
                        <MenuItem value="plasma">Plasma</MenuItem>
                        <MenuItem value="coolwarm">Coolwarm</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  fullWidth
                  className="upload-button"
                  disabled={!selectedFile || !vizRequest || isLoading || codeResult.status === 'loading'}
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
            
            {localError && (
              <Alert severity="error" style={{ marginBottom: '16px' }} onClose={() => setLocalError(null)}>
                {localError}
              </Alert>
            )}
            
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
                    onClick={handleRunCode}
                    disabled={!visualizationCode || codeResult.status === 'loading'}
                  >
                    Run Code
                  </Button>
                </div>
                <CodeEditor 
                  code={visualizationCode || (connectionError ? 
                    "# Backend connection required to generate visualization code\n# Please start the backend services and reload this page" : 
                    "")} 
                  setCode={setVisualizationCode}
                  readOnly={connectionError}
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
                    disabled={(!dataContext || connectionError)}
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
                      disabled={(!dataContext || connectionError)}
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