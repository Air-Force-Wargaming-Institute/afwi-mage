// DocumentViewerPopup.js is a component that allows the user to view a document in a popup window from the Direct Chat page's list of documents from the selected vectorstore.
import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { CircularProgress, Typography, Paper, Container } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import FilePreview from '../FilePreview'; // Adjust path as needed
import { AuthContext } from '../../contexts/AuthContext'; // Adjust path as needed

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.default,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
    padding: theme.spacing(3),
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.contrastText,
    borderRadius: theme.shape.borderRadius,
  },
  previewWrapper: {
    flexGrow: 1,
    overflow: 'hidden', // Ensure FilePreview handles its own scrolling
  }
}));

const DocumentViewerPopup = () => {
  const classes = useStyles();
  const location = useLocation();
  const [fileDetails, setFileDetails] = useState(null);
  const [authContextValue, setAuthContextValue] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const filePath = queryParams.get('filePath');
    const fileName = queryParams.get('fileName');
    let fileType = queryParams.get('fileType');
    const authToken = queryParams.get('token');

    if (!filePath || !fileName || !authToken) {
      setError("Missing required file information (path, name, or token) in URL.");
      return;
    }

    if (!fileType) {
      const extension = filePath.split('.').pop()?.toUpperCase();
      if (extension === 'PDF') fileType = 'PDF';
      else if (extension === 'DOCX') fileType = 'DOCX';
      else if (extension === 'TXT') fileType = 'TXT';
      else {
        // Try to be more robust for common docx path from vectorstore metadata
        if (filePath.toLowerCase().includes('.pdf.md')) { // common pattern from conversion
            setError(`Cannot preview Markdown-converted files directly. Original PDF path: ${filePath.replace('.md', '')}`);
            // Potentially try to load the original PDF if possible, or guide user
            return;
        }
        setError(`Unsupported or undetermined file type for: ${fileName}`);
        return;
      }
    }
    
    // The FilePreview component expects 'path', 'name', and 'type'.
    // 'path' should be the key used by the /api/upload/files/{file_path_or_id} endpoint
    // which might be different from the original staging path in vector store metadata.
    // For this popup, we assume filePath is the correct identifier for preview.
    setFileDetails({
      path: filePath, // This should be the identifier the backend FilePreview API expects
      name: fileName,
      type: fileType.toUpperCase(), // Ensure type is uppercase as FilePreview might expect
      // Add any other properties FilePreview might need, e.g., id if different from path
    });

    setAuthContextValue({
      user: null, // User object might not be fully needed here, token is key
      token: authToken,
      // Mock other context functions if FilePreview or its children expect them
      // For now, assuming FilePreview primarily needs the token for its API calls
      login: () => {},
      logout: () => {},
      loading: false,
      isAuthenticated: !!authToken,
    });

  }, [location.search]);

  const handleFileUpdate = (updatedFilePath) => {
    // This function is a prop for FilePreview, e.g., after page deletion.
    // We might need to refresh or show a message.
    console.log('File updated in preview:', updatedFilePath);
    // For now, just log. Could potentially re-fetch or update state if needed.
    // To force a re-render of FilePreview, we could update its key or a timestamp prop
    // For simplicity, if numPages changes, FilePreview's internal useEffect should handle it.
  };

  if (error) {
    return (
      <Container className={classes.root}>
        <Paper className={classes.errorContainer} elevation={3}>
          <Typography variant="h5" gutterBottom>Error</Typography>
          <Typography>{error}</Typography>
        </Paper>
      </Container>
    );
  }

  if (!fileDetails || !authContextValue) {
    return (
      <Container className={classes.root}>
        <div className={classes.loadingContainer}>
          <CircularProgress />
          <Typography variant="h6" style={{ marginTop: '16px' }}>Loading document preview...</Typography>
        </div>
      </Container>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      <div className={classes.root}>
        <div className={classes.previewWrapper}>
          <FilePreview
            key={fileDetails.path} // Adding a key to help React remount if file path changes
            file={fileDetails}
            onFileUpdate={handleFileUpdate}
          />
        </div>
      </div>
    </AuthContext.Provider>
  );
};

export default DocumentViewerPopup;
