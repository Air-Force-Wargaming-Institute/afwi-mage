import React, { useState } from 'react';
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
  Divider
} from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import InfoIcon from '@material-ui/icons/Info';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import axios from 'axios';
import { getApiUrl } from '../config';

const useStyles = makeStyles((theme) => ({
  previewContainer: {
    width: '100%',
    height: 'calc(100vh - 250px)',
    display: 'flex',
    flexDirection: 'column',
  },
  previewFrame: {
    flex: 1,
    border: 'none',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
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
}));

function FilePreview({ file, onFileUpdate }) {
  const classes = useStyles();
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [openDialog, setOpenDialog] = useState(false);

  const handleDeletePage = async () => {
    try {
      const response = await axios.post(getApiUrl('UPLOAD', '/api/upload/delete-pdf-page/'), {
        file_path: file.path,
        page_number: pageNumber
      });
      if (response.data.success) {
        setNumPages(numPages - 1);
        if (pageNumber > numPages - 1) setPageNumber(numPages - 1);
        onFileUpdate(file.path);
      }
    } catch (error) {
      console.error('Error deleting PDF page:', error);
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const bestPractices = [
    "Remove extraneous pages: Delete cover pages, table of contents, indexes, and other non-essential content.",
    "Save in a compatible format: Ensure your document is saved in a format that supports text extraction (e.g., searchable PDF, DOCX, or TXT).",
  ];

  const renderPreview = () => {
    if (file.type === 'PDF') {
      return (
        <>
          <iframe
            src={`${getApiUrl('UPLOAD', `/api/upload/files/${file.path}#page=${pageNumber}`)}`}
            className={classes.previewFrame}
            title="PDF Preview"
          />
          <div className={classes.controls}>
            <Button 
              disabled={pageNumber <= 1} 
              onClick={() => setPageNumber(prev => prev - 1)}
            >
              Previous
            </Button>
            <Typography>
              Page {pageNumber} of {numPages}
            </Typography>
            <Button 
              disabled={pageNumber >= numPages} 
              onClick={() => setPageNumber(prev => prev + 1)}
            >
              Next
            </Button>
            <IconButton onClick={handleDeletePage} aria-label="delete page">
              <DeleteIcon />
            </IconButton>
          </div>
        </>
      );
    } else if (file.type === 'DOCX') {
      return (
        <iframe
          src={`${getApiUrl('UPLOAD', `/api/upload/preview-docx/${file.path}`)}`}
          className={classes.previewFrame}
          title="DOCX Preview"
        />
      );
    } else if (file.type === 'TXT') {
      return (
        <iframe
          src={`${getApiUrl('UPLOAD', `/api/upload/preview-txt/${file.path}`)}`}
          className={classes.previewFrame}
          title="TXT Preview"
        />
      );
    } else {
      return (
        <Typography>
          Preview not available for this file type: {file.type}
        </Typography>
      );
    }
  };

  return (
    <div className={classes.previewContainer}>
      <div className={classes.titleContainer}>
        <Typography variant="h6" className={classes.title}>File Preview</Typography>
        <Tooltip title="Best Practices for Document Preparation">
          <IconButton className={classes.infoIcon} onClick={handleOpenDialog}>
            <InfoIcon />
          </IconButton>
        </Tooltip>
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
