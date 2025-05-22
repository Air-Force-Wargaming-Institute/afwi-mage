import React, { useEffect, useState, useContext } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  Paper, 
  makeStyles, 
  IconButton,
  ButtonGroup,
  Tooltip,
  Collapse,
  useTheme,
  CircularProgress
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import FormatListBulletedIcon from '@material-ui/icons/FormatListBulleted';
import FormatListNumberedIcon from '@material-ui/icons/FormatListNumbered';
import AutorenewIcon from '@material-ui/icons/Autorenew';
import RefreshIcon from '@material-ui/icons/Refresh';
import InfoIcon from '@material-ui/icons/Info';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import CallReceivedIcon from '@material-ui/icons/CallReceived';
import { GradientText, SubtleGlowPaper } from '../../styles/StyledComponents';
import { getGatewayUrl } from '../../config';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import ReportTextEditorModal from './ReportTextEditorModal';
import FullscreenIcon from '@material-ui/icons/Fullscreen';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
  },
  configSection: {
    marginBottom: theme.spacing(1),
    position: 'relative',
    zIndex: 1,
  },
  elementsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  },
  elementItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.25),
    paddingTop: theme.spacing(1),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    paddingBottom: theme.spacing(0.25),
    position: 'relative',
    '&:hover .insertButtonOverlay': {
      opacity: 1,
    },
  },
  elementHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(0.25),
    borderBottom: `1px solid ${theme.palette.divider}`,
    paddingBottom: theme.spacing(0.25),
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    padding: theme.spacing(0.25),
    borderRadius: theme.shape.borderRadius,
  },
  elementTitleText: {
    fontWeight: 500,
    fontSize: '0.95rem',
  },
  elementActions: {
    display: 'flex',
    gap: theme.spacing(0.25),
  },
  elementControls: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeToggleButtonGroup: {
  },
  typeToggleButton: {
    minWidth: '36px',
    padding: theme.spacing(0.25, 1.5),
  },
  formatButtonGroup: {
  },
  formatButton: {
    minWidth: '36px',
    padding: theme.spacing(0.25, 0.5),
  },
  formatIconButton: {
    padding: theme.spacing(0.5),
  },
  insertButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
  },
  bulletList: {
    listStyleType: 'disc',
    paddingLeft: theme.spacing(1.5),
    margin: theme.spacing(0.5, 0),
  },
  bulletItem: {
    display: 'list-item',
    marginBottom: theme.spacing(0.25),
    '&:last-child': {
      marginBottom: 0,
    },
  },
  elementContent: {
    padding: theme.spacing(0.5),
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
    width: `calc(100% + ${theme.spacing(1) * 2}px)`,
    position: 'sticky',
    top: -theme.spacing(1),
    zIndex: 2,
    backgroundColor: `#121212`,
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    marginLeft: -theme.spacing(1),
    marginRight: -theme.spacing(1),
  },
  sectionContent: {
    marginLeft: theme.spacing(1),
    borderLeft: `2px solid ${theme.palette.divider}`,
    paddingLeft: theme.spacing(1),
  },
  collapseButton: {
    padding: theme.spacing(0.25),
    marginRight: theme.spacing(0.5),
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  elementTitle: {
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '0.95rem',
    padding: theme.spacing(0.25),
    borderRadius: theme.shape.borderRadius,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  elementTitleInput: {
    flex: 1,
    '& .MuiInputBase-root': {
      fontSize: '0.95rem',
      fontWeight: 500,
    },
    '& .MuiInputBase-input': {
      padding: theme.spacing(0.25),
    },
  },
  insertButtonOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    padding: theme.spacing(0.5),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTop: `1px solid ${theme.palette.divider}`,
    opacity: 0,
    transition: 'opacity 0.2s ease-in-out',
    zIndex: 1,
  },
  insertButton: {
    backgroundColor: theme.palette.background.paper,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  collapseAllButton: {
    marginLeft: 'auto',
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  regenerateButton: {
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
    backgroundColor: theme.palette.primary.light,
    color: '#fff',
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
    },
  },
  regenerateTooltip: {
    maxWidth: 280,
  },
  textFieldContainer: {
    position: 'relative',
    width: '100%',
  },
  expandButton: {
    position: 'absolute',
    right: theme.spacing(0.25),
    top: theme.spacing(0.25),
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    }
  },
}));

// Available format options
const formatOptions = [
  { value: 'paragraph', label: 'P' },
  { value: 'h1', label: 'H1' },
  { value: 'h2', label: 'H2' },
  { value: 'h3', label: 'H3' },
  { value: 'h4', label: 'H4' },
  { value: 'h5', label: 'H5' },
  { value: 'h6', label: 'H6' },
  { value: 'bulletList', label: 'Bullet List', icon: FormatListBulletedIcon },
  { value: 'numberedList', label: 'Numbered List', icon: FormatListNumberedIcon },
  // Add more formats like blockquote, code block if needed
];

