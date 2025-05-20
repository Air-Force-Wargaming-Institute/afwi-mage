import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  Container, 
  Box, 
  makeStyles, 
  Button, 
  ButtonGroup,
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
  DialogActions,
  Tooltip // Added Tooltip import
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
import { v4 as uuidv4 } from 'uuid';

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
    minWidth: '400px',
    flexShrink: 0,
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
    flexGrow: 1,
    minWidth: 0,
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
  const [saveMenuAnchor, setSaveMenuAnchor] = useState(null);
  const [isNewTemplate, setIsNewTemplate] = useState(false);
  const [isNewReport, setIsNewReport] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState({ code: '', message: '' });
  const [generatingElements, setGeneratingElements] = useState({});
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [scrollToElementId, setScrollToElementId] = useState(null);
  const [highlightElementId, setHighlightElementId] = useState(null);
  const [pageTitlePrefix, setPageTitlePrefix] = useState('');

  const toolbarRef = useRef(null);
  const titleBoxRef = useRef(null);
  const buttonsBoxRef = useRef(null);

  const [titleBoxStyle, setTitleBoxStyle] = useState({
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    // maxWidth will be set by useEffect
  });

  useEffect(() => {
    if (token) {
      setIsLoading(true);
      setError(null);
      
      // Check URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const isTemplateParam = urlParams.get('isTemplate') === 'true';
      const fromTemplateParam = urlParams.get('fromTemplate') === 'true';
      
      // If there's no reportId but isTemplateParam is true, we're creating a new template
      if (!reportId && isTemplateParam) {
        setIsNewTemplate(true);
        setIsNewReport(false);
        setPageTitlePrefix('New Template: ');
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
      if (!reportId && !isTemplateParam) {
        setIsNewReport(true);
        setIsNewTemplate(false);
        
        // Check if this is a template-based report
        if (fromTemplateParam) {
          setPageTitlePrefix('Template Report: ');
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
                id: uuidv4(),
                title: templateData.name,
                description: templateData.description || '',
                elements: transformedElements,
                templateId: templateData.id,
                type: 'Template-based',
                isTemplate: false
              });
            } else {
              // Fallback to custom report if no template data in session
              setPageTitlePrefix('Custom Report: ');
              setCurrentDefinition({
                ...getDefaultReport(),
                title: 'New Custom Report',
                isTemplate: false,
              });
            }
          } catch (e) {
            console.error("Error loading template from session storage:", e);
            // Fall back to empty report if template loading fails
            setPageTitlePrefix('Custom Report: ');
            setCurrentDefinition({
              ...getDefaultReport(),
              title: 'New Custom Report',
              isTemplate: false,
            });
          }
        } else {
          // Just a standard custom report
          setPageTitlePrefix('Custom Report: ');
          setCurrentDefinition({
            ...getDefaultReport(),
            title: 'New Custom Report',
            isTemplate: false,
          });
        }
        
        setHasUnsavedChanges(true);
        setIsLoading(false);
        return;
      }
      
      // If we have a reportId, fetch the existing report or template
      if (reportId) {
        setIsNewReport(false); 
        setIsNewTemplate(false);

        // Determine the API endpoint based on whether we're editing a template or report
        // The 'isTemplateParam' from URL might be relevant here if opening a template directly by ID
        const effectiveIsTemplate = isTemplateParam || (currentDefinition && currentDefinition.isTemplate);

        const endpoint = effectiveIsTemplate 
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
          
          if (data) {
            if (data.isTemplate || effectiveIsTemplate) { // Check actual data or URL param
              setPageTitlePrefix('Template: ');
            } else {
              setPageTitlePrefix('Prior Report: ');
            }
            // Transform the API response to the format expected by ReportConfigPanel
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
              title: data.name, // Use data.name for both templates and reports as the editable title
              description: data.description,
              elements: transformedElements,
              vectorStoreId: data.vectorStoreId || '',
              status: data.status || 'draft',
              isTemplate: data.isTemplate || effectiveIsTemplate, // Prioritize actual data flag
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              type: data.type || ( (data.isTemplate || effectiveIsTemplate) ? undefined : 'Custom'),
              ...((data.isTemplate || effectiveIsTemplate) && { category: data.category || 'Custom' })
            });
            
            // Reset unsaved changes flag after initial load
            setHasUnsavedChanges(false);
          } else {
             // Fallback logic if data is unexpectedly null/undefined
            if (effectiveIsTemplate) {
              setPageTitlePrefix('Template: ');
              setCurrentDefinition({ ...getDefaultReport(), id: reportId, title: 'Template Error', isTemplate: true });
            } else {
              setPageTitlePrefix('Prior Report: ');
              setCurrentDefinition({ ...getDefaultReport(), id: reportId, title: 'Report Error', isTemplate: false });
            }
            setHasUnsavedChanges(false);
          }
        })
        .catch(err => {
          console.error(`Error fetching ${effectiveIsTemplate ? 'template' : 'report'}:`, err);
          setError(err.response?.data?.detail || `Failed to load ${effectiveIsTemplate ? 'template' : 'report'}`);
          
          // Fallback for error
          if (effectiveIsTemplate) {
            setPageTitlePrefix('Template: '); // Or "Error: Template"
            setCurrentDefinition({ id: reportId, title: 'Error Loading', description: '', elements: [], isTemplate: true });
          } else {
            setPageTitlePrefix('Prior Report: '); // Or "Error: Report"
            setCurrentDefinition({ ...getDefaultReport(), id: reportId, title: 'Error Loading', isTemplate: false });
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

  // Diagnostic useEffect to track title changes in currentDefinition
  useEffect(() => {
  }, [currentDefinition?.title]);

  useEffect(() => {
    const updateTitlePosition = () => {
      if (!titleBoxRef.current || !buttonsBoxRef.current || !toolbarRef.current) {
        return;
      }

      const titleEl = titleBoxRef.current;
      const buttonsEl = buttonsBoxRef.current;
      const toolbarEl = toolbarRef.current;

      const titleContentWidth = titleEl.scrollWidth;
      const buttonsLeftOffset = buttonsEl.offsetLeft;
      const toolbarWidth = toolbarEl.offsetWidth;
      
      const safetyMargin = 24;

      const titleRightEdgeIfFullCentered = (toolbarWidth / 2) + (titleContentWidth / 2);

      if (titleContentWidth === 0 && toolbarWidth === 0) {
        // Still waiting for initial layout, defer further action or use defaults
        // This helps prevent setting a tiny width if called too early before any dimensions
        return;
      }

      if (titleRightEdgeIfFullCentered + safetyMargin > buttonsLeftOffset && buttonsLeftOffset > 0) { // Added buttonsLeftOffset > 0 to ensure buttons are actually to the right
        const availableWidthForTitleBox = Math.max(0, buttonsLeftOffset - safetyMargin);
        
        setTitleBoxStyle({
          position: 'absolute',
          left: '0px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: `${availableWidthForTitleBox}px`,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        });
      } else {
        const maxHalfWidth = Math.max(0, (buttonsLeftOffset > 0 ? buttonsLeftOffset : toolbarWidth) - safetyMargin - (toolbarWidth / 2));
        const maxAllowedTitleWidth = Math.max(0, maxHalfWidth * 2, titleContentWidth > 0 ? 150 : 0); // Ensure a minimum sensible width if calculations are odd initially

        setTitleBoxStyle({
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          maxWidth: `${maxAllowedTitleWidth}px`,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        });
      }
    };

    // Initial calculation - deferred to next animation frame
    const animationFrameId = requestAnimationFrame(updateTitlePosition);

    // Recalculate on window resize
    window.addEventListener('resize', updateTitlePosition);
    
    let titleObserver;
    if (titleBoxRef.current) {
      titleObserver = new ResizeObserver(updateTitlePosition);
      titleObserver.observe(titleBoxRef.current);
    }

    return () => {
      cancelAnimationFrame(animationFrameId); // Cancel the frame if component unmounts before it runs
      window.removeEventListener('resize', updateTitlePosition);
      if (titleObserver) {
        titleObserver.disconnect();
      }
    };
  }, [currentDefinition.title, pageTitlePrefix]);

  const handleDefinitionChange = (newDefinitionOrAction) => {
    const urlParams = new URLSearchParams(window.location.search);
    const isTemplateFromUrl = urlParams.get('isTemplate') === 'true';

    if (newDefinitionOrAction && newDefinitionOrAction.type === 'UPDATE_REPORT_FIELD') {
      const { field, value } = newDefinitionOrAction;
      setCurrentDefinition(prevDef => {
        const updatedDef = {
          ...prevDef,
          [field]: value,
        };
        // Ensure isTemplate is correctly maintained based on URL and definition type
        updatedDef.isTemplate = isTemplateFromUrl || prevDef.isTemplate; 
        return updatedDef;
      });
    } else { // Assume it's the full newDefinition object (e.g., from element changes)
      const newDefinition = newDefinitionOrAction;
      setCurrentDefinition(prevDef => { 
        const updatedDef = {
          ...newDefinition, 
        };
        // Ensure isTemplate is correctly maintained using the incoming newDefinition's isTemplate flag
        updatedDef.isTemplate = isTemplateFromUrl || newDefinition.isTemplate;
        return updatedDef;
      });
    }
    
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
          id: response.data.id,
          title: response.data.name || response.data.title, // API uses 'name'
          description: response.data.description,
          elements: response.data.content?.elements || prev.elements,
          isTemplate: true, // This is a new template
          category: response.data.category || 'Custom',
          updatedAt: response.data.updatedAt,
          createdAt: response.data.createdAt
        }));
        
        // No longer a new template
        setIsNewTemplate(false);
        
        // Update the URL to include the new ID
        window.history.replaceState(
          null, 
          '', 
          `/report-designer/${response.data.id}?isTemplate=true`
        );
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
          id: response.data.id,
          title: response.data.name || response.data.title, // API uses 'name'
          description: response.data.description,
          elements: response.data.content?.elements || prev.elements,
          vectorStoreId: response.data.vectorStoreId,
          status: response.data.status || 'draft',
          type: response.data.type || 'Custom',
          templateId: response.data.templateId !== undefined ? response.data.templateId : prev.templateId, // if created from template
          isTemplate: false, // This is a new report
          updatedAt: response.data.updatedAt,
          createdAt: response.data.createdAt
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
      
      // Update the current definition with the response from the server
      setCurrentDefinition(prev => ({
        ...prev,
        id: response.data.id || prev.id,
        title: response.data.name || response.data.title, // API might use 'name' for title
        description: response.data.description,
        vectorStoreId: !isTemplate ? response.data.vectorStoreId : prev.vectorStoreId,
        elements: response.data.content?.elements || prev.elements,
        isTemplate: isTemplate, // Ensure this is correctly maintained
        type: !isTemplate ? (response.data.type || prev.type) : prev.type,
        status: !isTemplate ? (response.data.status || prev.status) : prev.status,
        templateId: !isTemplate ? (response.data.templateId !== undefined ? response.data.templateId : prev.templateId) : prev.templateId,
        category: isTemplate ? (response.data.category || prev.category) : prev.category,
        updatedAt: response.data.updatedAt || prev.updatedAt,
        // Preserve other fields that might not be in the response or are UI-specific
      }));
      
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
      
      let saveErrorMessage = 'An unknown error occurred during save.'; // Default user-facing message

      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          saveErrorMessage = error.response.data.detail;
        } else if (error.response.data.detail.message && typeof error.response.data.detail.message === 'string') {
          saveErrorMessage = error.response.data.detail.message;
        } else if (error.message) { 
            // If detail is an object but detail.message isn't a string, or detail.message is absent
            saveErrorMessage = error.message;
        }
        // If detail is an object, detail.message is not a string/absent, and error.message is also absent, it keeps the default.
      } else if (error.message) {
        saveErrorMessage = error.message;
      }

      setError(saveErrorMessage); // Set the general error state with the parsed message
      
      setSnackbar({
        open: true,
        message: `Failed to save: ${saveErrorMessage}`, // Use the parsed message for the snackbar
        severity: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Check if there are unsaved changes
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave this page? All unsaved data will be lost.');
      if (!confirmLeave) {
        return; // Stay on the page if user cancels
      }
    }
    
    // If checks pass or user confirms, close the window
    window.close();

    // Fallback navigation for cases where window.close() might not work (e.g., tab not opened by script)
    // This part might be optional or adjusted based on how ReportDesignerPage is opened.
    // If it's always opened by window.open(), window.close() should suffice.
    // history.push('/reports'); // Original fallback
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

  const handleSaveMenuClick = (event) => {
    setSaveMenuAnchor(event.currentTarget);
  };

  const handleSaveMenuClose = () => {
    setSaveMenuAnchor(null);
  };

  const handleExportFormat = async (format) => {
    try {
      // Special case for Word export - use backend endpoint
      if (format === 'docx') {
        // If there are unsaved changes, save the report first
        if (hasUnsavedChanges) {
          setSnackbar({
            open: true,
            message: 'Saving report before Word export...', 
            severity: 'info'
          });
          await handleSave(); // Wait for save to complete
          // Check if save was successful, if not, stop export
          if (error) { // Assuming handleSave sets an error state
             setSnackbar({
                open: true,
                message: 'Failed to save report. Word export aborted.',
                severity: 'error'
            });
            handleExportMenuClose();
            return;
          }
           setSnackbar({
            open: true,
            message: 'Report saved. Proceeding with Word export.',
            severity: 'success'
          });
        }

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
          ? contentDisposition.split('filename=')[1].replace(/"/g, '').replace(/\.docx$/, '-docx.docx')
          : `${currentDefinition.title.replace(/\s+/g, '_')}-docx.docx`;
        
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
      const suggestedName = `${reportTitle.replace(/\s+/g, '_')}-${fileExtension}.${fileExtension}`;
      
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

  const handleSaveTemplateAsNewReport = async () => {
    const reportName = window.prompt("Enter a name for the new report:", `Report from ${currentDefinition.title || 'template'}`);
    if (!reportName) {
      handleExportMenuClose();
      return; // User cancelled
    }

    setIsSaving(true);
    setError(null);

    try {
      const newReportData = {
        name: reportName,
        description: currentDefinition.description || '',
        content: {
          elements: currentDefinition.elements.map(el => ({ ...el, id: undefined })) // Ensure elements get new IDs if necessary by backend
        },
        isTemplate: false, // Explicitly set as not a template
        templateId: currentDefinition.id, // Link to the original template
        vectorStoreId: '', // Or some default, or prompt user if needed
        status: 'draft',
        type: 'Template-based' // Indicate it was derived from a template
      };

      const response = await axios.post(
        getGatewayUrl('/api/report_builder/reports'),
        newReportData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const savedReport = response.data;

      // Update application state to reflect the new report
      setCurrentDefinition({
        ...savedReport, // Assuming backend returns the full new report object including new ID
        title: savedReport.name, // Ensure title is mapped from name
        isTemplate: false // Ensure this is set correctly in the state
      });
      setIsNewReport(false); // It's now an existing report
      setHasUnsavedChanges(false); // Freshly saved

      // Update the URL to the new report's designer page
      history.push(`/report-designer/${savedReport.id}`);

      setSnackbar({
        open: true,
        message: 'Template saved as new report successfully',
        severity: 'success'
      });

    } catch (error) {
      console.error("Failed to save template as new report:", error);
      setError(error.response?.data?.detail || "Failed to save template as new report");
      setSnackbar({
        open: true,
        message: `Failed to save as new report: ${error.response?.data?.detail || error.message}`,
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
      let content = '';
      if (element.type === 'explicit') {
        content = element.content || '';
      } else if (element.type === 'generative') {
        // Use ai_generated_content for generative sections
        // Fallback to a placeholder if content is not yet generated or if there was an error
        content = element.ai_generated_content || `[Content for '${element.title || 'generative section'}' not generated or error occurred]`;
      }

      // Filter out <think> and <thinking> tags and their content
      if (content && typeof content === 'string') {
        // Remove <thinking>...</thinking> tags
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
        // Remove <think>...</think> tags
        content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
      }

      if (element.format && element.format.startsWith('h')) {
        const level = parseInt(element.format.substring(1), 10) || 1;
        const prefix = '#'.repeat(level) + ' ';
        return prefix + content;
      } else if (element.format === 'bulletList') {
        return content.split('\n').map(line => `- ${line}`).join('\n');
      } else if (element.format === 'numberedList') {
        return content.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n');
      }
      return content;
    }).filter(Boolean).join('\n\n');
  };

  const handleGenerateReport = async () => {
    if (!currentDefinition.id) {
      setSnackbar({
        open: true,
        message: 'Please save the report before generating content',
        severity: 'warning'
      });
      return;
    }

    // Save the current state of the report before generating
    try {
      await handleSave(); 
      // If handleSave throws an error, it will be caught by its own try/catch, 
      // and a snackbar will be shown. We might want to prevent generation here
      // if save failed, but handleSave doesn't explicitly return success/failure.
      // For now, assume if it doesn't throw and stop execution, it was "successful enough"
      // or the user was notified of an issue.
    } catch (saveError) {
      // This catch block might not be strictly necessary if handleSave handles its own errors
      // and doesn't re-throw them in a way that should stop this function.
      // However, if handleSave could throw an error that isn't caught internally and
      // we want to stop generation, this would be the place.
      console.error("Failed to save report before generation:", saveError);
      setSnackbar({
        open: true,
        message: `Could not save report changes before generation: ${saveError.message}`,
        severity: 'error'
      });
      return; // Stop generation if save fails
    }

    const generativeElements = currentDefinition.elements.filter(el => el.type === 'generative');
    if (generativeElements.length === 0) {
      setSnackbar({
        open: true,
        message: 'This report has no generative sections to generate content for',
        severity: 'info'
      });
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    // Initialize generatingElements state for all generative sections
    const initialGeneratingState = {};
    generativeElements.forEach(el => {
      initialGeneratingState[el.id] = { 
        status: 'pending', // Mark as pending initially
        content: el.ai_generated_content, // Preserve existing content if any
        error: el.generation_error 
      };
    });
    setGeneratingElements(initialGeneratingState);
    // When Generate Report is clicked, we intend to regenerate all, so progress starts from 0.
    let completedCount = 0; 
    setGenerationProgress({ current: completedCount, total: generativeElements.length });

    // Sequentially generate content for each generative element
    // We will use a mutable copy of currentDefinition to update it step-by-step
    let currentReportState = JSON.parse(JSON.stringify(currentDefinition));
    // The original line for completedCount is removed as we set it to 0 above for full regeneration.
    // let completedCount = currentReportState.elements.filter(el => el.type === 'generative' && el.generation_status === 'completed').length;
    
    // Update progress based on already completed elements -- This is now handled by initializing completedCount to 0.
    // setGenerationProgress({ current: completedCount, total: generativeElements.length });

    for (const elementToProcess of generativeElements) {
      // The check for existing/completed content is removed to force regeneration.
      // const existingElementData = currentReportState.elements.find(e => e.id === elementToProcess.id);
      // if (existingElementData && existingElementData.ai_generated_content && existingElementData.generation_status === 'completed') {
      //   setGeneratingElements(prev => ({
      //     ...prev,
      //     [elementToProcess.id]: {
      //       status: 'completed',
      //       content: existingElementData.ai_generated_content,
      //       error: null
      //     }
      //   }));
      //   continue;
      // }

      // Mark current element as 'generating' in the UI
      setGeneratingElements(prev => ({
        ...prev,
        [elementToProcess.id]: { status: 'generating', content: elementToProcess.ai_generated_content }
      }));

      try {
        setSnackbar({ open: true, message: `Generating section: ${elementToProcess.title || 'Untitled Section'}...`, severity: 'info' });
        
        // Prepare the payload according to the backend's Report schema (similar to handleRegenerateSection)
        const payload = {
          id: currentReportState.id,
          name: currentReportState.title, // Map title to name
          description: currentReportState.description,
          vectorStoreId: currentReportState.vectorStoreId,
          type: currentReportState.type || 'Custom', // Ensure type is present
          templateId: currentReportState.templateId,
          status: currentReportState.status || 'draft', // Ensure status is present
          content: { // Nest elements under content
            elements: currentReportState.elements
          },
          createdAt: currentReportState.createdAt, 
          updatedAt: currentReportState.updatedAt 
        };

        // Remove undefined fields to avoid sending them if not set
        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
        if (payload.content?.elements === undefined) { // Check if content or content.elements is undefined
            if (payload.content) delete payload.content.elements;
            else payload.content = { elements: [] }; // Ensure content.elements exists if content itself was undefined
        } else if (payload.content.elements === null) {
            payload.content.elements = []; // Ensure elements is an array if it's null
        }
        
        // Call the backend API to regenerate the specific section
        const response = await axios.post(
          getGatewayUrl(`/api/report_builder/reports/${currentReportState.id}/sections/${elementToProcess.id}/regenerate`),
          payload, // Send the transformed payload
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json' // Ensure correct content type
            }
          }
        );

        const apiResponseData = response.data; // Store the raw API response

        if (apiResponseData && apiResponseData.content && apiResponseData.content.elements) {
          // Create a new "flat" definition for the React state
          const newFlatDefinition = {
            ...apiResponseData, // Spread top-level properties like id, name, status, etc.
            title: apiResponseData.name || apiResponseData.title, // Ensure title is correctly mapped from API's name or title
            elements: apiResponseData.content.elements, // Hoist elements
          };
          delete newFlatDefinition.content; // Remove the nested 'content' property

          setCurrentDefinition(newFlatDefinition); // Update the main state with the flat structure
          currentReportState = newFlatDefinition; // Update local variable for consistency

          // Find the regenerated element in the original API response's structure for UI updates
          const regeneratedElement = apiResponseData.content.elements.find(el => el.id === elementToProcess.id);
          
          if (regeneratedElement) {
            setGeneratingElements(prev => ({
              ...prev,
              [regeneratedElement.id]: {
                status: regeneratedElement.generation_status || (regeneratedElement.ai_generated_content ? 'completed' : 'error'), 
                content: regeneratedElement.ai_generated_content,
                error: regeneratedElement.generation_error
              }
            }));

            if (regeneratedElement.generation_status === 'completed' || (regeneratedElement.ai_generated_content && !regeneratedElement.generation_error)) {
              completedCount++;
              setSnackbar({ open: true, message: `Section "${regeneratedElement.title || 'Untitled'}" generated.`, severity: 'success' });
              setScrollToElementId(regeneratedElement.id); // Scroll to the newly generated element
              setHighlightElementId(regeneratedElement.id); // Highlight it
            } else {
              setSnackbar({ 
                open: true, 
                message: `Error generating section "${regeneratedElement.title || 'Untitled'}": ${regeneratedElement.generation_error || 'Unknown error'}`, 
                severity: 'error' 
              });
            }
          } else {
             // This case should ideally not happen if backend returns the element it processed
             setGeneratingElements(prev => ({
                ...prev,
                [elementToProcess.id]: { status: 'error', error: 'Processed element not found in response' }
            }));
          }
          setGenerationProgress({ current: completedCount, total: generativeElements.length });
        } else if (apiResponseData && apiResponseData.error) { // Backend returned a structured error
          throw new Error(apiResponseData.detail?.message || 'Unknown error from server during next element generation.');
        } else {
          throw new Error('Unexpected response from server for next element generation.');
        }
      } catch (err) {
        console.error(`Error generating element ${elementToProcess.id}:`, err);
        const errorMessage = err.response?.data?.detail?.message || err.message || 'Failed to generate section.';
        setError(prevError => `${prevError || ''} Element ${elementToProcess.title || elementToProcess.id}: ${errorMessage}\\n`);
        setGeneratingElements(prev => ({
          ...prev,
          [elementToProcess.id]: { status: 'error', error: errorMessage }
        }));
        setSnackbar({ open: true, message: `Failed to generate section "${elementToProcess.title || 'Untitled'}": ${errorMessage}`, severity: 'error' });
        // Optionally, decide if you want to stop the loop on first error or continue
        // For now, it continues to the next element if any error occurs on one.
      }
    } // End of for...of loop

    setIsGenerating(false);
    if (!error) { // If loop completed without setting a general error state
        const finalCompletedCount = currentReportState.elements.filter(el => el.type === 'generative' && el.generation_status === 'completed').length;
        if (finalCompletedCount === generativeElements.length) {
            setSnackbar({ open: true, message: 'All report sections generated successfully!', severity: 'success' });
        } else {
             setSnackbar({ open: true, message: 'Report generation finished, but some sections may have errors.', severity: 'warning' });
        }
    } else {
        setSnackbar({ open: true, message: `Report generation completed with errors. Check individual sections.`, severity: 'error' });
    }
  };

  const handleRegenerateSection = async (elementId) => {
    setIsGenerating(true); // Lock down Generate Report button
    try {
      if (isNewReport) { // Ensure this uses isNewReport
        setSnackbar({
          open: true,
          message: 'Please save the report before generating content for a section.',
          severity: 'warning'
        });
        setGeneratingElements(prev => ({
          ...prev,
          [elementId]: { ...(prev[elementId] || {}), status: 'idle' }
        }));
        return;
      }

      // Save the current state of the report before regenerating a section
      try {
        await handleSave();
      } catch (saveError) {
        console.error("Failed to save report before regenerating section:", saveError);
        setSnackbar({
          open: true,
          message: `Could not save report changes before section regeneration: ${saveError.message}`,
          severity: 'error'
        });
        // Reset generation status for this element
        setGeneratingElements(prev => ({
          ...prev,
          [elementId]: { ...(prev[elementId] || {}), status: 'error', error: 'Save failed before regeneration' } 
        }));
        return; // Stop regeneration if save fails
      }

      // Find the element to regenerate
      const element = currentDefinition.elements.find(el => el.id === elementId);
      
      if (!element) {
        throw new Error('Section not found');
      }
      
      // Get the section title for display
      const sectionTitle = element.title || 'Untitled Section';
      
      // Update generation status
      setGeneratingElements(prev => ({
        ...prev,
        [elementId]: { status: 'generating' }
      }));
      
      setSnackbar({
        open: true,
        message: `Regenerating "${sectionTitle}" with full report context...`,
        severity: 'info'
      });

      // Prepare the payload according to the backend's Report schema
      const payload = {
        id: currentDefinition.id,
        name: currentDefinition.title, // Map title to name
        description: currentDefinition.description,
        vectorStoreId: currentDefinition.vectorStoreId,
        type: currentDefinition.type || 'Custom', // Ensure type is present
        templateId: currentDefinition.templateId,
        status: currentDefinition.status || 'draft', // Ensure status is present
        content: { // Nest elements under content
          elements: currentDefinition.elements
        },
        // createdAt and updatedAt should ideally be present in currentDefinition if it's a saved report
        // If they might be missing, the backend would need to handle it or we need to ensure they are always there.
        // For now, assume they are passed if they exist on currentDefinition.
        createdAt: currentDefinition.createdAt, 
        updatedAt: currentDefinition.updatedAt 
      };

      // Remove undefined fields to avoid sending them if not set
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
      if (payload.content.elements === undefined) delete payload.content.elements; // Should not happen if currentDefinition.elements exists

      // Call the backend API to regenerate the specific section
      // Send the entire currentDefinition as the request body
      const response = await axios.post(
        getGatewayUrl(`/api/report_builder/reports/${currentDefinition.id}/sections/${elementId}/regenerate`), // Removed client_id
        payload, // Send the transformed payload
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json' // Ensure correct content type
          }
        }
      );

      // Check if the response is an error
      if (response.data && response.data.error === true) { // Standard error response
        throw new Error(response.data.detail?.message || 'Unknown error occurred during regeneration');
      }

      // If successful, the response.data is the updated Report object
      const apiResponseData = response.data; // Use a clear variable name

      if (apiResponseData && apiResponseData.content && apiResponseData.content.elements) {
        // Create a new "flat" definition for the React state
        const newFlatDefinition = {
          ...apiResponseData, // Spread top-level properties like id, name, status, etc.
          title: apiResponseData.name || apiResponseData.title, // Ensure title is correctly mapped from API's name or title
          elements: apiResponseData.content.elements, // Hoist elements
        };
        delete newFlatDefinition.content; // Remove the nested 'content' property

        setCurrentDefinition(newFlatDefinition); // Update the main state with the flat structure

        // Find the regenerated element in the original API response's structure (which is nested)
        const regeneratedElement = apiResponseData.content.elements.find(el => el.id === elementId);

        if (regeneratedElement) {
            setGeneratingElements(prev => ({
                ...prev,
                [regeneratedElement.id]: { 
                    status: regeneratedElement.generation_status || (regeneratedElement.ai_generated_content ? 'completed' : 'error'), 
                    content: regeneratedElement.ai_generated_content,
                    error: regeneratedElement.generation_error
                }
            }));
            
            if (regeneratedElement.generation_status === 'completed' || (regeneratedElement.ai_generated_content && !regeneratedElement.generation_error)) {
                 setSnackbar({
                    open: true,
                    message: `"${sectionTitle}" regenerated successfully with full report context`,
                    severity: 'success'
                });
                setScrollToElementId(elementId);
                setHighlightElementId(elementId);
            } else {
                 setSnackbar({
                    open: true,
                    message: `Error regenerating "${sectionTitle}": ${regeneratedElement.generation_error || 'Unknown error'}`,
                    severity: 'error'
                });
            }
        } else {
            throw new Error("Regenerated element not found in the server response.");
        }
      } else {
         throw new Error("Received an unexpected response from the server during section regeneration.");
      }
    } catch (err) {
      console.error('Error regenerating section:', err);
      
      // Parse error message
      let errorMessage = err.message;
      
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.detail.message) {
          errorMessage = err.response.data.detail.message;
        }
      }
      
      // Update generation status with error
      setGeneratingElements(prev => ({
        ...prev,
        [elementId]: { status: 'error', error: errorMessage }
      }));
      
      setSnackbar({
        open: true,
        message: `Error regenerating section: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setIsGenerating(false); // Release Generate Report button
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
        <Toolbar ref={toolbarRef} className={classes.toolbar} style={{ position: 'relative', justifyContent: 'flex-end' }}>
          {/* Title Box - styled dynamically */}
          <Box ref={titleBoxRef} style={titleBoxStyle}>
            <Typography variant="h2" style={{ 
              // Ellipsis styles are now primarily on the Box,
              // Typography will inherit width/max-width.
              // Explicitly ensure it doesn't break out if Box somehow allows it.
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              display: 'inline', // Helps if parent Box is using text-align effectively
            }}>
              {pageTitlePrefix}{currentDefinition.title || ''}
              {hasUnsavedChanges && ' *'}
            </Typography>
          </Box>
          
          {/* Buttons Box - used for measurement */}
          <Box ref={buttonsBoxRef}>
            {/* Save Button (Pure Dropdown) */}
            <Button 
              startIcon={<SaveIcon />} 
              endIcon={<ArrowDropDownIcon />}
              onClick={handleSaveMenuClick} 
              disabled={isSaving} // Still disable if any save operation is in progress
              color="primary"
              variant="contained"
              style={{ marginRight: 16 }}
              aria-controls={saveMenuAnchor ? 'save-options-menu' : undefined}
              aria-expanded={saveMenuAnchor ? 'true' : undefined}
              aria-haspopup="menu"
            >
              Save
            </Button>
            <Menu
              id="save-options-menu"
              anchorEl={saveMenuAnchor}
              open={Boolean(saveMenuAnchor)}
              onClose={handleSaveMenuClose}
              keepMounted
            >
              {/* Options when editing a Report */}
              {!currentDefinition.isTemplate && [
                <MenuItem key="save-report" onClick={() => { handleSave(); handleSaveMenuClose(); }}>
                  Save Report
                </MenuItem>,
                <MenuItem key="save-as-template" onClick={() => { handleSaveAsTemplate(); handleSaveMenuClose(); }}>
                  Save as Template
                </MenuItem>
              ]}

              {/* Options when editing a Template */}
              {currentDefinition.isTemplate && [
                // Option to update current template (if not a system template and not a new template)
                !isNewTemplate && currentDefinition.category !== 'System' && (
                  <MenuItem key="update-template" onClick={() => { handleSave(); handleSaveMenuClose(); }}>
                    Update Current Template
                  </MenuItem>
                ),
                // Option to save template as a new report
                <MenuItem key="template-to-report" onClick={() => { handleSaveTemplateAsNewReport(); handleSaveMenuClose(); }}>
                  Save as New Report
                </MenuItem>,
                // Option to save template as a new template (e.g., system template as user template, or user template as another user template)
                <MenuItem key="template-to-new-template" onClick={() => { handleSaveAsTemplate(); handleSaveMenuClose(); }}>
                  Save as New Template
                </MenuItem>
              ].filter(Boolean) // Filter out null items if category is System for the first option
            }
            </Menu>

            {/* Add Generate Report button - only show for reports (not templates) */}
            {!currentDefinition.isTemplate && (
              <Tooltip title={(isNewReport && !isGenerating ? "Please save the document before AI generation." : undefined)}>
                <span>
                  <Button
                    startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <AutorenewIcon />}
                    onClick={handleGenerateReport}
                    disabled={isGenerating || isNewReport}
                    color="secondary"
                    variant="contained"
                    style={{ marginRight: 16 }}
                  >
                    {isGenerating ? `Generating... ${generationProgress.current}/${generationProgress.total}` : 'Generate Report'}
                  </Button>
                </span>
              </Tooltip>
            )}

            {/* --- Export Button (Pure Dropdown) --- */}
            {!currentDefinition.isTemplate && (
              <Button
                startIcon={<PublishIcon />}
                endIcon={<ArrowDropDownIcon />}
                color="primary"
                variant="outlined"
                style={{ marginRight: 16 }}
                onClick={handleExportClick} 
                aria-controls={exportMenuAnchor ? 'export-options-menu' : undefined}
                aria-expanded={exportMenuAnchor ? 'true' : undefined}
                aria-haspopup="menu"
              >
                Export
              </Button>
            )}
            <Menu
              id="export-options-menu" 
              anchorEl={exportMenuAnchor} 
              keepMounted
              open={Boolean(exportMenuAnchor)}
              onClose={handleExportMenuClose} 
            >
              {/* Menu Items for Export - only shown when !currentDefinition.isTemplate was already handled by parent button */}
              <MenuItem onClick={() => handleExportFormat('txt')}>Export as Text (.txt)</MenuItem>
              <MenuItem onClick={() => handleExportFormat('md')}>Export as Markdown (.md)</MenuItem>
              <MenuItem onClick={() => handleExportFormat('html')}>Export as HTML (.html)</MenuItem>
              <MenuItem onClick={() => handleExportFormat('json')}>Export as JSON (.json)</MenuItem>
              <MenuItem onClick={() => handleExportFormat('docx')}>Export as Word (.docx)</MenuItem>
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
            onRegenerateSection={handleRegenerateSection}
            isGenerating={isGenerating}
            generatingElements={generatingElements}
            isNewReport={isNewReport}
          />
        </Box>
        <Box className={classes.rightPanel}>
          <ReportPreviewPanel
            definition={currentDefinition}
            onContentChange={handleDefinitionChange}
            isGenerating={isGenerating}
            generatingElements={generatingElements}
            scrollToElementId={scrollToElementId}
            setScrollToElementId={setScrollToElementId}
            highlightElementId={highlightElementId}
            setHighlightElementId={setHighlightElementId}
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