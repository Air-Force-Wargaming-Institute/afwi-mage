import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  Snackbar,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
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
import SpreadsheetModal from '../common/SpreadsheetModal';
import { toast, Toaster } from 'react-hot-toast';

const SpreadsheetViewer = () => {
  const { 
    spreadsheets,
    fetchSpreadsheets,
    isLoading,
    error,
    connectionError,
    uploadSpreadsheet,
    apiBaseUrl,
    getSpreadsheetSheets,
    performCellOperation,
    deleteSpreadsheet,
    updateSpreadsheet
  } = useContext(WorkbenchContext);
  
  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
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
  const [openModal, setOpenModal] = useState(false);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState(null);
  const [selectedFilename, setSelectedFilename] = useState('');
  
  // State for the delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [spreadsheetToDelete, setSpreadsheetToDelete] = useState(null);
  
  // State for the rename dialog
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [spreadsheetToRename, setSpreadsheetToRename] = useState(null);
  const [newFilename, setNewFilename] = useState('');
  const [filenameError, setFilenameError] = useState('');
  
  // Fetch spreadsheets when component mounts
  useEffect(() => {
    // Only fetch once when component mounts
    fetchSpreadsheets();
    // Empty dependency array means this only runs once on mount
    // DO NOT add fetchSpreadsheets to dependencies or it will cause infinite loops
  }, []);
  
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
      const response = await fetch(`/api/workbench/spreadsheets/upload`, {
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
    } catch (err) {
      console.error('Error uploading file:', err);
      setUploadError(err.message);
    } finally {
      setUploadLoading(false);
    }
  };
  
  // Handle view spreadsheet
  const handleViewSpreadsheet = async (spreadsheetId, filename) => {
    setSelectedSpreadsheetId(spreadsheetId);
    setSelectedFilename(filename);
    setOpenModal(true);
  };
  
  // Handle modal close
  const handleCloseModal = () => {
    setOpenModal(false);
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
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress && onProgress(percentComplete);
        }
      });
      
      // Return promise for upload completion
      return new Promise((resolve, reject) => {
        // Use the proper URL with apiBaseUrl
        const url = apiBaseUrl.endsWith('/') 
          ? `${apiBaseUrl}api/workbench/spreadsheets/upload`
          : `${apiBaseUrl}/api/workbench/spreadsheets/upload`;
        
        xhr.open('POST', url);
        
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Success
            const response = JSON.parse(xhr.responseText);
            fetchSpreadsheets(); // Refresh the list
            onSuccess && onSuccess(response);
            resolve(response);
          } else {
            // Error
            const error = new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`);
            onError && onError(error);
            reject(error);
          }
        };
        
        xhr.onerror = function() {
          const error = new Error('Network error during upload');
          onError && onError(error);
          reject(error);
        };
        
        xhr.send(formData);
      });
    } catch (err) {
      console.error('Error in file upload:', err);
      onError && onError(err);
      throw err;
    }
  };
  
  // Add download functionality
  const handleDownloadSpreadsheet = async (spreadsheetId, filename) => {
    try {
      // Construct the download URL using apiBaseUrl
      const baseUrl = apiBaseUrl.endsWith('/') 
        ? `${apiBaseUrl}api/workbench/spreadsheets` 
        : `${apiBaseUrl}/api/workbench/spreadsheets`;
      
      const downloadUrl = `${baseUrl}/${spreadsheetId}/download`;
      
      // Create temporary link and click it
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename || `spreadsheet-${spreadsheetId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
      
      // Show success message
      toast.success(`Downloading "${filename}"...`);
    } catch (error) {
      console.error('Error downloading spreadsheet:', error);
      setDownloadError(`Download failed: ${error.message}`);
      toast.error(`Download failed: ${error.message}`);
    }
  };
  
  // Handle spreadsheet deletion
  const handleDeleteClick = (spreadsheetId, filename) => {
    // Set the spreadsheet to delete and open the confirmation dialog
    setSpreadsheetToDelete({ id: spreadsheetId, filename });
    setDeleteDialogOpen(true);
  };
  
  // Handle deletion confirmation
  const handleConfirmDelete = async () => {
    if (!spreadsheetToDelete) return;
    
    try {
      await deleteSpreadsheet(spreadsheetToDelete.id);
      // Close the dialog
      setDeleteDialogOpen(false);
      setSpreadsheetToDelete(null);
      
      // Show success message
      toast.success(`"${spreadsheetToDelete.filename}" was deleted successfully.`);
    } catch (error) {
      console.error('Error deleting spreadsheet:', error);
      toast.error(`Failed to delete spreadsheet: ${error.message}`);
    }
  };
  
  // Handle deletion cancellation
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setSpreadsheetToDelete(null);
  };
  
  // Handle opening the rename dialog
  const handleRenameClick = (spreadsheetId, filename) => {
    // Get filename without extension
    const fileExt = filename.lastIndexOf('.');
    const filenameWithoutExt = fileExt > 0 ? filename.substring(0, fileExt) : filename;
    
    setSpreadsheetToRename({ id: spreadsheetId, filename });
    setNewFilename(filenameWithoutExt);
    setFilenameError('');
    setRenameDialogOpen(true);
  };
  
  // Handle rename cancellation
  const handleCancelRename = () => {
    setRenameDialogOpen(false);
    setSpreadsheetToRename(null);
    setNewFilename('');
    setFilenameError('');
  };
  
  // Validate filename (no special characters except for underscore and hyphen)
  const validateFilename = (filename) => {
    if (!filename.trim()) {
      return 'Filename cannot be empty';
    }
    
    // Check for invalid characters (allow letters, numbers, spaces, underscores, hyphens)
    const invalidCharsRegex = /[^a-zA-Z0-9\s_\-\.]/;
    if (invalidCharsRegex.test(filename)) {
      return 'Filename contains invalid characters. Only letters, numbers, spaces, underscores, and hyphens are allowed.';
    }
    
    return '';
  };
  
  // Handle rename submission
  const handleConfirmRename = async () => {
    if (!spreadsheetToRename) return;
    
    // Validate filename
    const error = validateFilename(newFilename);
    if (error) {
      setFilenameError(error);
      return;
    }
    
    try {
      // Get the file extension from the original filename
      const originalExt = spreadsheetToRename.filename.split('.').pop();
      
      // Only append the extension if it's not already there
      let finalFilename = newFilename;
      if (!finalFilename.toLowerCase().endsWith(`.${originalExt.toLowerCase()}`)) {
        finalFilename = `${newFilename}.${originalExt}`;
      }
      
      // Call API to update filename
      await updateSpreadsheet(spreadsheetToRename.id, { 
        filename: finalFilename 
      });
      
      // Close dialog
      setRenameDialogOpen(false);
      setSpreadsheetToRename(null);
      setNewFilename('');
      
      // Show success message
      toast.success(`"${spreadsheetToRename.filename}" renamed to "${finalFilename}".`);
    } catch (error) {
      console.error('Error renaming spreadsheet:', error);
      toast.error(`Failed to rename spreadsheet: ${error.message}`);
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
            
            <FileUploader
              onUpload={handleUploadFile}
              acceptedFileTypes={['.xlsx', '.xls', '.csv']}
              uploadButtonText="Upload Spreadsheet"
              showDescription={true}
              descriptionLabel="Description (optional)"
              maxFileSizeMB={50}
              disabled={isLoading}
            />
          </div>
        );
        
      case 1: // Library tab
        return (
          <div style={{ padding: '24px' }}>
            <Typography variant="h6" gutterBottom className="section-subtitle">
              Spreadsheet Library
            </Typography>
            
            {renderLibraryTab()}
          </div>
        );
        
      case 2: // Process & Analyze tab
        return (
          <div style={{ padding: '24px' }}>
            <Typography variant="h6" gutterBottom className="section-subtitle">
              Process & Analyze Data
            </Typography>
            
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
  
  // Render library tab
  const renderLibraryTab = () => {
    if (isLoading) {
      return <CircularProgress />;
    }
    
    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }
    
    if (connectionError) {
      return (
        <Alert severity="error">
          Cannot connect to backend services. Please ensure the backend is running.
        </Alert>
      );
    }
    
    if (!spreadsheets || spreadsheets.length === 0) {
      return (
        <Alert severity="info">
          No spreadsheets found. Please upload a spreadsheet to get started.
        </Alert>
      );
    }
    
    return (
      <Paper elevation={1} style={{ padding: '16px', marginTop: '16px' }}>
        <Typography variant="h6" gutterBottom>
          Available Spreadsheets
        </Typography>
        
        <TableContainer component={Paper} variant="outlined">
          <Table aria-label="spreadsheets table" size="small">
            <TableHead>
              <TableRow>
                <TableCell>Filename</TableCell>
                <TableCell>Upload Date</TableCell>
                <TableCell>Sheets</TableCell>
                <TableCell>Size</TableCell>
                <TableCell width="250">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {spreadsheets.map((sheet) => (
                <TableRow key={sheet.id}>
                  <TableCell>{sheet.filename}</TableCell>
                  <TableCell>{new Date(sheet.upload_date).toLocaleString()}</TableCell>
                  <TableCell>{sheet.sheet_count}</TableCell>
                  <TableCell>{formatFileSize(sheet.size_bytes)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="primary"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewSpreadsheet(sheet.id, sheet.filename)}
                      >
                        View
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        color="primary"
                        startIcon={<FileDownloadIcon />}
                        onClick={() => handleDownloadSpreadsheet(sheet.id, sheet.filename)}
                      >
                        Download
                      </Button>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          onClick={() => handleRenameClick(sheet.id, sheet.filename)}
                          sx={{ minWidth: 'auto' }}
                        >
                          Rename
                        </Button>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          color="error"
                          startIcon={<DeleteOutlineIcon />}
                          onClick={() => handleDeleteClick(sheet.id, sheet.filename)}
                        >
                          Delete
                        </Button>
                      </Box>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };
  
  return (
    <Container maxWidth="xl">
      {/* Toast notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#4caf50',
              color: '#fff',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#f44336',
              color: '#fff',
            },
          },
        }}
      />
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Spreadsheet Viewer</Typography>
        
        <Box sx={{ width: '100%' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Upload" />
            <Tab label="Library" />
          </Tabs>
          
          <Box mt={2}>
            {renderTabContent()}
          </Box>
        </Box>
      </Paper>
      
      <Snackbar
        open={uploadSuccess}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        message="Spreadsheet uploaded successfully"
      />
      
      {/* Spreadsheet Modal */}
      <SpreadsheetModal
        open={openModal}
        onClose={handleCloseModal}
        spreadsheetId={selectedSpreadsheetId}
        filename={selectedFilename}
      />
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          {"Confirm Spreadsheet Deletion"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete "{spreadsheetToDelete?.filename}"? This action is permanent and cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Rename Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={handleCancelRename}
        aria-labelledby="rename-dialog-title"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="rename-dialog-title">
          Rename Spreadsheet
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter a new name for "{spreadsheetToRename?.filename}". The file extension will be preserved.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            label="New filename"
            value={newFilename}
            onChange={(e) => setNewFilename(e.target.value)}
            error={!!filenameError}
            helperText={filenameError || `The file extension will remain .${spreadsheetToRename?.filename.split('.').pop() || 'xlsx'}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleConfirmRename();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRename} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmRename} 
            color="primary" 
            variant="contained" 
            disabled={!newFilename.trim() || !!filenameError}
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SpreadsheetViewer; 