import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  Collapse,
  Zoom,
  Fade,
  IconButton,
  Tooltip,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Alert from '@material-ui/lab/Alert';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import SecurityIcon from '@material-ui/icons/Security';
import CloseIcon from '@material-ui/icons/Close';
import LockIcon from '@material-ui/icons/Lock';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import WarningIcon from '@material-ui/icons/Warning';
import SettingsIcon from '@material-ui/icons/Settings';
import { GradientText } from '../../../styles/StyledComponents';
import WargameMap from './WargameMap';
import NationConfigPane from './NationConfigPane';
import NationPostureModal from './NationPostureModal';
import ConflictTheatersPane from './ConflictTheatersPane';
import RelationshipMatrix from './RelationshipMatrix';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  gridContainer: {
    flexGrow: 1,
    height: 'calc(100% - 50px)',
  },
  leftPane: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  rightPane: {
    height: '100%',
    position: 'relative',
  },
  mapContainer: {
    height: '100%',
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
    position: 'relative',
    transition: 'all 0.3s ease',
  },
  panelTitle: {
    marginBottom: theme.spacing(2),
    fontWeight: 500,
    borderBottom: `2px solid ${theme.palette.primary.main}`,
    paddingBottom: theme.spacing(1),
    display: 'inline-block',
  },
  formControl: {
    width: '100%',
    marginBottom: theme.spacing(2),
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
  },
  helpIcon: {
    marginLeft: theme.spacing(1),
    fontSize: '1rem',
    opacity: 0.7,
    '&:hover': {
      opacity: 1,
    }
  },
  recentlyAddedLabel: {
    position: 'absolute',
    left: theme.spacing(2),
    bottom: theme.spacing(2),
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    padding: theme.spacing(1, 2),
    borderRadius: theme.shape.borderRadius,
    zIndex: 1000,
    transition: 'all 0.3s ease',
  },
  highlightAnimation: {
    animation: `$pulse 2s ${theme.transitions.easing.easeInOut}`,
  },
  "@keyframes pulse": {
    "0%": {
      boxShadow: "0 0 0 0 rgba(66, 133, 244, 0.7)"
    },
    "70%": {
      boxShadow: "0 0 0 10px rgba(66, 133, 244, 0)"
    },
    "100%": {
      boxShadow: "0 0 0 0 rgba(66, 133, 244, 0)"
    }
  },
  divider: {
    margin: theme.spacing(3, 0),
  },
  theatersButton: {
    marginBottom: theme.spacing(2),
    width: '100%',
  },
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(2),
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
  theatersDialog: {
    '& .MuiDialog-paper': {
      height: '80vh',
      maxHeight: '900px',
      width: '90vw',
      maxWidth: '1400px',
      display: 'flex',
      flexDirection: 'column',
    },
    '& .MuiDialogContent-root': {
      padding: theme.spacing(2),
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
    }
  },
  modalGrid: {
    height: '100%',
  },
  modalCol: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  modalColLeft: {
    borderRight: `1px solid ${theme.palette.divider}`,
    paddingRight: theme.spacing(2),
  },
  modalColRight: {
    paddingLeft: theme.spacing(2),
  },
  disabledSection: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
  },
  lockIcon: {
    fontSize: '3rem',
    marginBottom: theme.spacing(2),
    color: theme.palette.grey[400],
  },
  stepIndicator: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  step: {
    padding: theme.spacing(1, 2),
    borderRadius: theme.shape.borderRadius,
    marginRight: theme.spacing(1),
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  },
  stepActive: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
  stepComplete: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
  },
  stepPending: {
    backgroundColor: theme.palette.grey[600],
    color: theme.palette.grey[100],
  },
  columnContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  tabContainer: {
    height: '100%',
  },
  sectionTitle: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    paddingBottom: theme.spacing(1),
  },
  relationshipContainer: {
    padding: theme.spacing(1.5),
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    '& .MuiTypography-h6': {
      fontSize: '1rem',
    },
    '& .MuiTypography-body2': {
      fontSize: '0.75rem',
    },
  },
  relationshipHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  completionIndicator: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.75rem',
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    color: '#fff',
  },
  complete: {
    backgroundColor: theme.palette.success.main,
  },
  incomplete: {
    backgroundColor: theme.palette.warning.main,
  },
  matrixWrapper: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  floatingButtonContainer: {
    position: 'absolute',
    top: theme.spacing(2),
    left: theme.spacing(2),
    zIndex: 1000,
  },
  floatingButton: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(1, 2),
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    '&:hover': {
      backgroundColor: theme.palette.background.default,
    },
  },
  customEntityList: {
    maxHeight: '300px',
    overflow: 'auto',
    marginTop: theme.spacing(2),
  },
  customEntityItem: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
  },
  deleteButton: {
    color: theme.palette.error.main,
  },
}));