function ReportConfigPanel({ definition, onChange, currentReportId, onRegenerateSection, isGenerating, generatingElements = {}, isNewReport }) {
  const classes = useStyles();
  const theme = useTheme();
  const { token } = useContext(AuthContext);
  const [vectorStores, setVectorStores] = useState([]);
  const [isLoadingVectorStores, setIsLoadingVectorStores] = useState(false);
  const [vectorStoreError, setVectorStoreError] = useState(null);
  const [collapsedElements, setCollapsedElements] = useState({});
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const isTemplate = definition?.isTemplate || false;
  
  // State for the new Text Editor Modal
  const [isReportTextEditorOpen, setIsReportTextEditorOpen] = useState(false);
  const [reportTextEditorConfig, setReportTextEditorConfig] = useState({
    title: '',
    value: '',
    elementId: null,
    field: '',
    placeholder: '',
  });
  
  const fetchVectorStores = async () => {
    if (!token) return;
    
    setIsLoadingVectorStores(true);
    setVectorStoreError(null);
    try {
      const response = await axios.get(
        getGatewayUrl('/api/report_builder/vector_stores'),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setVectorStores(response.data);
    } catch (error) {
      console.error('Error fetching vector stores:', error);
      setVectorStoreError(error.response?.data?.detail || error.message);
      setVectorStores([]);
    } finally {
      setIsLoadingVectorStores(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const templateKey = urlParams.get('templateKey');

    if (templateKey && currentReportId && (!definition || !definition.items || definition.items.length === 0)) {
      try {
        const templateDataString = sessionStorage.getItem(templateKey);
        if (templateDataString) {
          const template = JSON.parse(templateDataString); // template is already in the new format
          
          // Process template items (now using items instead of prebuiltElements)
          const processedItems = (template.items || template.prebuiltElements || []).map((item, index) => {
            if (item.item_type === 'section') {
              // Process section and its child elements
              const processedElements = (item.elements || []).map((element, elemIndex) => ({
                ...element,
                id: `${template.id || 'template'}-${item.title || 'section'}-elem-${elemIndex}-${Date.now()}`,
              }));
              return {
                ...item,
                id: `${template.id || 'template'}-section-${index}-${Date.now()}`,
                elements: processedElements
              };
            } else {
              // Standalone element
              return {
                ...item,
                id: `${template.id || 'template'}-${item.title ? item.title.replace(/\s+/g, '-').toLowerCase() : 'element'}-${index}-${Date.now()}`,
              };
            }
          });

          onChange({
            id: currentReportId,
            title: template.name || 'New Report from Template',
            description: template.description || '',
            items: processedItems,
            vectorStoreId: template.vectorStoreId || ''
          });
        }
      } catch (error) {
        console.error('Error processing template data from sessionStorage:', error);
      }
    }
  }, [definition, onChange, currentReportId]);

  // Helper functions for managing items structure
  const getAllElements = (items) => {
    const allElements = [];
    items.forEach(item => {
      if (item.item_type === 'element') {
        allElements.push(item);
      } else if (item.item_type === 'section' && item.elements) {
        allElements.push(...item.elements);
      }
    });
    return allElements;
  };

  const findElementInItems = (items, elementId) => {
    for (const item of items) {
      if (item.item_type === 'element' && item.id === elementId) {
        return { element: item, parent: null, parentIndex: null, elementIndex: items.indexOf(item) };
      } else if (item.item_type === 'section' && item.elements) {
        for (let i = 0; i < item.elements.length; i++) {
          if (item.elements[i].id === elementId) {
            return { element: item.elements[i], parent: item, parentIndex: items.indexOf(item), elementIndex: i };
          }
        }
      }
    }
    return null;
  };

  const updateElementInItems = (items, elementId, field, value) => {
    return items.map(item => {
      if (item.item_type === 'element' && item.id === elementId) {
        return { ...item, [field]: value };
      } else if (item.item_type === 'section' && item.elements) {
        const updatedElements = item.elements.map(element => 
          element.id === elementId ? { ...element, [field]: value } : element
        );
        return { ...item, elements: updatedElements };
      }
      return item;
    });
  };

  const deleteElementFromItems = (items, elementId) => {
    return items.map(item => {
      if (item.item_type === 'section' && item.elements) {
        const updatedElements = item.elements.filter(element => element.id !== elementId);
        // If section becomes empty, auto-add a new element
        if (updatedElements.length === 0) {
          updatedElements.push(createNewElement());
        }
        return { ...item, elements: updatedElements };
      }
      return item;
    }).filter(item => !(item.item_type === 'element' && item.id === elementId));
  };

  const handleDeleteSection = (sectionId) => {
    const sectionToDelete = (definition?.items || []).find(item => item.item_type === 'section' && item.id === sectionId);
    if (!sectionToDelete) return;

    const updatedItems = [];
    const sectionIndex = (definition?.items || []).findIndex(item => item.id === sectionId);
    
    // Add all items before the section
    updatedItems.push(...(definition?.items || []).slice(0, sectionIndex));
    
    // Add the child elements of the deleted section as standalone elements
    if (sectionToDelete.elements) {
      sectionToDelete.elements.forEach(element => {
        updatedItems.push({
          ...element,
          item_type: 'element',
          parent_uuid: null // Make them unparented
        });
      });
    }
    
    // Add all items after the section
    updatedItems.push(...(definition?.items || []).slice(sectionIndex + 1));
    
    onChange({ ...definition, items: updatedItems });
  };

  const handleRemoveElementFromSection = (elementId) => {
    const found = findElementInItems(definition?.items || [], elementId);
    if (!found || !found.parent) return; // Element is not in a section
    
    const updatedItems = [];
    
    (definition?.items || []).forEach((item, index) => {
      if (item.item_type === 'section' && item.id === found.parent.id) {
        // Remove element from this section
        const updatedElements = item.elements.filter(el => el.id !== elementId);
        
        // If section becomes empty, add a new element
        if (updatedElements.length === 0) {
          updatedElements.push(createNewElement());
        }
        
        updatedItems.push({ ...item, elements: updatedElements });
        
        // Add the removed element as a standalone element right after the section
        updatedItems.push({
          ...found.element,
          item_type: 'element',
          parent_uuid: null
        });
      } else {
        updatedItems.push(item);
      }
    });
    
    onChange({ ...definition, items: updatedItems });
  };

  const handleAddElementToSectionAbove = (elementId) => {
    const elementIndex = (definition?.items || []).findIndex(item => item.item_type === 'element' && item.id === elementId);
    if (elementIndex <= 0) return; // No element found or no section above
    
    // Find the section directly above this element
    let sectionAbove = null;
    for (let i = elementIndex - 1; i >= 0; i--) {
      if ((definition?.items || [])[i].item_type === 'section') {
        sectionAbove = (definition?.items || [])[i];
        break;
      }
    }
    
    if (!sectionAbove) return; // No section found above
    
    const elementToMove = (definition?.items || []).find(item => item.id === elementId);
    if (!elementToMove) return;
    
    const updatedItems = (definition?.items || []).map(item => {
      if (item.item_type === 'section' && item.id === sectionAbove.id) {
        // Add element to this section
        return {
          ...item,
          elements: [...item.elements, { ...elementToMove, parent_uuid: item.id }]
        };
      }
      return item;
    }).filter(item => !(item.item_type === 'element' && item.id === elementId)); // Remove from root level
    
    onChange({ ...definition, items: updatedItems });
  };

  // New generic handler for simple field changes
  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    onChange({ type: 'UPDATE_REPORT_FIELD', field: name, value: value });
  };

  const createNewElement = () => ({
    id: `element-${Date.now()}`,
    item_type: 'element',
    type: 'explicit',
    format: 'paragraph',
    content: '',
    instructions: '',
    ai_generated_content: null,
    parent_uuid: null
  });

  const createNewSection = () => ({
    id: `section-${Date.now()}`,
    item_type: 'section',
    title: 'New Section',
    elements: [createNewElement()]
  });

  const handleAddElement = () => {
    const newElement = createNewElement();
    const newItems = [...(definition?.items || []), newElement];
    onChange({ ...definition, items: newItems });
  };

  const handleAddSection = () => {
    const newSection = createNewSection();
    const newItems = [...(definition?.items || []), newSection];
    onChange({ ...definition, items: newItems });
  };

  const handleInsertElementBelow = (index) => {
    const newElement = createNewElement();
    const newItems = [...(definition?.items || [])];
    newItems.splice(index + 1, 0, newElement);
    onChange({ ...definition, items: newItems });
  };

  const handleInsertSectionBelow = (index) => {
    const newSection = createNewSection();
    const newItems = [...(definition?.items || [])];
    newItems.splice(index + 1, 0, newSection);
    onChange({ ...definition, items: newItems });
  };

  const handleInsertElementBelowSection = (index) => {
    const newElement = createNewElement();
    const newItems = [...(definition?.items || [])];
    newItems.splice(index + 1, 0, newElement);
    onChange({ ...definition, items: newItems });
  };

  const handleInsertElementInSection = (sectionId, elementIndex) => {
    const newElement = createNewElement();
    const updatedItems = (definition?.items || []).map(item => {
      if (item.item_type === 'section' && item.id === sectionId) {
        const updatedElements = [...item.elements];
        updatedElements.splice(elementIndex + 1, 0, newElement);
        return { ...item, elements: updatedElements };
      }
      return item;
    });
    onChange({ ...definition, items: updatedItems });
  };

  const handleElementChange = (elementId, field, value) => {
    const updatedItems = updateElementInItems(definition?.items || [], elementId, field, value);
    
    // Special handling when switching between element types
    if (field === 'type') {
      const updatedItemsWithTypeSwitch = updatedItems.map(item => {
        if (item.item_type === 'element' && item.id === elementId) {
          const updatedElement = { ...item };
          if (value === 'explicit') {
            // Ensure required fields exist for explicit elements
            if (updatedElement.ai_generated_content === undefined) {
              updatedElement.ai_generated_content = null;
            }
            if (updatedElement.instructions === undefined) {
              updatedElement.instructions = '';
            }
          } else if (value === 'generative') {
            // Ensure required fields exist for generative elements
            if (updatedElement.content === undefined) {
              updatedElement.content = '';
            }
            if (updatedElement.instructions === undefined) {
              updatedElement.instructions = '';
            }
            if (updatedElement.ai_generated_content === undefined) {
              updatedElement.ai_generated_content = null;
            }
          }
          return updatedElement;
        } else if (item.item_type === 'section' && item.elements) {
          const updatedElements = item.elements.map(element => {
            if (element.id === elementId) {
              const updatedElement = { ...element };
              if (value === 'explicit') {
                if (updatedElement.ai_generated_content === undefined) {
                  updatedElement.ai_generated_content = null;
                }
                if (updatedElement.instructions === undefined) {
                  updatedElement.instructions = '';
                }
              } else if (value === 'generative') {
                if (updatedElement.content === undefined) {
                  updatedElement.content = '';
                }
                if (updatedElement.instructions === undefined) {
                  updatedElement.instructions = '';
                }
                if (updatedElement.ai_generated_content === undefined) {
                  updatedElement.ai_generated_content = null;
                }
              }
              return updatedElement;
            }
            return element;
          });
          return { ...item, elements: updatedElements };
        }
        return item;
      });
      onChange({ ...definition, items: updatedItemsWithTypeSwitch });
    } else {
      onChange({ ...definition, items: updatedItems });
    }
  };

  const handleDeleteElement = (elementId) => {
    const updatedItems = deleteElementFromItems(definition?.items || [], elementId);
    onChange({ ...definition, items: updatedItems });
  };

  const handleMoveElement = (index, direction) => {
    // For now, this only handles root-level items movement
    // TODO: Add logic for moving elements within sections
    const newItems = [...(definition?.items || [])];
    if (index < 0 || index >= newItems.length) return;
    const item = newItems.splice(index, 1)[0];
    const newIndex = index + direction;
    const clampedIndex = Math.max(0, Math.min(newIndex, newItems.length));
    newItems.splice(clampedIndex, 0, item);
    onChange({ ...definition, items: newItems });
  };

  const isBulletFormat = (element) => {
    return element.format === 'bulletList';
  };

  const getBulletItems = (element) => {
    if (element.type === 'bulletList') {
      return element.items;
    }
    if (element.format === 'bulletList') {
      return element.content ? element.content.split('\n') : [];
    }
    return [];
  };

  const handleBulletChange = (elementId, value, element) => {
    const items = value.split('\n').filter(item => item.trim() !== '');
    if (element.type === 'bulletList') {
      handleElementChange(elementId, 'items', items);
    } else {
      handleElementChange(elementId, 'content', value);
    }
  };

  const toggleElement = (elementId) => {
    setCollapsedElements(prev => ({
      ...prev,
      [elementId]: !prev[elementId]
    }));
  };

  const handleTitleClick = (elementId, e) => {
    e.stopPropagation();
    setEditingTitle(elementId);
    
    // Find the item (could be section or element) using the helper function
    const found = findElementInItems(definition?.items || [], elementId);
    let currentTitle = '';
    
    if (found) {
      currentTitle = found.element.title || '';
    } else {
      // Check if it's a section
      const section = (definition?.items || []).find(item => item.item_type === 'section' && item.id === elementId);
      if (section) {
        currentTitle = section.title || '';
      }
    }
    
    setEditingTitleValue(currentTitle);

    // If the element is currently collapsed, expand it when its title is clicked for editing.
    if (collapsedElements[elementId]) {
      toggleElement(elementId);
    }
  };

  const handleTitleChange = (e) => {
    setEditingTitleValue(e.target.value);
  };

  const saveTitleChange = (elementId) => {
    // Check if it's a section first
    const isSection = (definition?.items || []).find(item => item.item_type === 'section' && item.id === elementId);
    
    if (isSection) {
      // Handle section title change
      const updatedItems = (definition?.items || []).map(item => 
        item.id === elementId ? { ...item, title: editingTitleValue } : item
      );
      onChange({ ...definition, items: updatedItems });
    } else {
      // Handle element title change
      handleElementChange(elementId, 'title', editingTitleValue);
    }
    
    setEditingTitle(null);
  };

  const handleTitleKeyPress = (e, elementId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitleChange(elementId);
    }
  };

  const toggleAllElements = (collapse) => {
    const newCollapsedState = {};
    (definition?.items || []).forEach(item => {
      if (item.item_type === 'element') {
        newCollapsedState[item.id] = collapse;
      } else if (item.item_type === 'section' && item.elements) {
        item.elements.forEach(element => {
          newCollapsedState[element.id] = collapse;
        });
      }
    });
    setCollapsedElements(newCollapsedState);
  };

  const areAllCollapsed = () => {
    return (definition?.items || []).every(item => {
      if (item.item_type === 'element') {
        return collapsedElements[item.id];
      } else if (item.item_type === 'section' && item.elements) {
        return item.elements.every(element => collapsedElements[element.id]);
      }
      return false;
    });
  };

  // Helper functions for the ReportTextEditorModal
  const handleOpenReportTextEditor = (elementId, field, currentValue, title, placeholder) => {
    setReportTextEditorConfig({
      elementId,
      field,
      value: currentValue,
      title,
      placeholder,
    });
    setIsReportTextEditorOpen(true);
  };

  const handleCloseReportTextEditor = () => {
    setIsReportTextEditorOpen(false);
  };

  const handleReportTextEditorSave = (newValue) => {
    const { elementId, field } = reportTextEditorConfig;
    if (elementId && field) {
      handleElementChange(elementId, field, newValue);
    }
    handleCloseReportTextEditor();
  };

  const handleMoveElementInSection = (sectionId, elementIndex, direction) => {
    const updatedItems = (definition?.items || []).map(item => {
      if (item.item_type === 'section' && item.id === sectionId) {
        const elements = [...item.elements];
        if (elementIndex < 0 || elementIndex >= elements.length) return item;
        
        const element = elements.splice(elementIndex, 1)[0];
        const newIndex = elementIndex + direction;
        const clampedIndex = Math.max(0, Math.min(newIndex, elements.length));
        elements.splice(clampedIndex, 0, element);
        
        return { ...item, elements };
      }
      return item;
    });
    onChange({ ...definition, items: updatedItems });
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.configSection}>
        <GradientText variant="h6" component="h2" gutterBottom>
          {isTemplate ? 'Template Configuration' : 'Report Configuration'}
        </GradientText>
        <TextField
          label={isTemplate ? "Template Title" : "Report Title"}
          value={definition?.title || ''}
          name="title"
          onChange={handleFieldChange}
          fullWidth
          style={{ marginBottom: theme.spacing(1) }}
          disabled={isTemplate && definition?.category === 'System'}
        />
        <TextField
          label="Description"
          value={definition?.description || ''}
          name="description"
          onChange={handleFieldChange}
          multiline
          rows={3}
          fullWidth
          style={{ marginBottom: theme.spacing(1) }}
        />
        {!isTemplate && (
          <FormControl fullWidth style={{ marginBottom: theme.spacing(1) }} disabled={isLoadingVectorStores || !!vectorStoreError}>
            <InputLabel id="vector-store-label">Vector Store</InputLabel>
            <Select
              labelId="vector-store-label"
              name="vectorStoreId"
              value={definition?.vectorStoreId || ''}
              onChange={handleFieldChange}
              onOpen={fetchVectorStores}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {isLoadingVectorStores && (
                <MenuItem disabled value="loading">
                  <em>Loading vector stores...</em>
                </MenuItem>
              )}
              {vectorStoreError && (
                <MenuItem disabled value="error">
                  <em>Error loading vector stores</em>
                </MenuItem>
              )}
              {vectorStores.length === 0 && (
                <MenuItem disabled value="none_available">
                  <em>None Available</em>
                </MenuItem>
              )}
              {vectorStores.length > 0 && 
                vectorStores.map(vs => (
                  <MenuItem key={vs.id} value={vs.id}>{vs.name}</MenuItem>
                ))
              }
            </Select>
          </FormControl>
        )}
      </Box>

      <Box className={classes.sectionHeader}>
        <GradientText variant="h6" component="h2">
          {isTemplate ? 'Template Elements' : 'Report Elements'}
        </GradientText>
        <Button
          size="small"
          variant="outlined"
          color="primary"
          onClick={() => toggleAllElements(!areAllCollapsed())}
          className={classes.collapseAllButton}
          startIcon={areAllCollapsed() ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        >
          {areAllCollapsed() ? 'Expand All' : 'Collapse All'}
        </Button>
      </Box>

      <Box className={classes.elementsContainer}>
        {(definition?.items || []).map((item, index) => {
          if (item.item_type === 'section') {
            // Render Section with its child elements
            return (
              <SubtleGlowPaper 
                key={item.id || index} 
                className={classes.elementItem} 
                elevation={2}
              >
                <Box className={classes.sectionHeader}>
                  <Box className={classes.sectionTitle}>
                    <IconButton 
                      size="small" 
                      className={classes.collapseButton}
                      onClick={() => toggleElement(item.id)}
                    >
                      {collapsedElements[item.id] ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                    </IconButton>
                    {editingTitle === item.id ? (
                      <TextField
                        className={classes.elementTitleInput}
                        value={editingTitleValue}
                        onChange={handleTitleChange}
                        onBlur={() => saveTitleChange(item.id)}
                        onKeyPress={(e) => handleTitleKeyPress(e, item.id)}
                        autoFocus
                        size="small"
                        variant="standard"
                      />
                    ) : (
                      <Typography 
                        className={classes.elementTitle}
                        onClick={(e) => handleTitleClick(item.id, e)}
                      >
                        📁 {item.title || `Section ${index + 1}`}
                      </Typography>
                    )}
                  </Box>
                  <Box className={classes.elementActions}>
                    <IconButton size="small" onClick={() => handleMoveElement(index, -1)} disabled={index === 0} title="Move Section Up">
                      <ArrowUpwardIcon fontSize="inherit"/>
                    </IconButton>
                    <IconButton size="small" onClick={() => handleMoveElement(index, 1)} disabled={index === (definition?.items?.length || 0) - 1} title="Move Section Down">
                      <ArrowDownwardIcon fontSize="inherit"/>
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteSection(item.id)} color="secondary" title="Delete Section">
                      <DeleteIcon fontSize="inherit"/>
                    </IconButton>
                  </Box>
                </Box>

                <Collapse in={!collapsedElements[item.id]}>
                  <Box className={classes.sectionContent}>
                    {/* Render child elements */}
                    {(item.elements || []).map((element, elemIndex) => (
                      <SubtleGlowPaper 
                        key={element.id || elemIndex} 
                        className={classes.elementItem} 
                        elevation={1}
                        onClick={() => toggleElement(element.id)}
                      >
                        <Box className={classes.elementHeader}>
                          <Box style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <IconButton 
                              size="small" 
                              className={classes.collapseButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleElement(element.id);
                              }}
                            >
                              {collapsedElements[element.id] ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                            </IconButton>
                            {editingTitle === element.id ? (
                              <TextField
                                className={classes.elementTitleInput}
                                value={editingTitleValue}
                                onChange={handleTitleChange}
                                onBlur={() => saveTitleChange(element.id)}
                                onKeyPress={(e) => handleTitleKeyPress(e, element.id)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                size="small"
                                variant="standard"
                              />
                            ) : (
                              <Typography 
                                className={classes.elementTitle}
                                onClick={(e) => handleTitleClick(element.id, e)}
                              >
                                📄 {element.title || `Element ${elemIndex + 1}`}
                              </Typography>
                            )}
                          </Box>
                          <Box className={classes.elementActions}>
                            <IconButton size="small" onClick={(e) => {
                              e.stopPropagation();
                              handleMoveElementInSection(item.id, elemIndex, -1);
                            }} disabled={elemIndex === 0} title="Move Element Up">
                              <ArrowUpwardIcon fontSize="inherit"/>
                            </IconButton>
                            <IconButton size="small" onClick={(e) => {
                              e.stopPropagation();
                              handleMoveElementInSection(item.id, elemIndex, 1);
                            }} disabled={elemIndex === (item.elements?.length || 0) - 1} title="Move Element Down">
                              <ArrowDownwardIcon fontSize="inherit"/>
                            </IconButton>
                            <IconButton size="small" onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteElement(element.id);
                            }} color="secondary" title="Delete Element">
                              <DeleteIcon fontSize="inherit"/>
                            </IconButton>
                            <Tooltip title="Remove from Section (make standalone)">
                              <IconButton size="small" onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveElementFromSection(element.id);
                              }} color="primary" title="Remove from Section">
                                <ExitToAppIcon fontSize="inherit"/>
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>

                        <Collapse in={!collapsedElements[element.id]}>
                          <Box className={classes.elementContent} onClick={(e) => e.stopPropagation()}>
                            <Box className={classes.elementControls}>
                              <ButtonGroup className={classes.typeToggleButtonGroup} size="small" aria-label="element type toggle">
                                <Button
                                  className={classes.typeToggleButton}
                                  variant={element.type === 'explicit' ? 'contained' : 'outlined'}
                                  color={element.type === 'explicit' ? 'primary' : 'default'}
                                  onClick={() => handleElementChange(element.id, 'type', 'explicit')}
                                >
                                  Explicit
                                </Button>
                                <Button
                                  className={classes.typeToggleButton}
                                  variant={element.type === 'generative' ? 'contained' : 'outlined'}
                                  color={element.type === 'generative' ? 'primary' : 'default'}
                                  onClick={() => handleElementChange(element.id, 'type', 'generative')}
                                >
                                  AI Gen
                                </Button>
                              </ButtonGroup>

                              {element.type === 'explicit' && (
                                <ButtonGroup className={classes.formatButtonGroup} size="small" aria-label="format options">
                                  {formatOptions.map(opt => {
                                    const isSelected = element.format === opt.value;
                                    const FormatIcon = opt.icon;
                                    return (
                                      FormatIcon ? (
                                        <Tooltip title={opt.label} key={opt.value}>
                                          <IconButton
                                            className={classes.formatIconButton}
                                            size="small"
                                            color={'primary'} 
                                            onClick={() => handleElementChange(element.id, 'format', opt.value)}
                                            style={{
                                              border: `1px solid ${theme.palette.primary.main}`,
                                              borderRadius: '4px',
                                              color: isSelected ? theme.palette.primary.contrastText : theme.palette.primary.main,
                                              backgroundColor: isSelected ? theme.palette.primary.main : 'transparent',
                                            }}
                                          >
                                            <FormatIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      ) : (
                                        <Button 
                                          key={opt.value}
                                          className={classes.formatButton}
                                          variant={isSelected ? 'contained' : 'outlined'}
                                          color={isSelected ? 'primary' : 'default'}
                                          onClick={() => handleElementChange(element.id, 'format', opt.value)}
                                        >
                                          {opt.label}
                                        </Button>
                                      )
                                    );
                                  })}
                                </ButtonGroup>
                              )}

                              {element.type === 'generative' && onRegenerateSection && (
                                <Tooltip 
                                  title={
                                    isNewReport ? "Please save the document before AI generation." :
                                    !definition?.id ? "Please save the document before AI generation." : (
                                      <Typography variant="body2">
                                        {element.ai_generated_content ? 
                                          "Regenerate this section's content. The AI will analyze the full report context to ensure the new content maintains consistency with all other sections." :
                                          "Generate this section's content. The AI will analyze the full report context to ensure content is consistent with all other sections."}
                                      </Typography>
                                    )
                                  }
                                  classes={{ tooltip: classes.regenerateTooltip }}
                                  placement="top"
                                >
                                  <span>
                                    <Button
                                      variant="contained"
                                      disabled={isGenerating || isNewReport || !definition?.id}
                                      className={classes.regenerateButton}
                                      size="small"
                                      onClick={() => onRegenerateSection(element.id)}
                                      startIcon={generatingElements[element.id]?.status === 'generating' ? <CircularProgress size={16} color="inherit" /> : null}
                                    >
                                      {element.ai_generated_content ? 'Regenerate' : 'Generate'}
                                    </Button>
                                  </span>
                                </Tooltip>
                              )}
                            </Box>
                            
                            {element.type === 'explicit' ? (
                              <Box className={classes.textFieldContainer}>
                                <TextField
                                  multiline
                                  rows={2}
                                  fullWidth
                                  variant="outlined"
                                  margin="dense"
                                  size="small"
                                  value={isBulletFormat(element) ? getBulletItems(element).join('\n') : element.content || ''}
                                  onChange={(e) => {
                                    if (isBulletFormat(element)) {
                                      handleBulletChange(element.id, e.target.value, element);
                                    } else {
                                      handleElementChange(element.id, 'content', e.target.value);
                                    }
                                  }}
                                  label={
                                    isBulletFormat(element) ? 
                                    'Content: Use line breaks for new items.' : 
                                    element.format === 'numberedList' ? 
                                    'Content: Use line breaks for new numbered items. Indent with spaces for sub-lists.' : 
                                    element.format === 'paragraph' ? 
                                    'Content: Line breaks will be preserved.' : 
                                    'Content: Formatting is controlled by the buttons above.'
                                  }
                                />
                                <Tooltip title="Open Fullscreen Editor">
                                  <IconButton
                                    size="small"
                                    className={classes.expandButton}
                                    onClick={() => handleOpenReportTextEditor(
                                      element.id,
                                      'content',
                                      element.content || '',
                                      `Edit Content for ${element.title || 'Element ' + (elemIndex + 1)}`,
                                      isBulletFormat(element) ? 'Enter bullet items (one item per line)...': 'Enter element content...'
                                    )}
                                  >
                                    <FullscreenIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ) : (
                              <Box className={classes.textFieldContainer}>
                                <TextField
                                  label="AI Prompt - Provide instructions for MAGE to generate this element."
                                  multiline
                                  rows={2}
                                  fullWidth
                                  variant="outlined"
                                  margin="dense"
                                  size="small"
                                  value={element.instructions || ''}
                                  onChange={(e) => handleElementChange(element.id, 'instructions', e.target.value)}
                                />
                                <Tooltip title="Open Fullscreen Editor">
                                  <IconButton
                                    size="small"
                                    className={classes.expandButton}
                                    onClick={() => handleOpenReportTextEditor(
                                      element.id,
                                      'instructions',
                                      element.instructions || '',
                                      `Edit AI Prompt for ${element.title || 'Element ' + (elemIndex + 1)}`,
                                      'Enter AI prompt instructions...'
                                    )}
                                  >
                                    <FullscreenIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
                          </Box>
                        </Collapse>

                        <Box className={classes.insertButtonContainer}>
                          <Button 
                            size="small"
                            variant="text"
                            color="primary" 
                            startIcon={<AddIcon />} 
                            onClick={(e) => { 
                              e.stopPropagation();
                              handleInsertElementInSection(item.id, elemIndex);
                            }}
                          >
                            Insert Element Below
                          </Button>
                        </Box>
                      </SubtleGlowPaper>
                    ))}
                  </Box>
                </Collapse>

                <Box className={classes.insertButtonContainer}>
                  <Button 
                    size="small"
                    variant="text"
                    color="primary" 
                    startIcon={<AddIcon />} 
                    onClick={(e) => { 
                      e.stopPropagation();
                      handleInsertElementBelowSection(index);
                    }}
                  >
                    Insert Element Below
                  </Button>
                  <Button 
                    size="small"
                    variant="text"
                    color="secondary" 
                    startIcon={<AddIcon />} 
                    onClick={(e) => { 
                      e.stopPropagation();
                      handleInsertSectionBelow(index);
                    }}
                  >
                    Insert Section Below
                  </Button>
                </Box>
              </SubtleGlowPaper>
            );
          } else {
            // Render standalone Element
            return (
              <SubtleGlowPaper 
                key={item.id || index} 
                className={classes.elementItem} 
                elevation={2}
                onClick={() => toggleElement(item.id)}
              >
                <Box className={classes.elementHeader}>
                  <Box style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <IconButton 
                      size="small" 
                      className={classes.collapseButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleElement(item.id);
                      }}
                    >
                      {collapsedElements[item.id] ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                    </IconButton>
                    {editingTitle === item.id ? (
                      <TextField
                        className={classes.elementTitleInput}
                        value={editingTitleValue}
                        onChange={handleTitleChange}
                        onBlur={() => saveTitleChange(item.id)}
                        onKeyPress={(e) => handleTitleKeyPress(e, item.id)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        size="small"
                        variant="standard"
                      />
                    ) : (
                      <Typography 
                        className={classes.elementTitle}
                        onClick={(e) => handleTitleClick(item.id, e)}
                      >
                        📄 {item.title || `Element ${index + 1}`}
                      </Typography>
                    )}
                  </Box>
                  <Box className={classes.elementActions}>
                    <IconButton size="small" onClick={(e) => {
                      e.stopPropagation();
                      handleMoveElement(index, -1);
                    }} disabled={index === 0} title="Move Element Up">
                      <ArrowUpwardIcon fontSize="inherit"/>
                    </IconButton>
                    <IconButton size="small" onClick={(e) => {
                      e.stopPropagation();
                      handleMoveElement(index, 1);
                    }} disabled={index === (definition?.items?.length || 0) - 1} title="Move Element Down">
                      <ArrowDownwardIcon fontSize="inherit"/>
                    </IconButton>
                    <IconButton size="small" onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteElement(item.id);
                    }} color="secondary" title="Delete Element">
                      <DeleteIcon fontSize="inherit"/>
                    </IconButton>
                    {/* Check if there's a section above this element */}
                    {(() => {
                      const elementIndex = (definition?.items || []).findIndex(it => it.id === item.id);
                      const hasSectionAbove = elementIndex > 0 && (definition?.items || []).slice(0, elementIndex).some(it => it.item_type === 'section');
                      return hasSectionAbove ? (
                        <Tooltip title="Add to Section Above">
                          <IconButton size="small" onClick={(e) => {
                            e.stopPropagation();
                            handleAddElementToSectionAbove(item.id);
                          }} color="primary" title="Add to Section Above">
                            <CallReceivedIcon fontSize="inherit"/>
                          </IconButton>
                        </Tooltip>
                      ) : null;
                    })()}
                  </Box>
                </Box>

                <Collapse in={!collapsedElements[item.id]}>
                  <Box className={classes.elementContent} onClick={(e) => e.stopPropagation()}>
                    <Box className={classes.elementControls}>
                      <ButtonGroup className={classes.typeToggleButtonGroup} size="small" aria-label="element type toggle">
                        <Button
                          className={classes.typeToggleButton}
                          variant={item.type === 'explicit' ? 'contained' : 'outlined'}
                          color={item.type === 'explicit' ? 'primary' : 'default'}
                          onClick={() => handleElementChange(item.id || index, 'type', 'explicit')}
                        >
                          Explicit
                        </Button>
                        <Button
                          className={classes.typeToggleButton}
                          variant={item.type === 'generative' ? 'contained' : 'outlined'}
                          color={item.type === 'generative' ? 'primary' : 'default'}
                          onClick={() => handleElementChange(item.id || index, 'type', 'generative')}
                        >
                          AI Gen
                        </Button>
                      </ButtonGroup>

                      {item.type === 'explicit' && (
                        <ButtonGroup className={classes.formatButtonGroup} size="small" aria-label="format options">
                          {formatOptions.map(opt => {
                            const isSelected = item.format === opt.value;
                            const FormatIcon = opt.icon;
                            return (
                              FormatIcon ? (
                                <Tooltip title={opt.label} key={opt.value}>
                                  <IconButton
                                    className={classes.formatIconButton}
                                    size="small"
                                    color={'primary'} 
                                    onClick={() => handleElementChange(item.id || index, 'format', opt.value)}
                                    style={{
                                      border: `1px solid ${theme.palette.primary.main}`,
                                      borderRadius: '4px',
                                      color: isSelected ? theme.palette.primary.contrastText : theme.palette.primary.main,
                                      backgroundColor: isSelected ? theme.palette.primary.main : 'transparent',
                                    }}
                                  >
                                    <FormatIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                <Button 
                                  key={opt.value}
                                  className={classes.formatButton}
                                  variant={isSelected ? 'contained' : 'outlined'}
                                  color={isSelected ? 'primary' : 'default'}
                                  onClick={() => handleElementChange(item.id || index, 'format', opt.value)}
                                >
                                  {opt.label}
                                </Button>
                              )
                            );
                          })}
                        </ButtonGroup>
                      )}

                      {item.type === 'generative' && onRegenerateSection && (
                        <Tooltip 
                          title={
                            isNewReport ? "Please save the document before AI generation." :
                            !definition?.id ? "Please save the document before AI generation." : (
                              <Typography variant="body2">
                                {item.ai_generated_content ? 
                                  "Regenerate this section's content. The AI will analyze the full report context to ensure the new content maintains consistency with all other sections." :
                                  "Generate this section's content. The AI will analyze the full report context to ensure content is consistent with all other sections."}
                              </Typography>
                            )
                          }
                          classes={{ tooltip: classes.regenerateTooltip }}
                          placement="top"
                        >
                          <span>
                            <Button
                              variant="contained"
                              disabled={isGenerating || isNewReport || !definition?.id}
                              className={classes.regenerateButton}
                              size="small"
                              onClick={() => onRegenerateSection(item.id)}
                              startIcon={generatingElements[item.id]?.status === 'generating' ? <CircularProgress size={16} color="inherit" /> : null}
                            >
                              {item.ai_generated_content ? 'Regenerate' : 'Generate'}
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </Box>
                    
                    {item.type === 'explicit' ? (
                      <Box className={classes.textFieldContainer}>
                        <TextField
                          multiline
                          rows={2}
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          size="small"
                          value={isBulletFormat(item) ? getBulletItems(item).join('\n') : item.content || ''}
                          onChange={(e) => {
                            if (isBulletFormat(item)) {
                              handleBulletChange(item.id || index, e.target.value, item);
                            } else {
                              handleElementChange(item.id || index, 'content', e.target.value);
                            }
                          }}
                          label={
                            isBulletFormat(item) ? 
                            'Content: Use line breaks for new items.' : 
                            item.format === 'numberedList' ? 
                            'Content: Use line breaks for new numbered items. Indent with spaces for sub-lists.' : 
                            item.format === 'paragraph' ? 
                            'Content: Line breaks will be preserved.' : 
                            'Content: Formatting is controlled by the buttons above.'
                          }
                        />
                        <Tooltip title="Open Fullscreen Editor">
                          <IconButton
                            size="small"
                            className={classes.expandButton}
                            onClick={() => handleOpenReportTextEditor(
                              item.id || index,
                              'content',
                              item.content || '',
                              `Edit Content for ${item.title || 'Element ' + (index + 1)}`,
                              isBulletFormat(item) ? 'Enter bullet items (one item per line)...': 'Enter element content...'
                            )}
                          >
                            <FullscreenIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Box className={classes.textFieldContainer}>
                        <TextField
                          label="AI Prompt - Provide instructions for MAGE to generate this element."
                          multiline
                          rows={2}
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          size="small"
                          value={item.instructions || ''}
                          onChange={(e) => handleElementChange(item.id || index, 'instructions', e.target.value)}
                        />
                        <Tooltip title="Open Fullscreen Editor">
                          <IconButton
                            size="small"
                            className={classes.expandButton}
                            onClick={() => handleOpenReportTextEditor(
                              item.id || index,
                              'instructions',
                              item.instructions || '',
                              `Edit AI Prompt for ${item.title || 'Element ' + (index + 1)}`,
                              'Enter AI prompt instructions...'
                            )}
                          >
                            <FullscreenIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                </Collapse>

                <Box className={classes.insertButtonContainer}>
                  <Button 
                    size="small"
                    variant="text"
                    color="primary" 
                    startIcon={<AddIcon />} 
                    onClick={(e) => { 
                      e.stopPropagation();
                      handleInsertElementBelow(index);
                    }}
                  >
                    Insert Element Below
                  </Button>
                  <Button 
                    size="small"
                    variant="text"
                    color="secondary" 
                    startIcon={<AddIcon />} 
                    onClick={(e) => { 
                      e.stopPropagation();
                      handleInsertSectionBelow(index);
                    }}
                  >
                    Insert Section Below
                  </Button>
                </Box>
              </SubtleGlowPaper>
            );
          }
        })}
        {(definition?.items || []).length === 0 && (
          <Typography align="center" color="textSecondary" style={{ padding: '16px' }}>
            No items added yet. Use the buttons below to add the first element or section.
          </Typography>
        )}
      </Box>
      <Box style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'center' }}>
        <Button 
          variant="contained"
          color="primary" 
          startIcon={<AddIcon />} 
          onClick={handleAddElement}
        >
          Add Element
        </Button>
        <Button 
          variant="outlined"
          color="primary" 
          startIcon={<AddIcon />} 
          onClick={handleAddSection}
        >
          Add Section
        </Button>
      </Box>

      <ReportTextEditorModal
        open={isReportTextEditorOpen}
        onClose={handleCloseReportTextEditor}
        title={reportTextEditorConfig.title}
        value={reportTextEditorConfig.value}
        onChange={handleReportTextEditorSave}
        placeholder={reportTextEditorConfig.placeholder}
        // rows={15} // Optionally set a different default row count for this modal instance
      />
    </Box>
  );
}

export default ReportConfigPanel; 