import React, { useState, useContext } from 'react';
import { 
  Paper, 
  Typography, 
  Button, 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction,
  IconButton,
  Divider, 
  makeStyles,
  CircularProgress,
  Snackbar,
  Input,
  TextField
} from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import VerifiedUserIcon from '@material-ui/icons/VerifiedUser';
import ExtensionIcon from '@material-ui/icons/Extension';
import { GradientText } from '../../styles/StyledComponents'; // Import GradientText
import { AuthContext } from '../../contexts/AuthContext';
import axios from 'axios';
import { getGatewayUrl } from '../../config';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(1.5),
    height: '100%', // Make it take full height of its container
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.paper, // Ensure background color
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    border: `1px solid ${theme.palette.divider}`,
    borderBottomLeftRadius: theme.shape.borderRadius * 2,
    borderBottomRightRadius: theme.shape.borderRadius * 2,
  },
  subtitle: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5),
    marginTop: theme.spacing(1),
    fontWeight: 500,
  },
  templateList: {
    flexGrow: 1,
    overflowY: 'auto',
    overflowX: 'hidden', // Prevent horizontal scrolling
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1, 0.5),
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: theme.palette.background.default,
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.action.hover,
      borderRadius: '4px',
      '&:hover': {
        background: theme.palette.action.selected,
      },
    },
    '&::-webkit-scrollbar-corner': {
      background: 'transparent',
    },
  },
  templateItem: {
    cursor: 'pointer',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1.5),
    padding: theme.spacing(1, 1.5),
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'visible',
    backgroundColor: theme.palette.background.paper,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      borderColor: theme.palette.primary.light,
    },
    '&:active': {
      transform: 'translateY(0)',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: -2,
      left: 0,
      width: 0,
      height: 2,
      backgroundColor: theme.palette.primary.main,
      transition: 'width 0.3s ease',
    },
    '&:hover::after': {
      width: '100%',
    },
  },
  systemTemplate: {
    borderLeft: `4px solid ${theme.palette.secondary.main}`,
  },
  customTemplate: {
    borderLeft: `4px solid ${theme.palette.primary.main}`,
  },
  templateIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.text.secondary,
  },
  templateActions: {
    position: 'absolute',
    right: theme.spacing(1),
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    zIndex: 2,
  },
  useTemplateButton: {
    minWidth: 'auto',
    marginRight: theme.spacing(1),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
  },
  button: {
    marginBottom: theme.spacing(1),
    padding: theme.spacing(1.5),
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
    },
  },
  divider: {
    margin: theme.spacing(1, 0),
    backgroundColor: theme.palette.divider,
  },
  listItemText: {
    '& .MuiListItemText-primary': {
      fontWeight: 500,
      color: theme.palette.text.primary,
    },
    '& .MuiListItemText-secondary': {
      color: theme.palette.text.secondary,
      fontSize: '0.875rem',
    },
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(2),
    flexGrow: 1,
  },
  categoryBadge: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: 12,
    padding: '3px 8px',
    fontWeight: 600,
    marginRight: theme.spacing(1),
  },
  systemBadge: {
    backgroundColor: theme.palette.secondary.light,
    color: theme.palette.secondary.dark,
    border: `1px solid ${theme.palette.secondary.main}`,
  },
  customBadge: {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.dark,
    border: `1px solid ${theme.palette.primary.main}`,
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: theme.spacing(0.5),
  },
  templateNameClickable: {
    cursor: 'pointer',
    display: 'inline-block',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  templateDescription: {
    display: '-webkit-box',
    '-webkit-line-clamp': 2,
    '-webkit-box-orient': 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '1.4em',
    maxHeight: '2.8em',
    marginLeft: 32,
    whiteSpace: 'normal',
  },
}));

