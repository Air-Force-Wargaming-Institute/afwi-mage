import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Paper,
  CircularProgress,
  LinearProgress,
  Alert,
  IconButton,
  Chip,
  Tooltip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import ArticleIcon from '@mui/icons-material/Article';
import '../../../App.css'; // Import global styles

/**
 * Reusable File Uploader component
 * 
 * Features:
 * - Drag and drop file upload
 * - File selection via browser dialog
 * - Optional description field
 * - File type validation
 * - Upload progress tracking
 * - Success/error state handling
 * - File size display
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onUpload - Callback function when upload is initiated
 * @param {string[]} props.acceptedFileTypes - Array of accepted file extensions (.xlsx, .csv, etc.)
 * @param {string} props.uploadButtonText - Text for the upload button
 * @param {boolean} props.showDescription - Whether to show the description field
 * @param {string} props.descriptionLabel - Label for the description field
 * @param {number} props.maxFileSizeMB - Maximum file size in MB
 * @param {boolean} props.disabled - Whether the uploader is disabled
 * @param {boolean} props.developmentMode - Whether in development mode
 */
const FileUploader = ({
  onUpload,
  acceptedFileTypes = ['.xlsx', '.xls', '.csv'],
  uploadButtonText = 'Upload File',
  showDescription = true,
  descriptionLabel = 'Description (optional)',
  maxFileSizeMB = 50,
  disabled = false,
  developmentMode = false
}) => {
  // File input ref for programmatic access
  const fileInputRef = useRef(null);
  
  // Component state
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Get accepted file types string for the file input
  const acceptString = acceptedFileTypes.join(',');
  
  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Helper function to check if file type is valid
  const isFileTypeValid = (file) => {
    const fileName = file.name || '';
    const fileExtension = '.' + fileName.split('.').pop().toLowerCase();
    return acceptedFileTypes.includes(fileExtension);
  };
  
  // Helper function to check if file size is valid
  const isFileSizeValid = (file) => {
    return file.size <= maxFileSizeMB * 1024 * 1024;
  };
  
  // Handle file selection
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    validateAndSetFile(selectedFile);
  };
  
  // Handle file drag events
  const handleDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  // Handle file drop
  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      validateAndSetFile(event.dataTransfer.files[0]);
    }
  };
  
  // Handle file validation and setting
  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;
    
    // Reset states
    setUploadError(null);
    setUploadSuccess(false);
    
    // Check file type
    if (!isFileTypeValid(selectedFile)) {
      setUploadError(`Invalid file type. Accepted types: ${acceptedFileTypes.join(', ')}`);
      return;
    }
    
    // Check file size
    if (!isFileSizeValid(selectedFile)) {
      setUploadError(`File size exceeds the maximum limit of ${maxFileSizeMB} MB`);
      return;
    }
    
    // Set file if all validations pass
    setFile(selectedFile);
  };
  
  // Handle form reset
  const handleReset = () => {
    setFile(null);
    setDescription('');
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);
    
    // Also reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle file upload
  const handleUpload = async () => {
    if (!file || disabled || isUploading) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    
    try {
      // Simulate progress in dev mode
      if (developmentMode) {
        // Simulate upload progress
        const interval = setInterval(() => {
          setUploadProgress((prevProgress) => {
            const newProgress = prevProgress + 10;
            if (newProgress >= 100) {
              clearInterval(interval);
              
              // Wait a bit before completing
              setTimeout(() => {
                setIsUploading(false);
                setUploadSuccess(true);
                
                // Call the onUpload callback
                onUpload && onUpload(file, description);
                
                // Reset form after 3 seconds
                setTimeout(() => {
                  handleReset();
                }, 3000);
              }, 500);
              
              return 100;
            }
            return newProgress;
          });
        }, 300);
      } else {
        // Create a FormData object for the actual upload
        const formData = new FormData();
        formData.append('file', file);
        
        if (description) {
          formData.append('description', description);
        }
        
        // Call the onUpload callback with progress tracking
        onUpload && onUpload(
          file, 
          description, 
          (progress) => setUploadProgress(progress),
          () => {
            setIsUploading(false);
            setUploadSuccess(true);
            
            // Reset form after success (after 3 seconds)
            setTimeout(() => {
              handleReset();
            }, 3000);
          },
          (error) => {
            setIsUploading(false);
            setUploadError(error.message || 'Upload failed');
          }
        );
      }
    } catch (error) {
      console.error('Error during upload:', error);
      setUploadError(error.message || 'Upload failed');
      setIsUploading(false);
    }
  };
  
  // Handle manual file selection click
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };
  
  // Determine if the upload button should be disabled
  const isUploadDisabled = !file || isUploading || disabled || uploadSuccess;
  
  return (
    <Box className="file-uploader-container">
      {/* File drop area */}
      <Paper
        elevation={0}
        variant="outlined"
        className={`file-drop-area ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={disabled ? null : handleDrop}
        onClick={disabled ? null : handleSelectFile}
        style={{
          padding: '24px',
          marginBottom: '16px',
          borderRadius: '8px',
          borderStyle: 'dashed',
          borderWidth: '2px',
          borderColor: dragActive ? '#1976d2' : '#ccc',
          backgroundColor: dragActive ? 'rgba(25, 118, 210, 0.05)' : 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'center',
          position: 'relative',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept={acceptString}
          disabled={disabled}
        />
        
        {/* Upload icon */}
        <CloudUploadIcon
          style={{
            fontSize: '48px',
            color: disabled ? '#ccc' : '#1976d2',
            marginBottom: '16px'
          }}
        />
        
        {/* Upload instructions */}
        <Typography variant="h6" component="div" gutterBottom>
          Drag & Drop or Click to Select
        </Typography>
        
        <Typography variant="body2" color="textSecondary">
          Accepted file types: {acceptedFileTypes.join(', ')}
        </Typography>
        
        <Typography variant="body2" color="textSecondary">
          Maximum file size: {maxFileSizeMB} MB
        </Typography>
        
        {/* Selected file info */}
        {file && (
          <Box
            mt={2}
            p={2}
            borderRadius="4px"
            bgcolor="rgba(0, 0, 0, 0.05)"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box display="flex" alignItems="center">
              <ArticleIcon style={{ marginRight: '8px', color: '#1976d2' }} />
              <Box>
                <Typography variant="body2" component="div">
                  {file.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {formatFileSize(file.size)}
                </Typography>
              </Box>
            </Box>
            
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              disabled={isUploading}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Paper>
      
      {/* Description field */}
      {showDescription && (
        <TextField
          label={descriptionLabel}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          variant="outlined"
          fullWidth
          multiline
          rows={2}
          disabled={disabled || isUploading || uploadSuccess}
          style={{ marginBottom: '16px' }}
        />
      )}
      
      {/* Upload button */}
      <Box display="flex" alignItems="center">
        <Button
          variant="contained"
          color="primary"
          startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
          onClick={handleUpload}
          disabled={isUploadDisabled}
          style={{ marginRight: '8px' }}
        >
          {isUploading ? 'Uploading...' : uploadButtonText}
        </Button>
        
        {developmentMode && (
          <Tooltip title="Development Mode - Upload simulation">
            <Chip
              icon={<InfoIcon />}
              label="Dev Mode"
              variant="outlined"
              size="small"
              color="primary"
            />
          </Tooltip>
        )}
      </Box>
      
      {/* Upload progress */}
      {isUploading && (
        <Box mt={2}>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <Typography variant="caption" align="right" style={{ display: 'block', marginTop: '4px' }}>
            {Math.round(uploadProgress)}%
          </Typography>
        </Box>
      )}
      
      {/* Success message */}
      {uploadSuccess && (
        <Alert
          icon={<CheckCircleIcon fontSize="inherit" />}
          severity="success"
          style={{ marginTop: '16px' }}
        >
          File uploaded successfully!
        </Alert>
      )}
      
      {/* Error message */}
      {uploadError && (
        <Alert
          severity="error"
          style={{ marginTop: '16px' }}
          onClose={() => setUploadError(null)}
        >
          {uploadError}
        </Alert>
      )}
    </Box>
  );
};

export default FileUploader; 