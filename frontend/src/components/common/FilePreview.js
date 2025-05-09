import React, { useState, useContext, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { 
  Button, 
  Typography, 
  IconButton, 
  Tooltip, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress
} from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import InfoIcon from '@material-ui/icons/Info';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import FullscreenExitIcon from '@material-ui/icons/FullscreenExit';
import CloseIcon from '@material-ui/icons/Close';
import axios from 'axios';
import { getApiUrl, getGatewayUrl } from '../../config';
import { AuthContext } from '../../contexts/AuthContext';

const useStyles = makeStyles((theme) => ({
  previewContainer: {
    width: '100%',
    height: 'calc(100vh - 100px)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  previewFrame: {
    flex: 1,
    border: 'none',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
  },
  titleLeftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    flex: 1,
  },
  fileName: {
    flex: 2,
    textAlign: 'center',
    fontWeight: 500,
    color: theme.palette.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  titleRightSection: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  title: {
    marginRight: theme.spacing(1),
  },
  infoIcon: {
    cursor: 'pointer',
    color: theme.palette.primary.main,
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1),
    backgroundColor: '#f5f5f5',
  },
  pageCounter: {
    marginRight: theme.spacing(2),
  },
  dialogTitle: {
    backgroundColor: theme.palette.primary.main,
    color: '#ffffff',
  },
  dialogContent: {
    padding: theme.spacing(3),
  },
  listItem: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  listItemIcon: {
    minWidth: 36,
  },
  listItemText: {
    margin: 0,
  },
  divider: {
    margin: theme.spacing(2, 0),
  },
  fullscreenDialog: {
    '& .MuiDialog-paper': {
      width: '95vw',
      height: '95vh',
      maxWidth: 'none',
      maxHeight: 'none',
      borderRadius: '12px',
    },
  },
  fullscreenContent: {
    height: 'calc(100% - 64px)', // Account for dialog title
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  fullscreenPreview: {
    flex: 1,
    border: 'none',
    width: '100%',
    height: '100%',
  },
  fullscreenControls: {
    padding: theme.spacing(2),
    backgroundColor: '#f5f5f5',
    borderTop: '1px solid #ddd',
  },
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 3),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
  fullscreenButton: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  pageInputs: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginRight: theme.spacing(1),
    '& .MuiIconButton-root': {
      marginLeft: theme.spacing(0.5),
      padding: theme.spacing(0.5),
    },
  },
  pageInputLabel: {
    color: theme.palette.text.secondary,
  },
  pageInput: {
    width: '60px',
    padding: theme.spacing(0.5),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    '&:focus': {
      outline: 'none',
      borderColor: theme.palette.primary.main,
    },
    '&::-webkit-inner-spin-button': {
      opacity: 1,
      height: '24px',
    },
  },
  fullscreenDialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 3),
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  closeButton: {
    color: theme.palette.text.secondary,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: theme.spacing(2),
    color: theme.palette.text.secondary,
  },
}));

