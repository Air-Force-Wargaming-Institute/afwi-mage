import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { WorkbenchContext } from '../../../contexts/WorkbenchContext';
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid,
  Divider,
  TextField,
  Chip
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import '../../../App.css'; // Import App.css for styling
import FileUploader from '../common/FileUploader';
import SpreadsheetModal from '../common/SpreadsheetModal';
import { toast, Toaster } from 'react-hot-toast';
// Import styled components
import {
  GradientBorderPaper,
  AnimatedGradientPaper,
  SubtleGlowPaper,
  useContainerStyles,
  GradientText
} from '../../../styles/StyledComponents';
// Import action buttons
import {
  DeleteButton,
  EditButton,
  DownloadButton,
  ViewButton,
  DeleteActionButton
} from '../../../styles/ActionButtons';
import { getGatewayUrl } from '../../../config';
import { AuthContext } from '../../../contexts/AuthContext';

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
    updateSpreadsheet,
    activeView
  } = useContext(WorkbenchContext);
  const { token } = useContext(AuthContext);
  
  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
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
  
  // Fetch spreadsheets when component mounts or view becomes active
  useEffect(() => {
    // Only fetch if the library view is active
    if (activeView === 'library') {
      fetchSpreadsheets();
    }
    // Add fetchSpreadsheets and activeView to dependency array
  }, [fetchSpreadsheets, activeView]);
  
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
        const url = getGatewayUrl('/api/workbench/spreadsheets/upload');
        
        xhr.open('POST', url);

        // **** ADD AUTHORIZATION HEADER ****
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        } else {
           console.warn('No auth token available for XHR upload request.');
        }
        
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
      const baseUrl = `http://localhost:8020/api/workbench/spreadsheets`
      
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
  
  // Render spreadsheet list
  const renderSpreadsheetList = () => {
    if (isLoading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <CircularProgress />
        </Box>
      );
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
      <GradientBorderPaper elevation={2}>
        <TableContainer sx={{ 
          height: '100%', 
          overflow: 'auto',
        }}>
          <Table aria-label="spreadsheets table" size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Filename</TableCell>
                <TableCell>Upload Date</TableCell>
                <TableCell>Sheets</TableCell>
                <TableCell>Size</TableCell>
                <TableCell width="280">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {spreadsheets.map((sheet) => (
                <TableRow key={sheet.id}>
                  <TableCell>
                    {sheet.filename}
                    {sheet.is_transformed && (
                      <Chip 
                        size="small" 
                        label="Transformed" 
                        color="secondary" 
                        sx={{ ml: 1 }} 
                      />
                    )}
                  </TableCell>
                  <TableCell>{new Date(sheet.upload_date).toLocaleString()}</TableCell>
                  <TableCell>{sheet.sheet_count}</TableCell>
                  <TableCell>{formatFileSize(sheet.size_bytes)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <ViewButton 
                        onClick={() => handleViewSpreadsheet(sheet.id, sheet.filename)}
                        tooltip="View Spreadsheet"
                      />
                      <DownloadButton
                        onClick={() => handleDownloadSpreadsheet(sheet.id, sheet.filename)}
                        tooltip="Download Spreadsheet" 
                      />
                      <EditButton
                        onClick={() => handleRenameClick(sheet.id, sheet.filename)}
                        tooltip="Rename Spreadsheet"
                      />
                      <DeleteButton
                        onClick={() => handleDeleteClick(sheet.id, sheet.filename)}
                        tooltip="Delete Spreadsheet"
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </GradientBorderPaper>
    );
  };
  
  return (
    <Container maxWidth="xl" sx={{ 
      height: 'calc(100vh - 170px)', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden',
      px: { xs: 2, sm: 3 },
      width: '100%',
      mt: '-10px'
    }}>
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
      
      <Box sx={{ mb: 2 }}>
        <GradientText variant="h3" component="h1" gutterBottom className="section-title" sx={{ fontSize: '2.2rem', fontWeight: 600, mb: 1 }}>
          Upload/Manage Spreadsheets
        </GradientText>
      </Box>
      
      <Grid container spacing={3} sx={{ height: 'calc(100vh - 230px)' }}>
        {/* Upload Panel - 20% width */}
        <Grid item xs={12} md={3} lg={2.4}>
          <SubtleGlowPaper elevation={2} sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            p: 3,
            boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.3)'
          }}>
            <Typography variant="h6" gutterBottom fontWeight="600" color="primary.main">
              Upload Files
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Upload your spreadsheet files here. Supported formats: XLSX, XLS, CSV
            </Typography>
            
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <FileUploader
                onUpload={handleUploadFile}
                acceptedFileTypes={['.xlsx', '.xls', '.csv']}
                uploadButtonText="Upload Spreadsheet"
                showDescription={true}
                descriptionLabel="Description (optional)"
                maxFileSizeMB={50}
                disabled={isLoading}
              />
            </Box>
          </SubtleGlowPaper>
        </Grid>
        
        {/* Spreadsheet List - 80% width */}
        <Grid item xs={12} md={9} lg={9.6}>
          <GradientBorderPaper elevation={3} sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            p: 3,
            boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
            '&::before': {
              background: '#121212',
              borderRadius: theme => theme.shape.borderRadius - theme.custom?.borderWidth?.thin/2 || 1.5,
            }
          }}>
            <Typography variant="h6" gutterBottom fontWeight="600" color="primary.main">
              Original Uploaded Spreadsheets
            </Typography>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              {renderSpreadsheetList()}
            </Box>
          </GradientBorderPaper>
        </Grid>
      </Grid>
      
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
        PaperProps={{
          style: {
            backgroundColor: 'rgba(30, 30, 35, 0.95)',
            backgroundImage: 'linear-gradient(rgba(30, 30, 35, 0.97), rgba(20, 20, 25, 0.95))',
            color: '#ffffff',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            borderRadius: '10px',
            border: '1px solid rgba(66, 133, 244, 0.1)'
          }
        }}
        sx={{
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(0, 0, 0, 0.7)'
          }
        }}
      >
        <DialogTitle 
          id="delete-dialog-title"
          sx={{ 
            color: '#ffffff',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '16px 24px'
          }}
        >
          {"Confirm Spreadsheet Deletion"}
        </DialogTitle>
        <DialogContent sx={{ padding: '24px' }}>
          <DialogContentText 
            id="delete-dialog-description"
            sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
          >
            Are you sure you want to delete "{spreadsheetToDelete?.filename}"? This action is permanent and cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ 
          padding: '16px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          justifyContent: 'space-between'
        }}>
          <Button 
            onClick={handleCancelDelete} 
            color="primary"
            sx={{ 
              color: '#4285f4',
              '&:hover': {
                backgroundColor: 'rgba(66, 133, 244, 0.08)'
              }
            }}
          >
            CANCEL
          </Button>
          <DeleteActionButton 
            onClick={handleConfirmDelete} 
            autoFocus
            sx={{
              '& svg': {
                marginRight: '8px'
              }
            }}
          >
            Delete
          </DeleteActionButton>
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