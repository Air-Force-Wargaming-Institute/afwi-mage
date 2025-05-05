import React from 'react';
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
  Tooltip
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import FormatListBulletedIcon from '@material-ui/icons/FormatListBulleted';
import FormatListNumberedIcon from '@material-ui/icons/FormatListNumbered';
import { GradientText, SubtleGlowPaper } from '../../styles/StyledComponents';

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
  },
  elementHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(0.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
    paddingBottom: theme.spacing(0.5),
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
    marginTop: theme.spacing(1),
    paddingTop: theme.spacing(1),
    borderTop: `1px dashed ${theme.palette.divider}`,
  }
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
  { value: 'bullet', label: 'Bullet List', icon: FormatListBulletedIcon },
  { value: 'numbered', label: 'Numbered List', icon: FormatListNumberedIcon },
  // Add more formats like blockquote, code block if needed
];

// Mock data for vector stores
const mockVectorStores = [
  { id: 'vs1', name: 'General Knowledge Base' },
  { id: 'vs2', name: 'Project Blue Book Docs' },
  { id: 'vs3', name: 'Historical Ops Data' },
];

function ReportConfigPanel({ definition, onChange }) {
  const classes = useStyles();
  const [vectorStores, setVectorStores] = React.useState(mockVectorStores);

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
    const newElements = (definition?.elements || []).map(el => 
      el.id === elementId ? { ...el, [field]: value } : el
    );
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

  return (
    <Box className={classes.root}>
      <Box className={classes.configSection}>
        <GradientText variant="h6" component="h2" gutterBottom>
          Report Configuration
        </GradientText>
        <TextField 
          label="Report Title" 
          name="title" 
          value={definition?.title || ''} 
          onChange={handleInputChange} 
          fullWidth 
          margin="dense" 
          variant="outlined" 
          size="small"
        />
        <TextField 
          label="Report Description" 
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
        <FormControl fullWidth margin="dense" variant="outlined" size="small">
          <InputLabel>Vector Store</InputLabel>
          <Select
            value={definition?.vectorStoreId || ''}
            onChange={handleVectorStoreChange}
            label="Vector Store"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {vectorStores.map(vs => (
              <MenuItem key={vs.id} value={vs.id}>{vs.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <GradientText variant="h6" component="h2" gutterBottom>
        Report Elements
      </GradientText>
      <Box className={classes.elementsContainer}>
        {(definition?.elements || []).map((element, index) => (
          <SubtleGlowPaper key={element.id} className={classes.elementItem} elevation={2}>
            <Box className={classes.elementHeader}>
              <Typography variant="subtitle1" className={classes.elementTitleText}>Element {index + 1}</Typography>
              <Box className={classes.elementActions}>
                <IconButton size="small" onClick={() => handleMoveElement(index, -1)} disabled={index === 0} title="Move Up">
                  <ArrowUpwardIcon fontSize="inherit"/>
                </IconButton>
                <IconButton size="small" onClick={() => handleMoveElement(index, 1)} disabled={index === (definition?.elements?.length || 0) - 1} title="Move Down">
                  <ArrowDownwardIcon fontSize="inherit"/>
                </IconButton>
                <IconButton size="small" onClick={() => handleDeleteElement(element.id)} color="secondary" title="Delete Element">
                  <DeleteIcon fontSize="inherit"/>
                </IconButton>
              </Box>
            </Box>

            <Box className={classes.elementControls}>
              <ButtonGroup className={classes.typeToggleButtonGroup} size="small" aria-label="element type toggle">
                <Button
                  className={classes.formatButton}
                  variant={element.type === 'explicit' ? 'contained' : 'outlined'}
                  color={element.type === 'explicit' ? 'primary' : 'default'}
                  onClick={() => handleElementChange(element.id, 'type', 'explicit')}
                >
                  Explicit
                </Button>
                <Button
                  className={classes.formatButton}
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
                            color={isSelected ? 'primary' : 'default'}
                            onClick={() => handleElementChange(element.id, 'format', opt.value)}
                            style={{ border: isSelected ? '1px solid' : '1px solid rgba(0, 0, 0, 0.23)', borderRadius: '4px' }}
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
                value={element.content || ''}
                onChange={(e) => handleElementChange(element.id, 'content', e.target.value)}
                helperText={
                  element.format === 'bullet' ? 
                  'Enter list items. Use line breaks (Enter) for new items. Indent with spaces for sub-lists.' : 
                  element.format === 'numbered' ? 
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
                onChange={(e) => handleElementChange(element.id, 'instructions', e.target.value)}
                helperText="Provide clear instructions for the AI to generate this element."
              />
            )}

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