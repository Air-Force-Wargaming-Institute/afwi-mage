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
  useTheme
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import FormatListBulletedIcon from '@material-ui/icons/FormatListBulleted';
import FormatListNumberedIcon from '@material-ui/icons/FormatListNumbered';
import { GradientText, SubtleGlowPaper } from '../../styles/StyledComponents';
import { getGatewayUrl } from '../../config';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2.5),
  },
  configSection: {
    marginBottom: theme.spacing(2),
  },
  elementsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
  },
  elementItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    padding: theme.spacing(1.5),
    position: 'relative',
    '&:hover .insertButtonOverlay': {
      opacity: 1,
    },
  },
  elementHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(0.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
    paddingBottom: theme.spacing(0.5),
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    padding: theme.spacing(0.5),
    borderRadius: theme.shape.borderRadius,
  },
  elementTitleText: {
    fontWeight: 500,
    fontSize: '0.95rem',
  },
  elementActions: {
    display: 'flex',
    gap: theme.spacing(0.5),
  },
  elementControls: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
    flexWrap: 'wrap',
  },
  typeToggleButtonGroup: {
  },
  formatButtonGroup: {
  },
  formatButton: {
    minWidth: '36px',
    padding: theme.spacing(0.5, 1),
  },
  formatIconButton: {
    padding: theme.spacing(0.75),
  },
  insertButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  bulletList: {
    listStyleType: 'disc',
    paddingLeft: theme.spacing(3),
    margin: theme.spacing(1, 0),
  },
  bulletItem: {
    display: 'list-item',
    marginBottom: theme.spacing(0.5),
    '&:last-child': {
      marginBottom: 0,
    },
  },
  elementContent: {
    padding: theme.spacing(1),
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
    width: '100%',
  },
  sectionContent: {
    marginLeft: theme.spacing(2),
    borderLeft: `2px solid ${theme.palette.divider}`,
    paddingLeft: theme.spacing(2),
  },
  collapseButton: {
    padding: theme.spacing(0.5),
    marginRight: theme.spacing(1),
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  elementTitle: {
    flex: 1,
    fontWeight: 500,
    fontSize: '0.95rem',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(0.5),
    },
  },
  elementTitleInput: {
    flex: 1,
    '& .MuiInputBase-root': {
      fontSize: '0.95rem',
      fontWeight: 500,
    },
    '& .MuiInputBase-input': {
      padding: theme.spacing(0.5),
    },
  },
  insertButtonOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    padding: theme.spacing(1),
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

