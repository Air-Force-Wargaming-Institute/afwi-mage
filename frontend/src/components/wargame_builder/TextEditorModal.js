import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Box,
  Button,
  IconButton
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import CloseIcon from '@material-ui/icons/Close';
import EditIcon from '@material-ui/icons/Edit';
import DoneIcon from '@material-ui/icons/Done';
import AutorenewIcon from '@material-ui/icons/Autorenew';

const useStyles = makeStyles((theme) => ({
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dialogContent: {
    padding: theme.spacing(2),
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
  fullscreenTextField: {
    '& .MuiInputBase-root': {
      fontFamily: "'Roboto Mono', monospace",
      fontSize: '1rem',
      lineHeight: '1.5',
    },
  },
  charCount: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
  },
  helpText: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing(1),
  },
  titleWithIcon: {
    display: 'flex',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  approveButton: {
    marginRight: theme.spacing(1),
  },
  approveButtonApproved: {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.common.white,
    '&:hover': {
      backgroundColor: theme.palette.success.dark,
    },
  },
  mageAssistButton: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    borderColor: theme.palette.primary.main,
    '&:hover': {
      backgroundColor: 'rgba(66, 133, 244, 0.2)',
    },
  },
  mageAssistIcon: {
    marginRight: theme.spacing(1),
  },
}));

/**
 * A reusable modal component for editing long-form text
 * 
 * @param {Object} props
 * @param {boolean} props.open - Controls whether the modal is open
 * @param {Function} props.onClose - Callback when the modal is closed
 * @param {string} props.title - The title displayed in the modal header
 * @param {string} props.value - The current text value
 * @param {Function} props.onChange - Callback when text is saved, receives the new text as argument
 * @param {string} props.placeholder - Placeholder text for the input field
 * @param {number} props.rows - Number of rows for the text field (default: 20)
 * @param {number} props.maxLength - Optional maximum character length
 * @param {boolean} props.isApproved - Whether the content is approved for execution
 * @param {Function} props.onApprove - Callback to toggle approval status
 * @param {string} props.fieldName - Field name used for approval tracking
 */
function TextEditorModal({ 
  open, 
  onClose, 
  title, 
  value, 
  onChange, 
  placeholder,
  rows = 20,
  maxLength,
  isApproved = false,
  onApprove = null,
  fieldName = null
}) {
  const classes = useStyles();
  const [text, setText] = useState(value || '');
  const [isDirty, setIsDirty] = useState(false);

  // Update text when value prop changes
  useEffect(() => {
    setText(value || '');
    setIsDirty(false);
  }, [value, open]);

  const handleSave = () => {
    onChange(text);
    onClose();
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    if (maxLength && newValue.length > maxLength) {
      return; // Don't update if exceeding max length
    }
    setText(newValue);
    setIsDirty(text !== newValue);
  };

  const handleKeyDown = (e) => {
    // Allow saving with Ctrl+Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
      e.preventDefault();
    }
    // Close on Escape key
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleMageAssist = () => {
    // This is a placeholder - will be connected to LLM functionality
    console.log('MAGE Assist requested for text editor content');
    // Future implementation could pre-populate or enhance the current text
  };

  // Calculate character count and limit information
  const charCount = text.length;
  const charLimitText = maxLength ? `${charCount}/${maxLength}` : `${charCount} characters`;

  // Show approval button only if onApprove is provided and fieldName is set
  const showApprovalButton = onApprove && fieldName && text.trim().length > 0;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="md"
      aria-labelledby="text-editor-dialog-title"
    >
      <DialogTitle id="text-editor-dialog-title" className={classes.dialogTitle}>
        <Box className={classes.titleWithIcon}>
          <EditIcon className={classes.titleIcon} />
          <Typography variant="h6">{title}</Typography>
        </Box>
        <IconButton aria-label="close" className={classes.closeButton} onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent className={classes.dialogContent} dividers>
        <TextField
          autoFocus
          multiline
          rows={rows}
          variant="outlined"
          fullWidth
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={classes.fullscreenTextField}
        />
        
        <Button
          variant="outlined"
          fullWidth
          color="primary"
          className={classes.mageAssistButton}
          onClick={handleMageAssist}
          startIcon={<AutorenewIcon />}
        >
          MAGE Assist - Help Improve This Content
        </Button>
        
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mt={2} mb={1}>
          {showApprovalButton && (
            <Box display="flex" flexDirection="column">
              <Button
                variant={isApproved ? "contained" : "outlined"}
                size="small"
                onClick={() => onApprove(fieldName)}
                className={`${classes.approveButton} ${isApproved ? classes.approveButtonApproved : ''}`}
                startIcon={isApproved ? <DoneIcon /> : null}
                disabled={isDirty}
              >
                {isApproved ? "Approved" : "Approve & Commit"}
              </Button>
              {isApproved && (
                <Typography variant="caption" color="textSecondary" style={{ marginTop: 4 }}>
                  Content approved for execution
                </Typography>
              )}
            </Box>
          )}
          
          <Typography variant="caption" color="textSecondary" className={classes.charCount}>
            {charLimitText}
          </Typography>
        </Box>
        
        <Typography variant="caption" color="textSecondary">
          Tip: Press Ctrl+Enter to save, Escape to cancel
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="default">
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          color="primary" 
          variant="contained"
          disabled={maxLength && text.length > maxLength}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TextEditorModal; 