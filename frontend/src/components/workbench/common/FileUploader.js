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
 * FileUploader Component
 * 
 * A reusable file upload component with drag-and-drop capability.
 * 
 * @param {Object} props Component props
 * @param {Function} props.onUpload Callback function when file is uploaded
 * @param {Array<string>} props.allowedFileTypes Array of allowed file extensions (e.g. ['.xlsx', '.csv'])
 * @param {number} props.maxFileSizeMB Maximum file size in MB
 * @param {string} props.description Optional description of the file uploader
 * @param {boolean} props.disabled Whether the uploader is disabled
 * @param {Function} props.onError Callback function when error occurs
 */
const FileUploader = ({
  onUpload,
  allowedFileTypes = ['.xlsx', '.csv', '.xls'],
  maxFileSizeMB = 10,
  description,
  disabled = false,
  onError
}) => {
  const [file, setFile] = useState(null);
  const [fileDescription, setFileDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  // Reset the component state
  const resetState = () => {
    setFile(null);
    setFileDescription('');
    setUploading(false);
    setUploadProgress(0);
    setError(null);
  };

  // Handle file selection from input
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    validateAndSetFile(selectedFile);
  };
  
  // Handle drag events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragging(true);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };
  
  // Validate file type and size
  const validateAndSetFile = (selectedFile) => {
    setError(null);
    
    // Check if file exists
    if (!selectedFile) return;
    
    // Check file type
    const fileExt = `.${selectedFile.name.split('.').pop().toLowerCase()}`;
    if (allowedFileTypes.length > 0 && !allowedFileTypes.includes(fileExt)) {
      const errMsg = `Invalid file type. Allowed types: ${allowedFileTypes.join(', ')}`;
      setError(errMsg);
      onError && onError(errMsg);
      return;
    }
    
    // Check file size
    if (maxFileSizeMB > 0 && selectedFile.size > maxFileSizeMB * 1024 * 1024) {
      const errMsg = `File too large. Maximum size: ${maxFileSizeMB}MB`;
      setError(errMsg);
      onError && onError(errMsg);
      return;
    }
    
    // Set the validated file
    setFile(selectedFile);
  };
  
  // Handle upload button click
  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      // Call the onUpload callback with the file and description
      await onUpload(file, fileDescription, (progress) => {
        setUploadProgress(progress);
      }, () => {
        // Success callback
        resetState();
      }, (error) => {
        // Error callback
        setUploading(false);
        setError(error.message || 'Upload failed');
        onError && onError(error);
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploading(false);
      setError(error.message || 'Upload failed');
      onError && onError(error);
    }
  };
  
  // Handle clicking "Choose File" button
  const handleChooseFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <Box>
      {/* Drop Zone */}
      <Paper
        variant="outlined"
        sx={{
          backgroundColor: isDragging ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
          border: isDragging ? '2px dashed #1976d2' : '2px dashed #cccccc',
          borderRadius: '8px',
          padding: '24px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.2s ease'
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={disabled ? undefined : handleChooseFileClick}
      >
        <input
          type="file"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept={allowedFileTypes.join(',')}
          ref={fileInputRef}
          disabled={disabled}
        />
        
        <CloudUploadIcon style={{ fontSize: 48, color: '#1976d2', marginBottom: '16px' }} />
        
        {!file ? (
          <>
            <Typography variant="h6" gutterBottom>
              Drag & Drop File Here
            </Typography>
            <Typography variant="body2" color="textSecondary">
              or {disabled ? '(Disabled)' : 'click to browse files'}
            </Typography>
            <Typography variant="caption" display="block" style={{ marginTop: '8px' }}>
              Allowed file types: {allowedFileTypes.join(', ')}
            </Typography>
            {maxFileSizeMB > 0 && (
              <Typography variant="caption" display="block">
                Maximum file size: {maxFileSizeMB}MB
              </Typography>
            )}
          </>
        ) : (
          <>
            <Typography variant="h6" gutterBottom>
              {file.name}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {(file.size / (1024 * 1024)).toFixed(2)}MB
            </Typography>
          </>
        )}
      </Paper>
      
      {/* File Description */}
      {file && (
        <TextField
          fullWidth
          label="File Description (Optional)"
          variant="outlined"
          value={fileDescription}
          onChange={(e) => setFileDescription(e.target.value)}
          margin="normal"
          disabled={uploading || disabled}
        />
      )}
      
      {/* Error Message */}
      {error && (
        <Alert severity="error" style={{ marginTop: '16px' }}>
          {error}
        </Alert>
      )}
      
      {/* Action Buttons */}
      {file && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '16px' 
        }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={resetState}
            disabled={uploading || disabled}
          >
            Clear
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={uploading || disabled}
            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
          >
            {uploading ? `Uploading (${uploadProgress}%)` : 'Upload'}
          </Button>
        </Box>
      )}
      
      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ width: '100%', marginTop: '16px' }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}
    </Box>
  );
};

export default FileUploader; 