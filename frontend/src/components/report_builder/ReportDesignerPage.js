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
import { getGatewayUrl, getApiUrl } from '../../config';
import { AuthContext } from '../../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

// Helper functions
const getDefaultReport = () => ({
  id: null,
  title: 'New Report',
  description: '',
  vectorStoreId: '',
  items: []
});

// Helper to create a new default element
const createDefaultElement = (parentId) => ({
  id: uuidv4(),
  type: 'explicit', // Or your application's default element type
  title: 'New Element', // Default title
  content: '',          // Default content
  format: 'paragraph',  // Default format
  parentUUID: parentId, // Link to parent section ID
  // Add any other default properties your elements usually have
  // e.g., ai_generated_content: null, generation_error: null, generation_status: 'idle' for generative elements
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
    padding: theme.spacing(1),
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
          items: [], 
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
              // Templates might have `content.items` or `content.elements` and `parent_uuid`
              const rawItems = templateData.content?.items || templateData.content?.elements || [];
              const transformedItems = rawItems.map((item, index) => {
                const newItemId = item.id || `item-template-new-${index}-${Date.now()}`;
                const baseItemData = {
                  ...item,
                  id: newItemId,
                  type: item.item_type === 'section' ? 'section' : item.type || (Array.isArray(item.elements) ? 'section' : 'explicit'),
                  format: item.format || (item.item_type === 'section' || (Array.isArray(item.elements) && item.type !== 'explicit' && item.type !== 'generative') ? undefined : 'paragraph'),
                  parentUUID: item.parent_uuid || item.parentUUID || null // Map from parent_uuid or keep parentUUID, then remove parent_uuid
                };
                delete baseItemData.parent_uuid; // Remove backend key after mapping
                delete baseItemData.item_type;   // Remove backend key after mapping type
                
                if (baseItemData.type === 'section' && Array.isArray(item.elements)) { 
                  baseItemData.elements = item.elements.map((subElement, subIndex) => {
                    const newSubId = subElement.id || `subElement-template-new-${index}-${subIndex}-${Date.now()}`;
                    const subBase = {
                      ...subElement,
                      id: newSubId,
                      format: subElement.format || 'paragraph',
                      parentUUID: newItemId, // Child's parentUUID is this section's ID
                      type: subElement.item_type === 'element' ? subElement.type : subElement.type // Ensure type is preferred over item_type
                    };
                    delete subBase.parent_uuid;
                    delete subBase.item_type;
                    return subBase;
                  });
                } else if (baseItemData.type !== 'section') {
                  delete baseItemData.elements; 
                }
                return baseItemData;
              });
              
              setCurrentDefinition({
                id: uuidv4(),
                title: templateData.name,
                description: templateData.description || '',
                items: transformedItems, 
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
            // Transform the API response to the format expected by our state
            // API response has data.content.items (or data.content.elements for older compatibility if needed)
            const rawItems = data.content?.items || data.content?.elements || [];
            
            const transformedItems = rawItems.map((item, index) => {
              const newItemId = item.id || `item-api-${reportId}-${index}-${Date.now()}`;
              const baseItemData = {
                ...item, 
                id: newItemId,
                type: item.item_type === 'section' ? 'section' : item.type, // Prefer item.type, fallback to item_type for section type detection
                format: item.format || (item.item_type === 'section' ? undefined : 'paragraph'),
                parentUUID: item.parent_uuid || item.parentUUID || null // Map from parent_uuid, then remove it
              };
              delete baseItemData.parent_uuid;
              delete baseItemData.item_type;
              
              if (baseItemData.type === 'section' && Array.isArray(item.elements)) { 
                baseItemData.elements = item.elements.map((subElement, subIndex) => {
                  const newSubId = subElement.id || `subElement-api-${reportId}-${index}-${subIndex}-${Date.now()}`;
                  const subBase = {
                    ...subElement,
                    id: newSubId,
                    format: subElement.format || 'paragraph',
                    parentUUID: newItemId,
                    type: subElement.item_type === 'element' ? subElement.type : subElement.type
                  };
                  delete subBase.parent_uuid;
                  delete subBase.item_type;
                  return subBase;
                });
              } else if (baseItemData.type !== 'section') {
                 delete baseItemData.elements;
              }
              return baseItemData;
            });

            // Set the definition with proper mapping of API data
            setCurrentDefinition({
              id: data.id,
              title: data.name, 
              description: data.description,
              items: transformedItems, 
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
              setCurrentDefinition({ ...getDefaultReport(), id: reportId, title: 'Template Error', items: [], isTemplate: true });
            } else {
              setPageTitlePrefix('Prior Report: ');
              setCurrentDefinition({ ...getDefaultReport(), id: reportId, title: 'Report Error', items: [], isTemplate: false });
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
            setCurrentDefinition({ id: reportId, title: 'Error Loading', description: '', items: [], isTemplate: true });
          } else {
            setPageTitlePrefix('Prior Report: '); // Or "Error: Report"
            setCurrentDefinition({ ...getDefaultReport(), id: reportId, title: 'Error Loading', items: [], isTemplate: false });
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
        updatedDef.isTemplate = isTemplateFromUrl || prevDef.isTemplate; 
        return updatedDef;
      });
    } else { 
      const newDefinition = newDefinitionOrAction;
      setCurrentDefinition(prevDef => { 
        const updatedDef = {
          ...newDefinition, 
        };
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
        // Transform items back to API format (content.items)
        content: {
          // API expects 'items' list containing sections and elements.
          // Each element that is a child of a section needs 'parent_uuid' set to section's id.
          items: currentDefinition.items.map((item, index) => {
            // --- START CONSOLE LOGGING ---
            if (index === 0) { // Log only for the first item for now, as per the error
              console.log('[handleSave] Processing item at index 0:', JSON.parse(JSON.stringify(item)));
              console.log('[handleSave] item[0].type is:', item.type);
              console.log('[handleSave] item[0].item_type is:', item.item_type);
            }
            // --- END CONSOLE LOGGING ---
            const apiItem = { ...item }; // Work on a copy
            
            // Set item_type for backend (more robustly)
            if (apiItem.type === 'section') {
              apiItem.item_type = 'section';
            } else if (apiItem.item_type === 'section') { // Trust item_type if type is missing/wrong
              apiItem.item_type = 'section';
              apiItem.type = 'section'; // Correct apiItem.type for subsequent logic in this map function
            } else {
              apiItem.item_type = 'element';
              // Ensure elements have their specific type (explicit/generative)
              // If apiItem.type is not 'explicit' or 'generative' here, backend will catch it.
            }

            // Convert parentUUID to parent_uuid for elements not sections
            if (apiItem.type !== 'section' && apiItem.parentUUID) {
              apiItem.parent_uuid = apiItem.parentUUID;
            }
            delete apiItem.parentUUID; // Always remove frontend parentUUID from API payload

            if (apiItem.type === 'section') {
              apiItem.elements = (apiItem.elements || []).map(childEl => {
                const apiChildEl = {
                  ...childEl,
                  item_type: 'element', // Children are always elements
                  parent_uuid: apiItem.id // Link child to this section using backend key
                };
                delete apiChildEl.parentUUID; // Remove frontend key from child
                return apiChildEl;
              });
              // Sections themselves do not have parent_uuid in the backend schema
              delete apiItem.parent_uuid; 
              // Sections themselves also do not have a 'type' field in the backend schema, only 'item_type'
              delete apiItem.type;
            }
            return apiItem; 
          })
        }
      };
      // Ensure content.items is the key, remove elements if it was a leftover from old logic
      if (apiData.content.elements && apiData.content.items) {
        delete apiData.content.elements;
      } else if (apiData.content.elements && !apiData.content.items) {
        apiData.content.items = apiData.content.elements;
        delete apiData.content.elements;
      }

      // --- ADD CONSOLE LOG FOR SENT DATA ---
      console.log('[handleSave] Data being sent to API (apiData.content.items):', JSON.parse(JSON.stringify(apiData.content.items)));
      // --- END CONSOLE LOG ---

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
          items: (response.data.content?.items || []).map(item => { 
            const newItemId = item.id; 
            const baseItem = { ...item, parent_uuid: item.parent_uuid || null }; 
            if (item.type === 'section' && Array.isArray(item.elements)) {
              baseItem.elements = item.elements.map(subEl => ({ 
                ...subEl, 
                parent_uuid: newItemId 
              }));
            }
            return baseItem;
          }),
          isTemplate: true, 
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
          items: (response.data.content?.items || []).map(item => { 
            const newItemId = item.id;
            const baseItem = { ...item, parent_uuid: item.parent_uuid || null }; 
            if (item.type === 'section' && Array.isArray(item.elements)) {
              baseItem.elements = item.elements.map(subEl => ({ 
                ...subEl, 
                parent_uuid: newItemId 
              }));
            }
            return baseItem;
          }),
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
      // --- ADD CONSOLE LOG FOR RECEIVED DATA AFTER SAVE ---
      if (response && response.data && response.data.content && response.data.content.items) {
        console.log('[handleSave] Data received from API after save (response.data.content.items):', JSON.parse(JSON.stringify(response.data.content.items)));
      }
      // --- END CONSOLE LOG ---
      setCurrentDefinition(prev => ({
        ...prev,
        id: response.data.id || prev.id,
        title: response.data.name || response.data.title, // API might use 'name' for title
        description: response.data.description,
        vectorStoreId: !isTemplate ? response.data.vectorStoreId : prev.vectorStoreId,
        items: (response.data.content?.items || prev.items || []).map(item => { 
            const newItemId = item.id;
            const baseItem = { ...item, parent_uuid: item.parent_uuid || null };
            if (item.type === 'section' && Array.isArray(item.elements)) {
              baseItem.elements = item.elements.map(subEl => ({ 
                ...subEl, 
                parent_uuid: newItemId
              }));
            }
            return baseItem;
          }),
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
    if (!currentDefinition || !currentDefinition.id) {
      setSnackbar({
        open: true,
        message: 'Please save the report before exporting.',
        severity: 'warning',
      });
      return;
    }

    setSnackbar({ open: true, message: `Exporting report as ${format.toUpperCase()}...`, severity: 'info' });
    setIsLoading(true); // Show loading indicator

    try {
      if (format === 'docx') {
        try {
          const docxExportUrl = getApiUrl('REPORT_BUILDER', `/api/report_builder/reports/${currentDefinition.id}/export/word`);
          console.log('Attempting to export DOCX from URL:', docxExportUrl);
          const response = await axios.get(
            docxExportUrl,
            {
              headers: { Authorization: `Bearer ${token}` },
              responseType: 'blob',
            }
          );
          const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
          const contentDisposition = response.headers['content-disposition'];
          
          const baseTitleDocx = typeof currentDefinition.title === 'string' ? currentDefinition.title : 'report';
          const suggestedName = contentDisposition
            ? contentDisposition.split('filename=')[1].replace(/"/g, '')
            : `${(baseTitleDocx || 'report').replace(/\s+/g, '_')}.docx`;

          if ('showSaveFilePicker' in window) {
            const fileHandle = await window.showSaveFilePicker({
              suggestedName,
              types: [{
                description: 'Word Document',
                accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
              }],
            });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            setSnackbar({ open: true, message: 'Report exported as DOCX successfully', severity: 'success' });
          } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = suggestedName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setSnackbar({ open: true, message: 'Report exported as DOCX (saved to downloads folder)', severity: 'success' });
          }
        } catch (err) {
          console.error('Error exporting DOCX:', err);
          setSnackbar({
            open: true,
            message: `Failed to export DOCX: ${err.response?.data?.detail?.message || err.message}`,
            severity: 'error',
          });
        } finally {
          setIsLoading(false); // This finally block for DOCX should remain
          handleExportMenuClose(); // This finally block for DOCX should remain
        }
        return;
      }

      if (format === 'pdf') {
        try {
          const pdfExportUrl = getApiUrl('REPORT_BUILDER', `/api/report_builder/reports/${currentDefinition.id}/export/pdf`);
          console.log('Attempting to export PDF from URL:', pdfExportUrl);
          const response = await axios.get(
            pdfExportUrl,
            {
              headers: { Authorization: `Bearer ${token}` },
              responseType: 'blob',
            }
          );
          const blob = new Blob([response.data], { type: 'application/pdf' });
          const contentDisposition = response.headers['content-disposition'];

          const baseTitlePdf = typeof currentDefinition.title === 'string' ? currentDefinition.title : 'report';
          const suggestedName = contentDisposition
            ? contentDisposition.split('filename=')[1].replace(/"/g, '')
            : `${(baseTitlePdf || 'report').replace(/\s+/g, '_')}.pdf`;

          if ('showSaveFilePicker' in window) {
            const fileHandle = await window.showSaveFilePicker({
              suggestedName,
              types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }],
            });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            setSnackbar({ open: true, message: 'Report exported as PDF successfully', severity: 'success' });
          } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = suggestedName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setSnackbar({ open: true, message: 'Report exported as PDF (saved to downloads folder)', severity: 'success' });
          }
        } catch (err) {
          console.error('Error exporting PDF:', err);
          setSnackbar({
            open: true,
            message: `Failed to export PDF: ${err.response?.data?.detail?.message || err.message}`,
            severity: 'error',
          });
        } finally {
          setIsLoading(false); // This finally block for PDF should remain
          handleExportMenuClose(); // This finally block for PDF should remain
        }
        return;
      }

      // Fallback for other formats (txt, md, html, json)
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
      console.error('Error exporting file (main catch):', err); // Updated log message
      setSnackbar({
        open: true,
        message: `Failed to export report: ${err.message}`,
        severity: 'error'
      });
      // setIsLoading(false) and handleExportMenuClose() are now in the main finally block below
      // so they are removed from here.
    } finally {
      // This is the new main finally block.
      // It will execute after the main try completes or if an error is caught by the main catch.
      // It ensures that for the fallback formats (txt, md, html, json), or if an error
      // occurs outside the docx/pdf specific try/catch blocks, loading is stopped.
      setIsLoading(false);
      handleExportMenuClose();
    }
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
          items: currentDefinition.items || []
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
          items: currentDefinition.items.map(item => {
            const newItem = { ...item, id: undefined };
            if (item.type === 'section' && Array.isArray(item.elements)) {
              const newSectionId = uuidv4();
              newItem.id = newSectionId;
              newItem.elements = item.elements.map(el => ({ 
                ...el, 
                id: undefined,
                parentUUID: newSectionId
              }));
            } else {
              newItem.parentUUID = null;
            }
            return newItem;
          })
        },
        isTemplate: false, 
        templateId: currentDefinition.id, 
        vectorStoreId: '',
        status: 'draft',
        type: 'Template-based'
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
        ...savedReport,
        title: savedReport.name,
        isTemplate: false
      });
      setIsNewReport(false);
      setHasUnsavedChanges(false);

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
    if (!currentDefinition || !currentDefinition.items) return '';

    // Renamed for clarity to avoid conflict with a potential outer 'item' variable in calling scopes
    const processItemNodeForText = (itemNode) => {
      let content = '';
      if (itemNode.type === 'section') {
        // As per plan: Flatten for TXT/MD. Sections themselves are not directly in text output.
        return (itemNode.elements || []).map(processItemNodeForText).join('\n\n');
      }
      
      // Element processing logic (remains largely the same)
      if (itemNode.type === 'explicit') {
        content = itemNode.content || '';
      } else if (itemNode.type === 'generative') {
        content = itemNode.ai_generated_content || `[Content for '${itemNode.title || 'generative section'}' not generated or error occurred]`;
      }

      if (content && typeof content === 'string') {
        content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
        content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
      }

      if (itemNode.format && itemNode.format.startsWith('h')) {
        const level = parseInt(itemNode.format.substring(1), 10) || 1;
        const prefix = '#'.repeat(level) + ' ';
        return prefix + content;
      } else if (itemNode.format === 'bulletList') {
        return content.split('\n').map(line => `- ${line}`).join('\n');
      } else if (itemNode.format === 'numberedList') {
        return content.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n');
      }
      return content;
    };

    return (currentDefinition.items || []).map(processItemNodeForText).filter(Boolean).join('\n\n');
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
    } catch (saveError) {
      console.error("Failed to save report before generation:", saveError);
      setSnackbar({
        open: true,
        message: `Could not save report changes before generation: ${saveError.message}`,
        severity: 'error'
      });
      return; // Stop generation if save fails
    }

    // Recursive helper to find all generative elements, whether top-level or nested in sections.
    const findGenerativeElementsRecursive = (itemList) => {
      let generative = [];
      if (!Array.isArray(itemList)) return generative;

      for (const item of itemList) {
        if (item.type === 'section' && Array.isArray(item.elements)) {
          // If it's a section, recurse into its elements
          generative = generative.concat(findGenerativeElementsRecursive(item.elements));
        } else if (item.type === 'generative') {
          // If it's a generative element, add it to the list
          // The element object itself (item) is pushed. It will retain its parentUUID if it has one.
          generative.push(item);
        }
      }
      return generative;
    };
    const generativeElements = findGenerativeElementsRecursive(currentDefinition.items || []);

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
    
    for (const elementToProcess of generativeElements) { // elementToProcess is a direct reference to a generative element
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
          content: { 
            items: currentReportState.items
          },
          createdAt: currentReportState.createdAt, 
          updatedAt: currentReportState.updatedAt 
        };

        // Remove undefined fields to avoid sending them if not set
        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
        if (payload.content?.items === undefined) { 
            if (payload.content) delete payload.content.items;
            else payload.content = { items: [] }; 
        } else if (payload.content.items === null) {
            payload.content.items = []; 
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

        if (apiResponseData && apiResponseData.content && apiResponseData.content.items) {
          // Create a new "flat" definition for the React state
          const newFlatDefinition = {
            ...apiResponseData, 
            title: apiResponseData.name || apiResponseData.title, 
            items: apiResponseData.content.items.map(item => {
                const baseItem = { ...item, parent_uuid: item.parent_uuid || null };
                if (item.type === 'section' && Array.isArray(item.elements)) {
                  baseItem.elements = item.elements.map(subEl => ({ ...subEl, parent_uuid: item.id }));
                }
                return baseItem;
              }), 
          };
          delete newFlatDefinition.content; 

          setCurrentDefinition(newFlatDefinition); 
          currentReportState = newFlatDefinition; 

          // Find the regenerated element. It might be top-level or nested.
          let regeneratedElement = null;
          const findElementByIdRecursive = (id, itemListToSearch) => {
            if (!Array.isArray(itemListToSearch)) return null;
            for (const item of itemListToSearch) {
              if (item.id === id) return item;
              if (item.type === 'section' && Array.isArray(item.elements)) {
                const found = findElementByIdRecursive(id, item.elements);
                if (found) return found;
              }
            }
            return null;
          };
          // elementToProcess.id is the ID of the generative element we sent for processing.
          regeneratedElement = findElementByIdRecursive(elementToProcess.id, newFlatDefinition.items);
          
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
        const finalGenerativeElements = findGenerativeElementsRecursive(currentReportState.items || []);
        const finalCompletedCount = finalGenerativeElements.filter(el => el.generation_status === 'completed' && el.ai_generated_content).length;
        
        if (finalCompletedCount === finalGenerativeElements.length && finalGenerativeElements.length > 0) {
            setSnackbar({ open: true, message: 'All report sections generated successfully!', severity: 'success' });
        } else if (finalGenerativeElements.length === 0) {
            // This case should be caught earlier, but as a fallback
            setSnackbar({ open: true, message: 'No generative sections found in the report.', severity: 'info' });
        } else if (finalCompletedCount > 0 && finalCompletedCount < finalGenerativeElements.length) {
             setSnackbar({ open: true, message: 'Report generation finished, but some sections may have errors or no content.', severity: 'warning' });
        } else if (finalCompletedCount === 0 && finalGenerativeElements.length > 0) {
            setSnackbar({ open: true, message: 'Report generation completed, but no content was generated for any section.', severity: 'error' });
        } else { // Default fallback, should ideally not be hit if logic above is sound
            setSnackbar({ open: true, message: 'Report generation process completed.', severity: 'info' });
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
      let element = null;
      let parentSection = null; // Keep track of parent if element is nested

      const findElementRecursive = (itemsList, targetId) => {
        for (const item of itemsList) {
          if (item.id === targetId) {
            return item;
          }
          if (item.type === 'section' && Array.isArray(item.elements)) {
            const foundInChildren = findElementRecursive(item.elements, targetId);
            if (foundInChildren) {
              // If found in children, we don't set parentSection here,
              // as 'element' itself will be the child.
              // The context for regeneration, however, is the whole report.
              return foundInChildren;
            }
          }
        }
        return null;
      };
      element = findElementRecursive(currentDefinition.items || [], elementId);
      
      if (!element) {
        throw new Error('Section not found for regeneration');
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
        content: { 
          items: currentDefinition.items
        },
        createdAt: currentDefinition.createdAt, 
        updatedAt: currentDefinition.updatedAt 
      };

      // Remove undefined fields to avoid sending them if not set
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
      if (payload.content.items === undefined) delete payload.content.items; 
      else if (payload.content.items === null) payload.content.items = [];

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

      if (apiResponseData && apiResponseData.content && apiResponseData.content.items) {
        // Create a new "flat" definition for the React state
        const newFlatDefinition = {
          ...apiResponseData, 
          title: apiResponseData.name || apiResponseData.title, 
          items: apiResponseData.content.items.map(item => {
            const baseItem = { ...item, parent_uuid: item.parent_uuid || null };
            if (item.type === 'section' && Array.isArray(item.elements)) {
              baseItem.elements = item.elements.map(subEl => ({ ...subEl, parent_uuid: item.id }));
            }
            return baseItem;
          }),
        };
        delete newFlatDefinition.content; 

        setCurrentDefinition(newFlatDefinition); 

        let regeneratedElement = null;
        const findElementById_regen = (id, itemList) => {
          for (const item of itemList) {
            if (item.id === id) return item;
            if (item.type === 'section' && Array.isArray(item.elements)) {
              const found = findElementById_regen(id, item.elements);
              if (found) return found;
            }
          }
          return null;
        };
        regeneratedElement = findElementById_regen(elementId, newFlatDefinition.items);

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

  const updateElement = (updatedElementData) => {
    setCurrentDefinition(prevDefinition => {
      const newItems = (prevDefinition.items || []).map(item => {
        // If this top-level item is the one being updated
        if (item.id === updatedElementData.id) {
          return { ...item, ...updatedElementData, parentUUID: item.parentUUID };
        }
        // If this top-level item is a section, check its children
        if (item.type === 'section' && Array.isArray(item.elements)) {
          let childElementUpdated = false;
          const updatedChildElements = item.elements.map(childEl => {
            if (childEl.id === updatedElementData.id) {
              childElementUpdated = true;
              // When updating a child, ensure its parentUUID remains linked to this section
              return { ...childEl, ...updatedElementData, parent_uuid: item.id };
            }
            return childEl;
          });
          if (childElementUpdated) {
            return { ...item, elements: updatedChildElements };
          }
        }
        return item;
      });
      return { ...prevDefinition, items: newItems };
    });
    setHasUnsavedChanges(true);
  };

  // Adds a new item (element or section) to the report definition.
  // For adding an element: newElementData is the element, parentSectionId is the ID of the section it belongs to (or null for top-level).
  // For adding a section: newElementData is the section data (should have type: 'section'), parentSectionId is ignored (or should be null).
  const addItem = (itemData, parentSectionId = null) => {
    setCurrentDefinition(prevDefinition => {
      const newItems = [...(prevDefinition.items || [])];
      const itemToAdd = { ...itemData, id: itemData.id || uuidv4() };

      if (itemToAdd.type === 'section') {
        // Adding a new section to the top-level items list
        itemToAdd.parentUUID = null; // Sections are always top-level conceptually
        if (!Array.isArray(itemToAdd.elements)) {
           itemToAdd.elements = []; // Ensure sections have an elements array
        }
        // As per plan: "When a new Section is created... automatically insert a new Element within that Section."
        if (itemToAdd.elements.length === 0) {
            itemToAdd.elements.push(createDefaultElement(itemToAdd.id));
        }
        newItems.push(itemToAdd);
      } else { 
        // Adding a new element (not a section)
        if (parentSectionId) {
          const parentSectionIndex = newItems.findIndex(item => item.id === parentSectionId && item.type === 'section');
          if (parentSectionIndex !== -1) {
            const parentSection = { ...newItems[parentSectionIndex] }; // shallow copy section
            parentSection.elements = [...(parentSection.elements || [])]; // shallow copy elements array
            parentSection.elements.push({ ...itemToAdd, parentUUID: parentSectionId });
            newItems[parentSectionIndex] = parentSection;
          } else {
            console.warn(`Parent section with ID ${parentSectionId} not found. Adding element to top level.`);
            newItems.push({ ...itemToAdd, parentUUID: null });
          }
        } else {
          // Adding a top-level element
          newItems.push({ ...itemToAdd, parentUUID: null });
        }
      }
      return { ...prevDefinition, items: newItems };
    });
    setHasUnsavedChanges(true);
  };

  // Deletes an item: either a top-level section, a top-level element, or an element from within a section.
  const deleteItem = (itemIdToDelete, parentSectionIdIfChild = null) => {
    setCurrentDefinition(prevDefinition => {
      let newItems = [...(prevDefinition.items || [])];

      if (parentSectionIdIfChild) {
        // Deleting an element from within a section
        const parentSectionIndex = newItems.findIndex(item => item.id === parentSectionIdIfChild && item.type === 'section');
        if (parentSectionIndex !== -1) {
          const parentSection = { ...newItems[parentSectionIndex] }; // shallow copy
          let updatedChildElements = (parentSection.elements || []).filter(el => el.id !== itemIdToDelete);
          
          if (updatedChildElements.length === 0 && parentSection.type === 'section') {
            // Plan: "If the last Element of a Section is deleted, automatically insert a new Element"
            updatedChildElements.push(createDefaultElement(parentSectionIdIfChild)); 
          }
          parentSection.elements = updatedChildElements;
          newItems[parentSectionIndex] = parentSection;
        }
        // If parent section not found, the item effectively doesn't exist in that context, so no change.
      } else {
        // Deleting a top-level item (could be a section or an element)
        const itemToDelete = newItems.find(item => item.id === itemIdToDelete);
        if (itemToDelete && itemToDelete.type === 'section') {
          // Plan: "When a parent Section is deleted, all its child Elements will have their parentUUID set to null
          // and become unparented, remaining in the report structure..."
          const childElementsOfDeletedSection = (itemToDelete.elements || []).map(child => ({
            ...child,
            parentUUID: null // Unparent them
          }));
          // Find index of section to delete
          const sectionIndex = newItems.findIndex(item => item.id === itemIdToDelete);
          if (sectionIndex !== -1) {
            // Remove the section and insert its children in its place
            newItems.splice(sectionIndex, 1, ...childElementsOfDeletedSection);
          }
        } else {
          // Deleting a top-level element (not a section)
          newItems = newItems.filter(item => item.id !== itemIdToDelete);
        }
      }
      return { ...prevDefinition, items: newItems };
    });
    setHasUnsavedChanges(true);
  };
  
  // Renamed from reorderElements to reorderItems, and signature matches react-beautiful-dnd or similar
  const reorderItems = (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return; // Dropped outside a valid droppable
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return; // Dropped in the same place
    }

    setCurrentDefinition(prevDefinition => {
      let newItemsState = [...(prevDefinition.items || [])]; // Operate on a mutable copy

      let movedItemGlobal; // Store the item being moved

      // --- REMOVE FROM SOURCE --- 
      if (source.droppableId === 'report-items-droppable') { // Source is top-level
        // Find and remove from top-level, store the moved item
        const [removed] = newItemsState.splice(source.index, 1);
        movedItemGlobal = removed;
      } else { // Source is a section (droppableId is section.id)
        const sourceSectionIndex = newItemsState.findIndex(s => s.id === source.droppableId && s.type === 'section');
        if (sourceSectionIndex !== -1) {
          const sourceSection = { ...newItemsState[sourceSectionIndex] }; // shallow copy section
          sourceSection.elements = [...(sourceSection.elements || [])]; // shallow copy elements array
          const [removed] = sourceSection.elements.splice(source.index, 1);
          movedItemGlobal = removed;
          newItemsState[sourceSectionIndex] = sourceSection; // Update the section in the main list

          // If source section became empty, add default element
          if (sourceSection.elements.length === 0) {
            sourceSection.elements.push(createDefaultElement(sourceSection.id));
            newItemsState[sourceSectionIndex] = { ...sourceSection }; // Ensure re-assignment for state update
          }
        } else {
          console.error("Source section not found for reorder");
          return prevDefinition; // No change if source section is invalid
        }
      }

      if (!movedItemGlobal) {
        console.error("Could not find item to move");
        return prevDefinition; // Should not happen
      }

      // --- ADD TO DESTINATION --- 
      if (destination.droppableId === 'report-items-droppable') { // Destination is top-level
        movedItemGlobal.parentUUID = null; // Item is now top-level
        newItemsState.splice(destination.index, 0, movedItemGlobal);
      } else { // Destination is a section (droppableId is section.id)
        const destSectionIndex = newItemsState.findIndex(s => s.id === destination.droppableId && s.type === 'section');
        if (destSectionIndex !== -1) {
          const destSection = { ...newItemsState[destSectionIndex] }; // shallow copy section
          destSection.elements = [...(destSection.elements || [])]; // shallow copy elements array
          
          movedItemGlobal.parentUUID = destSection.id; // Update parentUUID to the new section
          destSection.elements.splice(destination.index, 0, movedItemGlobal);
          newItemsState[destSectionIndex] = destSection; // Update the section in the main list
        } else {
          console.error("Destination section not found for reorder. Item not moved.");
          // Revert: Add back to source (this is complex, for now, just log error)
          // A more robust solution would put it back exactly where it was.
          // For simplicity, current state might be slightly off if this rare error occurs.
          // The primary goal is to prevent crashes.
          return prevDefinition; 
        }
      }

      return { ...prevDefinition, items: newItemsState };
    });
    setHasUnsavedChanges(true);
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
              <MenuItem onClick={() => handleExportFormat('pdf')}>Export as PDF (.pdf)</MenuItem>
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
            onGenerateReport={handleGenerateReport}
            setGeneratingElements={setGeneratingElements}
            setScrollToElementId={setScrollToElementId}
            setHighlightElementId={setHighlightElementId}
            updateElement={updateElement}
            addItem={addItem} // Renamed from addElement
            deleteItem={deleteItem} // Renamed from deleteElement
            reorderItems={reorderItems} 
          />
        </Box>
        <Box className={classes.rightPanel}>
          <ReportPreviewPanel 
            items={(currentDefinition.items || []).flatMap(item => item.type === 'section' ? (item.elements || []) : item)} // Flatten for preview
            scrollToElementId={scrollToElementId}
            highlightElementId={highlightElementId}
            setScrollToElementId={setScrollToElementId}
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