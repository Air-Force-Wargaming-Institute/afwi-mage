import React, { useContext, useEffect } from 'react';
import { WorkbenchContext } from '../../contexts/WorkbenchContext';
import Sidebar from './Sidebar';
import { Box, Container, Typography, Paper, CircularProgress, Alert, AlertTitle, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CodeIcon from '@mui/icons-material/Code';
import '../../App.css'; // Import App.css for styling

// Import tool-specific components 
import SpreadsheetViewer from './spreadsheet/SpreadsheetViewer';
import SpreadsheetTools from './spreadsheet/SpreadsheetTools';
import ChartBuilder from './visualization/ChartBuilder';

const ConnectionErrorBanner = ({ connectionError, developmentMode, toggleDevelopmentMode }) => {
  if (!connectionError) return null;
  
  return (
    <Alert 
      severity="info" 
      variant="filled"
      icon={<CodeIcon />}
      style={{ 
        marginBottom: '16px',
        backgroundColor: '#2196f3', // Blue color for info
      }}
      action={
        <Button 
          color="inherit" 
          size="small" 
          variant="outlined" 
          onClick={toggleDevelopmentMode}
          style={{ borderColor: 'white', color: 'white' }}
        >
          {developmentMode ? 'Disable' : 'Enable'} Dev Mode
        </Button>
      }
    >
      <AlertTitle style={{ fontWeight: 'bold', color: 'white' }}>
        Development Mode {developmentMode ? 'Active' : 'Available'}
      </AlertTitle>
      <Typography variant="body2" style={{ color: 'white' }}>
        {developmentMode 
          ? 'Using mock data for development. UI elements are functional with placeholder data.' 
          : 'Backend connection failed. Enable development mode to use mock data for UI development.'}
      </Typography>
    </Alert>
  );
};

const WorkbenchDashboard = () => {
  const { 
    selectedTool, 
    isLoading, 
    error, 
    clearError,
    connectionError,
    developmentMode,
    toggleDevelopmentMode,
    activeView
  } = useContext(WorkbenchContext);

  // Clear errors when unmounting
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  // Render the appropriate tool component based on selected tool
  const renderToolComponent = () => {
    switch (selectedTool) {
      case 'spreadsheet':
        return <SpreadsheetViewer />;
      case 'column-transform':
        return <SpreadsheetTools />;
      case 'visualization':
        return <ChartBuilder />;
      default:
        return (
          <Box className="info-box" style={{ textAlign: 'center', marginTop: '32px' }}>
            <Typography variant="h5" gutterBottom className="section-title">
              Select a tool from the sidebar to begin
            </Typography>
            <Typography variant="body1" className="text-secondary">
              The Analysis Workbench helps you work with data, create visualizations, and process document-based content using AI assistance.
            </Typography>
            {connectionError && !developmentMode && (
              <Alert 
                severity="warning" 
                variant="outlined"
                icon={<ErrorOutlineIcon />}
                className="info-box"
                style={{ marginTop: '24px', marginLeft: 'auto', marginRight: 'auto', maxWidth: '600px' }}
              >
                <AlertTitle>Backend Connection Error</AlertTitle>
                <Typography variant="body2">
                  Unable to connect to backend services. The workbench features require the backend to be running.
                </Typography>
                <Typography variant="body2" style={{ marginTop: '8px' }}>
                  Enable Development Mode to continue frontend development with mock data.
                </Typography>
              </Alert>
            )}
          </Box>
        );
    }
  };

  return (
    <div className="root-container" style={{ height: 'calc(100vh - 200px)' }}>
      {/* Left sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <Paper className="main-content" style={{ flexGrow: 1, overflowY: 'auto' }}>
        {/* Connection error banner - Always show when connection error exists */}
        <ConnectionErrorBanner 
          connectionError={connectionError} 
          developmentMode={developmentMode}
          toggleDevelopmentMode={toggleDevelopmentMode}
        />
        
        {/* Regular error notification - only show non-connection errors */}
        {error && !connectionError && (
          <Alert 
            severity="error" 
            style={{ marginBottom: '16px' }}
            onClose={clearError}
          >
            {error}
          </Alert>
        )}
        
        {/* Loading indicator - show as an overlay instead of blocking content */}
        {isLoading && !developmentMode && (
          <Box style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            padding: '20px',
            borderRadius: '8px'
          }}>
            <CircularProgress />
          </Box>
        )}
        
        {/* Content - always visible */}
        {renderToolComponent()}
      </Paper>
    </div>
  );
};

export default WorkbenchDashboard; 