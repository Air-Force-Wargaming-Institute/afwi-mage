import React, { useContext, useEffect } from 'react';
import { WorkbenchContext } from '../../contexts/WorkbenchContext';
import Sidebar from './Sidebar';
import { Box, Container, Typography, Paper, CircularProgress, Alert, AlertTitle, Button, Grid, Card, CardContent, CardActions, Divider } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TableChartIcon from '@mui/icons-material/TableChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import TransformIcon from '@mui/icons-material/Transform';
import '../../App.css'; // Import App.css for styling

// Import tool-specific components 
import SpreadsheetViewer from './spreadsheet/SpreadsheetViewer';
import SpreadsheetTools from './spreadsheet/SpreadsheetTools';
import ChartBuilder from './visualization/ChartBuilder';
import ChartGallery from './visualization/ChartGallery'; // Import ChartGallery

// Styled components for modern UI
const GradientBorderPaper = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(3),
  backgroundColor: 'transparent',
  color: theme.palette.text.primary,
  background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.8), rgba(52, 168, 83, 0.8), rgba(234, 67, 53, 0.8))',
  border: `1px solid transparent`,
  borderRadius: theme.shape.borderRadius,
  boxSizing: 'border-box',
  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
  transition: 'all 0.3s ease',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    background: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius - 1,
    zIndex: 0,
  },
  '& > *': {
    position: 'relative',
    zIndex: 1,
  },
  '&:hover': {
    boxShadow: '0 6px 15px rgba(0, 0, 0, 0.25)',
    transform: 'translateY(-2px)',
  }
}));

// GradientBorderCard for feature cards with hover effect
const FeatureCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(2),
  backgroundColor: 'transparent',
  color: theme.palette.text.primary,
  background: theme.custom?.gradients?.gradient1 || 'linear-gradient(to right,rgb(129, 177, 255),rgb(95, 127, 255),rgb(165, 165, 165))',
  border: `${theme.custom?.borderWidth?.hairline || 1}px solid transparent`,
  borderRadius: theme.shape.borderRadius,
  boxSizing: 'border-box',
  boxShadow: theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.3)',
  transition: theme.custom?.transition || 'all 0.3s ease',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: theme.custom?.borderWidth?.hairline || 1,
    left: theme.custom?.borderWidth?.hairline || 1,
    right: theme.custom?.borderWidth?.hairline || 1,
    bottom: theme.custom?.borderWidth?.hairline || 1,
    background: 'rgba(30, 30, 30, 0.9)',
    borderRadius: `calc(${theme.shape.borderRadius}px - 1px)`,
    zIndex: 0,
  },
  '& > *': {
    position: 'relative',
    zIndex: 1,
  },
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
    background: theme.custom?.gradients?.vibrant || 'linear-gradient(45deg, #4285f4,rgb(203, 208, 255),rgb(5, 140, 251))',
  }
}));

// Update the SelectToolButton for better visual contrast and styling
const SelectToolButton = styled(Button)(({ theme }) => ({
  width: '100%',
  background: theme.custom?.gradients?.horizontal || 'linear-gradient(to right, #4285f4, #34a853)',
  color: '#ffffff',
  fontWeight: 600,
  padding: theme.spacing(1),
  textTransform: 'none',
  borderRadius: theme.shape.borderRadius,
  transition: theme.custom?.transition || 'all 0.3s ease',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
  '&:hover': {
    background: theme.custom?.gradients?.vibrant || 'linear-gradient(45deg, #4285f4, #34a853)',
    boxShadow: '0 6px 10px rgba(0, 0, 0, 0.3)',
    transform: 'translateY(-2px)',
  }
}));

const ContentContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  width: '100%',
  backgroundColor: 'rgba(30, 30, 30, 0.9)',
  borderRadius: '10px',
  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
  padding: '24px',
  position: 'relative',
  color: theme.palette.text.primary,
  '&:before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: '10px',
    border: '1px solid rgba(66, 133, 244, 0.2)',
    pointerEvents: 'none',
  }
}));

// Update the FeatureIcon styling for better icon presentation
const FeatureIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: '16px',
  '& .MuiSvgIcon-root': {
    fontSize: '3rem',
    color: theme.palette.primary.main,
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
    transition: 'all 0.3s ease',
  },
  '&:hover .MuiSvgIcon-root': {
    transform: 'scale(1.1)',
    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
  }
}));

// Update FeatureTitle for better contrast
const FeatureTitle = styled(Typography)(({ theme }) => ({
  marginBottom: '5px',
  color: theme.palette.primary.main,
  fontWeight: 600,
  textAlign: 'center',
  fontSize: '1.2rem',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
}));

// Update FeatureDescription for better text visibility
const FeatureDescription = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  textAlign: 'left',
  fontSize: '0.95rem',
  lineHeight: 1.6,
  marginBottom: '5px',
  fontWeight: 400,
  opacity: 0.9,
}));

const GradientHeader = styled(Paper)(({ theme }) => ({
  backgroundColor: 'rgba(30, 30, 30, 0.9)',
  padding: '35px 24px 24px 24px',
  marginBottom: '5px',
  borderRadius: '10px',
  textAlign: 'center',
  position: 'relative',
  overflow: 'hidden',
  color: theme.palette.text.primary,
  border: '1px solid rgba(66, 133, 244, 0.3)',
  minHeight: '175px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  '&:before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: theme.custom?.gradients?.horizontal || 'linear-gradient(to right, #4285f4, #5794ff, #2c5cc5)',
  }
}));