function ReportConfigPanel({ definition, onChange, currentReportId }) {
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
  
  console.log('ReportConfigPanel - isTemplate:', isTemplate); // Debug logging
  console.log('ReportConfigPanel - definition:', definition); // Debug logging

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const templateKey = urlParams.get('templateKey');

    if (templateKey && currentReportId && (!definition || !definition.elements || definition.elements.length === 0)) {
      try {
        const templateDataString = sessionStorage.getItem(templateKey);
        if (templateDataString) {
          const template = JSON.parse(templateDataString); // template is already in the new format
          
          // Simplified processing: template.prebuiltElements are now in the correct format.
          // We just need to ensure unique IDs for elements within this new report instance.
          const processedElements = (template.prebuiltElements || []).map((element, index) => ({
            ...element, // Spread the element, which already has `format` and correct `content` structure
            id: `${template.id || 'template'}-${element.title ? element.title.replace(/\s+/g, '-').toLowerCase() : 'element'}-${index}-${Date.now()}`,
            // No need for derivedFormat or content processing logic here anymore.
          }));

          onChange({
            id: currentReportId,
            title: template.name || 'New Report from Template',
            description: template.description || '',
            elements: processedElements,
            vectorStoreId: template.vectorStoreId || ''
          });
          // sessionStorage.removeItem(templateKey); // Optional: Clear sessionStorage after use
        }
      } catch (error) {
        console.error('Error processing template data from sessionStorage:', error);
      }
    }
  }, [definition, onChange, currentReportId]);

  // Load vector stores from API
  useEffect(() => {
    const fetchVectorStores = async () => {
      if (!token) return; // Skip if no token available
      
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
    
    fetchVectorStores();
  }, [token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...definition, [name]: value });
  };

  const handleVectorStoreChange = (e) => {
    onChange({ ...definition, vectorStoreId: e.target.value });
  };

  const createNewElement = () => ({
    id: `element-${Date.now()}`,
    type: 'explicit',
    format: 'paragraph',
    content: '',
    instructions: '',
    ai_generated_content: null
  });

  const handleAddElement = () => {
    const newElement = createNewElement();
    const newElements = [...(definition?.elements || []), newElement];
    onChange({ ...definition, elements: newElements });
  };

  const handleInsertElementBelow = (index) => {
    const newElement = createNewElement();
    const newElements = [...(definition?.elements || [])];
    newElements.splice(index + 1, 0, newElement);
    onChange({ ...definition, elements: newElements });
  };

  const handleElementChange = (elementId, field, value) => {
    const newElements = (definition?.elements || []).map(el => {
      if (el.id === elementId) {
        const updatedElement = { ...el, [field]: value };
        
        // Special handling when switching between element types
        if (field === 'type') {
          if (value === 'explicit') {
            // Don't clear any fields when switching to explicit
            // Just ensure the required fields exist
            if (updatedElement.ai_generated_content === undefined) {
              updatedElement.ai_generated_content = null;
            }
            if (updatedElement.instructions === undefined) {
              updatedElement.instructions = '';
            }
          } else if (value === 'generative') {
            // Don't clear any fields when switching to generative
            // Just ensure the required fields exist
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
        }
        
        return updatedElement;
      }
      return el;
    });
    
    onChange({ ...definition, elements: newElements });
  };

  const handleDeleteElement = (elementId) => {
    const newElements = (definition?.elements || []).filter(el => el.id !== elementId);
    onChange({ ...definition, elements: newElements });
  };

  const handleMoveElement = (index, direction) => {
    const newElements = [...(definition?.elements || [])];
    if (index < 0 || index >= newElements.length) return;
    const item = newElements.splice(index, 1)[0];
    const newIndex = index + direction;
    const clampedIndex = Math.max(0, Math.min(newIndex, newElements.length));
    newElements.splice(clampedIndex, 0, item);
    onChange({ ...definition, elements: newElements });
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
    // Set the initial editing value to the current title (or empty string if null)
    const element = definition?.elements?.find(el => el.id === elementId);
    setEditingTitleValue(element?.title || '');
  };

  const handleTitleChange = (e) => {
    setEditingTitleValue(e.target.value);
  };

  const saveTitleChange = (elementId) => {
    handleElementChange(elementId, 'title', editingTitleValue);
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
    (definition?.elements || []).forEach(element => {
      newCollapsedState[element.id] = collapse;
    });
    setCollapsedElements(newCollapsedState);
  };

  const areAllCollapsed = () => {
    return (definition?.elements || []).every(element => collapsedElements[element.id]);
  };

  return (
    <Box className={classes.root}>
      <Box className={classes.configSection}>
        <GradientText variant="h6" component="h2" gutterBottom>
          {isTemplate ? 'Template Configuration' : 'Report Configuration'}
        </GradientText>
        <TextField 
          label={isTemplate ? "Template Title" : "Report Title"} 
          name="title" 
          value={definition?.title || ''} 
          onChange={handleInputChange} 
          fullWidth 
          margin="dense" 
          variant="outlined" 
          size="small"
        />
        <TextField 
          label={isTemplate ? "Template Description" : "Report Description"} 
          name="description" 
          value={definition?.description || ''} 
          onChange={handleInputChange} 
          fullWidth 
          margin="dense" 
          variant="outlined" 
          multiline 
          rows={2}
          size="small"
        />
        {!isTemplate && (
          <FormControl fullWidth margin="dense" variant="outlined" size="small">
            <InputLabel>Vector Store</InputLabel>
            <Select
              value={vectorStores.length === 0 ? "none_available" : (definition?.vectorStoreId || '')}
              onChange={handleVectorStoreChange}
              label="Vector Store"
              disabled={isLoadingVectorStores || vectorStores.length === 0}
            >
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
              {vectorStores.length > 0 && (
                <MenuItem value="">
                  <em>None</em>
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
        {(definition?.elements || []).map((element, index) => (
          <SubtleGlowPaper key={element.id || index} className={classes.elementItem} elevation={2}>
            <Box 
              className={classes.elementHeader}
              onClick={() => toggleElement(element.id)}
            >
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
                    {element.title || `Element ${index + 1}`}
                  </Typography>
                )}
              </Box>
              <Box className={classes.elementActions}>
                <IconButton size="small" onClick={(e) => {
                  e.stopPropagation();
                  handleMoveElement(index, -1);
                }} disabled={index === 0} title="Move Up">
                  <ArrowUpwardIcon fontSize="inherit"/>
                </IconButton>
                <IconButton size="small" onClick={(e) => {
                  e.stopPropagation();
                  handleMoveElement(index, 1);
                }} disabled={index === (definition?.elements?.length || 0) - 1} title="Move Down">
                  <ArrowDownwardIcon fontSize="inherit"/>
                </IconButton>
                <IconButton size="small" onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteElement(element.id);
                }} color="secondary" title="Delete Element">
                  <DeleteIcon fontSize="inherit"/>
                </IconButton>
              </Box>
            </Box>

            <Collapse in={!collapsedElements[element.id]}>
              <Box className={classes.elementContent}>
                <Box className={classes.elementControls}>
                  <ButtonGroup className={classes.typeToggleButtonGroup} size="small" aria-label="element type toggle">
                    <Button
                      className={classes.formatButton}
                      variant={element.type === 'explicit' ? 'contained' : 'outlined'}
                      color={element.type === 'explicit' ? 'primary' : 'default'}
                      onClick={() => handleElementChange(element.id || index, 'type', 'explicit')}
                    >
                      Explicit
                    </Button>
                    <Button
                      className={classes.formatButton}
                      variant={element.type === 'generative' ? 'contained' : 'outlined'}
                      color={element.type === 'generative' ? 'primary' : 'default'}
                      onClick={() => handleElementChange(element.id || index, 'type', 'generative')}
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
                                onClick={() => handleElementChange(element.id || index, 'format', opt.value)}
                                style={{
                                  border: `1px solid ${theme.palette.primary.main}`, // Always use primary color for border
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
                              onClick={() => handleElementChange(element.id || index, 'format', opt.value)}
                            >
                              {opt.label}
                            </Button>
                          )
                        );
                      })}
                    </ButtonGroup>
                  )}
                </Box>
                
                {element.type === 'explicit' ? (
                  <TextField
                    label="Content"
                    multiline
                    rows={3}
                    fullWidth
                    variant="outlined"
                    margin="dense"
                    size="small"
                    value={isBulletFormat(element) ? getBulletItems(element).join('\n') : element.content || ''}
                    onChange={(e) => {
                      if (isBulletFormat(element)) {
                        handleBulletChange(element.id || index, e.target.value, element);
                      } else {
                        handleElementChange(element.id || index, 'content', e.target.value);
                      }
                    }}
                    helperText={
                      isBulletFormat(element) ? 
                      'Enter list items. Use line breaks (Enter) for new items.' : 
                      element.format === 'numberedList' ? 
                      'Enter list items. Use line breaks (Enter) for new items. Indent with spaces for sub-lists (numbering is automatic).' : 
                      element.format === 'paragraph' ? 
                      'Enter text. Line breaks (Enter) will be preserved.' : 
                      'Enter text content here. Formatting is controlled by the buttons above.'
                    }
                  />
                ) : (
                  <TextField
                    label="AI Instructions"
                    multiline
                    rows={3}
                    fullWidth
                    variant="outlined"
                    margin="dense"
                    size="small"
                    value={element.instructions || ''}
                    onChange={(e) => handleElementChange(element.id || index, 'instructions', e.target.value)}
                    helperText="Provide clear instructions for the AI to generate this element."
                  />
                )}
              </Box>
            </Collapse>

            <Box className={classes.insertButtonContainer}>
              <Button 
                size="small"
                variant="text"
                color="primary" 
                startIcon={<AddIcon />} 
                onClick={() => handleInsertElementBelow(index)}
              >
                Insert Element Below
              </Button>
            </Box>
          </SubtleGlowPaper>
        ))}
        {(definition?.elements || []).length === 0 && (
          <Typography align="center" color="textSecondary" style={{ padding: '16px' }}>
            No elements added yet. Use the button below to add the first element.
          </Typography>
        )}
      </Box>
      <Button 
        variant="contained"
        color="primary" 
        startIcon={<AddIcon />} 
        onClick={handleAddElement}
        style={{ marginTop: '16px', alignSelf: 'center' }}
      >
        Add Element to End
      </Button>
    </Box>
  );
}

export default ReportConfigPanel; 