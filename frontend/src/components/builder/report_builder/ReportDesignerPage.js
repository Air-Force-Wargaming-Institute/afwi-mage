import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  Container, 
  Box, 
  makeStyles, 
  Button, 
  Typography, 
  AppBar, 
  Toolbar, 
  IconButton 
} from '@material-ui/core';
import SaveIcon from '@material-ui/icons/Save';
import PublishIcon from '@material-ui/icons/Publish'; // Using Publish as Export
import CloseIcon from '@material-ui/icons/Close';
import ReportConfigPanel from './ReportConfigPanel';
import ReportPreviewPanel from './ReportPreviewPanel';

// Mock API functions (replace with actual service calls)
const fetchReportDefinition = async (reportId) => {
  console.log('Fetching report definition for:', reportId);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // Return mock data for editing, or null/default for new
  if (reportId === '1') {
    return {
      id: '1', 
      title: 'Q1 Threat Assessment', 
      description: 'Analysis of regional threats for Q1.', 
      vectorStoreId: 'vs1', 
      type: 'Custom',
      sections: [
        { id: 's1', type: 'explicit', content: '# Section 1: Introduction\nThis is the intro.' },
        { id: 's2', type: 'generative', instructions: 'Summarize key threats based on intel data.' }
      ]
    };
  }
  return { id: null, title: 'New Report', description: '', vectorStoreId: '', sections: [] }; // Default for new report
};

const saveReportDefinition = async (definition) => {
  console.log('Saving report definition:', definition);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 700));
  // Simulate saving - return the definition, possibly with a generated ID if new
  return { ...definition, id: definition.id || `new-${Date.now()}` }; 
};

const exportReport = async (definition) => {
  console.log('Exporting report:', definition);
  // Simulate API delay and file generation
  await new Promise(resolve => setTimeout(resolve, 1000));
  alert('Report export initiated (simulated).');
};

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh', // Full viewport height
    width: '100vw', // Full viewport width
    position: 'fixed', // Fix position to cover everything
    top: 0,
    left: 0,
    backgroundColor: theme.palette.background.default, // Use theme background
    zIndex: 1500, // Ensure it overlays other content
    padding: 0, // Remove default container padding
    margin: 0, // Remove default margin
    overflow: 'hidden', // Prevent scrolling at the root level
  },
  appBar: {
    position: 'relative', // Keep AppBar part of the flow
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(0, 2),
  },
  contentArea: {
    display: 'flex',
    flexGrow: 1,
    overflow: 'hidden', // Prevent content area from scrolling itself
  },
  leftPanel: {
    width: '20%',
    minWidth: '375px',
    borderRight: `1px solid ${theme.palette.divider}`,
    overflowY: 'auto', // Allow scrolling within this panel
    padding: theme.spacing(2),
    height: 'calc(100vh - 64px)', // Adjust height based on AppBar
  },
  rightPanel: {
    width: '80%',
    overflowY: 'auto', // Allow scrolling within this panel
    padding: theme.spacing(2),
    height: 'calc(100vh - 64px)', // Adjust height based on AppBar
  },
}));

function ReportDesignerPage() {
  const classes = useStyles();
  const { reportId } = useParams(); // Get reportId from URL
  const history = useHistory();
  const [currentDefinition, setCurrentDefinition] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchReportDefinition(reportId); 
        setCurrentDefinition(data);
      } catch (error) {
        console.error("Failed to load report data:", error);
        // Handle error state, maybe redirect or show message
        setCurrentDefinition({ id: null, title: 'Error Loading Report', description: '', sections: [] });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [reportId]);

  const handleDefinitionChange = (newDefinition) => {
    setCurrentDefinition(newDefinition);
  };

  const handleSave = async () => {
    if (!currentDefinition) return;
    setIsSaving(true);
    try {
      const savedDefinition = await saveReportDefinition(currentDefinition);
      setCurrentDefinition(savedDefinition); // Update state with saved data (e.g., new ID)
      alert('Report definition saved!'); 
      // Optionally close window or navigate
      // window.close(); 
    } catch (error) {
      console.error("Failed to save report definition:", error);
      alert('Error saving report definition.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (!currentDefinition) return;
    await exportReport(currentDefinition);
  };

  const handleClose = () => {
    // Ask for confirmation if there are unsaved changes (basic check)
    // In a real app, track changes more robustly
    if (JSON.stringify(currentDefinition) !== JSON.stringify(fetchReportDefinition(reportId))) { // Basic check
      if (window.confirm("You have unsaved changes. Are you sure you want to close?")) {
        window.close();
      }
    } else {
      window.close();
    }
  };

  if (isLoading) {
    return <Typography>Loading Report Designer...</Typography>; // Or a loading spinner
  }

  return (
    <Container className={classes.root} maxWidth={false} disableGutters>
      <AppBar position="static" className={classes.appBar} elevation={1}>
        <Toolbar className={classes.toolbar} variant="dense">
          <Typography variant="h6">
            {currentDefinition?.id ? `Editing: ${currentDefinition.title}` : 'Create New Report'}
          </Typography>
          <Box>
            <Button 
              color="secondary" 
              startIcon={<PublishIcon />} 
              onClick={handleExport}
              style={{ marginRight: '8px' }}
            >
              Export
            </Button>
            <Button 
              color="primary" 
              variant="contained" 
              startIcon={<SaveIcon />} 
              onClick={handleSave}
              disabled={isSaving}
              style={{ marginRight: '8px' }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Box className={classes.contentArea}>
        <Box className={classes.leftPanel}>
          <ReportConfigPanel 
            definition={currentDefinition} 
            onChange={handleDefinitionChange} 
          />
        </Box>
        <Box className={classes.rightPanel}>
          <ReportPreviewPanel 
            definition={currentDefinition} 
            onContentChange={handleDefinitionChange} 
          />
        </Box>
      </Box>
    </Container>
  );
}

export default ReportDesignerPage; 