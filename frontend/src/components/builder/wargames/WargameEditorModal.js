import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Box,
  Typography,
  IconButton,
  Snackbar,
  Divider,
  Paper,
  Grid
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import CloseIcon from '@material-ui/icons/Close';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import FullscreenExitIcon from '@material-ui/icons/FullscreenExit';
import { makeStyles } from '@material-ui/core/styles';
import { GradientText } from '../../../styles/StyledComponents';
import ScenarioTab from './ScenarioTab';
import CrafterTab from './CrafterTab';
import ExecutionChecklist from './ExecutionChecklist';
import WargameReportsAnalysis from './WargameReportsAnalysis';
import NationConfigPane from './NationConfigPane';
import NationPosturePanel from './NationPosturePanel';

// Create styles for the modal and tabs
const useStyles = makeStyles((theme) => ({
  dialogRoot: {
    '& .MuiDialog-paper': {
      maxWidth: '95vw',
      maxHeight: '90vh',
      width: '95vw',
      height: '90vh'
    }
  },
  dialogRootFullscreen: {
    '& .MuiDialog-paper': {
      maxWidth: '100vw',
      maxHeight: '100vh',
      width: '100vw',
      height: '100vh',
      margin: 0,
      borderRadius: 0
    }
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
  },
  closeButton: {
    color: theme.palette.grey[500],
    marginLeft: theme.spacing(1), // Add margin between buttons
  },
  fullscreenButton: {
    color: theme.palette.grey[500],
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0.5, 1.5),
    borderRadius: theme.shape.borderRadius,
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
  fullscreenText: {
    marginRight: theme.spacing(1),
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dialogContent: {
    padding: 0,
    overflow: 'hidden', // Prevent DialogContent from scrolling
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(90vh - 180px)', // Adjusted for two tab rows
  },
  topTabs: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    '& .MuiTab-wrapper': {
      fontSize: '1.8rem !important',
      fontWeight: 600,
    }
  },
  bottomTabs: {
    backgroundColor: theme.palette.background.default,
    borderBottom: `1px solid ${theme.palette.divider}`,
    '& .MuiTab-wrapper': {
      fontSize: '1.2rem !important',
      fontWeight: 500,
    },
    paddingLeft: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    '& .MuiTabs-flexContainer': {
      alignItems: 'center',
    }
  },
  tabContent: {
    padding: theme.spacing(3),
    height: '100%',
    overflowY: 'auto', // This is the only scrollable element
    flex: 1,
  },
  tabLabel: {
    fontSize: '1.8rem',
    fontWeight: 600,
  },
  subtabLabel: {
    fontSize: '1.2rem',
    fontWeight: 500,
    position: 'relative',
    display: 'inline-block',
    transition: 'all 0.2s ease',
    '&::after': {
      content: '""',
      position: 'absolute',
      width: '0',
      height: '2px',
      bottom: '-4px',
      left: 0,
      backgroundColor: theme.palette.secondary.main,
      transition: 'width 0.3s ease',
    },
  },
  activeSubtabLabel: {
    fontWeight: 700,
    color: theme.palette.secondary.main,
    '&::after': {
      width: '100%',
    },
  },
  workflowHeading: {
    padding: theme.spacing(1, 2),
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: theme.palette.text.secondary,
  },
  workflowArrow: {
    color: theme.palette.secondary.main,
    opacity: 0.7,
    margin: '0 -12px',
    zIndex: 1,
  },
  workflowTabItem: {
    display: 'flex',
    alignItems: 'center',
  },
  customTabs: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(0, 2),
  },
  customTab: {
    padding: theme.spacing(2),
    minWidth: 0,
    textTransform: 'none',
    cursor: 'pointer',
    opacity: 0.7,
    transition: 'opacity 0.2s ease',
    '&:hover': {
      opacity: 1,
      '& $subtabLabel::after': {
        width: '100%',
      },
    },
  },
  '@keyframes underlineAnimation': {
    from: { width: '0%' },
    to: { width: '100%' }
  },
}));

