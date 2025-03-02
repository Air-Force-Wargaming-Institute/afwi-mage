import React, { useState, useEffect } from 'react';
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
  Badge
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
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

// Import the vector store service for API integration
import { 
  getVectorStores, 
  getVectorStoreById, 
  updateVectorStore, 
  deleteVectorStore,
  testVectorStoreQuery
} from '../../services/vectorStoreService';

// Import components
import QueryTester from './QueryTester';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
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
}));

// VectorStoreDetails component for the Details Dialog
const VectorStoreDetails = ({ vectorStore, onClose, onSave, onDelete }) => {
  const classes = useStyles();
  const [tabValue, setTabValue] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize edit form when entering edit mode
  const handleStartEditing = () => {
    setEditedName(vectorStore.name);
    setEditedDescription(vectorStore.description || '');
    setIsEditing(true);
  };

  // Cancel editing and return to view mode
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Save changes and return to view mode
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...vectorStore,
        name: editedName,
        description: editedDescription
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving changes:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Map API data to component's expected structure with proper defaults
  const mappedData = {
    ...vectorStore,
    documents: vectorStore.files || [],
    documentCount: vectorStore.files?.length || 0,
    created: vectorStore.created_at || vectorStore.created,
    lastUpdated: vectorStore.updated_at || vectorStore.lastUpdated,
    embeddingModel: vectorStore.embedding_model || vectorStore.embeddingModel,
    // Handle chunking method with defaults based on available data
    useParagraphChunking: vectorStore.chunking_method ? 
                          vectorStore.chunking_method === 'paragraph' : 
                          false, // Default to fixed size if not specified
    // Handle paragraph chunking parameters with defaults
    maxParagraphLength: vectorStore.max_paragraph_length || 1500,
    minParagraphLength: vectorStore.min_paragraph_length || 50,
    // These should be available from the backend
    chunkSize: vectorStore.chunk_size || 1000,
    chunkOverlap: vectorStore.chunk_overlap || 100
  };

  // Handle delete with correct document count
  const handleDelete = () => {
    // Pass the store with the correct document count
    onDelete({
      ...vectorStore,
      documentCount: mappedData.documentCount,
      file_count: mappedData.documentCount
    });
  };

  console.log("Vector store data received:", vectorStore);
  console.log("Mapped data for display:", mappedData);

  return (
    <>
      <DialogTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          {isEditing ? (
            <TextField
              label="Name"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              fullWidth
              variant="outlined"
              size="small"
              required
            />
          ) : (
            vectorStore.name
          )}
        </div>
        <div>
          <IconButton aria-label="close" onClick={onClose}>
            <Tooltip title="Close">
              <InfoIcon />
            </Tooltip>
          </IconButton>
        </div>
      </DialogTitle>
      <DialogContent className={classes.dialogContent}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Overview" />
          <Tab label="Documents" />
          <Tab label="Query Test" />
        </Tabs>

        {/* Overview Tab */}
        <div role="tabpanel" className={classes.tabPanel} hidden={tabValue !== 0}>
          {tabValue === 0 && (
            <>
              <Typography variant="subtitle1" gutterBottom style={{ marginTop: 16 }}>Description</Typography>
              {isEditing ? (
                <TextField
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  fullWidth
                  variant="outlined"
                  size="small"
                  multiline
                  rows={3}
                  placeholder="Enter vector store description"
                  style={{ marginBottom: 16 }}
                />
              ) : (
                <Typography variant="body2" paragraph>{mappedData.description || "No description provided"}</Typography>
              )}
              
              <div className={classes.detailItem}>
                <Typography variant="body2">Total Documents</Typography>
                <Typography variant="body2"><strong>{mappedData.documentCount}</strong></Typography>
              </div>
              
              <div className={classes.detailItem}>
                <Typography variant="body2">Created On</Typography>
                <Typography variant="body2">
                  <strong>{mappedData.created ? new Date(mappedData.created).toLocaleString() : 'Unknown'}</strong>
                </Typography>
              </div>
              
              <div className={classes.detailItem}>
                <Typography variant="body2">Last Updated</Typography>
                <Typography variant="body2">
                  <strong>{mappedData.lastUpdated ? new Date(mappedData.lastUpdated).toLocaleString() : 'Not updated'}</strong>
                </Typography>
              </div>
              
              <div className={classes.detailItem}>
                <Typography variant="body2">Embedding Model</Typography>
                <Typography variant="body2">
                  <strong>{mappedData.embeddingModel || 'Unknown'}</strong>
                </Typography>
              </div>
              
              <Typography variant="subtitle1" style={{ marginTop: 16 }} gutterBottom>Chunking Configuration</Typography>
              
              <div className={classes.detailItem}>
                <Typography variant="body2">Chunking Method</Typography>
                <Typography variant="body2">
                  <strong>{mappedData.useParagraphChunking ? 'Paragraph-based' : 'Fixed-size'}</strong>
                </Typography>
              </div>
              
              {mappedData.useParagraphChunking ? (
                <>
                  <div className={classes.detailItem}>
                    <Typography variant="body2">Max Paragraph Length</Typography>
                    <Typography variant="body2"><strong>{mappedData.maxParagraphLength}</strong></Typography>
                  </div>
                  <div className={classes.detailItem}>
                    <Typography variant="body2">Min Paragraph Length</Typography>
                    <Typography variant="body2"><strong>{mappedData.minParagraphLength}</strong></Typography>
                  </div>
                </>
              ) : (
                <>
                  <div className={classes.detailItem}>
                    <Typography variant="body2">Chunk Size</Typography>
                    <Typography variant="body2"><strong>{mappedData.chunkSize}</strong></Typography>
                  </div>
                  <div className={classes.detailItem}>
                    <Typography variant="body2">Chunk Overlap</Typography>
                    <Typography variant="body2"><strong>{mappedData.chunkOverlap}</strong></Typography>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Documents Tab */}
        <div role="tabpanel" className={classes.tabPanel} hidden={tabValue !== 1}>
          {tabValue === 1 && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Documents in Vector Store ({mappedData.documents?.length || 0})
              </Typography>
              
              {mappedData.documents?.length > 0 ? (
                <TableContainer component={Paper} className={classes.documentList}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>File Name</TableCell>
                        <TableCell>Security Classification</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mappedData.documents.map((doc, index) => (
                        <TableRow key={index}>
                          <TableCell>{doc.filename}</TableCell>
                          <TableCell>
                            <Chip 
                              size="small" 
                              label={doc.security_classification || "UNCLASSIFIED"} 
                              color={doc.security_classification === "Secret" ? "secondary" : "default"}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="textSecondary" align="center">
                  No documents information available
                </Typography>
              )}
            </>
          )}
        </div>

        {/* Query Test Tab */}
        <div role="tabpanel" className={classes.tabPanel} hidden={tabValue !== 2}>
          {tabValue === 2 && (
            <QueryTester vectorStore={vectorStore} />
          )}
        </div>
      </DialogContent>
      <DialogActions>
        {isEditing ? (
          <>
            <Button onClick={handleCancelEdit} color="default">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveChanges} 
              color="primary" 
              variant="contained"
              disabled={isSaving || !editedName.trim()}
              startIcon={isSaving && <CircularProgress size={20} />}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        ) : (
          <>
            <Button 
              onClick={handleDelete}
              color="secondary"
              startIcon={<DeleteIcon />}
            >
              Delete
            </Button>
            <Button 
              onClick={handleStartEditing}
              color="primary"
              startIcon={<EditIcon />}
            >
              Edit
            </Button>
            <Button onClick={onClose} color="default">
              Close
            </Button>
          </>
        )}
      </DialogActions>
    </>
  );
};

function ManageVectorStores() {
  const classes = useStyles();
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

  // Statistics
  const [stats, setStats] = useState({
    totalStores: 0,
    totalDocuments: 0,
    recentlyUpdated: 0
  });

  // Load vector stores from API
  useEffect(() => {
    const fetchVectorStores = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await getVectorStores();
        
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

  // Filter vector stores based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStores(vectorStores);
      return;
    }
    
    const lowercasedTerm = searchTerm.toLowerCase();
    const filtered = vectorStores.filter(store => 
      store.name.toLowerCase().includes(lowercasedTerm) || 
      store.description.toLowerCase().includes(lowercasedTerm)
    );
    
    setFilteredStores(filtered);
  }, [searchTerm, vectorStores]);

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
      const detailedStore = await getVectorStoreById(store.id);
      
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
      await deleteVectorStore(storeToDelete.id);
      
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
      const result = await updateVectorStore(updatedStore.id, updatedStore);
      
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
              onClick={() => window.location.href = '/build-databases'}
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
          filteredStores.map((store) => (
            <Grid item xs={12} sm={6} md={4} key={store.id}>
              <Card 
                className={classes.card} 
                onClick={() => handleOpenDetails(store)}
                style={{ cursor: 'pointer' }}
              >
                <span className={classes.creationDate}>
                  Created: {formatDate(store.created)}
                </span>
                <CardContent className={classes.cardContent}>
                  <Typography variant="h6" gutterBottom>
                    {store.name}
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
          ))
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
            onClick={() => window.location.href = '/build-databases'}
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
                </TableRow>
              ))
            ) : (
              filteredStores.map((store) => (
                <TableRow 
                  key={store.id} 
                  hover 
                  onClick={() => handleOpenDetails(store)}
                  style={{ cursor: 'pointer' }}
                >
                  <TableCell>{store.name}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Container maxWidth="xl" className="main-content">
      <div className={classes.header}>
        <Typography variant="h4" className="section-title" gutterBottom>
          Manage Vector Stores
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
            onClick={() => window.location.href = '/build-databases'}
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
              Total Vector Stores
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

      {/* Search and Filters */}
      <div className={classes.filterControls}>
        <div className={classes.searchBar}>
          <TextField
            className={classes.searchInput}
            variant="outlined"
            size="small"
            placeholder="Search vector stores..."
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

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        {selectedStore && <VectorStoreDetails vectorStore={selectedStore} onClose={handleCloseDetails} onSave={handleSaveEdit} onDelete={handleOpenDelete} />}
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