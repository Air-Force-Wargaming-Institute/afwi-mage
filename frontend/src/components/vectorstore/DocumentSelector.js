import React, { useState, useEffect, useRef } from 'react';
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Breadcrumbs,
  Link,
  IconButton,
  TextField,
  InputAdornment,
  Tooltip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  Switch
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import {
  Description as FileIcon,
  Folder as FolderIcon,
  ArrowBack as ArrowBackIcon,
  ArrowUpward as ArrowUpwardIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@material-ui/icons';
import { makeStyles } from '@material-ui/core/styles';
import { getDocuments, checkDocumentCompatibility } from '../../services/documentService';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  },
  paper: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  tableContainer: {
    maxHeight: 600,
    marginBottom: theme.spacing(2),
  },
  breadcrumbsContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  breadcrumbs: {
    flex: 1,
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  searchInput: {
    flex: 1,
  },
  searchToggle: {
    marginLeft: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
  },
  infoAlert: {
    marginBottom: theme.spacing(2),
  },
  selectedCount: {
    margin: theme.spacing(2, 0),
  },
  iconCell: {
    width: 40,
  },
  checkboxCell: {
    width: 40,
  },
  nameCell: {
    width: '40%',
  },
  typeCell: {
    width: '10%',
  },
  sizeCell: {
    width: '10%',
  },
  securityCell: {
    width: '15%',
  },
  statusCell: {
    width: '25%',
  },
  warningIcon: {
    color: theme.palette.warning.main,
    marginRight: theme.spacing(1),
  },
  errorIcon: {
    color: theme.palette.error.main,
    marginRight: theme.spacing(1),
  },
  inStoreChip: {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.contrastText,
    marginRight: theme.spacing(1),
  },
  incompatibleChip: {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.contrastText,
    marginRight: theme.spacing(1),
  },
  buttons: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
  selectedSummary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
  },
  totalSelectedText: {
    fontWeight: 'bold',
    color: theme.palette.primary.main,
  },
  clearSelectionButton: {
    marginLeft: theme.spacing(1),
  },
  selectionPanelHeader: {
    padding: theme.spacing(1, 2),
    borderTopLeftRadius: theme.shape.borderRadius,
    borderTopRightRadius: theme.shape.borderRadius,
  },
  selectionPanel: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  selectionPanelSection: {
    marginBottom: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
  },
  selectedDocsList: {
    maxHeight: 290,
    overflow: 'auto',
    backgroundColor: theme.palette.background.paper,
    borderBottomLeftRadius: theme.shape.borderRadius,
    borderBottomRightRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
  },
  selectedDocItem: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  filePathText: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
  },
  emptySelectionMessage: {
    padding: theme.spacing(2),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  mainGridContainer: {
    marginBottom: theme.spacing(2),
  },
  mainContentArea: {
    display: 'flex',
    flexDirection: 'column',
  },
  documentTableArea: {
    flex: 1,
  },
  sectionDivider: {
    margin: theme.spacing(2, 0),
    width: '100%',
  },
  addSectionHeader: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.contrastText,
  },
  removeSectionHeader: {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
  },
  addIcon: {
    color: theme.palette.success.main,
  },
  removeIcon: {
    color: theme.palette.error.main,
  },
  selectionStats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(1),
  },
  countNumber: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
}));

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Extract filename from path
const getFilenameFromPath = (path) => {
  if (!path) return '';
  const parts = path.split('/');
  return parts[parts.length - 1];
};

// Extract folder path from full path
const getFolderPathFromPath = (path) => {
  if (!path) return '';
  const parts = path.split('/');
  parts.pop(); // Remove filename
  return parts.join('/');
};

