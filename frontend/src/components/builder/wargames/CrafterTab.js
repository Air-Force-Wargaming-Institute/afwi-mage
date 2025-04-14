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
  Divider
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Alert from '@material-ui/lab/Alert';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import TheaterIcon from '@material-ui/icons/Theaters';
import CloseIcon from '@material-ui/icons/Close';
import LockIcon from '@material-ui/icons/Lock';
import { GradientText } from '../../../styles/StyledComponents';
import WargameMap from './WargameMap';
import NationConfigPane from './NationConfigPane';
import NationPostureModal from './NationPostureModal';
import ConflictTheatersPane from './ConflictTheatersPane';
import RelationshipMatrix from './RelationshipMatrix';

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
    overflow: 'auto',
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
    marginBottom: theme.spacing(2),
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
  
  // Organization modal state
  const [addOrgModalOpen, setAddOrgModalOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [customOrgName, setCustomOrgName] = useState('');
  const [customOrgId, setCustomOrgId] = useState('');
  const [isCustomOrg, setIsCustomOrg] = useState(false);
  
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

  // Check if all nation relationships are defined
  useEffect(() => {
    if (selectedNations.length < 2) {
      setRelationshipsComplete(false);
      return;
    }
    
    // Count how many relationships we should have
    const totalPairsNeeded = (selectedNations.length * (selectedNations.length - 1)) / 2;
    
    // Count defined relationships
    const definedRelationships = Object.values(nationRelationships).filter(rel => rel.type).length;
    
    setRelationshipsComplete(definedRelationships >= totalPairsNeeded);
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
    
    const updatedNations = selectedNations.filter(entity => entity.entityId !== entityId);
    setSelectedNations(updatedNations);
    
    // Also check if this nation is used in any theaters and remove it
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
    
    setTheaters(updatedTheaters);
    setNationRelationships(updatedRelationships);
    
    // Update parent component state with all changes
    onChange({
      ...wargameData,
      activatedEntities: updatedNations,
      conflictTheaters: updatedTheaters,
      nationRelationships: updatedRelationships
    });
    
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
  
  const handleAddOrganization = () => {
    setAddOrgModalOpen(true);
  };
  
  const handleCloseOrgModal = () => {
    setAddOrgModalOpen(false);
    setSelectedOrgId('');
    setCustomOrgName('');
    setCustomOrgId('');
    setIsCustomOrg(false);
  };
  
  const handleAddOrgSubmit = () => {
    let orgId, orgName;
    
    if (isCustomOrg) {
      // Custom organization
      orgId = customOrgId.toUpperCase();
      orgName = customOrgName;
    } else {
      // Pre-defined organization
      orgId = selectedOrgId;
      orgName = ORGANIZATIONS.find(org => org.id === selectedOrgId)?.name || selectedOrgId;
    }
    
    if (orgId && orgName) {
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
      
      // Close the modal
      handleCloseOrgModal();
    }
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

  return (
    <Box className={classes.root}>
      <GradientText variant="h5" component="h2" gutterBottom>
        Wargame Crafter
      </GradientText>
      
      <Grid container spacing={3} className={classes.gridContainer}>
        {/* Left Pane - Nation Configuration */}
        <Grid item xs={12} md={3} className={classes.leftPane}>
          {/* Theaters of Conflict Button */}
          <Button
            variant="contained"
            color="primary"
            className={classes.theatersButton}
            startIcon={<TheaterIcon />}
            onClick={handleOpenTheatersModal}
          >
            Configure Theaters of Conflict
          </Button>
          
          <NationConfigPane
            nations={selectedNations}
            onConfigureNation={handleConfigureNation}
            onRemoveNation={handleRemoveNation}
            onAddOrganization={handleAddOrganization}
            recentlyAddedId={recentlyAdded?.entityId}
          />
        </Grid>
        
        {/* Right Pane - Interactive Map */}
        <Grid item xs={12} md={9} className={classes.rightPane}>
          <Box className={classes.titleContainer}>
            <Typography variant="h6" className={classes.panelTitle}>
              World Map Selection
            </Typography>
            <Tooltip title="Click on countries or organizations to add them to your wargame scenario">
              <IconButton size="small">
                <HelpOutlineIcon className={classes.helpIcon} />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Paper 
            className={`${classes.mapContainer} ${recentlyAdded ? classes.highlightAnimation : ''}`} 
            elevation={2}
          >
            <WargameMap 
              selectedNations={selectedNations.map(n => n.entityId)} 
              onSelectNation={handleNationSelect}
              onSelectOrganization={handleOrganizationSelect}
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
      
      {/* Nation Configuration Modal */}
      <NationPostureModal
        open={configureModalOpen}
        onClose={handleCloseConfigureModal}
        nation={selectedNation}
        otherNations={selectedNations.filter(n => n.entityId !== selectedNation?.entityId)}
        onSave={handleSaveNationConfig}
      />
      
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
            <Typography variant="h6">Configure Relationships & Theaters of Conflict</Typography>
            
            <Box className={classes.stepIndicator}>
              <Box 
                className={`${classes.step} ${classes.stepActive}`}
              >
                Step 1: Define Relationships
              </Box>
              <Box 
                className={`${classes.step} ${relationshipsComplete ? classes.stepComplete : classes.stepPending}`}
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
            <Grid item xs={12} md={4} className={classes.columnContainer}>
              <Box height="100%" display="flex" flexDirection="column">
                <Typography variant="h6" className={classes.sectionTitle}>
                  Relationship Matrix
                </Typography>
                <RelationshipMatrix
                  nations={selectedNations}
                  relationships={nationRelationships}
                  onChange={handleUpdateRelationships}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={8} className={classes.columnContainer}>
              <Box height="100%" display="flex" flexDirection="column">
                <Typography variant="h6" className={classes.sectionTitle}>
                  Conflict Theaters
                </Typography>
                <Box className={classes.disabledSection}>
                  <ConflictTheatersPane 
                    nations={selectedNations}
                    theaters={theaters}
                    onChange={handleUpdateTheaters}
                  />
                  
                  {!relationshipsComplete && (
                    <Box className={classes.disabledOverlay}>
                      <LockIcon className={classes.lockIcon} />
                      <Typography variant="h6" gutterBottom>
                        Theater Configuration Locked
                      </Typography>
                      <Typography variant="body2">
                        Please define all relationships between nations in Step 1 before configuring theaters of conflict.
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
      
      {/* Add Organization Modal */}
      <Dialog open={addOrgModalOpen} onClose={handleCloseOrgModal} maxWidth="sm" fullWidth>
        <DialogTitle>Add Organization</DialogTitle>
        <DialogContent>
          {!isCustomOrg ? (
            <FormControl variant="outlined" className={classes.formControl}>
              <InputLabel id="org-select-label">Select Organization</InputLabel>
              <Select
                labelId="org-select-label"
                id="org-select"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                label="Select Organization"
              >
                {ORGANIZATIONS.map(org => (
                  <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <>
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
                className={classes.formControl}
              />
              <TextField
                margin="dense"
                id="custom-org-id"
                label="Organization ID (2-5 characters)"
                type="text"
                fullWidth
                variant="outlined"
                value={customOrgId}
                onChange={(e) => setCustomOrgId(e.target.value.slice(0, 5))}
                helperText="Short identifier for the organization (e.g., NATO, UN, EU)"
                inputProps={{ maxLength: 5 }}
                className={classes.formControl}
              />
            </>
          )}
          
          <Button 
            color="primary" 
            onClick={() => setIsCustomOrg(!isCustomOrg)}
          >
            {isCustomOrg ? "Use pre-defined organization" : "Add custom organization"}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOrgModal} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleAddOrgSubmit} 
            color="primary" 
            variant="contained"
            disabled={
              (isCustomOrg && (!customOrgName.trim() || !customOrgId.trim())) || 
              (!isCustomOrg && !selectedOrgId)
            }
          >
            Add
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