function FilePreview({ file, onFileUpdate }) {
  const classes = useStyles();
  const { user, token } = useContext(AuthContext);
  const [numPages, setNumPages] = useState(null);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timestamp, setTimestamp] = useState(Date.now());

  useEffect(() => {
    const fetchNumPages = async () => {
      if (file.type === 'PDF') {
        try {
          setLoading(true);
          setError(null);
          const response = await axios.get(getGatewayUrl(`/api/upload/pdf-info/${encodeURIComponent(file.path)}`),
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          if (response.data.num_pages) {
            setNumPages(response.data.num_pages);
            setEndPage(response.data.num_pages); // Set end page to total pages by default
          }
        } catch (error) {
          console.error('Error fetching PDF info:', error);
          setError('Failed to load PDF information. Please try refreshing the page.');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchNumPages();
    return () => {
      setNumPages(null);
      setStartPage(1);
      setEndPage(1);
      setError(null);
    };
  }, [file, timestamp]);

  const handleDeletePages = async () => {
    // Validate page range
    if (startPage > endPage) {
      alert('Start page cannot be greater than end page');
      return;
    }
    if (startPage < 1 || endPage > numPages) {
      alert(`Please enter page numbers between 1 and ${numPages}`);
      return;
    }

    // Check if user is trying to delete all pages
    if (startPage === 1 && endPage === numPages) {
      const deleteEntireDoc = window.confirm(
        'You are attempting to delete all pages. Would you like to delete the entire document instead?'
      );

      if (deleteEntireDoc) {
        try {
          setLoading('deleting');
          // Delete the entire document
          //await axios.delete(`${getApiUrl('UPLOAD', `/api/upload/files/${encodeURIComponent(file.path)}`)}`, {
          //  data: { delete_metadata: true }
          //});
          await axios.delete(getGatewayUrl(`/api/upload/files/${encodeURIComponent(file.path)}`), {
            data: { delete_metadata: true },
          }, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          // Clear the preview and trigger parent update
          setError('Document has been deleted. Select a different document to view.');
          setNumPages(null);
          setStartPage(1);
          setEndPage(1);
          onFileUpdate(file.path);
          
          // Force iframe to clear by setting source to empty
          const iframe = document.querySelector('iframe');
          if (iframe) {
            iframe.src = 'about:blank';
          }
          
          return;
        } catch (error) {
          console.error('Error deleting document:', error);
          alert('Failed to delete document. Please try again.');
        } finally {
          setLoading(false);
        }
        return;
      } else if (!window.confirm(`Are you sure you want to delete all pages one by one instead?`)) {
        return;
      }
    } else if (!window.confirm(`Are you sure you want to delete pages ${startPage} to ${endPage}?`)) {
      return;
    }

    try {
      setLoading('deleting');
      // Delete pages from highest to lowest to avoid page number shifting
      for (let i = 0; i <= endPage - startPage; i++) {
        const pageToDelete = endPage - i;
        const response = await axios.post(getGatewayUrl('/api/upload/delete-pdf-page'), {
          file_path: file.path,
          page_number: pageToDelete
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.data.success) {
          throw new Error(`Failed to delete page ${pageToDelete}`);
        }
      }

      const pagesDeleted = endPage - startPage + 1;
      setNumPages(prev => prev - pagesDeleted);
      setStartPage(1);
      setEndPage(Math.max(1, numPages - pagesDeleted));
      setTimestamp(Date.now());
      onFileUpdate(file.path);
    } catch (error) {
      console.error('Error deleting PDF pages:', error);
      alert('Failed to delete pages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  const bestPractices = [
    "Remove extraneous pages: Delete cover pages, table of contents, indexes, and other non-essential content.",
    "Save in a compatible format: Ensure your document is saved in a format that supports text extraction (e.g., searchable PDF, DOCX, or TXT).",
  ];

  const renderPreviewContent = (isFullscreenView = false) => {
    if (error) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%'
        }}>
          <Typography color="error">
            {error}
          </Typography>
        </div>
      );
    }

    if (loading) {
      return (
        <div className={classes.loadingOverlay}>
          <CircularProgress size={40} />
          <Typography variant="body1" className={classes.loadingText}>
            {loading === 'deleting' 
              ? "Working to delete selected pages... Preview will reload when complete."
              : "Loading document preview..."}
          </Typography>
        </div>
      );
    }

    const iframeProps = isFullscreenView ? {
      className: classes.fullscreenPreview
    } : {
      className: classes.previewFrame
    };

    if (file.type === 'PDF' || file.type === 'DOCX' || file.path.toLowerCase().endsWith('.docx')) {
      const previewUrl = file.type === 'PDF' 
        ? `${getApiUrl('UPLOAD', `/api/upload/files/${encodeURIComponent(file.path)}`)}?t=${timestamp}`
        : `${getApiUrl('UPLOAD', `/api/upload/preview-docx/${encodeURIComponent(file.path)}`)}?t=${timestamp}`; //Should this be authenticated?

      return (
        <>
          <iframe
            key={`${file.path}-${timestamp}`}
            src={previewUrl}
            {...iframeProps}
            title={file.type === 'PDF' ? "PDF Preview" : "DOCX Preview"}
          />
          <div className={isFullscreenView ? classes.fullscreenControls : classes.controls}>
            <div style={{ flex: 1 }} />
            {file.type === 'PDF' && (
              <div className={classes.pageInputs}>
                <Typography variant="body2" component="span" className={classes.pageInputLabel}>
                  Delete pages:
                </Typography>
                <input
                  type="number"
                  min="1"
                  max={numPages}
                  value={startPage}
                  onChange={(e) => setStartPage(Math.max(1, Math.min(numPages, parseInt(e.target.value) || 1)))}
                  className={classes.pageInput}
                />
                <Typography variant="body2" component="span" className={classes.pageInputLabel}>
                  to
                </Typography>
                <input
                  type="number"
                  min="1"
                  max={numPages}
                  value={endPage}
                  onChange={(e) => setEndPage(Math.max(1, Math.min(numPages, parseInt(e.target.value) || 1)))}
                  className={classes.pageInput}
                />
                <IconButton 
                  onClick={handleDeletePages} 
                  aria-label="delete pages"
                  disabled={loading || !numPages || numPages <= 1}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </div>
            )}
            {file.type === 'DOCX' && (
              <Button
                variant="outlined"
                color="primary"
                href={`${getApiUrl('UPLOAD', `/api/upload/files/${encodeURIComponent(file.path)}`)}`} //Should this be authenticated?
                download
              >
                Download Original DOCX
              </Button>
            )}
          </div>
        </>
      );
    } else if (file.type === 'TXT' || file.path.toLowerCase().endsWith('.txt')) {
      return (
        <>
          <iframe
            src={`${getApiUrl('UPLOAD', `/api/upload/preview-txt/${file.path}`)}`} //Should this be authenticated?
            {...iframeProps}
            title="TXT Preview"
          />
          <div className={isFullscreenView ? classes.fullscreenControls : classes.controls}>
            <div style={{ flex: 1 }} />
          </div>
        </>
      );
    } else {
      return (
        <Typography>
          Preview not available for this file type: {file.type}
        </Typography>
      );
    }
  };

  const renderPreview = () => {
    return (
      <>
        {renderPreviewContent(false)}
        <Dialog 
          open={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          className={classes.fullscreenDialog}
          maxWidth={false}
          fullWidth
        >
          <DialogTitle className={classes.fullscreenDialogTitle} disableTypography>
            <Typography variant="h6">{file.name}</Typography>
            <IconButton 
              onClick={() => setIsFullscreen(false)}
              className={classes.closeButton}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent className={classes.fullscreenContent}>
            {renderPreviewContent(true)}
          </DialogContent>
        </Dialog>
      </>
    );
  };

  return (
    <div className={classes.previewContainer}>
      <div className={classes.titleContainer}>
        <div className={classes.titleLeftSection}>
          <Typography variant="h6" className={classes.title}>File Preview</Typography>
          <Tooltip title="Best Practices for Document Preparation">
            <IconButton className={classes.infoIcon} onClick={handleOpenDialog}>
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </div>
        {!error?.includes('Document has been deleted') && (
          <Typography variant="subtitle1" className={classes.fileName}>
            {file.name}
          </Typography>
        )}
        <div className={classes.titleRightSection}>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleFullscreenToggle}
            className={classes.fullscreenButton}
            startIcon={<FullscreenIcon />}
          >
            Fullscreen
          </Button>
        </div>
      </div>
      {renderPreview()}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle className={classes.dialogTitle}>
          <Typography variant="h6" style={{ color: '#ffffff' }}>
            Best Practices for Document Preparation
          </Typography>
        </DialogTitle>
        <DialogContent className={classes.dialogContent}>
          <Typography variant="body1" paragraph>
            To optimize the extraction of sentences, paragraphs, or meaningful blocks of text from unstructured documents, consider the following best practices:
          </Typography>
          <List>
            {bestPractices.map((practice, index) => (
              <React.Fragment key={index}>
                <ListItem className={classes.listItem}>
                  <ListItemIcon className={classes.listItemIcon}>
                    <CheckCircleOutlineIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={practice} className={classes.listItemText} />
                </ListItem>
                {index < bestPractices.length - 1 && <Divider component="li" className={classes.divider} />}
              </React.Fragment>
            ))}
          </List>
          <Divider className={classes.divider} />
          <Typography variant="body1" paragraph>
            By following these practices, you can significantly improve the quality and accuracy of text extraction from your documents.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default FilePreview;
