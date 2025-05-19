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
  titleWithIcon: {
    display: 'flex',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main,
  },
}));

/**
 * A reusable modal component for editing long-form text in Report Builder.
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
 */
function ReportTextEditorModal({ 
  open, 
  onClose, 
  title, 
  value, 
  onChange, 
  placeholder,
  rows = 20,
  maxLength
}) {
  const classes = useStyles();
  const [text, setText] = useState(value || '');

  // Update text when value prop or open status changes
  useEffect(() => {
    setText(value || '');
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
  };

  const handleKeyDown = (e) => {
    // Allow saving with Ctrl+Enter or Cmd+Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
      e.preventDefault();
    }
    // Close on Escape key
    if (e.key === 'Escape') {
      onClose();
      e.preventDefault();
    }
  };

  // Calculate character count and limit information
  const charCount = text.length;
  const charLimitText = maxLength ? `${charCount}/${maxLength}` : `${charCount} characters`;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="md"
      aria-labelledby="report-text-editor-dialog-title"
    >
      <DialogTitle id="report-text-editor-dialog-title" className={classes.dialogTitle}>
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
        <Box display="flex" justifyContent="flex-end" alignItems="center" mt={1}>
          <Typography variant="caption" color="textSecondary" className={classes.charCount}>
            {charLimitText}
          </Typography>
        </Box>
        <Typography variant="caption" color="textSecondary">
          Tip: Press Ctrl+Enter to apply changes, Cancel to escape.
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
          Apply Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ReportTextEditorModal; 