const WorkbenchDashboard = () => {
  const theme = useTheme();
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
      icon: <TableChartIcon />, 
      description: 'Import and manage your Excel, CSV, and other spreadsheet files. Organize and prepare your data for analysis with easy file handling and categorization.',
      features: ['Drag-and-drop file uploads', 'Automatic column detection', 'Data preview capabilities', 'File organization tools']
    },
    { 
      id: 'column-transform', 
      name: 'Column Transformation', 
      icon: <TransformIcon />, 
      description: 'Transform, clean, and preprocess your data columns using AI-powered instructions. Easily handle missing values, outliers, and data type conversions.',
      features: ['Natural language data transformations', 'Bulk operations on columns', 'Formula creation assistant', 'Data validation tools']
    },
    { 
      id: 'visualization', 
      name: 'Data Visualization', 
      icon: <BarChartIcon />, 
      description: 'Create rich, interactive charts and visualizations from your data. Use AI assistance to select the best visualization types for your specific data and analysis goals.',
      features: ['Multiple chart types (bar, line, scatter, pie)', 'Customizable visual elements', 'Export options', 'AI-recommended visualizations']
    }
  ];

  // Render the welcome dashboard with tool information
  const renderWelcomeDashboard = () => {
    return (
      <>
        {/* Combined title and information container */}
        <GradientHeader elevation={1}>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Analysis Workbench
          </Typography>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              backgroundColor: 'rgba(40, 40, 40, 0.7)', 
              padding: '12px',
              borderRadius: '8px',
              maxWidth: '900px',
              margin: '0 auto 20px auto',
              color: theme.palette.text.primary,
              fontWeight: 500,
            }}
          >
            Powerful tools to help you transform, analyze, and visualize your data with AI assistance
          </Typography>
        </GradientHeader>
        
        <Divider sx={{ my: 1, opacity: 0.6 }} />
        
        <Grid 
          container 
          spacing={3} 
          sx={{ 
            marginTop: '5px',
            display: 'flex',
            justifyContent: 'center',
            maxWidth: '1200px',
            mx: 'auto'
          }}
        >
          {tools.map((tool) => (
            <Grid item xs={12} sm={6} md={4} key={tool.id} sx={{ display: 'flex', height: '100%' }}>
              <FeatureCard>
                <CardContent sx={{ flexGrow: 1, position: 'relative', zIndex: 1, height: '100%' }}>
                  <FeatureIcon>
                    {tool.icon}
                  </FeatureIcon>
                  <FeatureTitle variant="h6">
                    {tool.name}
                  </FeatureTitle>
                  <FeatureDescription variant="body2">
                    {tool.description}
                  </FeatureDescription>
                  
                  <Box sx={{ marginTop: '16px' }}>
                    <Typography variant="subtitle2" sx={{ 
                      fontWeight: 'bold', 
                      marginBottom: '8px', 
                      textAlign: 'left',
                      color: theme.palette.primary.light
                    }}>
                      Key Features:
                    </Typography>
                    <ul style={{ paddingLeft: '20px', marginTop: '8px', textAlign: 'left' }}>
                      {tool.features.map((feature, index) => (
                        <li key={index} style={{ marginBottom: '4px' }}>
                          <Typography variant="body2" sx={{ 
                            textAlign: 'left',
                            color: theme.palette.text.primary
                          }}>{feature}</Typography>
                        </li>
                      ))}
                    </ul>
                  </Box>
                </CardContent>
                <CardActions sx={{ position: 'relative', zIndex: 1, padding: '16px' }}>
                  <SelectToolButton
                    variant="contained"
                    onClick={() => setSelectedTool(tool.id)}
                  >
                    SELECT TOOL
                  </SelectToolButton>
                </CardActions>
              </FeatureCard>
            </Grid>
          ))}
        </Grid>
        
        {connectionError && (
          <Alert 
            severity="warning" 
            variant="outlined"
            icon={<ErrorOutlineIcon />}
            sx={{ 
              marginTop: '24px', 
              marginLeft: 'auto', 
              marginRight: 'auto', 
              maxWidth: '600px',
              border: '1px solid rgba(237, 108, 2, 0.5)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            <AlertTitle>Backend Connection Error</AlertTitle>
            <Typography variant="body2">
              Unable to connect to backend services. Please ensure the backend is running.
            </Typography>
          </Alert>
        )}
      </>
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
        // Render both ChartBuilder and ChartGallery
        return (
          <>
            <ChartBuilder />
            <Box sx={{ mt: 4 }}> {/* Add margin between builder and gallery */}
              <ChartGallery />
            </Box>
          </>
        );
      default:
        return renderWelcomeDashboard();
    }
  };

  return (
    <div style={{ 
      height: '100%',
      width: '100%', 
      display: 'flex',
      overflow: 'hidden',
      alignItems: 'flex-start'
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
        padding: '0 16px 16px 16px'
      }}>
        {/* Regular error notification */}
        {error && (
          <Alert 
            severity="error" 
            style={{ marginBottom: '16px' }}
            onClose={clearError}
            sx={{
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(211, 47, 47, 0.3)',
              borderRadius: '8px',
            }}
          >
            {error}
          </Alert>
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <Box sx={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            backgroundColor: 'rgba(30, 30, 30, 0.9)',
            padding: '20px 40px',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}>
            <CircularProgress sx={{ color: '#4285f4' }} />
            <Typography variant="body2" color="text.primary" sx={{ mt: 1 }}>
              Loading data...
            </Typography>
          </Box>
        )}
        
        {/* Content - directly rendered without container */}
        {renderToolComponent()}
      </div>
    </div>
  );
};

export default WorkbenchDashboard; 