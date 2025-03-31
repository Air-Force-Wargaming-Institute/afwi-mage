import React, { useContext, useEffect } from 'react';
import { WorkbenchContext } from '../../contexts/WorkbenchContext';
import Sidebar from './Sidebar';
import { Box, Container, Typography, Paper, CircularProgress, Alert, AlertTitle, Button, Grid, Card, CardContent, CardActions, Divider } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TableChartIcon from '@mui/icons-material/TableChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import TransformIcon from '@mui/icons-material/Transform';
import '../../App.css'; // Import App.css for styling

// Import tool-specific components 
import SpreadsheetViewer from './spreadsheet/SpreadsheetViewer';
import SpreadsheetTools from './spreadsheet/SpreadsheetTools';
import ChartBuilder from './visualization/ChartBuilder';

const WorkbenchDashboard = () => {
  const { 
    selectedTool, 
    isLoading, 
    error, 
    clearError,
    connectionError,
    activeView,
    setSelectedTool
  } = useContext(WorkbenchContext);

  // Clear errors when unmounting
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  // Tool information
  const tools = [
    { 
      id: 'spreadsheet', 
      name: 'Upload/Manage Spreadsheets', 
      icon: <TableChartIcon style={{ fontSize: '2.5rem', color: 'var(--primary-color)' }} />, 
      description: 'Import and manage your Excel, CSV, and other spreadsheet files. Organize and prepare your data for analysis with easy file handling and categorization.',
      features: ['Drag-and-drop file uploads', 'Automatic column detection', 'Data preview capabilities', 'File organization tools']
    },
    { 
      id: 'column-transform', 
      name: 'Column Transformation', 
      icon: <TransformIcon style={{ fontSize: '2.5rem', color: 'var(--primary-color)' }} />, 
      description: 'Transform, clean, and preprocess your data columns using AI-powered instructions. Easily handle missing values, outliers, and data type conversions.',
      features: ['Natural language data transformations', 'Bulk operations on columns', 'Formula creation assistant', 'Data validation tools']
    },
    { 
      id: 'visualization', 
      name: 'Data Visualization', 
      icon: <BarChartIcon style={{ fontSize: '2.5rem', color: 'var(--primary-color)' }} />, 
      description: 'Create rich, interactive charts and visualizations from your data. Use AI assistance to select the best visualization types for your specific data and analysis goals.',
      features: ['Multiple chart types (bar, line, scatter, pie)', 'Customizable visual elements', 'Export options', 'AI-recommended visualizations']
    }
  ];

  // Render the welcome dashboard with tool information
  const renderWelcomeDashboard = () => {
    return (
      <Box className="section" sx={{ padding: '0' }}>
        {/* Combined title and information container */}
        <Paper 
          elevation={0} 
          sx={{ 
            backgroundColor: 'white', 
            padding: '24px',
            marginBottom: '24px',
            borderRadius: 'var(--border-radius)',
            textAlign: 'center'
          }}
        >
          <Typography variant="h4" className="section-title" gutterBottom>
            Analysis Workbench
          </Typography>
          <Typography 
            variant="subtitle1" 
            className="text-secondary" 
            paragraph
            sx={{ 
              backgroundColor: 'rgba(245, 245, 245, 0.7)', 
              padding: '12px',
              borderRadius: '4px',
              maxWidth: '900px',
              margin: '0 auto 20px auto'
            }}
          >
            Powerful tools to help you transform, analyze, and visualize your data with AI assistance
          </Typography>
        </Paper>
        
        <Divider className="divider" />
        
        <Grid 
          container 
          spacing={2} 
          sx={{ 
            marginTop: '16px', 
            display: 'flex',
            justifyContent: 'center',
            maxWidth: '1200px',
            mx: 'auto'
          }}
        >
          {tools.map((tool) => (
            <Grid item xs={12} sm={6} md={4} key={tool.id} sx={{ display: 'flex' }}>
              <Card 
                className="feature-card" 
                sx={{ 
                  flex: 1,
                  maxHeight: '500px',
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)'
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, padding: '20px' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    {tool.icon}
                  </Box>
                  <Typography variant="h6" sx={{ marginBottom: '16px', color: 'var(--primary-color)', fontWeight: 500, textAlign: 'center' }}>
                    {tool.name}
                  </Typography>
                  <Typography variant="body2" paragraph sx={{ color: 'var(--text-color-dark)', textAlign: 'left' }}>
                    {tool.description}
                  </Typography>
                  <Box sx={{ marginTop: '16px' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', marginBottom: '8px', textAlign: 'left' }}>
                      Key Features:
                    </Typography>
                    <ul style={{ paddingLeft: '20px', marginTop: '8px', textAlign: 'left' }}>
                      {tool.features.map((feature, index) => (
                        <li key={index} style={{ marginBottom: '4px' }}>
                          <Typography variant="body2" sx={{ textAlign: 'left' }}>{feature}</Typography>
                        </li>
                      ))}
                    </ul>
                  </Box>
                </CardContent>
                <CardActions sx={{ padding: '8px', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setSelectedTool(tool.id)}
                    sx={{ width: '100%' }}
                  >
                    SELECT TOOL
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
        
        {connectionError && (
          <Alert 
            severity="warning" 
            variant="outlined"
            icon={<ErrorOutlineIcon />}
            className="info-box"
            style={{ marginTop: '24px', marginLeft: 'auto', marginRight: 'auto', maxWidth: '600px' }}
          >
            <AlertTitle>Backend Connection Error</AlertTitle>
            <Typography variant="body2">
              Unable to connect to backend services. Please ensure the backend is running.
            </Typography>
          </Alert>
        )}
      </Box>
    );
  };

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
        return renderWelcomeDashboard();
    }
  };

  return (
    <div style={{ 
      height: '100%',
      width: '100%', 
      display: 'flex',
      overflow: 'hidden'
    }}>
      {/* Left sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <div style={{ 
        flexGrow: 1, 
        height: '100%',
        minHeight: 'calc(100vh - 200px)',
        display: 'flex', 
        flexDirection: 'column',
        overflowY: 'auto',
        padding: '16px'
      }}>
        {/* Regular error notification */}
        {error && (
          <Alert 
            severity="error" 
            style={{ marginBottom: '16px' }}
            onClose={clearError}
          >
            {error}
          </Alert>
        )}
        
        {/* Loading indicator */}
        {isLoading && (
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
        <div style={{ 
          flexGrow: 1,
          width: '100%',
          backgroundColor: 'var(--container-bg-color)',
          borderRadius: 'var(--border-radius)',
          boxShadow: 'var(--box-shadow)',
          padding: '24px'
        }}>
          {renderToolComponent()}
        </div>
      </div>
    </div>
  );
};

export default WorkbenchDashboard; 