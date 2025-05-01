import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Grid,
  Chip,
  Button,
  Paper,
  Divider,
  ButtonGroup,
  Tooltip,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Flag from 'react-world-flags';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import DoneIcon from '@material-ui/icons/Done';
import FlagIcon from './FlagIcon';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import AttachFileIcon from '@material-ui/icons/AttachFile';
import DeleteIcon from '@material-ui/icons/Delete';
import DescriptionIcon from '@material-ui/icons/Description';
import PictureAsPdfIcon from '@material-ui/icons/PictureAsPdf';
import ImageIcon from '@material-ui/icons/Image';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import AutorenewIcon from '@material-ui/icons/Autorenew';
import TextEditorModal from './TextEditorModal';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(2, 3),
    borderBottom: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(2),
  },
  flagContainer: {
    width: 60,
    height: 40,
    marginRight: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '2px',
  },
  flag: {
    width: '100%',
    height: 'auto',
    objectFit: 'cover',
  },
  title: {
    marginLeft: theme.spacing(1),
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  tabPanel: {
    padding: theme.spacing(3),
    flex: 1,
    overflowY: 'auto',
  },
  sectionTitle: {
    marginBottom: theme.spacing(3),
    fontWeight: 600,
    borderBottom: `2px solid ${theme.palette.primary.main}`,
    paddingBottom: theme.spacing(1),
    display: 'inline-block',
    fontSize: '1.5rem',
  },
  section: {
    marginBottom: theme.spacing(4),
  },
  relationshipItem: {
    position: 'relative',
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    backgroundColor: 'transparent',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.12)',
  },
  relationshipItemContent: {
    position: 'relative',
    zIndex: 1,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius - 1,
  },
  formControl: {
    marginBottom: theme.spacing(2),
    width: '100%',
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  specialConsiderationsField: {
    marginTop: theme.spacing(2),
  },
  tabs: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    '& .MuiTab-wrapper': {
      fontSize: '1.2rem !important',
      fontWeight: 600,
    }
  },
  emptyRelationships: {
    padding: theme.spacing(3),
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(2),
  },
  relationshipButtonGroup: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
  },
  relationshipButton: {
    flex: 1,
    margin: '0 4px',
    border: '1px solid',
    textTransform: 'none',
    fontWeight: 500,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(0.5, 1),
    transition: 'all 0.2s ease',
    '&:first-child': {
      marginLeft: 0,
    },
    '&:last-child': {
      marginRight: 0,
    },
  },
  allianceButton: {
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
    '&.selected': {
      backgroundColor: `${theme.palette.primary.main}20`,
      boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
      fontWeight: 700,
    },
    '&:hover': {
      backgroundColor: `${theme.palette.primary.main}10`,
    },
  },
  partnershipButton: {
    borderColor: theme.palette.success.main,
    color: theme.palette.success.main,
    '&.selected': {
      backgroundColor: `${theme.palette.success.main}20`,
      boxShadow: `0 0 0 1px ${theme.palette.success.main}`,
      fontWeight: 700,
    },
    '&:hover': {
      backgroundColor: `${theme.palette.success.main}10`,
    },
  },
  rivalryButton: {
    borderColor: theme.palette.error.main,
    color: theme.palette.error.main,
    '&.selected': {
      backgroundColor: `${theme.palette.error.main}20`,
      boxShadow: `0 0 0 1px ${theme.palette.error.main}`,
      fontWeight: 700,
    },
    '&:hover': {
      backgroundColor: `${theme.palette.error.main}10`,
    },
  },
  neutralButton: {
    borderColor: theme.palette.grey[500],
    color: theme.palette.grey[500],
    '&.selected': {
      backgroundColor: `${theme.palette.grey[500]}20`,
      boxShadow: `0 0 0 1px ${theme.palette.grey[500]}`,
      fontWeight: 700,
    },
    '&:hover': {
      backgroundColor: `${theme.palette.grey[500]}10`,
    },
  },
  nationName: {
    fontSize: '1.5rem',
    fontWeight: 500,
  },
  relationshipStatus: {
    padding: theme.spacing(1),
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: theme.shape.borderRadius,
  },
  relationshipLabel: {
    fontWeight: 600,
  },
  allyLabel: {
    color: theme.palette.success.main,
  },
  partnerLabel: {
    color: theme.palette.primary.main,
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`,
    marginTop: 'auto',
  },
  approveButton: {
    marginLeft: theme.spacing(1),
    minWidth: 'auto',
    padding: theme.spacing(0.5, 1),
  },
  approveButtonApproved: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.common.white,
    '&:hover': {
      backgroundColor: theme.palette.success.dark,
    },
  },
  fieldContainer: {
    position: 'relative',
    width: '100%',
  },
  approvedIndicator: {
    position: 'absolute',
    top: -10,
    right: 0,
    backgroundColor: theme.palette.success.main,
    color: theme.palette.common.white,
    fontSize: '0.7rem',
    padding: theme.spacing(0.25, 1),
    borderRadius: theme.shape.borderRadius,
    display: 'flex',
    alignItems: 'center',
    zIndex: 1,
  },
  approvedIcon: {
    fontSize: '0.85rem',
    marginRight: theme.spacing(0.5),
  },
  approveButtonRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    width: '100%',
    marginTop: theme.spacing(0.5),
  },
  doctrineUploadArea: {
    border: `2px dashed ${theme.palette.primary.main}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(3),
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    marginBottom: theme.spacing(2),
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: 'rgba(66, 133, 244, 0.1)',
      borderColor: theme.palette.secondary.main,
    },
  },
  dragActive: {
    backgroundColor: 'rgba(66, 133, 244, 0.2)',
    borderColor: theme.palette.secondary.main,
  },
  uploadIcon: {
    fontSize: '3rem',
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(1),
  },
  fileList: {
    maxHeight: '200px',
    overflowY: 'auto',
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: theme.shape.borderRadius,
  },
  fileItem: {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  fileIcon: {
    color: theme.palette.primary.main,
  },
  fileSize: {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
  },
  hiddenInput: {
    display: 'none',
  },
  objectivesList: {
    width: '100%',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: theme.shape.borderRadius,
  },
  objectiveItem: {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  addObjectiveButton: {
    marginTop: theme.spacing(1),
  },
  objectiveInput: {
    marginRight: theme.spacing(1),
    flexGrow: 1,
  },
  fieldHeaderContainer: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  expandButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1,
  },
  textFieldContainer: {
    position: 'relative',
  },
  actionButtonsContainer: {
    display: 'flex',
    marginTop: theme.spacing(1),
    justifyContent: 'flex-start',
    '& > *': {
      marginRight: theme.spacing(1),
    }
  },
}));

