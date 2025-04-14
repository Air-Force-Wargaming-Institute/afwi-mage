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
  Snackbar
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import CloseIcon from '@material-ui/icons/Close';
import { makeStyles } from '@material-ui/core/styles';
import { GradientText } from '../../../styles/StyledComponents';
import ScenarioTab from './ScenarioTab';
import CrafterTab from './CrafterTab';
import ExecutionChecklist from './ExecutionChecklist';

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
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
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
    height: 'calc(90vh - 120px)', // Adjust height to account for title and tabs
  },
  tabs: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    '& .MuiTab-wrapper': {
      fontSize: '2rem !important',
      fontWeight: 500,
    }
  },
  tabContent: {
    padding: theme.spacing(3),
    height: '100%',
    overflowY: 'auto', // This is the only scrollable element
    flex: 1,
  },
  tabLabel: {
    fontSize: '2rem',
    fontWeight: 500,
  }
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

function WargameEditorModal({ open, onClose, wargameData: initialWargameData }) {
  const classes = useStyles();
  const [tabValue, setTabValue] = useState(0);
  const [wargameData, setWargameData] = useState(null);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  
  // Initialize wargame data when modal opens or data changes
  useEffect(() => {
    if (initialWargameData) {
      setWargameData({
        ...initialWargameData,
        // Initialize fields if they don't exist
        roadToWar: initialWargameData.roadToWar || '',
        researchObjectives: initialWargameData.researchObjectives || '',
        numberOfIterations: initialWargameData.numberOfIterations || 5,
        activatedEntities: initialWargameData.activatedEntities || []
      });
    }
  }, [initialWargameData]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
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

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      aria-labelledby="wargame-editor-dialog-title" 
      className={classes.dialogRoot}
      fullWidth
      maxWidth="xl"
    >
      <DialogTitle id="wargame-editor-dialog-title" className={classes.dialogTitle}>
        <Typography variant="h5" style={{
          color: 'white',
          fontWeight: 600, 
          textShadow: '0 1px 2px rgba(0,0,0,0.6)'
        }}>
          {wargameData?.name || 'Wargame Build'}
        </Typography>
        <IconButton aria-label="close" className={classes.closeButton} onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        className={classes.tabs}
      >
        <Tab 
          label={<Typography variant="h4" style={{ fontSize: '2rem', fontWeight: 700 }}>Scenario & Reports</Typography>} 
          id="wargame-tab-0" 
          aria-controls="wargame-tabpanel-0"
        />
        <Tab 
          label={<Typography variant="h4" style={{ fontSize: '2rem', fontWeight: 700 }}>Wargame Crafter</Typography>} 
          id="wargame-tab-1" 
          aria-controls="wargame-tabpanel-1"
        />
      </Tabs>
      
      <DialogContent className={classes.dialogContent} dividers>
        <TabPanel value={tabValue} index={0} className={classes.tabContent}>
          {wargameData ? (
            <ScenarioTab 
              wargameData={wargameData} 
              onChange={handleWargameDataChange} 
            />
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <Typography variant="body1">Loading wargame data...</Typography>
            </Box>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1} className={classes.tabContent}>
          {wargameData ? (
            <CrafterTab
              wargameData={wargameData}
              onChange={handleWargameDataChange}
            />
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <Typography variant="body1">Loading wargame data...</Typography>
            </Box>
          )}
        </TabPanel>
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