function NewReportOptions({ onCreateNew, onCreateTemplate, templates = [], refreshTemplates }) {
  const classes = useStyles();
  const { token } = useContext(AuthContext);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [editingTemplateName, setEditingTemplateName] = useState('');

  // Sort templates to show system templates at the top
  const getSortedTemplates = () => {
    if (!templates || templates.length === 0) return [];
    
    return [...templates].sort((a, b) => {
      // First sort by category - system templates (non-Custom) go first
      if (a.category === 'Custom' && b.category !== 'Custom') return 1;
      if (a.category !== 'Custom' && b.category === 'Custom') return -1;
      
      // If same category type, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  };

  const handleSelectTemplate = (template) => {
    if (editingTemplateId === template.id) {
      return;
    }
    onCreateNew({ type: 'template', data: template });
  };

  const handleDeleteTemplate = async (event, templateId) => {
    // Stop event propagation to prevent template selection
    event.stopPropagation();
    
    // Find the template to check if it's a system template
    const templateToDelete = templates.find(t => t.id === templateId);
    
    // Prevent deletion of system templates (those with category other than "Custom")
    if (!templateToDelete || templateToDelete.category !== 'Custom') {
      setSnackbarMessage('System templates cannot be deleted');
      setSnackbarOpen(true);
      return;
    }
    
    try {
      // Update the UI first for a more responsive experience
      // Note: This is just visual - the refreshTemplates will update with actual data from server
      const updatedTemplatesList = getSortedTemplates().filter(t => t.id !== templateId);
      const templatesList = document.querySelector(`.${classes.templateList}`);
      
      // Find and remove the template item from the DOM for immediate feedback
      const templateItem = document.querySelector(`[data-template-id="${templateId}"]`);
      if (templateItem) {
        // Add a fade-out animation
        templateItem.style.transition = 'opacity 0.3s ease';
        templateItem.style.opacity = '0';
        
        // Wait for animation to complete
        setTimeout(() => {
          // Call API to delete the template
          axios.delete(getGatewayUrl(`/api/report_builder/templates/${templateId}`), {
            headers: { Authorization: `Bearer ${token}` }
          })
          .then(() => {
            // Show success message
            setSnackbarMessage('Template deleted successfully');
            setSnackbarOpen(true);
            
            // Refresh templates to ensure data consistency
            if (refreshTemplates) {
              refreshTemplates();
            }
          })
          .catch(error => {
            console.error('Error deleting template:', error);
            setSnackbarMessage('Error deleting template');
            setSnackbarOpen(true);
            
            // Refresh to restore state on error
            if (refreshTemplates) {
              refreshTemplates();
            }
          });
        }, 300); // Match transition duration
      } else {
        // Fallback if DOM manipulation fails
        await axios.delete(getGatewayUrl(`/api/report_builder/templates/${templateId}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setSnackbarMessage('Template deleted successfully');
        setSnackbarOpen(true);
        
        if (refreshTemplates) {
          refreshTemplates();
        }
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      setSnackbarMessage('Error deleting template');
      setSnackbarOpen(true);
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const startEditTemplateName = (event, template) => {
    event.stopPropagation(); // Prevent ListItem's onClick
    if (template.category === 'Custom') {
      setEditingTemplateId(template.id);
      setEditingTemplateName(template.name);
    }
  };

  const cancelEditTemplateName = () => {
    setEditingTemplateId(null);
    setEditingTemplateName('');
  };

  const handleEditingNameChange = (event) => {
    setEditingTemplateName(event.target.value);
  };

  const handleEditingKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSaveTemplateName();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditTemplateName();
    }
  };
  
  // Modified to allow clicking away to save
  const handleSaveOrCancelEdit = (event) => {
    if (event.relatedTarget && event.relatedTarget.tagName !== 'INPUT') {
      handleSaveTemplateName();
    } else if (!event.relatedTarget) { 
      handleSaveTemplateName();
    }
  };

  const handleSaveTemplateName = async () => {
    if (!editingTemplateId || !editingTemplateName.trim()) {
      cancelEditTemplateName();
      if (editingTemplateId) refreshTemplates(); // Refresh if name was cleared to original
      return;
    }

    const originalTemplate = templates.find(t => t.id === editingTemplateId);
    if (originalTemplate && originalTemplate.name === editingTemplateName.trim()) {
      cancelEditTemplateName();
      return; // Name hasn't changed
    }

    try {
      await axios.put(
        getGatewayUrl(`/api/report_builder/templates/${editingTemplateId}`),
        { name: editingTemplateName.trim() },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      setSnackbarMessage('Template name updated successfully');
      setSnackbarOpen(true);
      refreshTemplates(); // Refresh the list from the server
    } catch (e) {
      console.error("Failed to update template name:", e);
      setSnackbarMessage(`Error updating template name: ${e.response?.data?.detail || e.message}`);
      setSnackbarOpen(true);
    } finally {
      cancelEditTemplateName();
    }
  };

  return (
    <Paper className={classes.root} elevation={3}>
      <GradientText variant="h6" component="h2" gutterBottom>
        Create New Report
      </GradientText>
      
      <Button 
        variant="contained" 
        color="primary" 
        fullWidth 
        onClick={() => onCreateNew({ type: 'custom' })}
        className={classes.button}
      >
        Design Custom Report
      </Button>

      <Divider className={classes.divider} />

      <Typography variant="subtitle1" gutterBottom className={classes.subtitle} align="left">
        From Template:
      </Typography>
      
      {templates.length === 0 ? (
        <Box className={classes.loadingContainer}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <List className={classes.templateList} dense>
          {getSortedTemplates().map((template) => (
            <ListItem 
              key={template.id}
              data-template-id={template.id}
              button 
              className={`${classes.templateItem} ${template.category === 'Custom' ? classes.customTemplate : classes.systemTemplate}`} 
              onClick={() => editingTemplateId !== template.id && handleSelectTemplate(template)}
            >
              <Box display="flex" flexDirection="column" width="100%">
                <Box display="flex" alignItems="center" mb={0.5}>
                  <Box
                    component="span"
                    width={24}
                    height={24}
                    mr={1}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    borderRadius="50%"
                    bgcolor={template.category === 'Custom' ? 'primary.light' : 'secondary.light'}
                    color="background.paper"
                    fontSize="0.8rem"
                    fontWeight="bold"
                  >
                    {template.name.charAt(0).toUpperCase()}
                  </Box>
                  {editingTemplateId === template.id && template.category === 'Custom' ? (
                    <TextField
                      fullWidth
                      value={editingTemplateName}
                      onChange={handleEditingNameChange}
                      onKeyDown={handleEditingKeyDown}
                      onBlur={handleSaveOrCancelEdit}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      variant="outlined"
                      size="small"
                      style={{ margin: '5px 0' }}
                    />
                  ) : (
                    <Typography 
                        variant="subtitle1" 
                        style={{ 
                            fontWeight: 600, 
                            marginLeft: 8, 
                            cursor: template.category === 'Custom' ? 'pointer' : 'default' 
                        }}
                        className={template.category === 'Custom' ? classes.templateNameClickable : ''}
                        onClick={(e) => {
                            startEditTemplateName(e, template);
                        }}
                    >
                      {template.name}
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" color="textSecondary" className={classes.templateDescription}>
                  {template.description}
                </Typography>
                
                <Box display="flex" alignItems="center" mt={0.5} style={{ marginLeft: 32 }}>
                  <Box 
                    component="span"
                    className={`${classes.categoryBadge} ${
                      template.category === 'Custom' ? classes.customBadge : classes.systemBadge
                    }`}
                  >
                    {template.category === 'Custom' ? (
                      <>
                        <ExtensionIcon className={classes.categoryIcon} />
                        Custom Template
                      </>
                    ) : (
                      <>
                        <VerifiedUserIcon className={classes.categoryIcon} />
                        System Template
                      </>
                    )}
                  </Box>
                </Box>
              </Box>
              
              {template.category === 'Custom' && editingTemplateId !== template.id && (
                <Box className={classes.templateActions}>
                  <IconButton 
                    edge="end" 
                    aria-label="delete" 
                    onClick={(e) => handleDeleteTemplate(e, template.id)}
                    size="small"
                  >
                    <DeleteIcon style={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              )}
            </ListItem>
          ))}
        </List>
      )}

      <Divider className={classes.divider} />

      <Button 
        variant="outlined" 
        color="secondary" 
        fullWidth 
        onClick={onCreateTemplate}
        className={classes.button}
        style={{ marginTop: 'auto' }}
      >
        Create New Template
      </Button>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
      />
    </Paper>
  );
}

export default NewReportOptions; 