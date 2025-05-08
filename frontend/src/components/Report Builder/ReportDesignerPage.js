import React, { useState, useEffect, useContext } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  Container, 
  Box, 
  makeStyles, 
  Button, 
  Typography, 
  AppBar, 
  Toolbar, 
  IconButton,
  CircularProgress,
  Snackbar
} from '@material-ui/core';
import SaveIcon from '@material-ui/icons/Save';
import PublishIcon from '@material-ui/icons/Publish';
import CloseIcon from '@material-ui/icons/Close';
import ReportConfigPanel from './ReportConfigPanel';
import ReportPreviewPanel from './ReportPreviewPanel';
import axios from 'axios';
import { getGatewayUrl } from '../../config';
import { AuthContext } from '../../contexts/AuthContext';

// Helper functions
const getDefaultReport = () => ({
  id: null,
  title: 'New Report',
  description: '',
  vectorStoreId: '',
  elements: []
});

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    position: 'fixed',
    top: 0,
    left: 0,
    backgroundColor: theme.palette.background.default,
    zIndex: 1500,
    padding: 0,
    margin: 0,
    overflow: 'hidden',
    '& ::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '& ::-webkit-scrollbar-track': {
      background: theme.palette.background.paper,
      borderRadius: '4px',
    },
    '& ::-webkit-scrollbar-thumb': {
      background: theme.palette.divider,
      borderRadius: '4px',
      '&:hover': {
        background: theme.palette.action.hover,
      },
    },
  },
  appBar: {
    position: 'relative',
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(0, 2),
  },
  contentArea: {
    display: 'flex',
    flexGrow: 1,
    overflow: 'hidden',
  },
  leftPanel: {
    width: '20%',
    minWidth: '400px',
    borderRight: `1px solid ${theme.palette.divider}`,
    overflowY: 'auto',
    padding: theme.spacing(2),
    height: 'calc(100vh - 64px)',
    '& ::-webkit-scrollbar': {
      width: '8px',
    },
    '& ::-webkit-scrollbar-track': {
      background: theme.palette.background.paper,
      borderRadius: '4px',
    },
    '& ::-webkit-scrollbar-thumb': {
      background: theme.palette.divider,
      borderRadius: '4px',
      '&:hover': {
        background: theme.palette.action.hover,
      },
    },
  },
  rightPanel: {
    width: '80%',
    overflowY: 'auto',
    padding: theme.spacing(2),
    height: 'calc(100vh - 64px)',
    '& ::-webkit-scrollbar': {
      width: '8px',
    },
    '& ::-webkit-scrollbar-track': {
      background: theme.palette.background.paper,
      borderRadius: '4px',
    },
    '& ::-webkit-scrollbar-thumb': {
      background: theme.palette.divider,
      borderRadius: '4px',
      '&:hover': {
        background: theme.palette.action.hover,
      },
    },
  },
}));

function ReportDesignerPage() {
  const classes = useStyles();
  const history = useHistory();
  const { reportId } = useParams();
  const { token } = useContext(AuthContext);
  const [currentDefinition, setCurrentDefinition] = useState(getDefaultReport());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (reportId && token) {
      setIsLoading(true);
      setError(null);
      
      // Fetch the actual report from the API
      axios.get(getGatewayUrl(`/api/report_builder/reports/${reportId}`), {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      .then(response => {
        const report = response.data;
        
        // Transform the API response to the format expected by ReportConfigPanel
        if (report) {
          // Extract elements from the report content
          const reportElements = report.content?.elements || [];
          
          // Transform elements to add required properties and IDs
          const transformedElements = reportElements.map((element, index) => {
            const baseElementWithId = {
              ...element,
              id: element.id || `element-${reportId}-${index}-${Date.now()}`,
              // Ensure format is set
              format: element.format || 'paragraph'
            };
            
            // Handle nested elements like sections if they exist
            if (element.type === 'section' && element.elements) { 
              const subElementsWithIds = element.elements.map((subElement, subIndex) => ({
                ...subElement,
                id: subElement.id || `subElement-${reportId}-${index}-${subIndex}-${Date.now()}`,
                format: subElement.format || 'paragraph'
              }));
              return { ...baseElementWithId, elements: subElementsWithIds };
            }
            
            return baseElementWithId;
          });

          // Set the definition with proper mapping of API data
          setCurrentDefinition({
            id: report.id,
            title: report.name,
            description: report.description,
            elements: transformedElements,
            vectorStoreId: report.vectorStoreId || '',
            status: report.status || 'draft'
          });
        } else {
          setCurrentDefinition(prevDef => ({
            ...getDefaultReport(),
            id: reportId
          }));
        }
      })
      .catch(err => {
        console.error("Error fetching report:", err);
        setError(err.response?.data?.detail || 'Failed to load report');
        
        // Fallback to default report if API call fails
        setCurrentDefinition(prevDef => ({
          ...getDefaultReport(),
          id: reportId
        }));
      })
      .finally(() => {
        setIsLoading(false);
      });
    }
  }, [reportId, token]);

  const handleDefinitionChange = (newDefinition) => {
    setCurrentDefinition(newDefinition);
  };

  const handleSave = async () => {
    if (!currentDefinition || !token) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Transform the definition back to the format expected by the API
      const reportData = {
        id: currentDefinition.id,
        name: currentDefinition.title,
        description: currentDefinition.description,
        vectorStoreId: currentDefinition.vectorStoreId || null,
        status: currentDefinition.status || 'draft',
        type: 'Custom',
        // Transform elements to API format
        content: {
          elements: currentDefinition.elements
        }
      };

      // Save the report using the API
      const response = await axios.put(
        getGatewayUrl(`/api/report_builder/reports/${reportId}`), 
        reportData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Report saved successfully:', response.data);
      
      setSnackbar({
        open: true,
        message: 'Report saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error("Failed to save report:", error);
      setError(error.response?.data?.detail || 'Failed to save report');
      
      setSnackbar({
        open: true,
        message: `Failed to save report: ${error.response?.data?.detail || error.message}`,
        severity: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    history.push('/reports');
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className={classes.root}>
      <AppBar className={classes.appBar}>
        <Toolbar className={classes.toolbar}>
          <Typography variant="h6">
            {currentDefinition.title || 'New Report'}
          </Typography>
          <Box>
            <Button
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={isSaving}
              color="primary"
              variant="contained"
              style={{ marginRight: 16 }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              startIcon={<PublishIcon />}
              color="primary"
              variant="outlined"
              style={{ marginRight: 16 }}
            >
              Export
            </Button>
            <IconButton edge="end" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Box className={classes.contentArea}>
        <Box className={classes.leftPanel}>
          <ReportConfigPanel
            definition={currentDefinition}
            onChange={handleDefinitionChange}
            currentReportId={reportId}
          />
        </Box>
        <Box className={classes.rightPanel}>
          <ReportPreviewPanel
            definition={currentDefinition}
            onContentChange={handleDefinitionChange}
          />
        </Box>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbar.message}
      />
    </Box>
  );
}

export default ReportDesignerPage; 