// Pre-defined organization options
const ORGANIZATIONS = [
  { id: 'NATO', name: 'NATO (North Atlantic Treaty Organization)' },
  { id: 'UN', name: 'United Nations' },
  { id: 'EU', name: 'European Union' },
  { id: 'ASEAN', name: 'Association of Southeast Asian Nations' },
  { id: 'BRICS', name: 'BRICS' },
  { id: 'AU', name: 'African Union' },
];

function CrafterTab({ wargameData, onChange }) {
  const classes = useStyles();
  const [selectedNations, setSelectedNations] = useState(wargameData?.activatedEntities || []);
  const [configureModalOpen, setConfigureModalOpen] = useState(false);
  const [selectedNation, setSelectedNation] = useState(null);
  const [recentlyAdded, setRecentlyAdded] = useState(null);
  const [notification, setNotification] = useState(null);
  
  // Theater modal state
  const [theatersModalOpen, setTheatersModalOpen] = useState(false);
  
  // Updated organization modal state
  const [manageEntitiesModalOpen, setManageEntitiesModalOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [customOrgName, setCustomOrgName] = useState('');
  const [customOrgId, setCustomOrgId] = useState('');
  const [isCustomOrg, setIsCustomOrg] = useState(true);
  const [customNationName, setCustomNationName] = useState('');
  const [customNationId, setCustomNationId] = useState('');
  const [isCustomNation, setIsCustomNation] = useState(false);
  
  // Confirmation dialog for deleting custom entities
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);
  
  // Custom entities tracking - initialize from existing custom entities in wargameData
  const [customEntities, setCustomEntities] = useState(() => {
    if (wargameData?.customEntities) {
      return wargameData.customEntities;
    }
    return [];
  });
  
  // Conflict theaters state
  const [theaters, setTheaters] = useState(wargameData?.conflictTheaters || []);
  
  // Nation relationships state
  const [nationRelationships, setNationRelationships] = useState(wargameData?.nationRelationships || {});
  
  // Calculate if all relationships are defined
  const [relationshipsComplete, setRelationshipsComplete] = useState(false);
  
  // Initialize activatedEntities if it doesn't exist
  if (!wargameData.activatedEntities) {
    wargameData.activatedEntities = [];
  }

  // Ensure all custom entities are included in activatedEntities when loading
  useEffect(() => {
    // Only run this check on initial load or when customEntities changes externally
    if (customEntities.length > 0) {
      // Find custom entities that aren't in activatedEntities
      const missingEntities = customEntities.filter(
        customEntity => !selectedNations.some(
          entity => entity.entityId === customEntity.entityId
        )
      );

      // If there are missing entities, add them to activatedEntities
      if (missingEntities.length > 0) {
        console.log("Syncing missing custom entities to activated entities:", missingEntities);
        
        // Create proper entity objects for each missing entity
        const entitiesToAdd = missingEntities.map(entity => ({
          entityId: entity.entityId,
          entityName: entity.entityName,
          entityType: entity.entityType,
          isConfigured: false
        }));
        
        // Update local state
        const updatedNations = [...selectedNations, ...entitiesToAdd];
        setSelectedNations(updatedNations);
        
        // Update parent component state
        onChange({
          ...wargameData,
          activatedEntities: updatedNations
        });
      }
    }
  }, []);  // Empty dependency array means it only runs once on mount

  // Check if all nation relationships are defined
  useEffect(() => {
    if (selectedNations.length < 2) {
      // Need at least 2 nations to have relationships
      setRelationshipsComplete(false);
      return;
    }
    
    // Calculate total number of nation pairs (combinations)
    const totalPairsNeeded = (selectedNations.length * (selectedNations.length - 1)) / 2;
    
    // Count how many relationships are defined
    const definedRelationships = Object.values(nationRelationships).filter(rel => rel.type).length;
    
    // Add debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`Relationships: ${definedRelationships}/${totalPairsNeeded} defined`, 
        { selectedNations, nationRelationships });
    }
    
    // Allow overriding relationship check with debug flag in localStorage
    const debugMode = localStorage.getItem('theater-debug-mode') === 'true';
    setRelationshipsComplete(definedRelationships >= totalPairsNeeded || debugMode);
  }, [selectedNations, nationRelationships]);

  // Clear recently added effect after a delay
  useEffect(() => {
    if (recentlyAdded) {
      const timer = setTimeout(() => {
        setRecentlyAdded(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [recentlyAdded]);

  const handleNationSelect = (countryCode, countryName) => {
    // Check if nation is already selected
    if (!selectedNations.some(nation => nation.entityId === countryCode)) {
      const newNation = {
        entityId: countryCode,
        entityName: countryName,
        entityType: 'nation',
        isConfigured: false
      };
      
      // Set as recently added for visual feedback
      setRecentlyAdded(newNation);
      
      // Add to local state
      setSelectedNations([...selectedNations, newNation]);
      
      // Update parent component state
      onChange({
        ...wargameData,
        activatedEntities: [...wargameData.activatedEntities, newNation]
      });
      
      // Show notification
      setNotification({
        message: `${countryName} has been added to your wargame`,
        severity: 'success'
      });
    }
  };
  
  const handleOrganizationSelect = (orgId, orgName) => {
    // Check if organization is already selected
    if (!selectedNations.some(entity => entity.entityId === orgId)) {
      const newOrganization = {
        entityId: orgId,
        entityName: orgName,
        entityType: 'organization',
        isConfigured: false
      };
      
      // Set as recently added for visual feedback
      setRecentlyAdded(newOrganization);
      
      // Add to local state
      setSelectedNations([...selectedNations, newOrganization]);
      
      // Update parent component state
      onChange({
        ...wargameData,
        activatedEntities: [...wargameData.activatedEntities, newOrganization]
      });
      
      // Show notification
      setNotification({
        message: `${orgName} has been added to your wargame`,
        severity: 'success'
      });
    } else {
      // Already selected - show notification
      setNotification({
        message: `${orgName} is already activated`,
        severity: 'info'
      });
    }
  };

  const handleRemoveNation = (entityId) => {
    // Find the nation being removed for the notification
    const removedNation = selectedNations.find(entity => entity.entityId === entityId);
    
    // Remove from activated entities
    const updatedNations = selectedNations.filter(entity => entity.entityId !== entityId);
    setSelectedNations(updatedNations);
    
    // Clean up theaters - remove the entity from all theater sides
    const updatedTheaters = theaters.map(theater => {
      const sides = theater.sides.map(side => ({
        ...side,
        leadNationId: side.leadNationId === entityId ? '' : side.leadNationId,
        supportingNationIds: side.supportingNationIds.filter(id => id !== entityId)
      }));
      return { ...theater, sides };
    });
    
    // Remove any relationships involving this nation
    const updatedRelationships = { ...nationRelationships };
    Object.keys(updatedRelationships).forEach(key => {
      if (key.includes(entityId)) {
        delete updatedRelationships[key];
      }
    });
    
    // Update state
    setTheaters(updatedTheaters);
    setNationRelationships(updatedRelationships);
    
    // Update parent component state with all changes
    onChange({
      ...wargameData,
      activatedEntities: updatedNations,
      conflictTheaters: updatedTheaters,
      nationRelationships: updatedRelationships
    });
    
    // Clear recently added if this was the recently added entity
    if (recentlyAdded && recentlyAdded.entityId === entityId) {
      setRecentlyAdded(null);
    }
    
    // Show notification
    if (removedNation) {
      setNotification({
        message: `${removedNation.entityName} has been removed from your wargame`,
        severity: 'info'
      });
    }
  };

  const handleConfigureNation = (entity) => {
    setSelectedNation(entity);
    setConfigureModalOpen(true);
  };
  
  const handleCloseConfigureModal = () => {
    setConfigureModalOpen(false);
    setSelectedNation(null);
  };
  
  const handleSaveNationConfig = (updatedEntity) => {
    // Update in local state
    const updatedEntities = selectedNations.map(entity => 
      entity.entityId === updatedEntity.entityId ? updatedEntity : entity
    );
    
    setSelectedNations(updatedEntities);
    
    // Update parent component state
    onChange({
      ...wargameData,
      activatedEntities: updatedEntities
    });
    
    // Show notification
    setNotification({
      message: `${updatedEntity.entityName} configuration has been saved`,
      severity: 'success'
    });
  };
  
  // Updated to open the manage entities modal
  const handleOpenManageEntitiesModal = () => {
    setManageEntitiesModalOpen(true);
    // Reset form state
    setCustomOrgName('');
    setCustomOrgId('');
    setCustomNationName('');
    setCustomNationId('');
    setIsCustomOrg(true);
    setIsCustomNation(false);
    setSelectedOrgId('');
  };
  
  // Close the manage entities modal
  const handleCloseManageEntitiesModal = () => {
    setManageEntitiesModalOpen(false);
  };
  
  // Updated to handle creation of custom entities
  const handleAddCustomEntity = () => {
    let entityToAdd;
    
    if (isCustomNation) {
      // Creating custom nation
      if (!customNationName.trim() || !customNationId.trim()) return;
      
      entityToAdd = {
        entityId: customNationId.toUpperCase(),
        entityName: customNationName,
        entityType: 'nation',
        isCustom: true,
        isConfigured: false
      };
    } else if (isCustomOrg) {
      // Creating custom organization
      if (!customOrgName.trim() || !customOrgId.trim()) return;
      
      entityToAdd = {
        entityId: customOrgId.toUpperCase(),
        entityName: customOrgName,
        entityType: 'organization',
        isCustom: true,
        isConfigured: false
      };
    } else {
      // Selected predefined organization
      if (!selectedOrgId) return;
      
      const selectedOrg = ORGANIZATIONS.find(org => org.id === selectedOrgId);
      entityToAdd = {
        entityId: selectedOrgId,
        entityName: selectedOrg.name,
        entityType: 'organization',
        isCustom: false,
        isConfigured: false
      };
    }
    
    // Check if the entity already exists in custom entities or activated entities
    const entityExists = 
      customEntities.some(entity => entity.entityId === entityToAdd.entityId) ||
      selectedNations.some(entity => entity.entityId === entityToAdd.entityId);
    
    if (entityExists) {
      setNotification({
        message: `An entity with ID ${entityToAdd.entityId} already exists`,
        severity: 'error'
      });
      return;
    }
    
    // Update customEntities list
    const updatedCustomEntities = [...customEntities, entityToAdd];
    
    // Update activatedEntities list
    const updatedActivatedEntities = [...selectedNations, entityToAdd];
    
    // Update local state
    setCustomEntities(updatedCustomEntities);
    setSelectedNations(updatedActivatedEntities);
    setRecentlyAdded(entityToAdd); // Set as recently added for visual feedback
    
    // Update parent component state with both lists in a single update
    onChange({
      ...wargameData,
      customEntities: updatedCustomEntities,
      activatedEntities: updatedActivatedEntities
    });
    
    // Show notification
    setNotification({
      message: `${entityToAdd.entityName} has been added to your wargame`,
      severity: 'success'
    });
    
    // Reset form
    if (isCustomNation) {
      setCustomNationName('');
      setCustomNationId('');
    } else {
      setCustomOrgName('');
      setCustomOrgId('');
      setSelectedOrgId('');
    }
  };
  
  // Open confirmation dialog before deleting a custom entity
  const handleConfirmDeleteEntity = (entity) => {
    setEntityToDelete(entity);
    setDeleteConfirmOpen(true);
  };
  
  // Cancel delete operation
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setEntityToDelete(null);
  };
  
  // Execute delete operation after confirmation
  const handleDeleteCustomEntity = () => {
    if (!entityToDelete) return;
    
    // Remove from custom entities
    const updatedCustomEntities = customEntities.filter(
      entity => entity.entityId !== entityToDelete.entityId
    );
    setCustomEntities(updatedCustomEntities);
    
    // Always remove from activated entities
    const updatedActivatedEntities = selectedNations.filter(
      entity => entity.entityId !== entityToDelete.entityId
    );
    setSelectedNations(updatedActivatedEntities);
    
    // Clean up theaters - remove the entity from all theater sides
    const updatedTheaters = theaters.map(theater => {
      const sides = theater.sides.map(side => ({
        ...side,
        leadNationId: side.leadNationId === entityToDelete.entityId ? '' : side.leadNationId,
        supportingNationIds: side.supportingNationIds.filter(id => id !== entityToDelete.entityId)
      }));
      return { ...theater, sides };
    });
    
    // Remove any relationships involving this entity
    const updatedRelationships = { ...nationRelationships };
    Object.keys(updatedRelationships).forEach(key => {
      if (key.includes(entityToDelete.entityId)) {
        delete updatedRelationships[key];
      }
    });
    
    // Update theaters and relationships state
    setTheaters(updatedTheaters);
    setNationRelationships(updatedRelationships);
    
    // Update parent component state with all changes
    onChange({
      ...wargameData,
      customEntities: updatedCustomEntities,
      activatedEntities: updatedActivatedEntities,
      conflictTheaters: updatedTheaters,
      nationRelationships: updatedRelationships
    });
    
    // Show notification
    setNotification({
      message: `${entityToDelete.entityName} has been removed`,
      severity: 'success'
    });
    
    // Close confirmation dialog
    setDeleteConfirmOpen(false);
    setEntityToDelete(null);
  };
  
  // Handle opening the theaters modal
  const handleOpenTheatersModal = () => {
    setTheatersModalOpen(true);
  };
  
  // Handle closing the theaters modal
  const handleCloseTheatersModal = () => {
    setTheatersModalOpen(false);
  };
  
  // Handle updating relationships
  const handleUpdateRelationships = (updatedRelationships) => {
    setNationRelationships(updatedRelationships);
    
    // Update parent component state
    onChange({
      ...wargameData,
      nationRelationships: updatedRelationships
    });
  };
  
  // Handle conflict theaters updates
  const handleUpdateTheaters = (updatedTheaters) => {
    setTheaters(updatedTheaters);
    
    // Update parent component state
    onChange({
      ...wargameData,
      conflictTheaters: updatedTheaters
    });
    
    // Show notification
    setNotification({
      message: 'Conflict theaters updated',
      severity: 'success'
    });
  };
  
  // Handle notification close
  const handleCloseNotification = () => {
    setNotification(null);
  };
  
  // Debug helper to toggle theater debug mode (development only)
  const toggleDebugMode = () => {
    const currentMode = localStorage.getItem('theater-debug-mode') === 'true';
    localStorage.setItem('theater-debug-mode', (!currentMode).toString());
    
    setNotification({
      message: `Theater debug mode ${!currentMode ? 'enabled' : 'disabled'}`,
      severity: !currentMode ? 'warning' : 'info'
    });
    
    // Force re-evaluation of relationshipsComplete
    const totalPairsNeeded = (selectedNations.length * (selectedNations.length - 1)) / 2;
    const definedRelationships = Object.values(nationRelationships).filter(rel => rel.type).length;
    const debugMode = !currentMode;
    setRelationshipsComplete(definedRelationships >= totalPairsNeeded || debugMode);
  };
  
  // Handle saving the entire theaters configuration
  const handleSaveTheatersConfig = () => {
    // Update parent component state with both relationships and theaters
    onChange({
      ...wargameData,
      nationRelationships: nationRelationships,
      conflictTheaters: theaters
    });
    
    // Show notification
    setNotification({
      message: `Configuration saved: ${Object.keys(nationRelationships).length} relationships and ${theaters.length} theaters`,
      severity: 'success'
    });
    
    // Close the modal
    handleCloseTheatersModal();
  };

  // Toggle between custom organization and custom nation
  const handleToggleEntityType = () => {
    setIsCustomNation(!isCustomNation);
    setIsCustomOrg(!isCustomOrg);
  };

  return (
    <Box className={classes.root}>
      <Grid container spacing={3} className={classes.gridContainer}>
        {/* Left Pane - Relationship Matrix */}
        <Grid item xs={12} md={4} lg={3} className={classes.leftPane}>
          {/* Theaters of Conflict Button */}
          <Tooltip 
            title={!relationshipsComplete ? "Please define all relationships between nations before configuring theaters" : ""}
            placement="right"
          >
            <span> {/* Tooltip requires a wrapper when target is disabled */}
              <Button
                variant="contained"
                color="primary"
                className={classes.theatersButton}
                startIcon={<SecurityIcon />}
                onClick={handleOpenTheatersModal}
                disabled={!relationshipsComplete}
              >
                Configure Theaters of Conflict
              </Button>
            </span>
          </Tooltip>
          
          {/* Relationship Matrix */}
          <Box bgcolor="background.paper" borderRadius={1} className={classes.relationshipContainer}>
            <Box className={classes.relationshipHeader}>
              <Typography variant="h6">
                Define Relationships
              </Typography>
              <Box 
                className={`${classes.completionIndicator} ${relationshipsComplete ? classes.complete : classes.incomplete}`}
              >
                {relationshipsComplete ? (
                  <>
                    <CheckCircleIcon fontSize="small" style={{ marginRight: 4 }} />
                    Complete
                  </>
                ) : (
                  <>
                    {selectedNations.length < 2 ? 
                      "Add nations" : 
                      `${Object.values(nationRelationships).filter(rel => rel.type).length} of ${(selectedNations.length * (selectedNations.length - 1)) / 2} defined`
                    }
                  </>
                )}
              </Box>
            </Box>

            <Typography variant="body2" color="textSecondary" paragraph>
              {selectedNations.length < 2 ? 
                "Add at least two nations or organizations to define relationships." : 
                relationshipsComplete ? 
                  "All relationships defined. You can now configure theaters of conflict." : 
                  "Define relationships between all nations before configuring theaters of conflict."
              }
            </Typography>
            
            <Box className={classes.matrixWrapper}>
              <RelationshipMatrix
                nations={selectedNations}
                relationships={nationRelationships}
                onChange={handleUpdateRelationships}
              />
            </Box>
          </Box>
        </Grid>
        
        {/* Right Pane - Interactive Map */}
        <Grid item xs={12} md={8} lg={9} className={classes.rightPane}>
          <Paper 
            className={`${classes.mapContainer} ${recentlyAdded ? classes.highlightAnimation : ''}`} 
            elevation={2}
          >
            {/* Add the floating button over the map */}
            <Box className={classes.floatingButtonContainer}>
              <Button
                variant="contained"
                color="secondary"
                className={classes.floatingButton}
                startIcon={<SettingsIcon />}
                onClick={handleOpenManageEntitiesModal}
              >
                Manage Custom Nations/Organizations
              </Button>
            </Box>
            
            <WargameMap 
              selectedNations={selectedNations.map(n => n.entityId)} 
              onSelectNation={handleNationSelect}
              onSelectOrganization={handleOrganizationSelect}
              onRemoveNation={handleRemoveNation}
              conflictTheaters={theaters}
            />
            
            <Fade in={!!recentlyAdded} timeout={500}>
              <Box className={classes.recentlyAddedLabel}>
                <Typography variant="body2">
                  {recentlyAdded?.entityName} activated
                </Typography>
              </Box>
            </Fade>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Nation Configuration Modal - Keep this for DIME configuration */}
      <NationPostureModal
        open={configureModalOpen}
        onClose={handleCloseConfigureModal}
        nation={selectedNation}
        otherNations={selectedNations.filter(n => n.entityId !== selectedNation?.entityId)}
        onSave={handleSaveNationConfig}
        nationRelationships={nationRelationships}
      />
      
      {/* Updated Manage Custom Entities Modal */}
      <Dialog
        open={manageEntitiesModalOpen}
        onClose={handleCloseManageEntitiesModal}
        maxWidth="md"
        fullWidth
        aria-labelledby="manage-entities-dialog-title"
      >
        <DialogTitle id="manage-entities-dialog-title">
          Manage Custom Nations & Organizations
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" paragraph>
            Create custom nations or organizations that aren't available on the map. Custom entities will be added to your wargame and can be configured like standard nations.
          </Typography>
          
          {/* Toggle between nation and organization */}
          <Box mt={2} mb={2}>
            <Button 
              color="primary" 
              variant={isCustomNation ? "contained" : "outlined"}
              onClick={handleToggleEntityType}
              style={{ marginRight: 8 }}
            >
              Custom Nation
            </Button>
            <Button 
              color="primary" 
              variant={isCustomOrg ? "contained" : "outlined"}
              onClick={handleToggleEntityType}
            >
              Custom Organization
            </Button>
          </Box>
          
          {/* Custom Nation Form */}
          {isCustomNation && (
            <Box mt={2}>
              <Typography variant="subtitle1" gutterBottom>Create Custom Nation</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <TextField
                    autoFocus
                    margin="dense"
                    id="custom-nation-name"
                    label="Nation Name"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={customNationName}
                    onChange={(e) => setCustomNationName(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    margin="dense"
                    id="custom-nation-id"
                    label="Nation ID (2-3 characters)"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={customNationId}
                    onChange={(e) => setCustomNationId(e.target.value.slice(0, 3).toUpperCase())}
                    helperText="ISO country code format (e.g., XK for Kosovo)"
                    inputProps={{ maxLength: 3 }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          
          {/* Custom Organization Form */}
          {isCustomOrg && !isCustomNation && (
            <Box mt={2}>
              <Typography variant="subtitle1" gutterBottom>Create Custom Organization</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <TextField
                    autoFocus
                    margin="dense"
                    id="custom-org-name"
                    label="Organization Name"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={customOrgName}
                    onChange={(e) => setCustomOrgName(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    margin="dense"
                    id="custom-org-id"
                    label="Organization ID (2-5 characters)"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={customOrgId}
                    onChange={(e) => setCustomOrgId(e.target.value.slice(0, 5).toUpperCase())}
                    helperText="Short identifier (e.g., NATO, UN, EU)"
                    inputProps={{ maxLength: 5 }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button 
              onClick={handleAddCustomEntity} 
              color="primary" 
              variant="contained"
              disabled={(isCustomNation && (!customNationName.trim() || !customNationId.trim())) || 
                       (isCustomOrg && !isCustomNation && (!customOrgName.trim() || !customOrgId.trim()))}
              startIcon={<AddIcon />}
            >
              Add to Wargame
            </Button>
          </Box>
          
          {/* List of Custom Entities */}
          <Typography variant="h6" className={classes.sectionTitle}>
            Custom Entities
          </Typography>
          
          {customEntities.length > 0 ? (
            <List className={classes.customEntityList}>
              {customEntities.map((entity) => (
                <ListItem key={entity.entityId} className={classes.customEntityItem}>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center">
                        {entity.entityName}
                        <Chip 
                          size="small" 
                          label={entity.entityType === 'nation' ? 'Nation' : 'Organization'} 
                          color="primary"
                          style={{ marginLeft: 8 }}
                        />
                      </Box>
                    }
                    secondary={`ID: ${entity.entityId}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      aria-label="delete" 
                      className={classes.deleteButton}
                      onClick={() => handleConfirmDeleteEntity(entity)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="textSecondary" align="center" style={{ marginTop: 16 }}>
              No custom entities created yet
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseManageEntitiesModal} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Confirmation Dialog for Deleting Custom Entities */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-confirm-dialog-title"
      >
        <DialogTitle id="delete-confirm-dialog-title" disableTypography>
          <Box display="flex" alignItems="center">
            <WarningIcon color="error" style={{ marginRight: 8 }} />
            <Typography variant="h6">Remove {entityToDelete?.entityName}?</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Removing <b>{entityToDelete?.entityName}</b> will:
          </Typography>
          <Box component="ul" mt={1} ml={2}>
            <Typography component="li">Delete this custom entity from your wargame</Typography>
            <Typography component="li">Remove all its configuration data if activated</Typography>
            <Typography component="li">Delete any relationships with other nations</Typography>
            <Typography component="li">Remove it from all theaters of conflict</Typography>
          </Box>
          <Typography variant="body1" mt={2} style={{ marginTop: 16 }} color="error">
            <b>This action cannot be undone.</b> Are you sure you want to remove {entityToDelete?.entityName}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteCustomEntity} color="secondary" variant="contained">
            Remove Entity
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Theaters of Conflict Modal */}
      <Dialog
        open={theatersModalOpen}
        onClose={handleCloseTheatersModal}
        maxWidth={false}
        fullWidth
        aria-labelledby="theaters-dialog-title"
        className={classes.theatersDialog}
      >
        <DialogTitle id="theaters-dialog-title" disableTypography className={classes.dialogTitle}>
          <Box>
            <Typography variant="h6">Configure Theaters of Conflict</Typography>
            
            <Box className={classes.stepIndicator}>
              <Box 
                className={`${classes.step} ${relationshipsComplete ? classes.stepComplete : classes.stepActive}`}
              >
                Step 1: Define Relationships
              </Box>
              <Box 
                className={`${classes.step} ${relationshipsComplete ? classes.stepActive : classes.stepPending}`}
              >
                Step 2: Configure Theaters
              </Box>
            </Box>
          </Box>
          
          <IconButton
            aria-label="close"
            className={classes.closeButton}
            onClick={handleCloseTheatersModal}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          <Grid container spacing={2} className={classes.tabContainer}>
            <Grid item xs={12} md={12} className={classes.columnContainer}>
              <Box height="100%" display="flex" flexDirection="column">
                <Typography variant="h6" className={classes.sectionTitle}>
                  Conflict Theaters
                </Typography>
                <Box className={classes.disabledSection}>
                  <ConflictTheatersPane 
                    nations={selectedNations}
                    theaters={theaters}
                    onChange={handleUpdateTheaters}
                    wargameId={wargameData.id}
                  />
                  
                  {!relationshipsComplete && (
                    <Box className={classes.disabledOverlay}>
                      <LockIcon className={classes.lockIcon} />
                      <Typography variant="h6" gutterBottom>
                        Theater Configuration Locked
                      </Typography>
                      <Typography variant="body2">
                        Please define all relationships between nations on the main screen before configuring theaters of conflict.
                      </Typography>
                      <Typography variant="body2" color="error" style={{ marginTop: '8px' }}>
                        {`Nations available: ${selectedNations.length}, Relationships defined: ${Object.values(nationRelationships).filter(rel => rel.type).length} of ${(selectedNations.length * (selectedNations.length - 1)) / 2} required`}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseTheatersModal} color="default">
            Cancel
          </Button>
          <Button 
            onClick={handleSaveTheatersConfig}
            color="primary"
            variant="contained"
          >
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification system */}
      <Snackbar 
        open={notification !== null} 
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {notification && (
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.severity || 'info'}
            elevation={6}
            variant="filled"
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
}

export default CrafterTab;