// TabPanel component for displaying tab content
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dime-tabpanel-${index}`}
      aria-labelledby={`dime-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box className={other.className}>
          {children}
        </Box>
      )}
    </div>
  );
}

function NationPosturePanel({ nation, otherNations, onSave, nationRelationships = {} }) {
  const classes = useStyles();
  const [tabValue, setTabValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // New state for objective inputs
  const [newDiplomacyObjective, setNewDiplomacyObjective] = useState('');
  const [newInformationObjective, setNewInformationObjective] = useState('');
  const [newMilitaryObjective, setNewMilitaryObjective] = useState('');
  const [newEconomicObjective, setNewEconomicObjective] = useState('');
  
  // State for tracking which objective is being edited
  const [editingObjective, setEditingObjective] = useState(null);
  
  // State for text editor modal
  const [textEditorOpen, setTextEditorOpen] = useState(false);
  const [textEditorConfig, setTextEditorConfig] = useState({
    title: '',
    value: '',
    fieldName: '',
    section: '',
    field: '',
    placeholder: ''
  });
  
  const [nationData, setNationData] = useState({
    // Relationships
    relationships: {},
    
    // Diplomacy
    diplomacy: {
      objectives: [], // Changed from string to array
      posture: '',
      keyInitiatives: '',
      specialConsiderations: '',
    },
    
    // Information
    information: {
      objectives: [], // Changed from string to array
      propagandaThemes: '',
      cyberTargets: '',
      specialConsiderations: '',
    },
    
    // Military
    military: {
      objectives: [], // Changed from string to array
      alertLevel: '',
      doctrine: '',
      doctrineFiles: [],
      domainPosture: {
        land: '',
        sea: '',
        air: '',
        cyber: '',
        space: '',
      },
      specialConsiderations: '',
    },
    
    // Economic
    economic: {
      objectives: [], // Changed from string to array
      tradeFocus: '',
      resourceDeps: '',
      sanctionsPolicy: '',
      specialConsiderations: '',
    },
    
    // Add approvedFields to track which fields have been approved
    approvedFields: {}
  });
  
  // Alert level options
  const alertLevelOptions = [
    { value: 'Normal Peacetime Operations', label: 'Normal Peacetime Operations' },
    { value: 'Elevated Readiness', label: 'Elevated Readiness' },
    { value: 'Heightened Alert', label: 'Heightened Alert' },
    { value: 'High Alert', label: 'High Alert' },
    { value: 'Full Mobilization', label: 'Full Mobilization' },
    { value: 'War Footing', label: 'War Footing' }
  ];
  
  // Initialize nation data when nation changes
  useEffect(() => {
    if (nation) {
      // If nation already has configuration data, load it
      const configData = nation.configData || {
        ...nationData,
        approvedFields: nation.configData?.approvedFields || {}
      };
      
      // Convert string objectives to arrays if needed (for backward compatibility)
      const updatedConfigData = {
        ...configData,
        diplomacy: {
          ...configData.diplomacy,
          objectives: Array.isArray(configData.diplomacy.objectives) 
            ? configData.diplomacy.objectives 
            : configData.diplomacy.objectives ? [configData.diplomacy.objectives] : []
        },
        information: {
          ...configData.information,
          objectives: Array.isArray(configData.information.objectives) 
            ? configData.information.objectives 
            : configData.information.objectives ? [configData.information.objectives] : []
        },
        military: {
          ...configData.military,
          objectives: Array.isArray(configData.military.objectives) 
            ? configData.military.objectives 
            : configData.military.objectives ? [configData.military.objectives] : []
        },
        economic: {
          ...configData.economic,
          objectives: Array.isArray(configData.economic.objectives) 
            ? configData.economic.objectives 
            : configData.economic.objectives ? [configData.economic.objectives] : []
        }
      };
      
      setNationData(updatedConfigData);
    }
  }, [nation]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleInputChange = (section, field, value) => {
    // Mark field as unapproved when changed
    const fieldKey = `${section}.${field}`;
    const updatedApprovedFields = { ...nationData.approvedFields };
    delete updatedApprovedFields[fieldKey];
    
    setNationData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      },
      approvedFields: updatedApprovedFields
    }));
  };
  
  const handleMilitaryDomainChange = (domain, value) => {
    // Mark field as unapproved when changed
    const fieldKey = `military.domainPosture.${domain}`;
    const updatedApprovedFields = { ...nationData.approvedFields };
    delete updatedApprovedFields[fieldKey];
    
    setNationData(prev => ({
      ...prev,
      military: {
        ...prev.military,
        domainPosture: {
          ...prev.military.domainPosture,
          [domain]: value
        }
      },
      approvedFields: updatedApprovedFields
    }));
  };
  
  const handleRelationshipTypeChange = (entityId, value) => {
    setNationData(prev => ({
      ...prev,
      relationships: {
        ...prev.relationships,
        [entityId]: {
          ...prev.relationships[entityId] || {},
          relationType: value
        }
      }
    }));
  };
  
  const handleRelationshipDetailsChange = (entityId, value) => {
    setNationData(prev => ({
      ...prev,
      relationships: {
        ...prev.relationships,
        [entityId]: {
          ...prev.relationships[entityId] || {},
          details: value
        }
      }
    }));
  };
  
  // New handler to toggle field approval status
  const handleToggleApproval = (fieldKey) => {
    const updatedApprovedFields = { ...nationData.approvedFields };
    
    if (updatedApprovedFields[fieldKey]) {
      delete updatedApprovedFields[fieldKey];
    } else {
      updatedApprovedFields[fieldKey] = true;
    }
    
    setNationData(prev => ({
      ...prev,
      approvedFields: updatedApprovedFields
    }));
  };
  
  const handleSave = () => {
    onSave({ ...nation, configData: nationData, isConfigured: true });
  };
  
  // Check if a field is approved
  const isFieldApproved = (fieldKey) => {
    return !!nationData.approvedFields[fieldKey];
  };
  
  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Get appropriate icon for file type
  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    if (['pdf'].includes(extension)) {
      return <PictureAsPdfIcon className={classes.fileIcon} />;
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension)) {
      return <ImageIcon className={classes.fileIcon} />;
    } else {
      return <DescriptionIcon className={classes.fileIcon} />;
    }
  };
  
  // Handle drag events
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, []);
  
  // Handle file selection via input
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };
  
  // Process uploaded files
  const handleFileUpload = (files) => {
    // Create file objects with metadata
    const newFiles = files.map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      // In a real app, you might want to:
      // 1. Upload the file to a server and store the URL
      // 2. Read the file content and store it
      // For this example, we'll just store metadata
    }));
    
    // Update state with new files
    setNationData(prev => ({
      ...prev,
      military: {
        ...prev.military,
        doctrineFiles: [...prev.military.doctrineFiles, ...newFiles]
      }
    }));
    
    // Mark as unapproved when files are added
    const fieldKey = 'military.doctrine';
    const updatedApprovedFields = { ...nationData.approvedFields };
    delete updatedApprovedFields[fieldKey];
    
    setNationData(prev => ({
      ...prev,
      approvedFields: updatedApprovedFields
    }));
  };
  
  // Remove a file
  const handleRemoveFile = (fileId) => {
    setNationData(prev => ({
      ...prev,
      military: {
        ...prev.military,
        doctrineFiles: prev.military.doctrineFiles.filter(file => file.id !== fileId)
      }
    }));
    
    // Mark as unapproved when files are removed
    const fieldKey = 'military.doctrine';
    const updatedApprovedFields = { ...nationData.approvedFields };
    delete updatedApprovedFields[fieldKey];
    
    setNationData(prev => ({
      ...prev,
      approvedFields: updatedApprovedFields
    }));
  };
  
  // Generic handler for adding objectives to any DIME section
  const handleAddObjective = (section, objective) => {
    if (!objective.trim()) return;
    
    // Mark field as unapproved when changed
    const fieldKey = `${section}.objectives`;
    const updatedApprovedFields = { ...nationData.approvedFields };
    delete updatedApprovedFields[fieldKey];
    
    setNationData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        objectives: [...prev[section].objectives, objective.trim()]
      },
      approvedFields: updatedApprovedFields
    }));
    
    // Clear the input field
    switch(section) {
      case 'diplomacy':
        setNewDiplomacyObjective('');
        break;
      case 'information':
        setNewInformationObjective('');
        break;
      case 'military':
        setNewMilitaryObjective('');
        break;
      case 'economic':
        setNewEconomicObjective('');
        break;
    }
  };
  
  // Generic handler for editing objectives in any DIME section
  const handleEditObjective = (section, index, newValue) => {
    if (!newValue.trim()) return;
    
    // Mark field as unapproved when changed
    const fieldKey = `${section}.objectives`;
    const updatedApprovedFields = { ...nationData.approvedFields };
    delete updatedApprovedFields[fieldKey];
    
    setNationData(prev => {
      const updatedObjectives = [...prev[section].objectives];
      updatedObjectives[index] = newValue.trim();
      
      return {
        ...prev,
        [section]: {
          ...prev[section],
          objectives: updatedObjectives
        },
        approvedFields: updatedApprovedFields
      };
    });
    
    setEditingObjective(null);
  };
  
  // Generic handler for deleting objectives in any DIME section
  const handleDeleteObjective = (section, index) => {
    // Mark field as unapproved when changed
    const fieldKey = `${section}.objectives`;
    const updatedApprovedFields = { ...nationData.approvedFields };
    delete updatedApprovedFields[fieldKey];
    
    setNationData(prev => {
      const updatedObjectives = [...prev[section].objectives];
      updatedObjectives.splice(index, 1);
      
      return {
        ...prev,
        [section]: {
          ...prev[section],
          objectives: updatedObjectives
        },
        approvedFields: updatedApprovedFields
      };
    });
  };
  
  // Helper function to render objectives list for any DIME section
  const renderObjectivesList = (section, newObjective, setNewObjective) => {
    const fieldKey = `${section}.objectives`;
    const isApproved = isFieldApproved(fieldKey);
    const objectives = nationData[section].objectives || [];
    
    return (
      <Box mb={3}>
        <Box className={classes.fieldHeaderContainer}>
          <Typography variant="subtitle1" style={{ marginRight: '16px' }}>Strategic Objectives</Typography>
          <Button
            variant={isApproved ? "contained" : "outlined"}
            size="small"
            onClick={() => handleToggleApproval(fieldKey)}
            className={`${classes.approveButton} ${isApproved ? classes.approveButtonApproved : ''}`}
            startIcon={isApproved ? <DoneIcon /> : null}
          >
            {isApproved ? "Approved" : "Approve & Commit"}
          </Button>
        </Box>
        
        <Typography variant="body2" color="textSecondary" paragraph>
          Define the key {section === 'diplomacy' ? 'diplomatic' : 
                         section === 'information' ? 'information' : 
                         section === 'military' ? 'military' : 'economic'} 
          goals and priorities for this entity.
        </Typography>
        
        {objectives.length > 0 && (
          <List className={classes.objectivesList}>
            {objectives.map((objective, index) => (
              <ListItem key={index} className={classes.objectiveItem}>
                <ListItemText
                  primary={
                    editingObjective && editingObjective.section === section && editingObjective.index === index ? (
                      <TextField
                        fullWidth
                        value={editingObjective.value}
                        onChange={(e) => setEditingObjective({...editingObjective, value: e.target.value})}
                        autoFocus
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleEditObjective(section, index, editingObjective.value);
                            e.preventDefault();
                          }
                        }}
                        onBlur={() => handleEditObjective(section, index, editingObjective.value)}
                      />
                    ) : (
                      `${index + 1}. ${objective}`
                    )
                  }
                />
                {(!editingObjective || editingObjective.section !== section || editingObjective.index !== index) && (
                  <ListItemSecondaryAction>
                    <IconButton edge="end" aria-label="edit" 
                      onClick={() => setEditingObjective({section, index, value: objective})}
                      style={{ marginRight: 8 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" aria-label="delete" 
                      onClick={() => handleDeleteObjective(section, index)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
          </List>
        )}
        
        <Grid container spacing={1} alignItems="center" style={{ marginTop: 8 }}>
          <Grid item xs>
            <TextField
              placeholder={`Enter a ${section} objective...`}
              variant="outlined"
              fullWidth
              size="small"
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddObjective(section, newObjective);
                  e.preventDefault();
                }
              }}
            />
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleAddObjective(section, newObjective)}
              disabled={!newObjective.trim()}
              size="small"
            >
              Add
            </Button>
          </Grid>
        </Grid>
      </Box>
    );
  };
  
  // Render the document upload area
  const renderDoctrineUploadArea = (gridProps = { xs: 12, md: 6 }) => {
    const fieldKey = 'military.doctrine';
    const isApproved = isFieldApproved(fieldKey);
    const doctrineFiles = nationData.military.doctrineFiles || [];
    
    return (
      <Grid item {...gridProps}>
        <Box className={classes.fieldContainer}>
          {isApproved && (
            <Box className={classes.approvedIndicator}>
              <DoneIcon className={classes.approvedIcon} />
              <Typography variant="caption">Approved</Typography>
            </Box>
          )}
          
          <Typography variant="subtitle1" gutterBottom>Military Doctrine Documents</Typography>
          
          {/* Drag and drop area */}
          <Box
            className={`${classes.doctrineUploadArea} ${isDragging ? classes.dragActive : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('doctrine-file-input').click()}
          >
            <input
              id="doctrine-file-input"
              type="file"
              multiple
              className={classes.hiddenInput}
              onChange={handleFileSelect}
            />
            <CloudUploadIcon className={classes.uploadIcon} />
            <Typography variant="body1" gutterBottom>
              Drag & drop doctrine documents here
            </Typography>
            <Typography variant="body2" color="textSecondary">
              or click to select files
            </Typography>
          </Box>
          
          {/* File list */}
          {doctrineFiles.length > 0 && (
            <List className={classes.fileList}>
              {doctrineFiles.map((file) => (
                <ListItem key={file.id} className={classes.fileItem}>
                  <ListItemIcon>
                    {getFileIcon(file.name)}
                  </ListItemIcon>
                  <ListItemText 
                    primary={file.name} 
                    secondary={<span className={classes.fileSize}>{formatFileSize(file.size)}</span>} 
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => handleRemoveFile(file.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
          
          {/* Add supporting text field for doctrine summary */}
          <TextField
            label="Doctrine Summary (Optional)"
            variant="outlined"
            fullWidth
            multiline
            rows={2}
            value={nationData.military.doctrine}
            onChange={(e) => handleInputChange('military', 'doctrine', e.target.value)}
            placeholder="Briefly summarize the doctrine outlined in the uploaded documents..."
            style={{ marginTop: 16 }}
          />
          
          <Box className={classes.approveButtonRow}>
            <Button
              variant={isApproved ? "contained" : "outlined"}
              size="small"
              onClick={() => handleToggleApproval(fieldKey)}
              className={`${classes.approveButton} ${isApproved ? classes.approveButtonApproved : ''}`}
              startIcon={isApproved ? <DoneIcon /> : null}
            >
              {isApproved ? "Approved" : "Approve & Commit"}
            </Button>
          </Box>
        </Box>
      </Grid>
    );
  };
  
  // Handler for opening text editor modal
  const handleOpenTextEditor = (title, value, section, field, placeholder) => {
    setTextEditorConfig({
      title,
      value,
      fieldName: `${section}.${field}`,
      section,
      field,
      placeholder
    });
    setTextEditorOpen(true);
  };
  
  // Handler for saving text from editor modal
  const handleTextEditorSave = (newValue) => {
    const { section, field } = textEditorConfig;
    
    if (section && field) {
      // Handle special case for military domain posture fields
      if (section === 'military' && field.includes('domainPosture.')) {
        const domain = field.split('.')[1];
        handleMilitaryDomainChange(domain, newValue);
      } else {
        // Standard field update
        handleInputChange(section, field, newValue);
      }
    }
    
    setTextEditorOpen(false);
  };
  
  // Handler for MAGE Assist button
  const handleMageAssist = (section, field) => {
    // Placeholder for future LLM functionality
    console.log(`MAGE Assist requested for ${section}.${field}`);
    // This would eventually trigger the MAGE LLM to help with content generation
  };
  
  // Modified renderFieldWithApproval to include Open Editor and MAGE Assist buttons
  const renderFieldWithApproval = (section, field, label, rows = 3, placeholder = '', gridProps = { xs: 12 }) => {
    const fieldKey = `${section}.${field}`;
    const isApproved = isFieldApproved(fieldKey);
    const fieldValue = section === 'military' && field.includes('.') 
      ? field.split('.').reduce((obj, key) => obj[key], nationData[section])
      : nationData[section][field];
    
    return (
      <Grid item {...gridProps}>
        <Box className={classes.fieldContainer}>
          {isApproved && (
            <Box className={classes.approvedIndicator}>
              <DoneIcon className={classes.approvedIcon} />
              <Typography variant="caption">Approved</Typography>
            </Box>
          )}
          <Box className={classes.textFieldContainer}>
            <TextField
              label={label}
              variant="outlined"
              fullWidth
              multiline={rows > 1}
              rows={rows}
              value={fieldValue}
              onChange={(e) => {
                if (section === 'military' && field.includes('.')) {
                  const [parent, child] = field.split('.');
                  handleMilitaryDomainChange(child, e.target.value);
                } else {
                  handleInputChange(section, field, e.target.value);
                }
              }}
              placeholder={placeholder}
            />
            {rows > 1 && (
              <Tooltip title="Open fullscreen editor">
                <IconButton 
                  className={classes.expandButton}
                  onClick={() => handleOpenTextEditor(
                    label, 
                    fieldValue, 
                    section, 
                    field,
                    placeholder
                  )}
                  size="small"
                >
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Box className={classes.actionButtonsContainer}>
            <Button
              variant={isApproved ? "contained" : "outlined"}
              size="small"
              onClick={() => handleToggleApproval(fieldKey)}
              className={`${classes.approveButton} ${isApproved ? classes.approveButtonApproved : ''}`}
              startIcon={isApproved ? <DoneIcon /> : null}
            >
              {isApproved ? "Approved" : "Approve & Commit"}
            </Button>
            
            {rows > 1 && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  color="secondary"
                  startIcon={<FullscreenIcon />}
                  onClick={() => handleOpenTextEditor(
                    label, 
                    fieldValue, 
                    section, 
                    field,
                    placeholder
                  )}
                >
                  Open Editor
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="primary"
                  startIcon={<AutorenewIcon />}
                  onClick={() => handleMageAssist(section, field)}
                >
                  MAGE Assist
                </Button>
              </>
            )}
            
            {isApproved && (
              <Typography variant="caption" color="textSecondary" style={{ marginLeft: 8, display: 'flex', alignItems: 'center' }}>
                <DoneIcon fontSize="small" style={{ color: '#4caf50', marginRight: 4 }} />
                Content approved
              </Typography>
            )}
          </Box>
        </Box>
      </Grid>
    );
  };
  
  // Helper to render alert level dropdown
  const renderAlertLevelDropdown = (gridProps = { xs: 12, md: 6 }) => {
    const fieldKey = 'military.alertLevel';
    const isApproved = isFieldApproved(fieldKey);
    
    return (
      <Grid item {...gridProps}>
        <Box className={classes.fieldContainer}>
          {isApproved && (
            <Box className={classes.approvedIndicator}>
              <DoneIcon className={classes.approvedIcon} />
              <Typography variant="caption">Approved</Typography>
            </Box>
          )}
          <FormControl variant="outlined" fullWidth>
            <InputLabel id="military-alert-level-label">Military Alert Level</InputLabel>
            <Select
              labelId="military-alert-level-label"
              id="military-alert-level"
              value={nationData.military.alertLevel}
              onChange={(e) => handleInputChange('military', 'alertLevel', e.target.value)}
              label="Military Alert Level"
            >
              <MenuItem value="">
                <em>Select an alert level...</em>
              </MenuItem>
              {alertLevelOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box className={classes.approveButtonRow}>
            <Button
              variant={isApproved ? "contained" : "outlined"}
              size="small"
              onClick={() => handleToggleApproval(fieldKey)}
              className={`${classes.approveButton} ${isApproved ? classes.approveButtonApproved : ''}`}
              startIcon={isApproved ? <DoneIcon /> : null}
            >
              {isApproved ? "Approved" : "Approve & Commit"}
            </Button>
          </Box>
        </Box>
      </Grid>
    );
  };
  
  // If no nation is provided, don't render anything
  if (!nation) return null;
  
  return (
    <Paper className={classes.root} elevation={2}>
      <Box className={classes.header}>
        <Box className={classes.flagContainer}>
          <Flag code={nation.entityId} className={classes.flag} />
        </Box>
        <Typography variant="h5" style={{
          fontWeight: 600,
          textShadow: '0 1px 2px rgba(0,0,0,0.6)'
        }}>
          {nation.entityName} Configuration
        </Typography>
      </Box>
      
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        className={classes.tabs}
      >
        <Tab 
          label={<Typography variant="subtitle1">Review Relationships</Typography>} 
          id="dime-tab-0"
          aria-controls="dime-tabpanel-0"
        />
        <Tab 
          label={<Typography variant="subtitle1">Diplomacy</Typography>} 
          id="dime-tab-1"
          aria-controls="dime-tabpanel-1" 
        />
        <Tab 
          label={<Typography variant="subtitle1">Information</Typography>} 
          id="dime-tab-2"
          aria-controls="dime-tabpanel-2"
        />
        <Tab 
          label={<Typography variant="subtitle1">Military</Typography>} 
          id="dime-tab-3"
          aria-controls="dime-tabpanel-3"
        />
        <Tab 
          label={<Typography variant="subtitle1">Economic</Typography>} 
          id="dime-tab-4"
          aria-controls="dime-tabpanel-4"
        />
      </Tabs>
      
      <Box className={classes.content}>
        {/* Relationships Tab - READ ONLY VIEW */}
        <TabPanel value={tabValue} index={0} className={classes.tabPanel}>
          <Typography variant="h5" className={classes.sectionTitle}>
            Relationships with Other Nations/Organizations
          </Typography>
          
          <Typography variant="body2" color="textSecondary" paragraph>
            This is a summary of relationships defined in the Relationships & Theaters configuration. 
            To modify these relationships, select the "Configure Relationships & Theaters of Conflict" button on Manage Actors & Theaters tab.
          </Typography>
          
          {otherNations && otherNations.length > 0 ? (
            otherNations.map(otherNation => {
              // Get relationship key - ensure consistent order regardless of which nation comes first
              const relationshipKey = [nation.entityId, otherNation.entityId].sort().join('_');
              const relationshipData = nationRelationships[relationshipKey] || {};
              const relationType = relationshipData.type || '';
              const notes = relationshipData.notes || '';
              
              return (
                <Box key={otherNation.entityId} className={classes.relationshipItem}>
                  <Box className={classes.relationshipItemContent}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Box display="flex" alignItems="center">
                          <Box width={30} height={20} marginRight={1} overflow="hidden" border="1px solid rgba(255,255,255,0.12)">
                            <Flag code={otherNation.entityId} style={{ width: '100%', height: 'auto' }} />
                          </Box>
                          <Typography variant="h6" className={classes.nationName}>
                            {otherNation.entityName}
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12}>
                        {/* Relationship buttons similar to RelationshipMatrix but read-only */}
                        <Box className={classes.relationshipButtonGroup} mt={1}>
                          <Button
                            className={`${classes.relationshipButton} ${classes.allianceButton} ${relationType === 'ally' ? 'selected' : ''}`}
                            variant={relationType === 'ally' ? 'contained' : 'outlined'}
                            size="small"
                            disabled
                            style={{
                              opacity: 1,
                              backgroundColor: relationType === 'ally' ? 'rgba(66, 133, 244, 0.2)' : 'transparent',
                              fontWeight: relationType === 'ally' ? 700 : 400
                            }}
                          >
                            Ally
                          </Button>
                          <Button
                            className={`${classes.relationshipButton} ${classes.partnershipButton} ${relationType === 'partner' ? 'selected' : ''}`}
                            variant={relationType === 'partner' ? 'contained' : 'outlined'}
                            size="small"
                            disabled
                            style={{
                              opacity: 1,
                              backgroundColor: relationType === 'partner' ? 'rgba(52, 168, 83, 0.2)' : 'transparent',
                              fontWeight: relationType === 'partner' ? 700 : 400
                            }}
                          >
                            Partner
                          </Button>
                          <Button
                            className={`${classes.relationshipButton} ${classes.neutralButton} ${relationType === 'neutral' ? 'selected' : ''}`}
                            variant={relationType === 'neutral' ? 'contained' : 'outlined'}
                            size="small"
                            disabled
                            style={{
                              opacity: 1,
                              backgroundColor: relationType === 'neutral' ? 'rgba(157, 157, 157, 0.2)' : 'transparent',
                              fontWeight: relationType === 'neutral' ? 700 : 400
                            }}
                          >
                            Neutral
                          </Button>
                          <Button
                            className={`${classes.relationshipButton} ${classes.rivalryButton} ${relationType === 'adversary' ? 'selected' : ''}`}
                            variant={relationType === 'adversary' ? 'contained' : 'outlined'}
                            size="small"
                            disabled
                            style={{
                              opacity: 1,
                              backgroundColor: relationType === 'adversary' ? 'rgba(234, 67, 53, 0.2)' : 'transparent',
                              fontWeight: relationType === 'adversary' ? 700 : 400
                            }}
                          >
                            Adversary
                          </Button>
                          <Button
                            className={`${classes.relationshipButton} ${classes.rivalryButton} ${relationType === 'enemy' ? 'selected' : ''}`}
                            variant={relationType === 'enemy' ? 'contained' : 'outlined'}
                            size="small"
                            disabled
                            style={{
                              opacity: 1,
                              backgroundColor: relationType === 'enemy' ? 'rgba(234, 67, 53, 0.2)' : 'transparent',
                              fontWeight: relationType === 'enemy' ? 700 : 400
                            }}
                          >
                            Enemy
                          </Button>
                        </Box>
                        
                        {!relationType && (
                          <Typography color="textSecondary" variant="body2" style={{ marginTop: 10, fontStyle: 'italic' }}>
                            No relationship has been defined with {otherNation.entityName}
                          </Typography>
                        )}
                      </Grid>
                      
                      {notes && (
                        <Grid item xs={12}>
                          <Box mt={2} p={2} bgcolor="rgba(0,0,0,0.1)" borderRadius={1}>
                            <Typography variant="subtitle2" gutterBottom>
                              Relationship Notes:
                            </Typography>
                            <Typography variant="body2">
                              {notes}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                </Box>
              );
            })
          ) : (
            <Box className={classes.emptyRelationships}>
              <Typography variant="body1" color="textSecondary">
                No other nations or organizations have been activated in this wargame.
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Add more entities to define relationships with {nation.entityName}.
              </Typography>
            </Box>
          )}
        </TabPanel>
        
        {/* Diplomacy Tab */}
        <TabPanel value={tabValue} index={1} className={classes.tabPanel}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Diplomatic Posture
            </Typography>
            
            {/* Render objectives list for Diplomacy */}
            {renderObjectivesList('diplomacy', newDiplomacyObjective, setNewDiplomacyObjective)}
            
            <Grid container spacing={3}>
              {renderFieldWithApproval(
                'diplomacy', 
                'posture', 
                "General Diplomatic Posture", 
                3, 
                "Describe the general diplomatic stance (e.g., cooperative, assertive, isolationist)...",
                { xs: 12, md: 6 }
              )}
              
              {renderFieldWithApproval(
                'diplomacy', 
                'keyInitiatives', 
                "Key Diplomatic Initiatives", 
                3, 
                "Outline current or planned diplomatic initiatives...",
                { xs: 12, md: 6 }
              )}
              
              {renderFieldWithApproval(
                'diplomacy', 
                'specialConsiderations', 
                "Special Considerations", 
                3, 
                "Any unique factors, sensitivities, or constraints that influence diplomatic behavior..."
              )}
            </Grid>
          </Box>
        </TabPanel>
        
        {/* Information Tab */}
        <TabPanel value={tabValue} index={2} className={classes.tabPanel}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Information Operations
            </Typography>
            
            {/* Render objectives list for Information */}
            {renderObjectivesList('information', newInformationObjective, setNewInformationObjective)}
            
            <Grid container spacing={3}>
              {renderFieldWithApproval(
                'information', 
                'propagandaThemes', 
                "Propaganda Themes", 
                3, 
                "Key narratives and messaging themes for domestic and international audiences...",
                { xs: 12, md: 6 }
              )}
              
              {renderFieldWithApproval(
                'information', 
                'cyberTargets', 
                "Cyber Capabilities & Targets", 
                3, 
                "Describe cyber capabilities and potential targets for information operations...",
                { xs: 12, md: 6 }
              )}
              
              {renderFieldWithApproval(
                'information', 
                'specialConsiderations', 
                "Special Considerations", 
                3, 
                "Any unique factors, sensitivities, or constraints that influence information operations..."
              )}
            </Grid>
          </Box>
        </TabPanel>
        
        {/* Military Tab */}
        <TabPanel value={tabValue} index={3} className={classes.tabPanel}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Military Posture
            </Typography>
            
            {/* Render objectives list for Military */}
            {renderObjectivesList('military', newMilitaryObjective, setNewMilitaryObjective)}
            
            <Grid container spacing={3}>
              {renderAlertLevelDropdown({ xs: 12, md: 6 })}
              
              {renderDoctrineUploadArea({ xs: 12, md: 6 })}
            </Grid>
            
            <Typography variant="subtitle1" gutterBottom style={{ marginTop: 24 }}>
              Domain-Specific Posture
            </Typography>
            
            <Grid container spacing={3}>
              {renderFieldWithApproval(
                'military', 
                'domainPosture.land', 
                "Land Forces", 
                2, 
                "Disposition and employment of land forces...",
                { xs: 12, md: 4 }
              )}
              
              {renderFieldWithApproval(
                'military', 
                'domainPosture.sea', 
                "Naval Forces", 
                2, 
                "Disposition and employment of naval forces...",
                { xs: 12, md: 4 }
              )}
              
              {renderFieldWithApproval(
                'military', 
                'domainPosture.air', 
                "Air Forces", 
                2, 
                "Disposition and employment of air forces...",
                { xs: 12, md: 4 }
              )}
              
              {renderFieldWithApproval(
                'military', 
                'domainPosture.cyber', 
                "Cyber Capabilities", 
                2, 
                "Military cyber operations and capabilities...",
                { xs: 12, md: 6 }
              )}
              
              {renderFieldWithApproval(
                'military', 
                'domainPosture.space', 
                "Space Capabilities", 
                2, 
                "Military space operations and capabilities...",
                { xs: 12, md: 6 }
              )}
              
              {renderFieldWithApproval(
                'military', 
                'specialConsiderations', 
                "Special Considerations", 
                3, 
                "Any unique factors, sensitivities, or constraints that influence military operations..."
              )}
            </Grid>
          </Box>
        </TabPanel>
        
        {/* Economic Tab */}
        <TabPanel value={tabValue} index={4} className={classes.tabPanel}>
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Economic Posture
            </Typography>
            
            {/* Render objectives list for Economic */}
            {renderObjectivesList('economic', newEconomicObjective, setNewEconomicObjective)}
            
            <Grid container spacing={3}>
              {renderFieldWithApproval(
                'economic', 
                'tradeFocus', 
                "Trade Focus", 
                3, 
                "Key trade priorities, partners, and goals...",
                { xs: 12, md: 6 }
              )}
              
              {renderFieldWithApproval(
                'economic', 
                'resourceDeps', 
                "Resource Dependencies", 
                3, 
                "Critical resources, supply chains, and dependencies...",
                { xs: 12, md: 6 }
              )}
              
              {renderFieldWithApproval(
                'economic', 
                'sanctionsPolicy', 
                "Sanctions Policy", 
                2, 
                "Approach to economic sanctions (both imposing and responding to)..."
              )}
              
              {renderFieldWithApproval(
                'economic', 
                'specialConsiderations', 
                "Special Considerations", 
                3, 
                "Any unique factors, sensitivities, or constraints that influence economic policy..."
              )}
            </Grid>
          </Box>
        </TabPanel>
      </Box>
      
      <Box className={classes.actionBar}>
        <Button 
          onClick={handleSave} 
          color="primary" 
          variant="contained"
        >
          Save Configuration
        </Button>
      </Box>
      
      {/* Add TextEditorModal */}
      <TextEditorModal
        open={textEditorOpen}
        onClose={() => setTextEditorOpen(false)}
        title={textEditorConfig.title}
        value={textEditorConfig.value}
        onChange={handleTextEditorSave}
        placeholder={textEditorConfig.placeholder}
        isApproved={textEditorConfig.fieldName ? isFieldApproved(textEditorConfig.fieldName) : false}
        onApprove={handleToggleApproval}
        fieldName={textEditorConfig.fieldName}
      />
    </Paper>
  );
}

export default NationPosturePanel; 