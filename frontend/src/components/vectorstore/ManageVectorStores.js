import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import {
  Typography,
  makeStyles,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  TextField,
  CircularProgress,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  Paper,
  Divider,
  Box,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Container,
  Badge,
  LinearProgress,
  FormControlLabel,
  Switch
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import AlertTitle from '@material-ui/lab/AlertTitle';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import SearchIcon from '@material-ui/icons/Search';
import AddIcon from '@material-ui/icons/Add';
import StorageIcon from '@material-ui/icons/Storage';
import DescriptionIcon from '@material-ui/icons/Description';
import ViewListIcon from '@material-ui/icons/ViewList';
import ViewModuleIcon from '@material-ui/icons/ViewModule';
import RefreshIcon from '@material-ui/icons/Refresh';
import InfoIcon from '@material-ui/icons/Info';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import ToggleButton from '@material-ui/lab/ToggleButton';
import { Skeleton } from '@material-ui/lab';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import WarningIcon from '@material-ui/icons/Warning';
import DocumentSelector from './DocumentSelector';
import DeleteSweepIcon from '@material-ui/icons/DeleteSweep';
import ComputerIcon from '@material-ui/icons/Computer';
import FolderOpenIcon from '@material-ui/icons/FolderOpen';
import CreateNewFolderIcon from '@material-ui/icons/CreateNewFolder';
import LinkIcon from '@material-ui/icons/Link';
import SaveIcon from '@material-ui/icons/Save';
import AssessmentIcon from '@material-ui/icons/Assessment';
import TableChartIcon from '@material-ui/icons/TableChart';
import CloudOffIcon from '@material-ui/icons/CloudOff';
import CloseIcon from '@material-ui/icons/Close';
import { AuthContext } from '../../contexts/AuthContext';
import { getApiUrl, getGatewayUrl } from '../../config';

// Import the vector store service for API integration
import { 
  getVectorStores, 
  getVectorStoreById, 
  updateVectorStore, 
  deleteVectorStore,
  testVectorStoreQuery,
  addDocumentsToVectorStore,
  removeDocumentsFromVectorStore,
  getJobStatus,
  batchUpdateVectorStore,
  cleanupVectorStoreBackups
} from '../../services/vectorStoreService';

// Import components
import VectorStoreDetails from './VectorStoreDetails';

// Import axios for API calls
import axios from 'axios';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  searchInput: {
    flexGrow: 1,
    marginRight: theme.spacing(2),
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: '0.3s',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: theme.shadows[4],
    },
    position: 'relative',
  },
  cardContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing(1),
  },
  cardActions: {
    justifyContent: 'flex-end',
    padding: theme.spacing(1, 2),
  },
  statsCards: {
    marginBottom: theme.spacing(3),
  },
  statsCard: {
    textAlign: 'center',
    padding: theme.spacing(2),
  },
  statsValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: theme.palette.primary.main,
  },
  viewToggle: {
    marginLeft: theme.spacing(2),
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  emptyState: {
    padding: theme.spacing(4),
    textAlign: 'center',
  },
  actionButton: {
    marginLeft: theme.spacing(1),
  },
  tableContainer: {
    marginTop: theme.spacing(2),
  },
  dialogContent: {
    minWidth: 500,
  },
  tabPanel: {
    padding: theme.spacing(2, 0),
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: theme.spacing(1, 0),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  creationDate: {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
  },
  documentList: {
    maxHeight: 300,
    overflow: 'auto',
  },
  modelChip: {
    marginTop: theme.spacing(1),
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
  },
  progressContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  filterControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  sortSelect: {
    minWidth: 150,
    marginLeft: theme.spacing(1),
  },
  backupChip: {
    margin: theme.spacing(0.5),
    backgroundColor: theme.palette.secondary.light,
    color: theme.palette.secondary.contrastText,
  },
  splitContainer: {
    display: 'flex',
    gap: theme.spacing(3),
    alignItems: 'flex-start',
    height: 'auto',
  },
  mainContentSection: {
    flex: '0 0 66%',
    maxHeight: '100%',
    overflowY: 'auto',
  },
  sidebarSection: {
    flex: '0 0 32%',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '100%',
  },
  connectionCard: {
    marginBottom: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    transition: '0.3s',
    width: '100%',
    '&:hover': {
      boxShadow: theme.shadows[2],
    },
  },
  connectionHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  connectionIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  connectionFormField: {
    marginBottom: theme.spacing(1.5),
  },
  dbTypeSelector: {
    marginBottom: theme.spacing(1.5),
    display: 'flex',
    justifyContent: 'center',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
  },
  dbTypeButton: {
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: theme.shape.borderRadius,
    width: '80px',
    cursor: 'pointer',
    '&.selected': {
      backgroundColor: theme.palette.primary.light,
      color: theme.palette.primary.contrastText,
    },
  },
  dbTypeIcon: {
    fontSize: '2rem',
    marginBottom: theme.spacing(0.5),
  },
  dbTypeLabel: {
    fontSize: '0.75rem',
    textAlign: 'center',
  },
  connectionActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: theme.spacing(1),
    borderTop: `1px solid ${theme.palette.divider}`,
    gap: theme.spacing(1),
  },
  sidebarTitle: {
    margin: theme.spacing(0, 0, 2, 0),
    paddingBottom: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: theme.spacing(1),
  },
  connectionList: {
    marginTop: theme.spacing(2),
  },
  emptyConnections: {
    padding: theme.spacing(3),
    textAlign: 'center',
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    height: '100%',
    overflow: 'hidden',
  },
}));

