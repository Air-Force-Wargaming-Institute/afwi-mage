import React from 'react';
import { styled } from '@material-ui/core/styles';
import { IconButton, Tooltip, Button, Typography } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import GetAppIcon from '@material-ui/icons/GetApp';
import VisibilityIcon from '@material-ui/icons/Visibility';
import AddIcon from '@material-ui/icons/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// Error color constant for consistency
export const DELETE_COLOR = '#ea4335';

// Utility function to apply delete styling to any component
export const withDeleteStyling = (Component) => {
  return styled(Component)(({ theme }) => ({
    color: DELETE_COLOR,
    '&:hover': {
      backgroundColor: 'rgba(234, 67, 53, 0.08)',
    },
    '& .MuiSvgIcon-root': {
      color: DELETE_COLOR,
    },
  }));
};

// Styled delete text for consistent styling
export const DeleteText = styled(Typography)(({ theme }) => ({
  color: DELETE_COLOR,
  fontWeight: 500,
}));

// Base styled action button
export const ActionButton = styled(IconButton)(({ theme }) => ({
  margin: theme.spacing(0.5),
  padding: theme.spacing(1),
  transition: 'all 0.3s ease',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
  },
}));

// Styled delete button with special red styling
export const DeleteIconButton = styled(ActionButton)(({ theme }) => ({
  color: DELETE_COLOR,
  '&:hover': {
    backgroundColor: 'rgba(234, 67, 53, 0.08)',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 10px rgba(234, 67, 53, 0.3)',
  },
}));

// Text delete button
export const DeleteTextButton = styled(Button)(({ theme }) => ({
  color: DELETE_COLOR,
  '&:hover': {
    backgroundColor: 'rgba(234, 67, 53, 0.08)',
  },
  '& .MuiButton-startIcon': {
    color: DELETE_COLOR,
  },
  '& .MuiButton-label': {
    color: DELETE_COLOR + ' !important',
  },
  '& span': {
    color: DELETE_COLOR,
  },
}));

// Component implementations
export const DeleteButton = ({ onClick, tooltip = "Delete", ...props }) => (
  <Tooltip title={tooltip}>
    <DeleteIconButton 
      onClick={onClick} 
      aria-label="delete"
      style={{ color: DELETE_COLOR }}
      {...props}
    >
      <DeleteIcon style={{ color: DELETE_COLOR }} />
    </DeleteIconButton>
  </Tooltip>
);

export const EditButton = ({ onClick, tooltip = "Edit", ...props }) => (
  <Tooltip title={tooltip}>
    <ActionButton 
      color="primary" 
      onClick={onClick} 
      aria-label="edit" 
      {...props}
    >
      <EditIcon />
    </ActionButton>
  </Tooltip>
);

export const DownloadButton = ({ onClick, tooltip = "Download", ...props }) => (
  <Tooltip title={tooltip}>
    <ActionButton 
      color="primary" 
      onClick={onClick} 
      aria-label="download" 
      {...props}
    >
      <GetAppIcon />
    </ActionButton>
  </Tooltip>
);

export const ViewButton = ({ onClick, tooltip = "View", ...props }) => (
  <Tooltip title={tooltip}>
    <ActionButton 
      color="primary" 
      onClick={onClick} 
      aria-label="view" 
      {...props}
    >
      <VisibilityIcon />
    </ActionButton>
  </Tooltip>
);

export const AddButton = ({ onClick, tooltip = "Add", ...props }) => (
  <Tooltip title={tooltip}>
    <ActionButton 
      color="secondary" 
      onClick={onClick} 
      aria-label="add" 
      {...props}
    >
      <AddIcon />
    </ActionButton>
  </Tooltip>
);

export const CopyButton = ({ onClick, tooltip = "Copy", ...props }) => (
  <Tooltip title={tooltip}>
    <ActionButton 
      color="primary" 
      onClick={onClick} 
      aria-label="copy" 
      {...props}
    >
      <ContentCopyIcon />
    </ActionButton>
  </Tooltip>
);

// Export a delete text button component for text buttons
export const DeleteActionButton = ({ children, onClick, ...props }) => (
  <DeleteTextButton
    startIcon={<DeleteIcon style={{ color: DELETE_COLOR }} />}
    onClick={onClick}
    aria-label="delete"
    style={{ color: DELETE_COLOR }}
    {...props}
  >
    <span style={{ color: DELETE_COLOR }}>{children || "Delete"}</span>
  </DeleteTextButton>
); 