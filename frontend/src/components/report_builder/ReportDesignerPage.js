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
  Snackbar,
  Menu,
  MenuItem
} from '@material-ui/core';
import SaveIcon from '@material-ui/icons/Save';
import PublishIcon from '@material-ui/icons/Publish';
import CloseIcon from '@material-ui/icons/Close';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
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
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);

  useEffect(() => {
    if (reportId && token) {
      setIsLoading(true);
      setError(null);
      
      // Check if we're editing a template
      const urlParams = new URLSearchParams(window.location.search);
      const isTemplate = urlParams.get('isTemplate') === 'true';
      
      console.log('Template mode:', isTemplate); // Debug logging
      
      // Determine the API endpoint based on whether we're editing a template or report
      const endpoint = isTemplate 
        ? getGatewayUrl(`/api/report_builder/templates/${reportId}`)
        : getGatewayUrl(`/api/report_builder/reports/${reportId}`);
      
      // Fetch the report or template from the API
      axios.get(endpoint, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      .then(response => {
        const data = response.data;
        
        // Transform the API response to the format expected by ReportConfigPanel
        if (data) {
          // Extract elements from the report/template content
          const elements = data.content?.elements || [];
          
          // Transform elements to add required properties and IDs
          const transformedElements = elements.map((element, index) => {
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
            id: data.id,
            title: isTemplate ? data.name : data.name,
            description: data.description,
            elements: transformedElements,
            vectorStoreId: data.vectorStoreId || '',
            status: data.status || 'draft',
            isTemplate: isTemplate
          });
        } else {
          setCurrentDefinition(prevDef => ({
            ...getDefaultReport(),
            id: reportId,
            isTemplate: isTemplate
          }));
        }
      })
      .catch(err => {
        console.error(`Error fetching ${isTemplate ? 'template' : 'report'}:`, err);
        setError(err.response?.data?.detail || `Failed to load ${isTemplate ? 'template' : 'report'}`);
        
        // Create a new template/report if API call fails
        if (isTemplate) {
          // For new templates, initialize with empty content
          setCurrentDefinition({
            id: reportId,
            title: 'New Template',
            description: '',
            elements: [],
            isTemplate: true
          });
        } else {
          // Fallback to default report if API call fails
          setCurrentDefinition(prevDef => ({
            ...getDefaultReport(),
            id: reportId,
            isTemplate: isTemplate
          }));
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
    }
  }, [reportId, token]);

  const handleDefinitionChange = (newDefinition) => {
    // Ensure the isTemplate flag is preserved
    const urlParams = new URLSearchParams(window.location.search);
    const isTemplate = urlParams.get('isTemplate') === 'true';
    
    setCurrentDefinition({
      ...newDefinition,
      isTemplate: isTemplate || newDefinition.isTemplate
    });
  };

  const handleSave = async () => {
    if (!currentDefinition || !token) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Check if we're editing a template
      const isTemplate = currentDefinition.isTemplate || false;
      
      // Transform the definition back to the format expected by the API
      const apiData = {
        id: currentDefinition.id,
        name: currentDefinition.title,
        description: currentDefinition.description,
        // Include template-specific fields
        ...(isTemplate && { category: currentDefinition.category || 'Custom' }),
        // Include report-specific fields
        ...(!isTemplate && {
          vectorStoreId: currentDefinition.vectorStoreId || null,
          status: currentDefinition.status || 'draft',
          type: 'Custom'
        }),
        // Transform elements to API format
        content: {
          elements: currentDefinition.elements
        }
      };

      // Determine endpoint based on whether we're saving a template or report
      const endpoint = isTemplate
        ? getGatewayUrl(`/api/report_builder/templates/${reportId}`)
        : getGatewayUrl(`/api/report_builder/reports/${reportId}`);
      
      // Save using the API
      const response = await axios.put(
        endpoint, 
        apiData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`${isTemplate ? 'Template' : 'Report'} saved successfully:`, response.data);
      
      setSnackbar({
        open: true,
        message: `${isTemplate ? 'Template' : 'Report'} saved successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error(`Failed to save ${currentDefinition.isTemplate ? 'template' : 'report'}:`, error);
      setError(error.response?.data?.detail || `Failed to save ${currentDefinition.isTemplate ? 'template' : 'report'}`);
      
      setSnackbar({
        open: true,
        message: `Failed to save: ${error.response?.data?.detail || error.message}`,
        severity: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Redirect to reports by default or handle according to what's being edited
    if (currentDefinition.isTemplate) {
      window.close(); // Close the window since it was opened in a new window
    } else {
      history.push('/reports');
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleExportClick = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleSaveAsTemplate = async () => {
    // Prompt for template information
    const templateName = window.prompt("Enter template name:", currentDefinition.title || "New Template");
    if (!templateName) {
      handleExportMenuClose();
      return; // User cancelled
    }

    const templateDescription = window.prompt("Enter template description (optional):", currentDefinition.description || "");
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Transform the current report definition to a template
      const templateData = {
        name: templateName,
        description: templateDescription || "",
        category: "Custom",
        content: {
          elements: currentDefinition.elements || []
        }
      };
      
      // Send to the backend
      const response = await axios.post(
        getGatewayUrl('/api/report_builder/templates'), 
        templateData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Template created successfully:', response.data);
      
      setSnackbar({
        open: true,
        message: 'Report saved as template successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error("Failed to save as template:", error);
      
      setSnackbar({
        open: true,
        message: `Failed to save as template: ${error.response?.data?.detail || error.message}`,
        severity: 'error'
      });
    } finally {
      setIsSaving(false);
      handleExportMenuClose();
    }
  };

  const getReportText = () => {
    if (!currentDefinition || !currentDefinition.elements) return '';
    
    return currentDefinition.elements.map(element => {
      if (element.type === 'explicit') {
        let content = element.content || '';
        if (element.format && element.format.startsWith('h')) {
          const level = parseInt(element.format.substring(1), 10) || 1;
          const prefix = '#'.repeat(level) + ' ';
          return prefix + content;
        } else if (element.format === 'bulletList') {
          return content.split('\n').map(line => `- ${line}`).join('\n');
        } else if (element.format === 'numberedList') {
          return content.split('\n').map((line, i) => `${i+1}. ${line}`).join('\n');
        }
        return content;
      }
      return '';
    }).filter(Boolean).join('\n\n');
  };

  const handleExportFormat = async (format) => {
    const reportText = getReportText();
    const reportTitle = currentDefinition.title || 'report';
    let fileContent, fileType, fileExtension;
    
    switch (format) {
      case 'txt':
        fileContent = reportText;
        fileType = 'text/plain';
        fileExtension = 'txt';
        break;
      case 'md':
        fileContent = reportText;
        fileType = 'text/markdown';
        fileExtension = 'md';
        break;
      case 'html':
        fileContent = `<!DOCTYPE html>
<html>
<head>
  <title>${reportTitle}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
    h1 { color: #333; }
    h2 { color: #444; }
    ul { margin-left: 20px; }
  </style>
</head>
<body>
  <h1>${reportTitle}</h1>
  ${reportText.split('\n').map(line => {
    if (line.startsWith('# ')) return `<h1>${line.substring(2)}</h1>`;
    if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`;
    if (line.startsWith('- ')) return `<li>${line.substring(2)}</li>`;
    if (line.trim() === '') return '<br/>';
    return `<p>${line}</p>`;
  }).join('\n')}
</body>
</html>`;
        fileType = 'text/html';
        fileExtension = 'html';
        break;
      case 'json':
        fileContent = JSON.stringify(currentDefinition, null, 2);
        fileType = 'application/json';
        fileExtension = 'json';
        break;
      default:
        fileContent = reportText;
        fileType = 'text/plain';
        fileExtension = 'txt';
    }
    
    // Create a blob for our content
    const blob = new Blob([fileContent], { type: fileType });
    
    // Suggested file name
    const suggestedName = `${reportTitle.replace(/\s+/g, '_')}.${fileExtension}`;
    
    try {
      // Check if the File System Access API is available
      if ('showSaveFilePicker' in window) {
        // Use the File System Access API
        const options = {
          suggestedName,
          types: [{
            description: `${format.toUpperCase()} File`,
            accept: {
              [fileType]: [`.${fileExtension}`]
            }
          }]
        };
        
        // Show the file picker
        const fileHandle = await window.showSaveFilePicker(options);
        
        // Get a writable stream
        const writable = await fileHandle.createWritable();
        
        // Write the blob to the file
        await writable.write(blob);
        
        // Close the stream
        await writable.close();
        
        setSnackbar({
          open: true,
          message: `Report exported as ${fileExtension.toUpperCase()} successfully`,
          severity: 'success'
        });
      } else {
        // Fallback to the old method for browsers that don't support the File System Access API
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = suggestedName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setSnackbar({
          open: true,
          message: `Report exported as ${fileExtension.toUpperCase()} (saved to downloads folder)`,
          severity: 'success'
        });
      }
    } catch (err) {
      console.error('Error exporting file:', err);
      setSnackbar({
        open: true,
        message: `Failed to export report: ${err.message}`,
        severity: 'error'
      });
    }
    
    handleExportMenuClose();
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
            {currentDefinition.isTemplate 
              ? `Template: ${currentDefinition.title || 'New Template'}`
              : `Report: ${currentDefinition.title || 'New Report'}`}
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
              {isSaving ? 'Saving...' : currentDefinition.isTemplate ? 'Save Template' : 'Save Report'}
            </Button>
            {!currentDefinition.isTemplate && (
              <Button
                startIcon={<PublishIcon />}
                endIcon={<ArrowDropDownIcon />}
                color="primary"
                variant="outlined"
                style={{ marginRight: 16 }}
                onClick={handleExportClick}
              >
                Export
              </Button>
            )}
            <Menu
              id="export-menu"
              anchorEl={exportMenuAnchor}
              keepMounted
              open={Boolean(exportMenuAnchor)}
              onClose={handleExportMenuClose}
            >
              <MenuItem onClick={() => handleExportFormat('txt')}>Text (.txt)</MenuItem>
              <MenuItem onClick={() => handleExportFormat('md')}>Markdown (.md)</MenuItem>
              <MenuItem onClick={() => handleExportFormat('html')}>HTML (.html)</MenuItem>
              <MenuItem onClick={() => handleExportFormat('json')}>JSON (.json)</MenuItem>
            </Menu>
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