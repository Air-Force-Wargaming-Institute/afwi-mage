import React, { useContext, useState, useEffect, useCallback } from 'react';
import { WorkbenchContext } from '../../../contexts/WorkbenchContext';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  TextField, 
  InputLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputAdornment,
  Divider,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import StorageIcon from '@mui/icons-material/Storage';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import CodeIcon from '@mui/icons-material/Code';
import TransformIcon from '@mui/icons-material/Transform';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import '../../../App.css'; // Import App.css for styling
import FileUploader from '../common/FileUploader';

const SpreadsheetViewer = () => {
  const { 
    spreadsheets,
    fetchSpreadsheets,
    isLoading,
    error,
    connectionError,
    developmentMode,
    apiBaseUrl,
    uploadSpreadsheet
  } = useContext(WorkbenchContext);
  
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [processingType, setProcessingType] = useState('analyze');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [activeSpreadsheet, setActiveSpreadsheet] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  
  // Fetch spreadsheets when component mounts
  useEffect(() => {
    // Only fetch spreadsheets if we're not in development mode
    // or if spreadsheets array is empty
    if (!developmentMode || spreadsheets.length === 0) {
      fetchSpreadsheets();
    }
  }, [fetchSpreadsheets, developmentMode, spreadsheets.length]);
  
  // Handle file selection
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle processing type change
  const handleProcessingTypeChange = (event) => {
    setProcessingType(event.target.value);
  };
  
  // Handle file upload
  const handleUpload = async () => {
    if (!file) return;
    
    setUploadLoading(true);
    setUploadError(null);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }
      
      // Send API request
      if (!developmentMode) {
        const response = await fetch(`${apiBaseUrl}/api/workbench/spreadsheets/upload`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Refresh spreadsheet list
        fetchSpreadsheets();
        
        // Reset form
        setFile(null);
        setDescription('');
        setUploadSuccess(true);
        
        // Switch to library tab
        setTabValue(1);
      } else {
        // Simulate upload in development mode
        console.log('Development mode: Simulating file upload');
        
        // Wait 1 second to simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reset form
        setFile(null);
        setDescription('');
        setUploadSuccess(true);
        
        // Switch to library tab
        setTabValue(1);
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setUploadError(err.message);
    } finally {
      setUploadLoading(false);
    }
  };
  
  // Handle view spreadsheet
  const handleViewSpreadsheet = async (spreadsheetId) => {
    setIsPreviewLoading(true);
    
    try {
      if (!developmentMode) {
        // Get spreadsheet info to find out sheet names
        const infoResponse = await fetch(`${apiBaseUrl}/api/workbench/spreadsheets/${spreadsheetId}/sheets`);
        
        if (!infoResponse.ok) {
          throw new Error(`Failed to get spreadsheet info: ${infoResponse.statusText}`);
        }
        
        const infoData = await infoResponse.json();
        const sheetName = infoData.sheets && infoData.sheets.length > 0 ? infoData.sheets[0] : null;
        
        if (!sheetName) {
          throw new Error('No sheets found in spreadsheet');
        }
        
        // Get preview data using the operate endpoint
        const previewResponse = await fetch(`${apiBaseUrl}/api/workbench/spreadsheets/${spreadsheetId}/operate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operation: 'read',
            sheet_name: sheetName,
            cell_range: 'A1:Z20' // Get first 20 rows for preview
          }),
        });
        
        if (!previewResponse.ok) {
          throw new Error(`Failed to get preview data: ${previewResponse.statusText}`);
        }
        
        const previewResult = await previewResponse.json();
        
        if (!previewResult.success) {
          throw new Error(previewResult.error || 'Failed to read spreadsheet data');
        }
        
        // Set active spreadsheet and preview data
        setActiveSpreadsheet(spreadsheetId);
        setPreviewData(previewResult.data.values);
        
        // Switch to process tab
        setTabValue(2);
      } else {
        // Use mock data in development mode
        console.log('Development mode: Using mock data for preview');
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Sample data for preview
        const mockPreviewData = [
          ['Date', 'Region', 'Product', 'Sales', 'Profit', 'Units', 'Customer'],
          ['2023-01-15', 'North', 'Widget A', '$12,500', '$3,750', 125, 'Acme Inc'],
          ['2023-02-05', 'South', 'Widget B', '$18,200', '$5,460', 182, 'Global Corp'],
          ['2023-01-27', 'East', 'Widget A', '$9,800', '$2,940', 98, 'Tech Solutions'],
          ['2023-02-12', 'West', 'Widget C', '$22,300', '$6,690', 223, 'MegaCorp'],
          ['2023-03-03', 'North', 'Widget B', '$15,700', '$4,710', 157, 'Acme Inc'],
          ['2023-03-18', 'South', 'Widget A', '$11,600', '$3,480', 116, 'Small Business Ltd'],
          ['2023-04-02', 'East', 'Widget C', '$19,400', '$5,820', 194, 'Global Corp'],
          ['2023-04-20', 'West', 'Widget B', '$17,800', '$5,340', 178, 'Tech Innovators']
        ];
        
        setActiveSpreadsheet('mock-id');
        setPreviewData(mockPreviewData);
        
        // Switch to process tab
        setTabValue(2);
      }
    } catch (err) {
      console.error('Error getting spreadsheet preview:', err);
      setUploadError(err.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };
  
  // Get placeholder text based on processing type
  const getPlaceholderText = () => {
    switch(processingType) {
      case 'analyze':
        return "E.g., Calculate the average sales by region, Find trends in profit margins...";
      case 'transform':
        return "E.g., Convert all sales values to numbers without currency symbols, Format dates to YYYY-MM-DD...";
      case 'filter':
        return "E.g., Show only rows where sales exceeded $15,000, Filter to just North and South regions...";
      case 'format':
        return "E.g., Format all currency columns with 2 decimal places, Convert text to proper case...";
      default:
        return "Enter your data processing request...";
    }
  };
  
  // Handle reset upload form
  const handleResetUpload = () => {
    setFile(null);
    setDescription('');
  };
  
  // Handle close success message
  const handleCloseSnackbar = () => {
    setUploadSuccess(false);
  };
  
  // Add a handleUploadFile function to use with FileUploader  
  const handleUploadFile = async (file, description, onProgress, onSuccess, onError) => {
    try {
      // If we're in dev mode, let the FileUploader component handle mock behavior
      if (developmentMode) {
        // Wait a bit to simulate upload
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Call upload spreadsheet in workbench context
        await uploadSpreadsheet(file, description);
        
        // Success callback
        onSuccess && onSuccess();
        return;
      }
      
      // For non-dev mode, handle with actual API
      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }
      
      // Setup XMLHttpRequest to track progress
      const xhr = new XMLHttpRequest();
      
      // Track progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress && onProgress(progress);
        }
      });
      
      // Return a promise that resolves when the upload is complete
      await new Promise((resolve, reject) => {
        xhr.open('POST', `${apiBaseUrl}/api/workbench/spreadsheets/upload`);
        
        // Handle completion
        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Refresh spreadsheet list
            await fetchSpreadsheets();
            onSuccess && onSuccess();
            resolve();
          } else {
            const error = new Error(`Upload failed with status ${xhr.status}`);
            onError && onError(error);
            reject(error);
          }
        };
        
        // Handle network errors
        xhr.onerror = () => {
          const error = new Error('Network error occurred during upload');
          onError && onError(error);
          reject(error);
        };
        
        // Send the request
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Error in handleUploadFile:', error);
      onError && onError(error);
    }
  };
  
  // Add download functionality
  const handleDownloadSpreadsheet = async (spreadsheetId, filename) => {
    try {
      if (developmentMode) {
        console.log('Development mode: Simulating file download for', filename);
        
        // Create a mock download (just an empty file with the correct name)
        const blob = new Blob(['Mock spreadsheet content'], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        // Create a temporary link and click it to download
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        
        return;
      }
      
      // For actual backend, make a GET request to download endpoint
      const response = await fetch(`${apiBaseUrl}/api/workbench/spreadsheets/${spreadsheetId}/download`, {
        method: 'GET',
        headers: {
          'Accept': 'application/octet-stream'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }
      
      // Convert response to blob
      const blob = await response.blob();
      
      // Create object URL
      const url = URL.createObjectURL(blob);
      
      // Create temporary link and click it
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `spreadsheet-${spreadsheetId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Error downloading spreadsheet:', error);
      setDownloadError(`Download failed: ${error.message}`);
    }
  };
  
  // Render tabs content
  const renderTabContent = () => {
    switch (tabValue) {
      case 0: // Upload tab
        return (
          <div style={{ padding: '24px' }}>
            <Typography variant="h6" gutterBottom className="section-subtitle">
              Upload a Spreadsheet
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
            
            <FileUploader
              onUpload={handleUploadFile}
              acceptedFileTypes={['.xlsx', '.xls', '.csv']}
              uploadButtonText="Upload Spreadsheet"
              showDescription={true}
              descriptionLabel="Description (optional)"
              maxFileSizeMB={50}
              disabled={isLoading}
              developmentMode={developmentMode}
            />
          </div>
        );
        
      case 1: // Library tab
        return (
          <div style={{ padding: '24px' }}>
            <Typography variant="h6" gutterBottom className="section-subtitle">
              Spreadsheet Library
            </Typography>
            
            {developmentMode && (
              <Chip 
                icon={<CodeIcon />} 
                label="Using Mock Data" 
                color="primary" 
                variant="outlined" 
                style={{ marginBottom: '16px' }} 
              />
            )}
            
            {isLoading ? (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
              </Box>
            ) : spreadsheets.length > 0 ? (
              <TableContainer component={Paper} className="table-container">
                <Table className="table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Filename</TableCell>
                      <TableCell>Upload Date</TableCell>
                      <TableCell>Sheets</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {spreadsheets.map((sheet) => (
                      <TableRow key={sheet.id}>
                        <TableCell>{sheet.filename}</TableCell>
                        <TableCell>{new Date(sheet.upload_date).toLocaleString()}</TableCell>
                        <TableCell>{sheet.sheet_count}</TableCell>
                        <TableCell>{Math.round(sheet.size_bytes / 1024)} KB</TableCell>
                        <TableCell>
                          <Button 
                            size="small" 
                            variant="outlined" 
                            className="action-button"
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleViewSpreadsheet(sheet.id)}
                            disabled={isPreviewLoading}
                          >
                            View
                          </Button>
                          <Button 
                            size="small" 
                            variant="outlined" 
                            className="action-button"
                            color="secondary"
                            startIcon={<FileDownloadIcon />}
                            onClick={() => handleDownloadSpreadsheet(sheet.id, sheet.filename)}
                            style={{ marginLeft: '8px' }}
                          >
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography className="text-secondary">
                No spreadsheets found. Upload a spreadsheet to get started.
              </Typography>
            )}
            
            {downloadError && (
              <Alert 
                severity="error" 
                onClose={() => setDownloadError(null)}
                style={{ marginTop: '16px' }}
              >
                {downloadError}
              </Alert>
            )}
          </div>
        );
        
      case 2: // Process & Analyze tab
        return (
          <div style={{ padding: '24px' }}>
            <Typography variant="h6" gutterBottom className="section-subtitle">
              Process & Analyze Data
            </Typography>
            
            {developmentMode && (
              <Chip 
                icon={<CodeIcon />} 
                label="Using Mock Data" 
                color="primary" 
                variant="outlined" 
                style={{ marginBottom: '16px' }} 
              />
            )}
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper variant="outlined" style={{ padding: '16px' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Data Preview
                    {isPreviewLoading && (
                      <CircularProgress size={20} style={{ marginLeft: '10px', verticalAlign: 'middle' }} />
                    )}
                  </Typography>
                  
                  <TableContainer className="table-container" style={{ maxHeight: '400px' }}>
                    <Table size="small" className="table" stickyHeader>
                      {previewData.length > 0 ? (
                        <>
                          <TableHead>
                            <TableRow>
                              {previewData[0].map((header, index) => (
                                <TableCell key={index} style={{ fontWeight: 'bold' }}>{header}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {previewData.slice(1).map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                  <TableCell key={cellIndex}>{cell}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </>
                      ) : (
                        <TableBody>
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              {isPreviewLoading ? 'Loading data...' : 'No data available. Select a spreadsheet from the library.'}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      )}
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Divider style={{ margin: '12px 0' }}>
                  <Chip label="Data Processing Options" />
                </Divider>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth variant="outlined" style={{ marginBottom: '16px' }}>
                  <InputLabel>Processing Type</InputLabel>
                  <Select
                    value={processingType}
                    onChange={handleProcessingTypeChange}
                    label="Processing Type"
                  >
                    <MenuItem value="analyze">
                      <Box display="flex" alignItems="center">
                        <AnalyticsIcon style={{ marginRight: '8px' }} />
                        Analyze Data
                      </Box>
                    </MenuItem>
                    <MenuItem value="transform">
                      <Box display="flex" alignItems="center">
                        <TransformIcon style={{ marginRight: '8px' }} />
                        Transform Data
                      </Box>
                    </MenuItem>
                    <MenuItem value="filter">
                      <Box display="flex" alignItems="center">
                        <FilterAltIcon style={{ marginRight: '8px' }} />
                        Filter Data
                      </Box>
                    </MenuItem>
                    <MenuItem value="format">
                      <Box display="flex" alignItems="center">
                        <FormatColorTextIcon style={{ marginRight: '8px' }} />
                        Format Data
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Instructions for AI"
                  fullWidth
                  placeholder={getPlaceholderText()}
                  variant="outlined"
                  InputProps={{
                    startAdornment: processingType === 'analyze' ? (
                      <InputAdornment position="start">
                        <ShowChartIcon />
                      </InputAdornment>
                    ) : processingType === 'transform' ? (
                      <InputAdornment position="start">
                        <TransformIcon />
                      </InputAdornment>
                    ) : processingType === 'filter' ? (
                      <InputAdornment position="start">
                        <FilterAltIcon />
                      </InputAdornment>
                    ) : (
                      <InputAdornment position="start">
                        <FormatColorTextIcon />
                      </InputAdornment>
                    )
                  }}
                  multiline
                  rows={3}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button 
                  variant="contained" 
                  startIcon={
                    processingType === 'analyze' ? <AnalyticsIcon /> : 
                    processingType === 'transform' ? <TransformIcon /> : 
                    processingType === 'filter' ? <FilterAltIcon /> : 
                    <FormatColorTextIcon />
                  } 
                  className="upload-button"
                  disabled={!activeSpreadsheet || previewData.length === 0}
                >
                  {processingType === 'analyze' ? 'Analyze Data' : 
                   processingType === 'transform' ? 'Transform Data' : 
                   processingType === 'filter' ? 'Filter Data' : 
                   'Format Data'}
                </Button>
              </Grid>
            </Grid>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div>
      <Typography variant="h5" component="h1" gutterBottom className="section-title">
        Spreadsheet/Data Processing
      </Typography>
      
      <Typography variant="body1" paragraph>
        Process, transform, analyze, and extract insights from spreadsheet data with AI assistance. 
        Handle data cleaning, formatting, filtering, and statistical analysis with natural language instructions.
      </Typography>
      
      <Paper elevation={0} style={{ marginTop: '24px' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab icon={<UploadFileIcon />} label="Upload" />
          <Tab icon={<StorageIcon />} label="Library" />
          <Tab icon={<AnalyticsIcon />} label="Process & Analyze" />
        </Tabs>
        
        {renderTabContent()}
      </Paper>
      
      <Snackbar
        open={uploadSuccess}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        message="Spreadsheet uploaded successfully"
      />
    </div>
  );
};

export default SpreadsheetViewer; 