// TabPanel component to handle tab content visibility
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`wargame-tabpanel-${index}`}
      aria-labelledby={`wargame-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && (
        <Box className={props.className}>
          {children}
        </Box>
      )}
    </div>
  );
}

// New component for the Configure Nations/Organizations tab
function NationConfigurationTab({ wargameData, onChange }) {
  const classes = useStyles();
  const [selectedNation, setSelectedNation] = useState(null);
  const { activatedEntities = [] } = wargameData;
  
  // Handler for when a nation is selected to configure
  const handleConfigureNation = (entity) => {
    setSelectedNation(entity);
  };
  
  // Handler for nation removal
  const handleRemoveNation = (entityId) => {
    const updatedEntities = activatedEntities.filter(entity => entity.entityId !== entityId);
    
    onChange({
      ...wargameData,
      activatedEntities: updatedEntities
    });
    
    // If the removed nation was selected, clear the selection
    if (selectedNation && selectedNation.entityId === entityId) {
      setSelectedNation(null);
    }
  };
  
  // Handler for saving nation configuration
  const handleSaveNationConfig = (updatedEntity) => {
    const updatedEntities = activatedEntities.map(entity => 
      entity.entityId === updatedEntity.entityId ? updatedEntity : entity
    );
    
    onChange({
      ...wargameData,
      activatedEntities: updatedEntities
    });
    
    // Update the selected nation with the new data
    setSelectedNation(updatedEntity);
  };

  return (
    <Grid container spacing={2} style={{ height: '100%' }}>
      {/* Left panel - Nation list (20% width) */}
      <Grid item xs={12} md={3} style={{ height: '100%' }}>
        <Box height="100%" display="flex" flexDirection="column">
          <NationConfigPane 
            nations={activatedEntities}
            onConfigureNation={handleConfigureNation}
            recentlyAddedId={null}
            selectedNationId={selectedNation ? selectedNation.entityId : null}
          />
        </Box>
      </Grid>
      
      {/* Right panel - Nation configuration (80% width) */}
      <Grid item xs={12} md={9} style={{ height: '100%' }}>
        {selectedNation ? (
          <NationPosturePanel
            nation={selectedNation}
            otherNations={activatedEntities.filter(n => n.entityId !== selectedNation.entityId)}
            onSave={handleSaveNationConfig}
            nationRelationships={wargameData.nationRelationships || {}}
          />
        ) : (
          <Box 
            height="100%" 
            display="flex" 
            flexDirection="column" 
            justifyContent="center" 
            alignItems="center"
            p={3}
            textAlign="center"
            bgcolor="rgba(255,255,255,0.05)"
            borderRadius={1}
          >
            <Typography variant="h5" gutterBottom>
              Select an Entity to Configure
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Choose a nation or organization from the list on the left to configure its DIME parameters.
            </Typography>
          </Box>
        )}
      </Grid>
    </Grid>
  );
}

function WargameEditorModal({ open, onClose, wargameData: initialWargameData }) {
  const classes = useStyles();
  const [topTabValue, setTopTabValue] = useState(0);
  const [bottomTabValue, setBottomTabValue] = useState(0);
  const [wargameData, setWargameData] = useState(null);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Initialize wargame data when modal opens or data changes
  useEffect(() => {
    if (initialWargameData) {
      // Get customEntities and activatedEntities from initialWargameData
      const customEntities = initialWargameData.customEntities || [];
      const activatedEntities = initialWargameData.activatedEntities || [];
      
      // Find custom entities that aren't in activatedEntities
      const missingEntities = customEntities.filter(
        customEntity => !activatedEntities.some(
          entity => entity.entityId === customEntity.entityId
        )
      );
      
      // Create new activatedEntities that include all custom entities
      const updatedActivatedEntities = [
        ...activatedEntities, 
        ...missingEntities.map(entity => ({
          entityId: entity.entityId,
          entityName: entity.entityName,
          entityType: entity.entityType,
          isConfigured: false
        }))
      ];
      
      // Set wargameData with all fields and the updated activatedEntities
      setWargameData({
        ...initialWargameData,
        // Initialize fields if they don't exist
        roadToWar: initialWargameData.roadToWar || '',
        researchObjectives: initialWargameData.researchObjectives || '',
        numberOfIterations: initialWargameData.numberOfIterations || 5,
        activatedEntities: updatedActivatedEntities,
        customEntities: customEntities,
        nationRelationships: initialWargameData.nationRelationships || {},
        conflictTheaters: initialWargameData.conflictTheaters || []
      });
    }
  }, [initialWargameData]);

  const handleTopTabChange = (event, newValue) => {
    setTopTabValue(newValue);
    // Reset bottom tab when changing top tab
    setBottomTabValue(0);
  };
  
  const handleBottomTabChange = (event, newValue) => {
    setBottomTabValue(newValue);
  };
  
  // Handle updates to wargame data from any tab
  const handleWargameDataChange = (updatedData) => {
    console.log("Updating wargame data:", updatedData);
    setWargameData(updatedData);
    
    // TODO: Replace with actual API call to save changes
    // For now, simulate saving with localStorage
    try {
      // Get current wargame builds
      const savedWargames = localStorage.getItem('wargameBuilds');
      if (savedWargames) {
        let wargameBuilds = JSON.parse(savedWargames);
        
        // Find and update the current wargame
        const updatedWargameBuilds = wargameBuilds.map(wargame => 
          wargame.id === updatedData.id ? {...wargame, ...updatedData} : wargame
        );
        
        // Save back to localStorage
        localStorage.setItem('wargameBuilds', JSON.stringify(updatedWargameBuilds));
        
        // Show save notification
        setShowSaveNotification(true);
      }
    } catch (error) {
      console.error("Error saving wargame updates to localStorage:", error);
    }
  };
  
  // Close save notification
  const handleCloseNotification = () => {
    setShowSaveNotification(false);
  };

  // Handle toggling fullscreen mode
  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Render content based on tab selections
  const renderContent = () => {
    if (!wargameData) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <Typography variant="body1">Loading wargame data...</Typography>
        </Box>
      );
    }

    // Top tab: Configure and Execute
    if (topTabValue === 0) {
      // Show ScenarioTab by default when "Configure and Execute" is first selected
      if (bottomTabValue === 0) {
        return (
          <ScenarioTab 
            wargameData={wargameData} 
            onChange={handleWargameDataChange} 
            showExecutionChecklist={false} // Don't show ExecutionChecklist on this tab
            moveRoadToWarToRight={true} // Move road to war to right side
          />
        );
      }
      
      // Bottom tabs inside "Configure and Execute"
      switch (bottomTabValue) {
        case 1: // "Select Actors and Theaters" (CrafterTab)
          return (
            <CrafterTab
              wargameData={wargameData}
              onChange={handleWargameDataChange}
            />
          );
        case 2: // "Configure Nations/Organizations" (now using the new component)
          return (
            <NationConfigurationTab
              wargameData={wargameData}
              onChange={handleWargameDataChange}
            />
          );
        case 3: // "Review & Execute" tab (ExecutionChecklist)
          return (
            <Box p={3}>
              <Typography variant="h5" gutterBottom mb={4}>Review & Execute Wargame</Typography>
              <Typography paragraph>
                Review the configuration of your wargame and verify its readiness for execution.
              </Typography>
              <Box mt={3}>
                <ExecutionChecklist wargameData={wargameData} />
              </Box>
            </Box>
          );
        default: // Default to ScenarioTab for top level "Configure and Execute"
          return (
            <ScenarioTab 
              wargameData={wargameData} 
              onChange={handleWargameDataChange} 
              showExecutionChecklist={false}
              moveRoadToWarToRight={true}
            />
          );
      }
    } 
    // Top tab: Reports and Analysis
    else if (topTabValue === 1) {
      return (
        <WargameReportsAnalysis wargameData={wargameData} />
      );
    }
    // Scenario & Reports tab (former first tab - keep for backward compatibility)
    else if (topTabValue === 2) {
      return (
        <ScenarioTab 
          wargameData={wargameData} 
          onChange={handleWargameDataChange} 
        />
      );
    }
  };

  // Custom tab rendering with workflow arrows
  const renderWorkflowTabs = () => {
    return (
      <Box className={classes.customTabs}>
        <Box 
          className={classes.customTab} 
          onClick={(e) => handleBottomTabChange(e, 0)}
        >
          <Typography 
            variant="subtitle1" 
            className={`${classes.subtabLabel} ${bottomTabValue === 0 ? classes.activeSubtabLabel : ''}`}
          >
            Configure and Setup
          </Typography>
        </Box>
        
        <ChevronRightIcon className={classes.workflowArrow} />
        
        <Box 
          className={classes.customTab} 
          onClick={(e) => handleBottomTabChange(e, 1)}
        >
          <Typography 
            variant="subtitle1" 
            className={`${classes.subtabLabel} ${bottomTabValue === 1 ? classes.activeSubtabLabel : ''}`}
          >
            Manage Actors and Theaters
          </Typography>
        </Box>
        
        <ChevronRightIcon className={classes.workflowArrow} />
        
        <Box 
          className={classes.customTab} 
          onClick={(e) => handleBottomTabChange(e, 2)}
        >
          <Typography 
            variant="subtitle1" 
            className={`${classes.subtabLabel} ${bottomTabValue === 2 ? classes.activeSubtabLabel : ''}`}
          >
            Configure Nations/Organizations
          </Typography>
        </Box>
        
        <ChevronRightIcon className={classes.workflowArrow} />
        
        <Box 
          className={classes.customTab} 
          onClick={(e) => handleBottomTabChange(e, 3)}
        >
          <Typography 
            variant="subtitle1" 
            className={`${classes.subtabLabel} ${bottomTabValue === 3 ? classes.activeSubtabLabel : ''}`}
          >
            Review & Execute
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      aria-labelledby="wargame-editor-dialog-title" 
      className={isFullscreen ? classes.dialogRootFullscreen : classes.dialogRoot}
      fullWidth
      maxWidth="xl"
    >
      <DialogTitle id="wargame-editor-dialog-title" className={classes.dialogTitle}>
        <Typography variant="h2" style={{
          color: 'white',
          fontWeight: 600, 
          textShadow: '0 1px 2px rgba(0,0,0,0.6)'
        }}>
          {wargameData?.name || 'Wargame Build'}
        </Typography>
        <Box className={classes.headerControls}>
          <IconButton 
            aria-label="fullscreen" 
            className={classes.fullscreenButton} 
            onClick={handleToggleFullscreen}
          >
            <Typography className={classes.fullscreenText}>
              {isFullscreen ? "EXIT FULLSCREEN" : "FULLSCREEN"}
            </Typography>
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
          <IconButton aria-label="close" className={classes.closeButton} onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      {/* Top level tabs */}
      <Tabs
        value={topTabValue}
        onChange={handleTopTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        className={classes.topTabs}
      >
        <Tab 
          label={<Typography variant="h4" className={classes.tabLabel}>Configure and Execute</Typography>} 
          id="wargame-tab-0" 
          aria-controls="wargame-tabpanel-0"
        />
        <Tab 
          label={<Typography variant="h4" className={classes.tabLabel}>Reports and Analysis</Typography>} 
          id="wargame-tab-1" 
          aria-controls="wargame-tabpanel-1"
        />
        {/* Keep original tab but hidden for backward compatibility */}
        <Tab 
          label={<Typography variant="h4" className={classes.tabLabel}>Scenario & Reports</Typography>} 
          id="wargame-tab-2" 
          aria-controls="wargame-tabpanel-2"
          style={{ display: 'none' }}
        />
      </Tabs>
      
      {/* Show second row of tabs only for "Configure and Execute" tab */}
      {topTabValue === 0 && (
        <>
          <Box className={classes.workflowHeading}>
            <Typography variant="subtitle2">WARGAME CRAFTING WORKFLOW</Typography>
          </Box>
          {renderWorkflowTabs()}
        </>
      )}
      
      <DialogContent className={classes.dialogContent} dividers>
        <Box className={classes.tabContent}>
          {renderContent()}
        </Box>
      </DialogContent>
      
      {/* Auto-save notification */}
      <Snackbar 
        open={showSaveNotification} 
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity="success">
          Changes saved successfully
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

export default WargameEditorModal; 