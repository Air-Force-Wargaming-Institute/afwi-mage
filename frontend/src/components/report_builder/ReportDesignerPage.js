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
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import SaveIcon from '@material-ui/icons/Save';
import PublishIcon from '@material-ui/icons/Publish';
import CloseIcon from '@material-ui/icons/Close';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import AutorenewIcon from '@material-ui/icons/Autorenew';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [isNewTemplate, setIsNewTemplate] = useState(false);
  const [isNewReport, setIsNewReport] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState({ code: '', message: '' });

  useEffect(() => {
    if (token) {
      setIsLoading(true);
      setError(null);
      
      // Check URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const isTemplate = urlParams.get('isTemplate') === 'true';
      const fromTemplate = urlParams.get('fromTemplate') === 'true';
      
      console.log('Template mode:', isTemplate);
      console.log('From template mode:', fromTemplate);
      
      // If there's no reportId but isTemplate is true, we're creating a new template
      if (!reportId && isTemplate) {
        console.log('Creating new template - no reportId');
        setIsNewTemplate(true);
        setCurrentDefinition({
          id: null,
          title: 'New Template',
          description: '',
          elements: [],
          isTemplate: true
        });
        setHasUnsavedChanges(true);
        setIsLoading(false);
        return;
      }
      
      // If there's no reportId but not a template, we're creating a new report
      if (!reportId && !isTemplate) {
        console.log('Creating new report - no reportId');
        setIsNewReport(true);
        
        // Check if this is a template-based report
        if (fromTemplate) {
          console.log('Creating from template');
          try {
            // Get the template from session storage
            const templateData = JSON.parse(sessionStorage.getItem('selectedTemplate'));
            
            if (templateData) {
              // Extract elements from the template content
              const elements = templateData.content?.elements || [];
              
              // Transform elements to add required properties and IDs
              const transformedElements = elements.map((element, index) => {
                const baseElementWithId = {
                  ...element,
                  id: element.id || `element-new-${index}-${Date.now()}`,
                  // Ensure format is set
                  format: element.format || 'paragraph'
                };
                
                // Handle nested elements like sections if they exist
                if (element.type === 'section' && element.elements) { 
                  const subElementsWithIds = element.elements.map((subElement, subIndex) => ({
                    ...subElement,
                    id: subElement.id || `subElement-new-${index}-${subIndex}-${Date.now()}`,
                    format: subElement.format || 'paragraph'
                  }));
                  return { ...baseElementWithId, elements: subElementsWithIds };
                }
                
                return baseElementWithId;
              });
              
              // Create a new report definition based on the template
              setCurrentDefinition({
                id: null,
                title: `New from: ${templateData.name}`,
                description: templateData.description || '',
                elements: transformedElements,
                templateId: templateData.id,
                type: 'Template-based',
                isTemplate: false
              });
              
              console.log('Set template-based report definition');
            }
          } catch (e) {
            console.error("Error loading template from session storage:", e);
            // Fall back to empty report if template loading fails
            setCurrentDefinition({
              ...getDefaultReport(),
              title: 'New Custom Report'
            });
          }
        } else {
          // Just a standard custom report
          setCurrentDefinition({
            ...getDefaultReport(),
            title: 'New Custom Report'
          });
        }
        
        setHasUnsavedChanges(true);
        setIsLoading(false);
        return;
      }
      
      // If we have a reportId, fetch the existing report or template
      if (reportId) {
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
            
            // Reset unsaved changes flag after initial load
            setHasUnsavedChanges(false);
          } else {
            setCurrentDefinition(prevDef => ({
              ...getDefaultReport(),
              id: reportId,
              isTemplate: isTemplate
            }));
            
            // Reset unsaved changes flag for new report/template
            setHasUnsavedChanges(false);
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
      } else {
        setIsLoading(false);
      }
    }
  }, [reportId, token]);

  // Add beforeunload event listener to warn users about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        // Standard way to show a confirmation dialog when closing/refreshing the page
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.returnValue = message; // For older browsers
        return message; // For modern browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleDefinitionChange = (newDefinition) => {
    // Ensure the isTemplate flag is preserved
    const urlParams = new URLSearchParams(window.location.search);
    const isTemplate = urlParams.get('isTemplate') === 'true';
    
    setCurrentDefinition({
      ...newDefinition,
      isTemplate: isTemplate || newDefinition.isTemplate
    });
    
    // Set flag for unsaved changes
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!token) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Check if we're editing a template
      const isTemplate = currentDefinition.isTemplate || false;
      
      // Transform the definition back to the format expected by the API
      const apiData = {
        name: currentDefinition.title,
        description: currentDefinition.description,
        // Include template-specific fields
        ...(isTemplate && { category: currentDefinition.category || 'Custom' }),
        // Include report-specific fields
        ...(!isTemplate && {
          vectorStoreId: currentDefinition.vectorStoreId || null,
          status: currentDefinition.status || 'draft',
          type: currentDefinition.type || 'Custom',
          ...(currentDefinition.templateId && { templateId: currentDefinition.templateId })
        }),
        // Transform elements to API format
        content: {
          elements: currentDefinition.elements
        }
      };

      let response;
      
      // If it's a new template (no id), create it
      if (isNewTemplate && isTemplate) {
        // Create a new template
        response = await axios.post(
          getGatewayUrl('/api/report_builder/templates'),
          apiData,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        // Update the definition with the new ID
        setCurrentDefinition(prev => ({
          ...prev,
          id: response.data.id
        }));
        
        // No longer a new template
        setIsNewTemplate(false);
        
        // Update the URL to include the new ID
        window.history.replaceState(
          null, 
          '', 
          `/report-designer/${response.data.id}?isTemplate=true`
        );
        
        console.log('New template created:', response.data);
      } 
      // If it's a new report (no id), create it
      else if (isNewReport && !isTemplate) {
        // Create a new report
        response = await axios.post(
          getGatewayUrl('/api/report_builder/reports'),
          apiData,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        // Update the definition with the new ID
        setCurrentDefinition(prev => ({
          ...prev,
          id: response.data.id
        }));
        
        // No longer a new report
        setIsNewReport(false);
        
        // Update the URL to include the new ID
        const fromTemplateParam = currentDefinition.templateId ? `&templateKey=${currentDefinition.templateId}` : '';
        window.history.replaceState(
          null, 
          '', 
          `/report-designer/${response.data.id}${fromTemplateParam}`
        );
        
        console.log('New report created:', response.data);
      }
      else {
        // Determine endpoint based on whether we're saving a template or report
        const endpoint = isTemplate
          ? getGatewayUrl(`/api/report_builder/templates/${currentDefinition.id}`)
          : getGatewayUrl(`/api/report_builder/reports/${currentDefinition.id}`);
        
        // Update existing template/report
        response = await axios.put(
          endpoint, 
          apiData,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }
      
      console.log(`${isTemplate ? 'Template' : 'Report'} saved successfully:`, response.data);
      
      // Reset the unsaved changes flag after successful save
      setHasUnsavedChanges(false);
      
      // Notify the parent window (opener) that a save occurred
      if (window.opener && !window.opener.closed) {
        try {
          // Tell the parent window to refresh its data
          window.opener.postMessage({ 
            type: 'REPORT_BUILDER_SAVE', 
            itemType: isTemplate ? 'template' : 'report',
            itemId: response.data.id
          }, window.location.origin);
          console.log('Notified parent window of save');
        } catch (e) {
          console.error('Failed to notify parent window:', e);
        }
      }
      
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
    // Check if there are unsaved changes
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmLeave) {
        return; // Stay on the page if user cancels
      }
    }
    
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

  const handleExportFormat = async (format) => {
    try {
      // Special case for Word export - use backend endpoint
      if (format === 'docx') {
        setSnackbar({
          open: true,
          message: 'Preparing Word document, please wait...',
          severity: 'info'
        });
        
        // Call the backend Word export endpoint
        const response = await axios.get(
          getGatewayUrl(`/api/report_builder/reports/${currentDefinition.id}/export/word`),
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            },
            responseType: 'blob'  // Important: we want a binary response
          }
        );
        
        // Create a blob from the response
        const blob = new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });
        
        // Get filename suggestion
        const contentDisposition = response.headers['content-disposition'];
        const suggestedName = contentDisposition
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : `${currentDefinition.title.replace(/\s+/g, '_')}.docx`;
        
        // Check if the File System Access API is available
        if ('showSaveFilePicker' in window) {
          // Use the File System Access API
          const options = {
            suggestedName,
            types: [{
              description: 'Word Document',
              accept: {
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
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
            message: 'Report exported as DOCX successfully',
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
            message: 'Report exported as DOCX (saved to downloads folder)',
            severity: 'success'
          });
        }
        
        handleExportMenuClose();
        return;
      }
      
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

  // Add this new method to handle report generation
  const handleGenerateReport = async () => {
    // Check if report has been saved (has an ID)
    if (!currentDefinition.id) {
      setSnackbar({
        open: true,
        message: 'Please save the report before generating content',
        severity: 'warning'
      });
      return;
    }

    // Check if the report has at least one generative section
    const hasGenerativeSections = currentDefinition.elements.some(
      element => element.type === 'generative'
    );

    if (!hasGenerativeSections) {
      setSnackbar({
        open: true,
        message: 'This report has no generative sections to generate content for',
        severity: 'info'
      });
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Display initial generation notification
      setSnackbar({
        open: true,
        message: 'Generating report content...',
        severity: 'info'
      });

      // Call the backend API to generate all sections
      const response = await axios.post(
        getGatewayUrl(`/api/report_builder/reports/${currentDefinition.id}/generate`),
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Check if we got an error response from the API
      if (response.data && response.data.error === true) {
        const errorCode = response.data.detail?.code;
        const errorMessage = response.data.detail?.message || 'Unknown error occurred during generation';
        
        // Handle specific error codes with more helpful messages
        if (errorCode === 'MAGE_SERVICE_ERROR') {
          throw new Error('The AI generation service is not available. This is typically a temporary issue. Please try again in a few minutes.');
        } else if (errorCode === 'VECTOR_STORE_ERROR') {
          throw new Error('There was an issue accessing the knowledge base for context. Please check the vector store connection.');
        } else {
          throw new Error(errorMessage);
        }
      }

      // Fetch the updated report to get the generated content
      const updatedReport = await axios.get(
        getGatewayUrl(`/api/report_builder/reports/${currentDefinition.id}`),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Update the report definition with generated content
      setCurrentDefinition(prev => {
        const updated = {
          ...prev,
          ...updatedReport.data,
          elements: updatedReport.data.content.elements || []
        };
        
        // Log the updated definition to help with debugging
        console.log('Updated report with generated content:', updated);
        
        return updated;
      });

      setSnackbar({
        open: true,
        message: 'Report content generated successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error generating report:', err);
      
      // Parse the error from the response if available
      let errorMessage = err.message;
      let errorCode = '';
      
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.detail.message) {
          errorMessage = err.response.data.detail.message;
          errorCode = err.response.data.detail.code || '';
          
          // Add more context for specific error codes
          if (err.response.data.detail.code === 'MAGE_SERVICE_ERROR') {
            errorMessage = 'The AI generation service is not available. This is typically a temporary issue. Please try again in a few minutes.';
            
            // Show the error details dialog with troubleshooting info
            setErrorDetails({
              code: 'MAGE_SERVICE_ERROR',
              message: errorMessage
            });
            setErrorDialogOpen(true);
          }
        }
      }
      
      setError(errorMessage);
      setSnackbar({
        open: true,
        message: `Error generating content: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseErrorDialog = () => {
    setErrorDialogOpen(false);
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
            {hasUnsavedChanges && ' *'}
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

            {/* Add Generate Report button - only show for reports (not templates) */}
            {!currentDefinition.isTemplate && (
              <Button
                startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <AutorenewIcon />}
                onClick={handleGenerateReport}
                disabled={isGenerating || !currentDefinition.id}
                color="secondary"
                variant="contained"
                style={{ marginRight: 16 }}
              >
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
            )}

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
              <MenuItem onClick={() => handleExportFormat('docx')}>Word (.docx)</MenuItem>
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
            isGenerating={isGenerating}
          />
        </Box>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity || 'info'}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Error details dialog */}
      <Dialog
        open={errorDialogOpen}
        onClose={handleCloseErrorDialog}
        aria-labelledby="error-dialog-title"
        aria-describedby="error-dialog-description"
      >
        <DialogTitle id="error-dialog-title">AI Generation Service Unavailable</DialogTitle>
        <DialogContent>
          <DialogContentText id="error-dialog-description">
            <Typography paragraph>
              The AI generation service (MAGE) is currently unavailable. This could be due to:
            </Typography>
            <ul>
              <li>The service is still starting up</li>
              <li>The service is temporarily down for maintenance</li>
              <li>There might be a configuration issue with the service connection</li>
            </ul>
            <Typography paragraph>
              <strong>Troubleshooting steps:</strong>
            </Typography>
            <Typography component="div" paragraph>
              <ol>
                <li>Wait a few minutes and try again</li>
                <li>Check that all services are running properly</li>
                <li>Verify the MAGE service configuration in your environment</li>
                <li>Contact your administrator if this issue persists</li>
              </ol>
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Error code: {errorDetails.code}
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseErrorDialog} color="primary" autoFocus>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ReportDesignerPage;