const DocumentSelector = ({ vectorStore, existingDocuments, onDocumentsSelected }) => {
  const classes = useStyles();
  const [currentPath, setCurrentPath] = useState('');
  const [documents, setDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [documentsToRemove, setDocumentsToRemove] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [recursiveSearch, setRecursiveSearch] = useState(true);
  const [allDocuments, setAllDocuments] = useState([]);
  
  // Store all document data in a ref to avoid triggering re-renders
  const allDocumentsMapRef = useRef({});
  // Store existing documents in a ref for easy lookup
  const existingDocumentsMapRef = useRef({});

  // Update existingDocumentsMap when existingDocuments changes
  useEffect(() => {
    const documentsMap = {};
    existingDocuments.forEach(doc => {
      // Make sure we have a document ID, use filename as fallback only if necessary
      const docId = doc.document_id || doc.id || doc.filename;
      documentsMap[docId] = doc;
      
      // Log the document ID mapping for debugging
      console.log(`Mapping document: ${doc.filename} -> ID: ${docId}`);
    });
    existingDocumentsMapRef.current = documentsMap;
    
    // Log the full map for debugging
    console.log("Existing documents map:", existingDocumentsMapRef.current);
  }, [existingDocuments]);

  // Fetch documents when the component mounts or path changes
  useEffect(() => {
    const fetchDocumentsFromPath = async () => {
      setLoading(true);
      try {
        const fetchedDocuments = await getDocuments(currentPath);
        
        // Map existing documents to a set of paths for easy lookup
        const existingDocumentPaths = new Set(existingDocuments.map(doc => doc.path || doc.filename));
        
        // Create a mapping of filenames to document IDs from existing documents
        const filenameToDocId = {};
        // Create a set of filenames for more reliable matching
        const existingDocumentFilenames = new Set();
        
        existingDocuments.forEach(doc => {
          if (doc.filename && doc.document_id) {
            filenameToDocId[doc.filename] = doc.document_id;
            existingDocumentFilenames.add(doc.filename);
          }
          // Also try to extract filename from path if filename isn't available
          if (!doc.filename && doc.path) {
            const extractedFilename = doc.path.split('/').pop();
            if (extractedFilename) {
              filenameToDocId[extractedFilename] = doc.document_id;
              existingDocumentFilenames.add(extractedFilename);
            }
          }
        });
        
        // Add metadata to each document
        const enhancedDocuments = fetchedDocuments.map(doc => {
          // Check if document is already in the vector store
          // Try matching by path first (for backward compatibility)
          let isInStore = existingDocumentPaths.has(doc.path);
          
          // If not found by path, try matching by filename
          if (!isInStore) {
            isInStore = existingDocumentFilenames.has(doc.name);
          }
          
          // Check if document is compatible with vector store
          const compatibility = checkDocumentCompatibility(doc, vectorStore);
          
          // If the document is in store, make sure it has a document_id
          // by looking it up in our existing documents
          let documentId = null;
          if (isInStore) {
            // Try to find the document ID by matching filename
            documentId = filenameToDocId[doc.name];
            
            // If not found, try to find the exact document in existingDocuments
            if (!documentId) {
              const existingDoc = existingDocuments.find(
                exDoc => exDoc.filename === doc.name || 
                         exDoc.path === doc.path ||
                         (exDoc.path && exDoc.path.split('/').pop() === doc.name)
              );
              if (existingDoc && existingDoc.document_id) {
                documentId = existingDoc.document_id;
              }
            }
            
            // Log when we find or can't find an ID
            if (documentId) {
              console.log(`Found document_id ${documentId} for file ${doc.name}`);
            } else {
              console.warn(`Could not find document_id for file ${doc.name} which is in the store`);
            }
          }
          
          return {
            ...doc,
            isInStore,
            isCompatible: compatibility.isCompatible,
            incompatibleReason: compatibility.reason,
            document_id: documentId  // Add the document_id property
          };
        });
        
        setDocuments(enhancedDocuments);
        setFilteredDocuments(enhancedDocuments);
        
        // Update our map of all documents we've seen using the ref
        // This won't trigger a re-render
        enhancedDocuments.forEach(doc => {
          allDocumentsMapRef.current[doc.path] = doc;
        });
        
        setError(null);
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError('Failed to load documents: ' + (err.message || 'Unknown error'));
        setDocuments([]);
        setFilteredDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentsFromPath();
  }, [currentPath, existingDocuments, vectorStore]);

  // Filter documents when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDocuments(documents);
      return;
    }
    
    const filtered = documents.filter(doc => 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDocuments(filtered);
  }, [searchTerm, documents]);

  // Add a function to get all documents recursively
  useEffect(() => {
    // Only load all documents when recursive search is enabled
    if (recursiveSearch) {
      setLoading(true);
      const fetchAllDocuments = async () => {
        try {
          // Call the API with empty path to get root documents
          const rootDocs = await getDocuments('');
          
          // Start recursive search from root documents
          let allDocs = [...rootDocs];
          let foldersToProcess = rootDocs.filter(doc => doc.isFolder).map(folder => folder.path);
          
          // Process folders in a breadth-first manner
          while (foldersToProcess.length > 0) {
            const folderPath = foldersToProcess.shift();
            try {
              const folderDocs = await getDocuments(folderPath);
              
              // Add folder path information to each document
              const enhancedDocs = folderDocs.map(doc => ({
                ...doc,
                parentPath: folderPath
              }));
              
              // Add documents to the list
              allDocs = [...allDocs, ...enhancedDocs];
              
              // Add new folders to process
              const newFolders = folderDocs.filter(doc => doc.isFolder).map(folder => folder.path);
              foldersToProcess = [...foldersToProcess, ...newFolders];
            } catch (error) {
              console.error(`Error fetching documents in folder ${folderPath}:`, error);
            }
          }
          
          // Process documents just like we do in the normal document fetch
          const existingDocumentPaths = new Set(existingDocuments.map(doc => doc.path || doc.filename));
          const filenameToDocId = {};
          const existingDocumentFilenames = new Set();
          
          existingDocuments.forEach(doc => {
            if (doc.filename && doc.document_id) {
              filenameToDocId[doc.filename] = doc.document_id;
              existingDocumentFilenames.add(doc.filename);
            }
            // Also try to extract filename from path if filename isn't available
            if (!doc.filename && doc.path) {
              const extractedFilename = doc.path.split('/').pop();
              if (extractedFilename) {
                filenameToDocId[extractedFilename] = doc.document_id;
                existingDocumentFilenames.add(extractedFilename);
              }
            }
          });
          
          // Enhance all documents with metadata
          const enhancedAllDocs = allDocs.map(doc => {
            // Try matching by path first (for backward compatibility)
            let isInStore = existingDocumentPaths.has(doc.path);
            
            // If not found by path, try matching by filename
            if (!isInStore) {
              isInStore = existingDocumentFilenames.has(doc.name);
            }
            
            const compatibility = checkDocumentCompatibility(doc, vectorStore);
            
            let documentId = null;
            if (isInStore) {
              documentId = filenameToDocId[doc.name];
              
              if (!documentId) {
                const existingDoc = existingDocuments.find(
                  exDoc => exDoc.filename === doc.name || 
                           exDoc.path === doc.path ||
                           (exDoc.path && exDoc.path.split('/').pop() === doc.name)
                );
                if (existingDoc && existingDoc.document_id) {
                  documentId = existingDoc.document_id;
                }
              }
            }
            
            return {
              ...doc,
              isInStore,
              isCompatible: compatibility.isCompatible,
              incompatibleReason: compatibility.reason,
              document_id: documentId
            };
          });
          
          setAllDocuments(enhancedAllDocs);
          
          // Create a map of all documents for quick lookup
          const docMap = {};
          enhancedAllDocs.forEach(doc => {
            docMap[doc.path] = doc;
          });
          allDocumentsMapRef.current = {...allDocumentsMapRef.current, ...docMap};
          
        } catch (error) {
          console.error('Error fetching all documents:', error);
          setError('Failed to load all documents: ' + (error.message || 'Unknown error'));
        } finally {
          setLoading(false);
        }
      };
      
      fetchAllDocuments();
    }
  }, [recursiveSearch, existingDocuments, vectorStore]);

  // Update search effect to handle recursive search
  useEffect(() => {
    // Clear search results when toggling
    if (searchTerm.trim()) {
      // Keep the loading state during recursive search
      if (recursiveSearch && !allDocuments.length) {
        return; // Wait for allDocuments to be populated
      }
      
      // If recursive search is enabled, search through all documents
      if (recursiveSearch) {
        const filtered = allDocuments.filter(doc => 
          doc.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredDocuments(filtered);
      } else {
        // Normal search in current directory
        const filtered = documents.filter(doc => 
          doc.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredDocuments(filtered);
      }
    } else {
      // When search term is empty, show current directory documents
      setFilteredDocuments(documents);
    }
  }, [searchTerm, documents, recursiveSearch, allDocuments]);

  const handlePathChange = (newPath) => {
    setCurrentPath(newPath);
    // No longer clearing selections when changing paths
  };

  const handleParentDirectory = () => {
    // Navigate to parent directory
    const pathParts = currentPath.split('/');
    pathParts.pop();
    setCurrentPath(pathParts.join('/'));
    // No longer clearing selections when navigating to parent
  };

  const handleFolderClick = (folderPath) => {
    console.log(`Navigating to folder: ${folderPath}`);
    setCurrentPath(folderPath);
    // No longer clearing selections when clicking on a folder
  };

  // Handle select all for documents to add
  const handleSelectAllToAdd = (event) => {
    if (event.target.checked) {
      // Select all compatible, non-folder documents that aren't already in the store
      const newSelectedPaths = filteredDocuments
        .filter(doc => !doc.isFolder && doc.isCompatible && !doc.isInStore)
        .map(doc => doc.path);
      
      // Merge with existing selections (using Set to avoid duplicates)
      const mergedSelections = [...new Set([...selectedDocuments, ...newSelectedPaths])];
      setSelectedDocuments(mergedSelections);
    } else {
      // Deselect only the documents visible in the current view
      const currentPaths = new Set(filteredDocuments
        .filter(doc => !doc.isFolder && doc.isCompatible && !doc.isInStore)
        .map(doc => doc.path));
      
      const remainingSelections = selectedDocuments.filter(path => !currentPaths.has(path));
      setSelectedDocuments(remainingSelections);
    }
  };

  // Handle select all for documents to remove
  const handleSelectAllToRemove = (event) => {
    if (event.target.checked) {
      // Get all documents in current view that are already in the store
      const docsInStore = filteredDocuments
        .filter(doc => !doc.isFolder && doc.isInStore)
        .map(doc => {
          // Find the corresponding document in existingDocuments
          const existingDoc = existingDocuments.find(e => e.path === doc.path || e.filename === doc.name);
          return existingDoc ? existingDoc.document_id : null;
        })
        .filter(Boolean); // Remove nulls
      
      // Merge with existing selections
      const mergedSelections = [...new Set([...documentsToRemove, ...docsInStore])];
      setDocumentsToRemove(mergedSelections);
    } else {
      // Deselect all documents in the current view that are in store
      const currentDocIds = new Set(filteredDocuments
        .filter(doc => !doc.isFolder && doc.isInStore)
        .map(doc => {
          const existingDoc = existingDocuments.find(e => e.path === doc.path || e.filename === doc.name);
          return existingDoc ? existingDoc.document_id : null;
        })
        .filter(Boolean));
      
      const remainingSelections = documentsToRemove.filter(id => !currentDocIds.has(id));
      setDocumentsToRemove(remainingSelections);
    }
  };

  const handleSelectItem = (path, document) => {
    if (document.isFolder) {
      handleFolderClick(path);
      return;
    }
    
    // If this is a search result from another folder, and recursive search is enabled
    if (recursiveSearch && searchTerm && document.parentPath && document.parentPath !== currentPath) {
      // Navigate to the parent folder where the document is located
      console.log(`Navigating to parent folder: ${document.parentPath} for document: ${document.name}`);
      setCurrentPath(document.parentPath);
      
      // If the document should be selected, we'll set a small delay to allow the folder to load first
      setTimeout(() => {
        // For files to add
        if (!document.isInStore && document.isCompatible) {
          setSelectedDocuments(prev => {
            if (!prev.includes(path)) {
              return [...prev, path];
            }
            return prev;
          });
        } 
        // For files to remove
        else if (document.isInStore && document.document_id) {
          setDocumentsToRemove(prev => {
            if (!prev.includes(document.document_id)) {
              return [...prev, document.document_id];
            }
            return prev;
          });
        }
      }, 300);
      return;
    }
    
    // Regular document selection in current folder
    if (isSelectedToAdd(path)) {
      handleRemoveAddSelection(path);
    } else if (document.isInStore) {
      // For files to remove - use the document ID
      if (document.document_id) {
        if (isSelectedToRemove(document.document_id)) {
          handleRemoveRemoveSelection(document.document_id);
        } else {
          console.log(`Adding document to remove list: ${document.name} with ID: ${document.document_id}`);
          setDocumentsToRemove(prev => [...prev, document.document_id]);
        }
      } else {
        console.warn(`Document ${document.name} has no document_id - cannot remove`);
      }
    } else {
      setSelectedDocuments(prev => [...prev, path]);
    }
  };

  const handleClearAllSelections = () => {
    setSelectedDocuments([]);
    setDocumentsToRemove([]);
  };

  const handleRemoveAddSelection = (path) => {
    setSelectedDocuments(selectedDocuments.filter(item => item !== path));
  };

  const handleRemoveRemoveSelection = (docId) => {
    console.log(`Removing document ID ${docId} from remove list`);
    setDocumentsToRemove(prev => prev.filter(id => id !== docId));
  };

  const isSelectedToAdd = (path) => selectedDocuments.indexOf(path) !== -1;
  
  const isSelectedToRemove = (documentId) => {
    if (!documentId) return false;
    const isSelected = documentsToRemove.indexOf(documentId) !== -1;
    // Log for debugging
    if (isSelected) {
      console.log(`Document ID ${documentId} is selected for removal`);
    }
    return isSelected;
  };

  const handleConfirm = () => {
    // Log the documents being selected for add/remove
    console.log("Documents to add:", selectedDocuments.map(path => ({
      path,
      name: getFilenameFromPath(path)
    })));
    
    // Log detailed information about documents being removed
    if (documentsToRemove.length > 0) {
      console.log("Document IDs to remove:", documentsToRemove);
      
      // Display additional info about each document being removed
      documentsToRemove.forEach(docId => {
        const doc = existingDocumentsMapRef.current[docId];
        if (doc) {
          console.log(`Removing document: ID=${docId}, Filename=${doc.filename}`);
        } else {
          console.warn(`Warning: Document ID ${docId} not found in existing documents map`);
        }
      });
    }
    
    onDocumentsSelected({
      documentsToAdd: selectedDocuments.map(path => ({
        path,
        name: getFilenameFromPath(path)
      })),
      documentsToRemove
    });
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  // Generate breadcrumbs from current path
  const renderBreadcrumbs = () => {
    const pathParts = currentPath ? currentPath.split('/') : [];
    
    return (
      <div className={classes.breadcrumbsContainer}>
        <IconButton 
          disabled={!currentPath} 
          onClick={handleParentDirectory}
          size="small"
        >
          <ArrowUpwardIcon />
        </IconButton>
        
        <Breadcrumbs className={classes.breadcrumbs}>
          <Link 
            component="button" 
            variant="body1" 
            color="inherit" 
            onClick={() => handlePathChange('')}
          >
            Root
          </Link>
          
          {pathParts.filter(Boolean).map((part, index) => {
            const pathToHere = pathParts.slice(0, index + 1).join('/');
            return (
              <Link
                key={index}
                component="button"
                variant="body1"
                color="inherit"
                onClick={() => handlePathChange(pathToHere)}
              >
                {part}
              </Link>
            );
          })}
        </Breadcrumbs>
      </div>
    );
  };

  // Select eligible documents
  const eligibleForAddition = document => 
    !document.isFolder && document.isCompatible && !document.isInStore;
  
  const eligibleForRemoval = document =>
    !document.isFolder && document.isInStore;

  // Count of eligible documents in current view
  const eligibleToAddCount = filteredDocuments.filter(eligibleForAddition).length;
  const eligibleToRemoveCount = filteredDocuments.filter(eligibleForRemoval).length;
  
  // Count of eligible documents in current view that are selected
  const currentViewSelectedToAddCount = filteredDocuments.filter(
    doc => eligibleForAddition(doc) && isSelectedToAdd(doc.path)
  ).length;
  
  const currentViewSelectedToRemoveCount = filteredDocuments.filter(
    doc => eligibleForRemoval(doc) && isSelectedToRemove(doc.document_id)
  ).length;

  // Get total counts
  const totalSelectedToAddCount = selectedDocuments.length;
  const totalSelectedToRemoveCount = documentsToRemove.length;
  const totalChangesCount = totalSelectedToAddCount + totalSelectedToRemoveCount;

  // Add a helper function to display document IDs more clearly in the UI
  const renderDocumentId = (docId) => {
    return (
      <Tooltip title="Document ID used for removal operations">
        <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#666' }}>
          ID: {docId ? docId.substring(0, 8) + '...' : 'No ID'}
        </span>
      </Tooltip>
    );
  };

  // Render the unified selection panel with both add and remove sections
  const renderSelectedDocumentsPanel = () => {
    return (
      <div className={classes.selectionPanel}>
        {/* Documents to Add Section */}
        <div className={classes.selectionPanelSection}>
          <div className={`${classes.selectionPanelHeader} ${classes.addSectionHeader}`}>
            <Typography variant="subtitle2">
              Documents to Add (<span className={classes.countNumber}>{totalSelectedToAddCount}</span>)
            </Typography>
          </div>
          
          <List className={classes.selectedDocsList}>
            {selectedDocuments.length === 0 ? (
              <div className={classes.emptySelectionMessage}>
                <Typography variant="body2">
                  No documents selected for addition
                </Typography>
                <Typography variant="body2">
                  Select documents from the left panel
                </Typography>
              </div>
            ) : (
              selectedDocuments.map((path) => {
                const doc = allDocumentsMapRef.current[path];
                if (!doc) return null;
                
                return (
                  <ListItem key={path} className={classes.selectedDocItem}>
                    <ListItemIcon>
                      <FileIcon fontSize="small" className={classes.addIcon} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={doc.name}
                      secondary={
                        <Typography variant="body2" className={classes.filePathText}>
                          {getFolderPathFromPath(doc.path)}
                        </Typography>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="remove" 
                        size="small"
                        onClick={() => handleRemoveAddSelection(path)}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })
            )}
          </List>
        </div>
        
        {/* Divider */}
        <Divider className={classes.sectionDivider} />
        
        {/* Documents to Remove Section */}
        <div className={classes.selectionPanelSection}>
          <div className={`${classes.selectionPanelHeader} ${classes.removeSectionHeader}`}>
            <Typography variant="subtitle2">
              Documents to Remove (<span className={classes.countNumber}>{totalSelectedToRemoveCount}</span>)
            </Typography>
          </div>
          
          <List className={classes.selectedDocsList}>
            {documentsToRemove.length === 0 ? (
              <div className={classes.emptySelectionMessage}>
                <Typography variant="body2">
                  No documents selected for removal
                </Typography>
                <Typography variant="body2">
                  Select existing documents to remove
                </Typography>
              </div>
            ) : (
              documentsToRemove.map((docId) => {
                const doc = existingDocumentsMapRef.current[docId];
                if (!doc) return null;
                
                return (
                  <ListItem key={docId} className={classes.selectedDocItem}>
                    <ListItemIcon>
                      <FileIcon fontSize="small" className={classes.removeIcon} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={doc.filename}
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" className={classes.filePathText}>
                            Already in vector store
                          </Typography>
                          {renderDocumentId(docId)}
                        </React.Fragment>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="keep" 
                        size="small"
                        onClick={() => handleRemoveRemoveSelection(docId)}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })
            )}
          </List>
        </div>
      </div>
    );
  };

  // Add a handler for the recursive search toggle
  const handleRecursiveSearchToggle = () => {
    const newValue = !recursiveSearch;
    setRecursiveSearch(newValue);
    
    // If enabling recursive search and we have a search term, show loading
    if (newValue && searchTerm.trim() && !allDocuments.length) {
      setLoading(true);
    } else if (!newValue) {
      // If disabling recursive search, revert to current directory view
      setFilteredDocuments(documents);
    }
  };

  return (
    <div className={classes.root}>
      {renderBreadcrumbs()}
      
      <div className={classes.searchContainer}>
        <TextField
          className={classes.searchInput}
          variant="outlined"
          size="small"
          placeholder={recursiveSearch ? "Search all folders..." : "Search current folder..."}
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClearSearch}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        <div className={classes.searchToggle}>
          <Typography variant="body2" style={{ marginRight: 8 }}>
            Search all folders
          </Typography>
          <Tooltip title={recursiveSearch ? "Searching across all folders" : "Search only in current folder"}>
            <Switch
              checked={recursiveSearch}
              onChange={handleRecursiveSearchToggle}
              color="primary"
              size="small"
            />
          </Tooltip>
        </div>
      </div>
      
      {totalChangesCount > 0 && (
        <Box className={classes.selectedSummary} mb={2}>
          <Typography variant="body2">
            <span className={classes.countNumber}>{totalChangesCount}</span> document changes selected 
            (<AddIcon fontSize="small" className={classes.addIcon} /> <span className={classes.countNumber}>{totalSelectedToAddCount}</span> to add, 
            <RemoveIcon fontSize="small" className={classes.removeIcon} /> <span className={classes.countNumber}>{totalSelectedToRemoveCount}</span> to remove)
          </Typography>
          <Button 
            size="small" 
            variant="outlined" 
            className={classes.clearSelectionButton}
            onClick={handleClearAllSelections}
          >
            Clear All
          </Button>
        </Box>
      )}
      
      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">
          {error}
        </Alert>
      ) : (
        <>
          <Grid container spacing={2} className={classes.mainGridContainer}>
            {/* Left side - Document browser */}
            <Grid item xs={12} md={8} className={classes.mainContentArea}>
              <Alert severity="info" className={classes.infoAlert}>
                Select documents from the library to add to the vector store.
                Documents already in the vector store can be selected for removal.
                Your selections will be preserved as you navigate between folders.
                {recursiveSearch && (
                  <Typography variant="body2" style={{ marginTop: 8 }}>
                    <strong>Search all folders mode:</strong> When you click on a search result, 
                    you'll navigate to its parent folder.
                  </Typography>
                )}
              </Alert>

              <div className={classes.documentTableArea}>
                <TableContainer component={Paper} className={classes.tableContainer}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" className={classes.checkboxCell}>
                          <Tooltip title="Select all eligible documents for addition">
                            <span>
                              <Checkbox
                                indeterminate={currentViewSelectedToAddCount > 0 && currentViewSelectedToAddCount < eligibleToAddCount}
                                checked={eligibleToAddCount > 0 && currentViewSelectedToAddCount === eligibleToAddCount}
                                onChange={handleSelectAllToAdd}
                                disabled={eligibleToAddCount === 0}
                                color="primary"
                              />
                            </span>
                          </Tooltip>
                        </TableCell>
                        <TableCell padding="checkbox" className={classes.checkboxCell}>
                          <Tooltip title="Select all documents for removal">
                            <span>
                              <Checkbox
                                indeterminate={currentViewSelectedToRemoveCount > 0 && currentViewSelectedToRemoveCount < eligibleToRemoveCount}
                                checked={eligibleToRemoveCount > 0 && currentViewSelectedToRemoveCount === eligibleToRemoveCount}
                                onChange={handleSelectAllToRemove}
                                disabled={eligibleToRemoveCount === 0}
                                color="secondary"
                              />
                            </span>
                          </Tooltip>
                        </TableCell>
                        <TableCell className={classes.iconCell}></TableCell>
                        <TableCell className={classes.nameCell}>Name</TableCell>
                        <TableCell className={classes.typeCell}>Type</TableCell>
                        <TableCell className={classes.sizeCell}>Size</TableCell>
                        <TableCell className={classes.securityCell}>Security</TableCell>
                        <TableCell className={classes.statusCell}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredDocuments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            No documents found in this location
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDocuments.map((document) => {
                          const isItemSelectedToAdd = isSelectedToAdd(document.path);
                          const isItemSelectedToRemove = isSelectedToRemove(document.document_id);
                          
                          return (
                            <TableRow
                              hover
                              key={document.path}
                              onClick={() => handleSelectItem(document.path, document)}
                              selected={isItemSelectedToAdd || isItemSelectedToRemove}
                              style={{ 
                                cursor: document.isFolder ? 'pointer' : 
                                       (eligibleForAddition(document) || eligibleForRemoval(document)) ? 'pointer' : 'default',
                                backgroundColor: isItemSelectedToRemove ? 'rgba(244, 67, 54, 0.08)' : 
                                                 document.isFolder ? 'rgba(232, 244, 253, 0.2)' : 
                                                 (recursiveSearch && searchTerm && document.parentPath && document.parentPath !== currentPath) ? 
                                                   'rgba(25, 118, 210, 0.08)' : undefined
                              }}
                            >
                              <TableCell padding="checkbox" className={classes.checkboxCell}>
                                {!document.isFolder && (
                                  <Checkbox
                                    checked={isItemSelectedToAdd}
                                    disabled={!eligibleForAddition(document)}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={() => eligibleForAddition(document) && handleSelectItem(document.path, document)}
                                    color="primary"
                                  />
                                )}
                              </TableCell>
                              <TableCell padding="checkbox" className={classes.checkboxCell}>
                                {!document.isFolder && (
                                  <Checkbox
                                    checked={isItemSelectedToRemove}
                                    disabled={!eligibleForRemoval(document)}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={() => eligibleForRemoval(document) && handleSelectItem(document.path, document)}
                                    color="secondary"
                                  />
                                )}
                              </TableCell>
                              <TableCell className={classes.iconCell}>
                                {document.isFolder ? <FolderIcon color="primary" /> : <FileIcon />}
                              </TableCell>
                              <TableCell className={classes.nameCell}>
                                {document.name}
                                {recursiveSearch && searchTerm && document.parentPath && (
                                  <Typography 
                                    variant="caption" 
                                    display="block" 
                                    style={{ 
                                      color: document.parentPath !== currentPath ? '#1976d2' : 'grey',
                                      fontWeight: document.parentPath !== currentPath ? 'bold' : 'normal'
                                    }}
                                  >
                                    {document.parentPath !== currentPath ? '📁 From: ' : 'Path: '}
                                    {document.parentPath}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell className={classes.typeCell}>
                                {document.isFolder ? 'Folder' : document.type}
                              </TableCell>
                              <TableCell className={classes.sizeCell}>
                                {document.isFolder ? '-' : formatFileSize(document.size)}
                              </TableCell>
                              <TableCell className={classes.securityCell}>
                                {document.securityClassification || 'Unclassified'}
                              </TableCell>
                              <TableCell className={classes.statusCell}>
                                {document.isInStore && (
                                  <Chip
                                    size="small"
                                    label="Already in store"
                                    className={classes.inStoreChip}
                                  />
                                )}
                                {!document.isCompatible && !document.isFolder && (
                                  <Tooltip title={document.incompatibleReason}>
                                    <Chip
                                      size="small"
                                      icon={<ErrorIcon fontSize="small" />}
                                      label="Incompatible"
                                      className={classes.incompatibleChip}
                                    />
                                  </Tooltip>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
              
              <div className={classes.selectionStats}>
                <Typography variant="body2" className={classes.selectedCount}>
                  <AddIcon fontSize="small" className={classes.addIcon} /> 
                  <span className={classes.countNumber}>{currentViewSelectedToAddCount}</span> of 
                  <span className={classes.countNumber}> {eligibleToAddCount}</span> eligible documents selected to add
                </Typography>
                <Typography variant="body2" className={classes.selectedCount}>
                  <RemoveIcon fontSize="small" className={classes.removeIcon} /> 
                  <span className={classes.countNumber}>{currentViewSelectedToRemoveCount}</span> of 
                  <span className={classes.countNumber}> {eligibleToRemoveCount}</span> documents selected to remove
                </Typography>
              </div>
            </Grid>
            
            {/* Right side - Selected documents list */}
            <Grid item xs={12} md={4}>
              <Box display="flex" justifyContent="center" mb={2}>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={totalChangesCount === 0}
                  onClick={handleConfirm}
                  fullWidth
                >
                  Apply {totalChangesCount} Document Changes
                </Button>
              </Box>
              {renderSelectedDocumentsPanel()}
            </Grid>
          </Grid>
        </>
      )}
    </div>
  );
};

export default DocumentSelector; 