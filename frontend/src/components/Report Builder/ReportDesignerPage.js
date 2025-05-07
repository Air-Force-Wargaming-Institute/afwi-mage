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
  IconButton,
  CircularProgress,
  Snackbar
} from '@material-ui/core';
import SaveIcon from '@material-ui/icons/Save';
import PublishIcon from '@material-ui/icons/Publish';
import CloseIcon from '@material-ui/icons/Close';
import ReportConfigPanel from './ReportConfigPanel';
import ReportPreviewPanel from './ReportPreviewPanel';
import { mockReports } from './mockReports';

// Helper functions
const getDefaultReport = () => ({
  id: null,
  title: 'New Report',
  description: '',
  vectorStoreId: '',
  elements: []
});

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    position: 'fixed',
    top: 0,
    left: 0,
    backgroundColor: theme.palette.background.default,
    zIndex: 1500,
    padding: 0,
    margin: 0,
    overflow: 'hidden',
    '& ::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '& ::-webkit-scrollbar-track': {
      background: theme.palette.background.paper,
      borderRadius: '4px',
    },
    '& ::-webkit-scrollbar-thumb': {
      background: theme.palette.divider,
      borderRadius: '4px',
      '&:hover': {
        background: theme.palette.action.hover,
      },
    },
  },
  appBar: {
    position: 'relative',
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
    overflow: 'hidden',
  },
  leftPanel: {
    width: '20%',
    minWidth: '400px',
    borderRight: `1px solid ${theme.palette.divider}`,
    overflowY: 'auto',
    padding: theme.spacing(2),
    height: 'calc(100vh - 64px)',
    '& ::-webkit-scrollbar': {
      width: '8px',
    },
    '& ::-webkit-scrollbar-track': {
      background: theme.palette.background.paper,
      borderRadius: '4px',
    },
    '& ::-webkit-scrollbar-thumb': {
      background: theme.palette.divider,
      borderRadius: '4px',
      '&:hover': {
        background: theme.palette.action.hover,
      },
    },
  },
  rightPanel: {
    width: '80%',
    overflowY: 'auto',
    padding: theme.spacing(2),
    height: 'calc(100vh - 64px)',
    '& ::-webkit-scrollbar': {
      width: '8px',
    },
    '& ::-webkit-scrollbar-track': {
      background: theme.palette.background.paper,
      borderRadius: '4px',
    },
    '& ::-webkit-scrollbar-thumb': {
      background: theme.palette.divider,
      borderRadius: '4px',
      '&:hover': {
        background: theme.palette.action.hover,
      },
    },
  },
}));

function ReportDesignerPage() {
  const classes = useStyles();
  const history = useHistory();
  const { reportId } = useParams();
  const [currentDefinition, setCurrentDefinition] = useState(getDefaultReport());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (reportId) {
      setIsLoading(true);
      const report = mockReports.find(r => r.id === reportId);
      if (report) {
        // Simplified transformation: Only ensure unique IDs and pass structure mostly as-is.
        // ReportConfigPanel will expect `format` and string list content directly from this definition.
        const transformedElements = report.prebuiltElements.map((element, index) => {
          const baseElementWithId = {
            ...element, // Pass original element properties
            id: `${element.type || 'element'}-${report.id}-${index}-${Date.now()}`,
            // No style-to-format or list content transformation here anymore.
            // This assumes mockReports.js will be updated to provide `format` and string list content.
          };

          // This section handling might still be relevant if mock reports can have nested structures,
          // though the current TSSG example is flat.
          if (element.type === 'section' && element.elements) { 
            const subElementsWithIds = element.elements.map((subElement, subIndex) => ({
              ...subElement,
              id: `${subElement.type || 'subElement'}-${report.id}-${index}-${subIndex}-${Date.now()}`
            }));
            return { ...baseElementWithId, elements: subElementsWithIds };
          }
          return baseElementWithId;
        });

        setCurrentDefinition({
          id: report.id,
          title: report.name,
          description: report.description,
          elements: transformedElements,
          vectorStoreId: report.vectorStoreId || '' 
        });

      } else {
        setCurrentDefinition(prevDef => ({
          ...getDefaultReport(),
          id: reportId
        }));
      }
      setIsLoading(false);
    }
  }, [reportId]);

  const handleDefinitionChange = (newDefinition) => {
    setCurrentDefinition(newDefinition);
  };

  const handleSave = async () => {
    if (!currentDefinition) return;
    setIsSaving(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 700));
      console.log('Saving report:', currentDefinition);
      setSnackbar({
        open: true,
        message: 'Report saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error("Failed to save report:", error);
      setSnackbar({
        open: true,
        message: 'Failed to save report',
        severity: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    history.push('/reports');
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className={classes.root}>
      <AppBar className={classes.appBar}>
        <Toolbar className={classes.toolbar}>
          <Typography variant="h6">
            {currentDefinition.title || 'New Report'}
          </Typography>
          <Box>
            <Button
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={isSaving}
              color="primary"
              variant="contained"
              style={{ marginRight: 16 }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              startIcon={<PublishIcon />}
              color="primary"
              variant="outlined"
              style={{ marginRight: 16 }}
            >
              Export
            </Button>
            <IconButton edge="end" onClick={handleClose}>
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
            currentReportId={reportId}
          />
        </Box>
        <Box className={classes.rightPanel}>
          <ReportPreviewPanel
            definition={currentDefinition}
            onContentChange={handleDefinitionChange}
          />
        </Box>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message={snackbar.message}
      />
    </Box>
  );
}

export default ReportDesignerPage; 