function ManageVectorStores() {
  const classes = useStyles();
  const { user, token } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vectorStores, setVectorStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedStore, setSelectedStore] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isCleaningBackups, setIsCleaningBackups] = useState(false);
  const [showBackups, setShowBackups] = useState(true);

  // New state variables for database connection functionality
  const [connections, setConnections] = useState([]);
  const [newConnectionOpen, setNewConnectionOpen] = useState(false);
  const [selectedConnectionType, setSelectedConnectionType] = useState(null);
  const [connectionForm, setConnectionForm] = useState({
    name: '',
    type: '',
    server: '',
    database: '',
    username: '',
    password: '',
    port: '',
    filePath: '',
    connectionString: '',
    fileObject: null,
    fileDetails: null
  });

  // Statistics
  const [stats, setStats] = useState({
    totalStores: 0,
    totalDocuments: 0,
    recentlyUpdated: 0
  });

  // Add file input references
  const excelFileInputRef = useRef(null);
  const csvFileInputRef = useRef(null);

  // Add file preview dialog state
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [fileToPreview, setFileToPreview] = useState(null);
  const [previewData, setPreviewData] = useState({
    headers: [],
    rows: [],
    loading: false,
    error: null
  });

  // Load vector stores from API
  useEffect(() => {
    const fetchVectorStores = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await getVectorStores({}, token);
        
        // Map API response fields to component fields
        const mappedData = data.map(store => ({
          ...store,
          documentCount: store.file_count || 0, 
          created: store.created_at,
          lastUpdated: store.updated_at,
          embeddingModel: store.embedding_model
        }));
        
        setVectorStores(mappedData);
        setFilteredStores(mappedData);
        
        // Calculate statistics
        const totalDocuments = mappedData.reduce((total, store) => total + (store.documentCount || 0), 0);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const recentlyUpdated = mappedData.filter(store => 
          new Date(store.lastUpdated) > oneWeekAgo
        ).length;
        
        setStats({
          totalStores: mappedData.length,
          totalDocuments,
          recentlyUpdated
        });
      } catch (error) {
        console.error('Error fetching vector stores:', error);
        setError(error.response?.data?.detail || 'Error loading vector stores');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVectorStores();
  }, [refreshTrigger]);

  // Update filtered stores when vectorStores, searchTerm, or showBackups changes
  useEffect(() => {
    if (!searchTerm.trim() && showBackups) {
      setFilteredStores(vectorStores);
      return;
    }
    
    let filtered = vectorStores;
    
    // First apply backup filter if needed
    if (!showBackups) {
      filtered = filtered.filter(store => !getBackupInfo(store).isBackup);
    }
    
    // Then apply search term filter if needed
    if (searchTerm.trim()) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(store => 
        store.name.toLowerCase().includes(lowercasedTerm) || 
        store.description.toLowerCase().includes(lowercasedTerm)
      );
    }
    
    setFilteredStores(filtered);
  }, [searchTerm, vectorStores, showBackups]);

  const handleViewModeChange = (event, newMode) => {
    if (newMode) setViewMode(newMode);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleOpenDetails = async (store) => {
    setSelectedStore(store);
    
    // Fetch more detailed information
    try {
      const detailedStore = await getVectorStoreById(store.id, token);
      
      if (detailedStore) {
        console.log("Fetched vector store details:", detailedStore);
        
        // Update selected store with detailed information
        setSelectedStore(detailedStore);
      }
    } catch (error) {
      console.error(`Error fetching details for store ${store.id}:`, error);
      // Show error in snackbar
      setSnackbar({
        open: true,
        message: `Error loading details: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
      // Continue with the basic store data we already have
    }
    
    setDetailsDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedStore(null);
  };

  const handleOpenDelete = (store) => {
    console.log("Opening delete dialog with store:", store);
    
    // Make sure we have the most up-to-date document count - handle all possible sources
    let documentCount = 0;
    
    // Check all possible sources of document count in order of reliability
    if (store.files && Array.isArray(store.files)) {
      documentCount = store.files.length;
    } else if (typeof store.documentCount === 'number') {
      documentCount = store.documentCount;
    } else if (typeof store.file_count === 'number') {
      documentCount = store.file_count;
    }
    
    const updatedStore = {
      ...store,
      documentCount: documentCount,
      file_count: documentCount
    };
    
    console.log("Store with updated document count:", updatedStore);
    setStoreToDelete(updatedStore);
    setDeleteDialogOpen(true);
  };

  const handleCloseDelete = () => {
    setDeleteDialogOpen(false);
    setStoreToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!storeToDelete) return;
    
    setIsDeleting(true);
    
    try {
      await deleteVectorStore(storeToDelete.id, token);
      
      // Update local state
      setVectorStores(prevStores => 
        prevStores.filter(store => store.id !== storeToDelete.id)
      );
      
      setSnackbar({
        open: true,
        message: `Vector store "${storeToDelete.name}" successfully deleted`,
        severity: 'success'
      });
      
      // Update statistics
      setStats(prev => ({
        ...prev,
        totalStores: prev.totalStores - 1,
        totalDocuments: prev.totalDocuments - (storeToDelete.documentCount || 0)
      }));
      
    } catch (error) {
      console.error(`Error deleting vector store ${storeToDelete.id}:`, error);
      setSnackbar({
        open: true,
        message: `Error deleting vector store: ${error.response?.data?.detail || error.message}`,
        severity: 'error'
      });
    } finally {
      setIsDeleting(false);
      handleCloseDelete();
    }
  };

  const handleSaveEdit = async (updatedStore) => {
    try {
      const result = await updateVectorStore(updatedStore.id, updatedStore, token);
      
      // Update local state
      setVectorStores(prevStores => 
        prevStores.map(store => 
          store.id === updatedStore.id ? { 
            ...store, 
            name: updatedStore.name,
            description: updatedStore.description,
            lastUpdated: new Date().toISOString() 
          } : store
        )
      );
      
      // Also update selectedStore if it's currently displayed
      if (selectedStore && selectedStore.id === updatedStore.id) {
        setSelectedStore({
          ...selectedStore,
          name: updatedStore.name,
          description: updatedStore.description,
          updated_at: new Date().toISOString()
        });
      }
      
      setSnackbar({
        open: true,
        message: `Vector store "${updatedStore.name}" successfully updated`,
        severity: 'success'
      });
      
    } catch (error) {
      console.error(`Error updating vector store ${updatedStore.id}:`, error);
      setSnackbar({
        open: true,
        message: `Error updating vector store: ${error.response?.data?.detail || error.message}`,
        severity: 'error'
      });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  };

  // Skeleton loaders for loading state
  const renderSkeletons = () => {
    return Array(6).fill(0).map((_, index) => (
      <Grid item xs={12} sm={6} md={4} key={`skeleton-${index}`}>
        <Card className={classes.card}>
          <CardContent className={classes.cardContent}>
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="40%" />
          </CardContent>
          <CardActions className={classes.cardActions}>
            <Skeleton variant="circle" width={30} height={30} style={{ marginLeft: 8 }} />
            <Skeleton variant="circle" width={30} height={30} style={{ marginLeft: 8 }} />
          </CardActions>
        </Card>
      </Grid>
    ));
  };

  // Helper function to determine if a store is a backup and get backup info
  const getBackupInfo = (store) => {
    // First try the metadata-based approach
    if (store.is_backup === true) {
      return {
        isBackup: true,
        originalId: store.original_id,
        timestamp: store.backup_timestamp,
        formattedDate: store.backup_date ? new Date(store.backup_date).toLocaleString() : 'Unknown date',
        displayName: store.display_name || `BACKUP OF: ${store.name}`,
        reason: store.backup_reason || 'Backup'
      };
    }
    
    // Check for backup ID format (newly added approach)
    if (store.id && store.id.includes("_backup_")) {
      try {
        const parts = store.id.split("_backup_");
        const originalId = parts[0];
        const timestamp = parts[1];
        const backupDate = timestamp ? new Date(parseInt(timestamp) * 1000) : new Date();
        
        return {
          isBackup: true,
          originalId,
          timestamp,
          formattedDate: backupDate.toLocaleString(),
          displayName: `BACKUP OF: ${store.name}`,
          reason: 'ID-based backup'
        };
      } catch (e) {
        console.warn("Error parsing backup info from ID:", store.id);
      }
    }
    
    // Fall back to directory-based detection for legacy backups
    if (store.directory && store.directory.includes("_backup_")) {
      try {
        const parts = store.directory.split("_backup_");
        const originalId = parts[0];
        const timestamp = parts[1];
        const backupDate = timestamp ? new Date(parseInt(timestamp) * 1000) : new Date();
        
        return {
          isBackup: true,
          originalId,
          timestamp,
          formattedDate: backupDate.toLocaleString(),
          displayName: `BACKUP OF: ${store.name}`,
          reason: 'Directory-based backup'
        };
      } catch (e) {
        console.warn("Error parsing backup info from directory:", store.directory);
      }
    }
    
    // Not a backup
    return {
      isBackup: false
    };
  };

  // Grid view of vector stores
  const renderGridView = () => {
    if (filteredStores.length === 0 && !loading) {
      return (
        <Grid item xs={12}>
          <Paper className={classes.emptyState}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No vector stores found
            </Typography>
            {searchTerm ? (
              <Typography variant="body2" color="textSecondary">
                No results match your search "{searchTerm}". Try different keywords or clear your search.
              </Typography>
            ) : (
              <Typography variant="body2" color="textSecondary">
                You haven't created any vector stores yet. Create one to get started!
              </Typography>
            )}
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              style={{ marginTop: 16 }}
              onClick={() => window.location.href = '/retrieval/build-databases'}
            >
              Create Vector Store
            </Button>
          </Paper>
        </Grid>
      );
    }

    return (
      <>
        {loading ? renderSkeletons() : (
          filteredStores.map((store) => {
            // Get backup info
            const backupInfo = getBackupInfo(store);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={store.id}>
                <Card 
                  className={classes.card} 
                  onClick={() => handleOpenDetails(store)}
                  style={{ 
                    cursor: 'pointer',
                    // Add a subtle background tint for backup stores
                    backgroundColor: backupInfo.isBackup ? 'rgba(220, 220, 255, 0.2)' : undefined,
                    // Add a border for backup stores
                    border: backupInfo.isBackup ? '1px solid #9c27b0' : undefined
                  }}
                >
                  <span className={classes.creationDate}>
                    Created: {formatDate(store.created)}
                  </span>
                  
                  {/* Add a backup indicator badge */}
                  {backupInfo.isBackup && (
                    <Box position="absolute" top={10} left={10}>
                      <Chip
                        size="small"
                        label="BACKUP"
                        color="secondary"
                        className={classes.backupChip}
                        title={`${backupInfo.reason}. Created on ${backupInfo.formattedDate}`}
                      />
                    </Box>
                  )}
                  
                  <CardContent className={classes.cardContent}>
                    <Typography variant="h6" gutterBottom>
                      {backupInfo.isBackup ? backupInfo.displayName : store.name}
                      {backupInfo.isBackup && (
                        <Typography variant="caption" component="span" style={{ marginLeft: 8, color: '#9c27b0' }}>
                          (Backup from {backupInfo.formattedDate})
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom noWrap>
                      {store.description}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      <DescriptionIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="textSecondary" style={{ marginLeft: 8 }}>
                        {store.documentCount || 0} document{(store.documentCount || 0) !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" mt={0.5}>
                      <InfoIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="textSecondary" style={{ marginLeft: 8 }}>
                        Updated: {formatDate(store.lastUpdated)}
                      </Typography>
                    </Box>
                    <Chip 
                      label={store.embeddingModel || 'Unknown Model'} 
                      size="small" 
                      className={classes.modelChip}
                    />
                  </CardContent>
                  <CardActions className={classes.cardActions}>
                    <Button
                      size="small"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click from triggering
                        handleOpenDetails(store);
                      }}
                    >
                      DETAILS
                    </Button>
                    <IconButton 
                      size="small" 
                      color="secondary" 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click from triggering
                        handleOpenDelete(store);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            );
          })
        )}
      </>
    );
  };

  // Table view of vector stores
  const renderTableView = () => {
    if (filteredStores.length === 0 && !loading) {
      return (
        <Paper className={classes.emptyState}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No vector stores found
          </Typography>
          {searchTerm ? (
            <Typography variant="body2" color="textSecondary">
              No results match your search "{searchTerm}". Try different keywords or clear your search.
            </Typography>
          ) : (
            <Typography variant="body2" color="textSecondary">
              You haven't created any vector stores yet. Create one to get started!
            </Typography>
          )}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            style={{ marginTop: 16 }}
            onClick={() => window.location.href = '/retrieval/build-databases'}
          >
            Create Vector Store
          </Button>
        </Paper>
      );
    }

    return (
      <TableContainer component={Paper} className={classes.tableContainer}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Documents</TableCell>
              <TableCell>Model</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array(5).fill(0).map((_, index) => (
                <TableRow key={`skeleton-row-${index}`}>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                </TableRow>
              ))
            ) : (
              filteredStores.map((store) => {
                // Get backup info
                const backupInfo = getBackupInfo(store);
                
                return (
                  <TableRow 
                    key={store.id} 
                    hover 
                    onClick={() => handleOpenDetails(store)}
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: backupInfo.isBackup ? 'rgba(220, 220, 255, 0.15)' : undefined
                    }}
                  >
                    <TableCell>
                      {backupInfo.isBackup ? backupInfo.displayName : store.name}
                      {backupInfo.isBackup && (
                        <Box display="flex" alignItems="center" mt={0.5}>
                          <Chip
                            size="small"
                            label="BACKUP"
                            color="secondary"
                            className={classes.backupChip}
                            style={{ marginRight: 8 }}
                          />
                          <Typography variant="caption" style={{ color: '#9c27b0' }}>
                            {backupInfo.formattedDate}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>{store.description}</TableCell>
                    <TableCell>{store.documentCount || 0}</TableCell>
                    <TableCell>
                      <Chip 
                        label={store.embeddingModel || 'Unknown'} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{formatDate(store.lastUpdated)}</TableCell>
                    <TableCell>
                      {backupInfo.isBackup && (
                        <Chip 
                          label={backupInfo.reason} 
                          size="small" 
                          color="secondary"
                          variant="outlined"
                          style={{ fontWeight: 'bold' }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        color="primary" 
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click
                          handleOpenDetails(store);
                        }}
                      >
                        <InfoIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="secondary" 
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click
                          handleOpenDelete(store);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const handleRefreshVectorStore = async () => {
    if (!selectedStore) return;
    
    try {
      const refreshedStore = await getVectorStoreById(selectedStore.id, token);
      
      if (refreshedStore) {
        // Update selected store with refreshed information
        setSelectedStore(refreshedStore);
        
        // Also update the store in the main list
        setVectorStores(prevStores => 
          prevStores.map(store => 
            store.id === refreshedStore.id ? {
              ...store,
              file_count: refreshedStore.files?.length || 0,
              documentCount: refreshedStore.files?.length || 0,
              lastUpdated: refreshedStore.updated_at,
              updated_at: refreshedStore.updated_at
            } : store
          )
        );
      }
    } catch (error) {
      console.error(`Error refreshing vector store ${selectedStore.id}:`, error);
      setSnackbar({
        open: true,
        message: `Error refreshing vector store: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  const handleCleanupBackups = async () => {
    if (isCleaningBackups) return;
    
    setIsCleaningBackups(true);
    try {
      const result = await cleanupVectorStoreBackups(3, token);
      setSnackbar({
        open: true,
        message: `${result.message} ${result.details}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error cleaning up backups:', error);
      setSnackbar({
        open: true,
        message: 'Failed to clean up backups: ' + (error.response?.data?.detail || error.message),
        severity: 'error'
      });
    } finally {
      setIsCleaningBackups(false);
    }
  };

  // Calculate total backup count using the helper function
  const backupCount = useMemo(() => {
    return vectorStores.filter(store => getBackupInfo(store).isBackup).length;
  }, [vectorStores]);

  // Clean Up Backups Button
  const renderCleanupButton = () => {
    return (
      <Box mt={3} display="flex" justifyContent="flex-end">
        <Button
          variant={backupCount > 0 ? "contained" : "outlined"}
          color="secondary"
          onClick={handleCleanupBackups}
          disabled={isCleaningBackups || backupCount === 0}
          startIcon={isCleaningBackups ? <CircularProgress size={20} /> : <DeleteSweepIcon />}
          style={{ 
            marginTop: 16,
            fontWeight: backupCount > 0 ? 'bold' : 'normal', 
          }}
        >
          {backupCount > 0 
            ? `Clean Up ${backupCount} Vector Store Backup${backupCount !== 1 ? 's' : ''}`
            : "No Backups to Clean Up"
          }
        </Button>
        {backupCount > 0 && (
          <Badge 
            color="error" 
            badgeContent={backupCount} 
            overlap="circular"
            style={{ marginLeft: -45, marginTop: 10 }}
          />
        )}
      </Box>
    );
  };

  // Toggle new connection form
  const handleToggleNewConnection = () => {
    setNewConnectionOpen(!newConnectionOpen);
    if (!newConnectionOpen) {
      setConnectionForm({
        name: '',
        type: '',
        server: '',
        database: '',
        username: '',
        password: '',
        port: '',
        filePath: '',
        connectionString: '',
        fileObject: null,
        fileDetails: null
      });
      setSelectedConnectionType(null);
    }
  };

  // Handle connection type selection
  const handleSelectConnectionType = (type) => {
    setSelectedConnectionType(type);
    setConnectionForm({
      ...connectionForm,
      type: type
    });
  };

  // Handle form field changes
  const handleConnectionFormChange = (e) => {
    const { name, value } = e.target;
    setConnectionForm({
      ...connectionForm,
      [name]: value
    });
  };

  // Handle file selection
  const handleFileSelect = (event, fileType) => {
    const file = event.target.files[0];
    if (file) {
      // Format file size to human-readable format
      const fileSizeInKB = file.size / 1024;
      let fileSizeFormatted = '';
      
      if (fileSizeInKB < 1024) {
        fileSizeFormatted = `${fileSizeInKB.toFixed(2)} KB`;
      } else {
        const fileSizeInMB = fileSizeInKB / 1024;
        fileSizeFormatted = `${fileSizeInMB.toFixed(2)} MB`;
      }
      
      // Format last modified date
      const lastModified = new Date(file.lastModified);
      const lastModifiedFormatted = lastModified.toLocaleString();
      
      // Update form with file information
      setConnectionForm({
        ...connectionForm,
        filePath: file.name,
        fileObject: file,
        fileDetails: {
          size: fileSizeFormatted,
          type: file.type,
          lastModified: lastModifiedFormatted
        }
      });

      // Show success message
      setSnackbar({
        open: true,
        message: `File "${file.name}" (${fileSizeFormatted}) selected`,
        severity: 'success'
      });
    }
  };

  // Trigger file dialog for Excel
  const handleBrowseExcel = () => {
    if (excelFileInputRef.current) {
      excelFileInputRef.current.click();
    }
  };

  // Trigger file dialog for CSV
  const handleBrowseCSV = () => {
    if (csvFileInputRef.current) {
      csvFileInputRef.current.click();
    }
  };

  // Save connection (placeholder function)
  const handleSaveConnection = () => {
    // Create file path display for file-based connections
    let fileDetails = null;
    
    if (connectionForm.fileObject) {
      fileDetails = {
        name: connectionForm.fileObject.name,
        size: connectionForm.fileDetails?.size || '',
        type: connectionForm.fileDetails?.type || '',
        lastModified: connectionForm.fileDetails?.lastModified || ''
      };
    }
    
    // This would eventually connect to an API to save the connection
    const newConnection = {
      id: Date.now().toString(),
      ...connectionForm,
      fileDetails: fileDetails,
      status: 'Not Connected',
      lastConnected: null
    };
    
    setConnections([...connections, newConnection]);
    setSnackbar({
      open: true,
      message: `Database connection "${connectionForm.name}" created successfully`,
      severity: 'success'
    });
    
    setNewConnectionOpen(false);
    setConnectionForm({
      name: '',
      type: '',
      server: '',
      database: '',
      username: '',
      password: '',
      port: '',
      filePath: '',
      connectionString: '',
      fileObject: null,
      fileDetails: null
    });
    setSelectedConnectionType(null);
  };

  // Handle opening file preview
  const handleOpenFilePreview = (connection) => {
    setFileToPreview(connection);
    setPreviewData({
      headers: [],
      rows: [],
      loading: true,
      error: null
    });
    setFilePreviewOpen(true);
    
    // Fetch the file preview from the API
    if (connection.fileObject) {
      // Case 1: For newly selected files that haven't been uploaded yet
      // Use the browser's FileReader API to preview them
      previewLocalFile(connection.fileObject, connection.type);
    } else if (connection.filePath) {
      // Case 2: For existing files already on the server
      // Call the backend API to get a preview
      fetchFilePreviewFromServer(connection.filePath, connection.type);
    } else {
      setPreviewData({
        headers: [],
        rows: [],
        loading: false,
        error: "No file available for preview"
      });
    }
  };
  
  // Preview a local file that hasn't been uploaded yet
  const previewLocalFile = (file, fileType) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (fileType === 'excel') {
          // For Excel files, we would need a library like SheetJS/xlsx
          // This is more complex for client-side and normally would be 
          // handled through a temporary upload to server
          // For now, we'll show a message
          setPreviewData({
            headers: [],
            rows: [],
            loading: false,
            error: "Excel preview requires uploading the file first"
          });
          
          // Consider a temporary upload to the server here or 
          // use a library like xlsx-js for client-side parsing
        } else if (fileType === 'csv') {
          // For CSV, we can do simple client-side parsing
          const csv = e.target.result;
          const lines = csv.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          
          const rows = [];
          for (let i = 1; i < Math.min(lines.length, 6); i++) {
            if (lines[i].trim() !== '') {
              rows.push(lines[i].split(',').map(cell => cell.trim()));
            }
          }
          
          setPreviewData({
            headers,
            rows,
            loading: false,
            error: null
          });
        }
      } catch (error) {
        console.error("Error parsing file:", error);
        setPreviewData({
          headers: [],
          rows: [],
          loading: false,
          error: `Error parsing file: ${error.message}`
        });
      }
    };
    
    reader.onerror = () => {
      setPreviewData({
        headers: [],
        rows: [],
        loading: false,
        error: "Error reading file"
      });
    };
    
    if (fileType === 'csv') {
      reader.readAsText(file);
    } else {
      // For Excel, we would need a different approach
      reader.readAsArrayBuffer(file);
    }
  };
  
  // Fetch file preview from the backend server for existing files
  const fetchFilePreviewFromServer = (filePath, fileType) => {
    const url = getGatewayUrl(`/api/upload/preview-tabular/${filePath}`);
    
    axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        const data = response.data;
        setPreviewData({
          headers: data.headers,
          rows: data.rows,
          loading: false,
          error: null,
          fileInfo: data.file_info,
          totalRows: data.total_rows
        });
      })
      .catch(error => {
        console.error("Error fetching file preview:", error);
        setPreviewData({
          headers: [],
          rows: [],
          loading: false,
          error: `Error fetching preview: ${error.response?.data?.detail || error.message}`
        });
      });
  };

  // Render file preview dialog
  const renderFilePreviewDialog = () => {
  return (
      <Dialog
        open={filePreviewOpen}
        onClose={handleCloseFilePreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle style={{ paddingBottom: 8 }}>
          <Box display="flex" alignItems="center">
            {fileToPreview?.type === 'excel' ? (
              <TableChartIcon style={{ marginRight: 8, color: '#217346' }} />
            ) : (
              <AssessmentIcon style={{ marginRight: 8, color: '#FF6D01' }} />
            )}
            Preview: {fileToPreview?.name || fileToPreview?.filePath}
            {previewData.fileInfo && (
              <Typography variant="caption" style={{ marginLeft: 12, color: 'text.secondary' }}>
                ({previewData.fileInfo.size_formatted})
              </Typography>
            )}
          </Box>
        </DialogTitle>
        <DialogContent style={{ paddingTop: 8 }}>
          {previewData.loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : previewData.error ? (
            <Alert severity="error">{previewData.error}</Alert>
          ) : (
            <>
              <Typography variant="body2" color="textSecondary" paragraph>
                {previewData.totalRows ? 
                  `Showing ${Math.min(previewData.rows.length, 5)} of ${previewData.totalRows} total rows` : 
                  `Showing first ${previewData.rows.length} rows`} from {fileToPreview?.filePath}
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {previewData.headers.map((header, index) => (
                        <TableCell key={index} style={{ fontWeight: 'bold' }}>
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData.rows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex}>{cell !== null ? cell.toString() : ''}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {previewData.totalRows > 5 && (
                <Box mt={1} display="flex" justifyContent="center">
                  <Typography variant="caption" color="textSecondary">
                    {previewData.totalRows - 5} more rows not shown
                  </Typography>
                </Box>
              )}
              <Box mt={2}>
                <Typography variant="caption" color="textSecondary">
                  Note: This is a preview of the first few rows. When using this data in MAGE, you'll be able to select specific columns to use for retrieval or generation.
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            color="primary" 
            onClick={handleCloseFilePreview}
          >
            Close
          </Button>
          <Button 
            color="primary" 
            variant="contained"
            disabled={previewData.loading || previewData.error}
            onClick={handleUseThisData}
          >
            Use This Data
          </Button>
        </DialogActions>
      </Dialog>
    );
  };
  
  // Handle the "Use This Data" button click
  const handleUseThisData = () => {
    // This would eventually connect to an API to process the file and create a vector store
    setSnackbar({
      open: true,
      message: `Processing data from "${fileToPreview?.name || fileToPreview?.filePath}" for vector store creation`,
      severity: 'info'
    });
    
    // Close the preview dialog
    handleCloseFilePreview();
    
    // Here we would handle the file processing and vector store creation
    // For now, just show a message
    setTimeout(() => {
      setSnackbar({
        open: true,
        message: 'This functionality is still under development. The file would be processed for vector store creation.',
        severity: 'info'
      });
    }, 1500);
  };

  // Handle closing file preview
  const handleCloseFilePreview = () => {
    setFilePreviewOpen(false);
    setFileToPreview(null);
  };

  // Update the test connection handler to show indication of testing
  const handleTestConnection = (connectionId) => {
    // Show testing indicator
    setSnackbar({
      open: true,
      message: `Testing connection...`,
      severity: 'info'
    });
    
    // Simulate a brief delay to represent the testing process
    setTimeout(() => {
      if (connectionId) {
        // Find the connection by ID
        const connection = connections.find(conn => conn.id === connectionId);
        
        if (connection) {
          if (connection.type === 'excel' || connection.type === 'csv') {
            // For file-based connections, show preview
            handleOpenFilePreview(connection);
          } else {
            // For database connections, test the connection
            setSnackbar({
              open: true,
              message: `Test connection successful for "${connection.name}"`,
              severity: 'success'
            });
          }
        }
      } else {
        // This is for the "Test Connection" button in the form
        setSnackbar({
          open: true,
          message: `Test connection successful for "${connectionForm.name}"`,
          severity: 'success'
        });
      }
    }, 1000);
  };

  // Delete connection
  const handleDeleteConnection = (connectionId) => {
    setConnections(connections.filter(conn => conn.id !== connectionId));
    setSnackbar({
      open: true,
      message: 'Connection deleted successfully',
      severity: 'success'
    });
  };

  // Render the connection form fields based on the selected connection type
  const renderConnectionFormFields = () => {
    switch (selectedConnectionType) {
      case 'sqlServer':
        return (
          <>
            <TextField
              fullWidth
              label="Server"
              name="server"
              value={connectionForm.server}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
              placeholder="e.g., localhost or 192.168.1.100"
            />
            <TextField
              fullWidth
              label="Database Name"
              name="database"
              value={connectionForm.database}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
            />
            <TextField
              fullWidth
              label="Port"
              name="port"
              value={connectionForm.port}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
              placeholder="e.g., 1433"
            />
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={connectionForm.username}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={connectionForm.password}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
            />
          </>
        );
      
      case 'mysql':
        return (
          <>
            <TextField
              fullWidth
              label="Server"
              name="server"
              value={connectionForm.server}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
              placeholder="e.g., localhost or 192.168.1.100"
            />
            <TextField
              fullWidth
              label="Database Name"
              name="database"
              value={connectionForm.database}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
            />
            <TextField
              fullWidth
              label="Port"
              name="port"
              value={connectionForm.port}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
              placeholder="e.g., 3306"
            />
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={connectionForm.username}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={connectionForm.password}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
            />
          </>
        );
      
      case 'postgresql':
        return (
          <>
            <TextField
              fullWidth
              label="Server"
              name="server"
              value={connectionForm.server}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
              placeholder="e.g., localhost or 192.168.1.100"
            />
            <TextField
              fullWidth
              label="Database Name"
              name="database"
              value={connectionForm.database}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
            />
            <TextField
              fullWidth
              label="Port"
              name="port"
              value={connectionForm.port}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
              placeholder="e.g., 5432"
            />
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={connectionForm.username}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={connectionForm.password}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
            />
          </>
        );
      
      case 'excel':
        return (
          <>
            <TextField
              fullWidth
              label="File Path"
              name="filePath"
              value={connectionForm.filePath}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
              placeholder="Select an Excel file (.xlsx, .xls)"
              InputProps={{
                endAdornment: (
                  <Button
                    variant="contained"
                    color="default"
                    size="small"
                    style={{ marginRight: -10 }}
                    onClick={handleBrowseExcel}
                  >
                    Browse
                  </Button>
                ),
                readOnly: true,
              }}
            />
            <input
              type="file"
              accept=".xlsx,.xls"
              ref={excelFileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e, 'excel')}
            />
            <Typography variant="caption" color="textSecondary">
              Supported formats: .xlsx, .xls
            </Typography>
          </>
        );
      
      case 'csv':
        return (
          <>
            <TextField
              fullWidth
              label="File Path"
              name="filePath"
              value={connectionForm.filePath}
              onChange={handleConnectionFormChange}
              className={classes.connectionFormField}
              variant="outlined"
              size="small"
              placeholder="Select a CSV file (.csv)"
              InputProps={{
                endAdornment: (
                  <Button
                    variant="contained"
                    color="default"
                    size="small"
                    style={{ marginRight: -10 }}
                    onClick={handleBrowseCSV}
                  >
                    Browse
                  </Button>
                ),
                readOnly: true,
              }}
            />
            <input
              type="file"
              accept=".csv"
              ref={csvFileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e, 'csv')}
            />
            <Typography variant="caption" color="textSecondary">
              Supported format: .csv (comma-separated values)
            </Typography>
          </>
        );
      
      case 'other':
        return (
          <TextField
            fullWidth
            label="Connection String"
            name="connectionString"
            value={connectionForm.connectionString}
            onChange={handleConnectionFormChange}
            className={classes.connectionFormField}
            variant="outlined"
            size="small"
            multiline
            rows={4}
            placeholder="Enter your custom connection string"
          />
        );
      
      default:
        return (
          <Typography variant="body2" color="textSecondary" style={{ textAlign: 'center' }}>
            Please select a connection type above
          </Typography>
        );
    }
  };

  // Render connection type selector
  const renderConnectionTypeSelector = () => {
    const connectionTypes = [
      { id: 'sqlServer', name: 'SQL Server', icon: <StorageIcon className={classes.dbTypeIcon} /> },
      { id: 'mysql', name: 'MySQL', icon: <StorageIcon className={classes.dbTypeIcon} /> },
      { id: 'postgresql', name: 'PostgreSQL', icon: <StorageIcon className={classes.dbTypeIcon} /> },
      { id: 'excel', name: 'Excel', icon: <TableChartIcon className={classes.dbTypeIcon} /> },
      { id: 'csv', name: 'CSV', icon: <AssessmentIcon className={classes.dbTypeIcon} /> },
      { id: 'other', name: 'Other', icon: <CloudOffIcon className={classes.dbTypeIcon} /> }
    ];
    
    return (
      <Box className={classes.dbTypeSelector}>
        {connectionTypes.map((type) => (
          <Box 
            key={type.id}
            className={`${classes.dbTypeButton} ${selectedConnectionType === type.id ? 'selected' : ''}`}
            onClick={() => handleSelectConnectionType(type.id)}
          >
            {type.icon}
            <Typography className={classes.dbTypeLabel}>{type.name}</Typography>
          </Box>
        ))}
      </Box>
    );
  };

  // Render the database connections section
  const renderDatabaseConnections = () => {
    return (
      <Paper 
        className={classes.sidebarSection} 
        elevation={3}
      >
        <Box p={2}>
          <Typography variant="h5" className={classes.sidebarTitle}>
            <LinkIcon className={classes.titleIcon} />
            Connect to System Databases
          </Typography>
          
          <Typography variant="body2" color="textSecondary" paragraph>
            Connect MAGE to local databases to access structured data for analysis and integration with AI agents.
          </Typography>
          
          <Button
            variant="contained"
            color="secondary"
            fullWidth
            startIcon={newConnectionOpen ? <CloseIcon /> : <AddIcon />}
            onClick={handleToggleNewConnection}
          >
            {newConnectionOpen ? 'Cancel' : 'Add New Connection'}
          </Button>
          
          {newConnectionOpen && (
            <Paper className={classes.connectionCard} elevation={0}>
              <div className={classes.connectionHeader}>
                <ComputerIcon className={classes.connectionIcon} />
                <Typography variant="subtitle1">New Database Connection</Typography>
              </div>
              
              <Box p={2}>
                <TextField
                  fullWidth
                  label="Connection Name"
                  name="name"
                  value={connectionForm.name}
                  onChange={handleConnectionFormChange}
                  className={classes.connectionFormField}
                  variant="outlined"
                  size="small"
                  placeholder="e.g., HR Database"
                />
                
                <Typography variant="subtitle2" gutterBottom>Select Database Type</Typography>
                {renderConnectionTypeSelector()}
                
                {selectedConnectionType && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>Connection Details</Typography>
                    {renderConnectionFormFields()}
                  </>
                )}
              </Box>
              
              <div className={classes.connectionActions}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<StorageIcon />}
                  onClick={handleTestConnection}
                  disabled={!selectedConnectionType || !connectionForm.name}
                >
                  Test Connection
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveConnection}
                  disabled={!selectedConnectionType || !connectionForm.name}
                >
                  Save Connection
                </Button>
              </div>
            </Paper>
          )}
          
          <div className={classes.connectionList}>
            <Typography variant="subtitle1" gutterBottom>
              Saved Connections
            </Typography>
            
            {connections.length === 0 ? (
              <div className={classes.emptyConnections}>
                <Typography variant="body2" color="textSecondary">
                  No database connections configured yet.
                </Typography>
              </div>
            ) : (
              connections.map((connection) => (
                <Paper key={connection.id} className={classes.connectionCard} elevation={0}>
                  <div className={classes.connectionHeader}>
                    {connection.type === 'excel' || connection.type === 'csv' ? (
                      <TableChartIcon className={classes.connectionIcon} />
                    ) : (
                      <StorageIcon className={classes.connectionIcon} />
                    )}
                    <Typography variant="subtitle2">{connection.name}</Typography>
                  </div>
                  
                  <Box p={2}>
                    <Typography variant="body2" color="textSecondary">
                      Type: {connection.type === 'sqlServer' ? 'SQL Server' : 
                            connection.type === 'mysql' ? 'MySQL' : 
                            connection.type === 'postgresql' ? 'PostgreSQL' : 
                            connection.type === 'excel' ? 'Excel File' : 
                            connection.type === 'csv' ? 'CSV File' : 'Other'}
                    </Typography>
                    
                    {(connection.type === 'sqlServer' || connection.type === 'mysql' || connection.type === 'postgresql') && (
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        <Typography variant="body2" color="textSecondary">
                          Server: {connection.server}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" style={{ marginLeft: 8 }}>
                          DB: {connection.database}
                        </Typography>
                      </Box>
                    )}
                    
                    {(connection.type === 'excel' || connection.type === 'csv') && (
                      <>
                        <Typography variant="body2" color="textSecondary" noWrap>
                          File: {connection.filePath}
                        </Typography>
                        {connection.fileDetails && (
                          <Box display="flex" flexWrap="wrap" gap={1} alignItems="center" mt={0.5}>
                            <Typography variant="body2" color="textSecondary">
                              {connection.fileDetails.size}
                            </Typography>
                            <Tooltip title={connection.fileDetails.lastModified}>
                              <Typography variant="body2" color="textSecondary" style={{ marginLeft: 8 }}>
                                Modified: {new Date(connection.fileDetails.lastModified).toLocaleDateString()}
                              </Typography>
                            </Tooltip>
                            <Tooltip title={connection.fileDetails.type || "Unknown file type"}>
                              <Chip 
                                size="small" 
                                label={connection.type === 'excel' ? 'Excel' : 'CSV'} 
                                style={{ backgroundColor: connection.type === 'excel' ? '#217346' : '#FF6D01', color: 'white' }}
                              />
                            </Tooltip>
                          </Box>
                        )}
                      </>
                    )}
                    
                    <Box display="flex" alignItems="center" mt={0.5}>
                      <Chip 
                        size="small" 
                        label={connection.status || 'Not Connected'} 
                        color={connection.status === 'Connected' ? 'primary' : 'default'}
                      />
                    </Box>
                  </Box>
                  
                  <div className={classes.connectionActions}>
                    <Button
                      size="small"
                      color="primary"
                      startIcon={connection.type === 'excel' || connection.type === 'csv' ? 
                        <TableChartIcon /> : <StorageIcon />}
                      onClick={() => handleTestConnection(connection.id)}
                    >
                      {connection.type === 'excel' || connection.type === 'csv' ? 'Open' : 'Connect'}
                    </Button>
                    <Button
                      size="small"
                      color="info"
                      startIcon={<LinkIcon />}
                      onClick={() => handleTestConnection(connection.id)}
                    >
                      Test
                    </Button>
                    <Button
                      size="small"
                      color="secondary"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteConnection(connection.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </Paper>
              ))
            )}
          </div>
        </Box>
      </Paper>
    );
  };

  return (
    <Container maxWidth="xl" className={`main-content ${classes.mainContent}`} style={{ overflow: 'hidden' }}>
      <div className={classes.header}>
        <Typography variant="h4" className="section-title" gutterBottom>
          Manage Retrieval Databases
        </Typography>
        <div>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            className={classes.actionButton}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            className={classes.actionButton}
            onClick={() => window.location.href = '/retrieval/build-databases'}
          >
            Create New
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <Grid container spacing={3} className={classes.statsCards}>
        <Grid item xs={12} md={4}>
          <Paper className={classes.statsCard} elevation={3}>
            <Typography variant="subtitle1" color="textSecondary" gutterBottom>
              Total Retrieval Databases
            </Typography>
            <Typography className={classes.statsValue}>
              {loading ? <Skeleton width={80} /> : stats.totalStores}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper className={classes.statsCard} elevation={3}>
            <Typography variant="subtitle1" color="textSecondary" gutterBottom>
              Total Embedded Documents
            </Typography>
            <Typography className={classes.statsValue}>
              {loading ? <Skeleton width={80} /> : stats.totalDocuments}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper className={classes.statsCard} elevation={3}>
            <Typography variant="subtitle1" color="textSecondary" gutterBottom>
              Recently Updated <Tooltip title="Updated in the last 7 days"><InfoIcon fontSize="small" /></Tooltip>
            </Typography>
            <Typography className={classes.statsValue}>
              {loading ? <Skeleton width={80} /> : (
                <Badge 
                  color="primary" 
                  badgeContent={stats.recentlyUpdated > 0 ? 'New' : 0}
                  invisible={stats.recentlyUpdated === 0}
                >
                  {stats.recentlyUpdated}
                </Badge>
              )}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Backup information alert */}
      {backupCount > 0 && (
        <Alert 
          severity="info" 
          style={{ marginBottom: 16 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleCleanupBackups}
              disabled={isCleaningBackups}
              startIcon={isCleaningBackups ? <CircularProgress size={16} /> : <DeleteSweepIcon />}
            >
              CLEAN UP
            </Button>
          }
        >
          <AlertTitle>Vector Store Backups</AlertTitle>
          {backupCount} backup{backupCount !== 1 ? 's' : ''} detected. Backups are automatically created when you add or remove documents from a vector store.
          They serve as a safety measure in case anything goes wrong during the update process.
          Once you've verified your vector store is working correctly, you can safely clean up old backups.
        </Alert>
      )}

      {/* Split layout: Vector stores on left (2/3) and Database connections on right (1/3) */}
      <Box 
        className={classes.splitContainer}
      >
        {/* Main Vector Store Content - Left 2/3 */}
        <Paper 
          className={classes.mainContentSection} 
          elevation={3}
        >
          <Box p={2}>
      {/* Search and Filters */}
      <div className={classes.filterControls}>
        <div className={classes.searchBar}>
          <TextField
            className={classes.searchInput}
            variant="outlined"
            size="small"
            placeholder="Search for a database..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon color="action" style={{ marginRight: 8 }} />,
            }}
          />
          {searchTerm && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSearchTerm('')}
            >
              Clear
            </Button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={showBackups}
                onChange={(e) => setShowBackups(e.target.checked)}
                name="showBackups"
                color="secondary"
              />
            }
            label={
              <Box display="flex" alignItems="center">
                <Typography variant="body2" style={{ marginRight: 8 }}>
                  Show Backups
                </Typography>
                {backupCount > 0 && (
                  <Badge 
                    color="secondary" 
                    badgeContent={backupCount} 
                    overlap="circular"
                  />
                )}
              </Box>
            }
          />
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            className={classes.viewToggle}
            size="small"
          >
            <ToggleButton value="grid" aria-label="grid view">
              <ViewModuleIcon />
            </ToggleButton>
            <ToggleButton value="list" aria-label="list view">
              <ViewListIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
      </div>

      {/* Vector Store List */}
      {loading && filteredStores.length === 0 ? (
        <div className={classes.progressContainer}>
          <CircularProgress />
        </div>
      ) : error ? (
        <Alert severity="error" style={{ marginTop: 16 }}>
          {error}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {viewMode === 'grid' ? renderGridView() : renderTableView()}
        </Grid>
      )}

            {/* Clean Up Backups Button */}
            {renderCleanupButton()}
          </Box>
        </Paper>

        {/* Database Connections Section - Right 1/3 */}
        {renderDatabaseConnections()}
      </Box>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={handleCloseDetails}
        maxWidth="xl"
        fullWidth
      >
        {selectedStore && <VectorStoreDetails 
          vectorStore={selectedStore} 
          onClose={handleCloseDetails} 
          onSave={handleSaveEdit}
          onDelete={handleOpenDelete}
          onRefresh={handleRefreshVectorStore}
        />}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDelete}
      >
        <DialogTitle style={{ display: 'flex', alignItems: 'center', color: '#f44336' }}>
          <WarningIcon style={{ marginRight: 8 }} /> Warning: Permanent Deletion
        </DialogTitle>
        <DialogContent>
          <Box mb={2} p={2} bgcolor="#fff4f4" border="1px solid #f44336" borderRadius={4}>
            <DialogContentText color="error">
              <strong>This action cannot be undone.</strong> Are you sure you want to delete the vector store "{storeToDelete?.name}"?
            </DialogContentText>
          </Box>
          <DialogContentText style={{ marginTop: 16 }}>
            This will permanently remove all <strong>{storeToDelete?.documentCount || storeToDelete?.file_count || 0}</strong> embedded documents from this vector store.
          </DialogContentText>
          <DialogContentText style={{ marginTop: 16 }}>
            <strong>Important:</strong> Recreating this vector store will require significant time and compute resources, especially for large document collections. All embeddings will need to be regenerated from scratch.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete} color="primary" variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="secondary"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : <DeleteForeverIcon />}
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Preview Dialog */}
      {renderFilePreviewDialog()}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default ManageVectorStores; 