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
    width: '100%',
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
    flex: 1,
    fontWeight: 500,
    fontSize: '0.95rem',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(0.25),
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

function ReportConfigPanel({ definition, onChange, currentReportId, onRegenerateSection, isGenerating, generatingElements = {} }) {
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

  // New generic handler for simple field changes
  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    onChange({ type: 'UPDATE_REPORT_FIELD', field: name, value: value });
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
                      className={classes.typeToggleButton}
                      variant={element.type === 'explicit' ? 'contained' : 'outlined'}
                      color={element.type === 'explicit' ? 'primary' : 'default'}
                      onClick={() => handleElementChange(element.id || index, 'type', 'explicit')}
                    >
                      Explicit
                    </Button>
                    <Button
                      className={classes.typeToggleButton}
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

                  {element.type === 'generative' && onRegenerateSection && (
                    <Tooltip 
                      title={
                        <Typography variant="body2">
                          {element.ai_generated_content ? 
                            "Regenerate this section's content. The AI will analyze the full report context to ensure the new content maintains consistency with all other sections." :
                            "Generate this section's content. The AI will analyze the full report context to ensure content is consistent with all other sections."}
                        </Typography>
                      }
                      classes={{ tooltip: classes.regenerateTooltip }}
                      placement="top"
                    >
                      <Button
                        variant="contained"
                        disabled={isGenerating}
                        className={classes.regenerateButton}
                        size="small"
                        onClick={() => onRegenerateSection(element.id)}
                        startIcon={generatingElements[element.id]?.status === 'generating' ? <CircularProgress size={16} color="inherit" /> : null}
                      >
                        {element.ai_generated_content ? 'Regenerate' : 'Generate'}
                      </Button>
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
                      value={isBulletFormat(element) ? getBulletItems(element).join('\\n') : element.content || ''}
                      onChange={(e) => {
                        if (isBulletFormat(element)) {
                          handleBulletChange(element.id || index, e.target.value, element);
                        } else {
                          handleElementChange(element.id || index, 'content', e.target.value);
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
                          element.id || index,
                          'content',
                          element.content || '',
                          `Edit Content for ${element.title || 'Element ' + (index + 1)}`,
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
                      onChange={(e) => handleElementChange(element.id || index, 'instructions', e.target.value)}
                    />
                    <Tooltip title="Open Fullscreen Editor">
                      <IconButton
                        size="small"
                        className={classes.expandButton}
                        onClick={() => handleOpenReportTextEditor(
                          element.id || index,
                          'instructions',
                          element.instructions || '',
                          `Edit AI Prompt for ${element.title || 'Element ' + (index + 1)}`,
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