import React from 'react';
import {
  makeStyles,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Tooltip,
  Typography,
  FormControl,
  Select,
  MenuItem,
  InputLabel
} from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import GetAppIcon from '@material-ui/icons/GetApp';
import { GradientText } from '../../styles/StyledComponents'; // Assuming GradientText is here

const useStyles = makeStyles((theme) => ({
  chatLog: {
    width: '20%', // This was the original width, can be adjusted if the parent controls width
    height: '100%',
    paddingTop: '10px',
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    transition: 'opacity 0.3s ease',
    position: 'relative',
    border: `${theme.custom.borderWidth.regular}px solid transparent`,
    borderRadius: theme.shape.borderRadius,
    boxSizing: 'border-box',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    '&.disabled': {
      opacity: 0.5,
      pointerEvents: 'none',
      filter: 'grayscale(50%)',
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
      background: theme.custom.gradients.gradient2,
      borderRadius: theme.shape.borderRadius,
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: theme.custom.borderWidth.regular,
      left: theme.custom.borderWidth.regular,
      right: theme.custom.borderWidth.regular,
      bottom: theme.custom.borderWidth.regular,
      borderRadius: theme.shape.borderRadius - theme.custom.borderWidth.regular / 2,
      background: theme.palette.background.paper,
      zIndex: -1,
    },
    '& > *': {
      position: 'relative',
      zIndex: 1
    }
  },
  historyPanelContent: { // Changed from uploadPaneContent for clarity
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  newChatButton: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1), // Reduced margin
    width: '90%',
    alignSelf: 'center',
    background: theme.custom.gradients.gradient1,
    transition: theme.custom.transition,
    position: 'relative',
    zIndex: 2,
    '&:hover': {
      background: theme.custom.gradients.vibrant,
      transform: 'translateY(-2px)',
      boxShadow: theme.custom.boxShadowLarge,
    },
  },
  sortControlContainer: {
    width: '90%',
    alignSelf: 'center',
    marginBottom: theme.spacing(2),
  },
  formControl: {
    width: '100%',
  },
  chatSessionsContainer: {
    flexGrow: 1,
    overflow: 'hidden',
    position: 'relative',
    minHeight: '100px',
    paddingBottom: theme.spacing(2),
  },
  sessionsList: {
    padding: theme.spacing(0, 1, 1, 1), // Adjusted padding
    paddingBottom: theme.spacing(3),
    position: 'relative',
    zIndex: 2,
    overflowY: 'auto',
    height: '100%', // Important for scrolling within the container
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.grey[500],
      borderRadius: '4px',
      '&:hover': {
        background: theme.palette.grey[600],
      },
    },
  },
  chatSessionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
    transition: theme.custom.transition,
    position: 'relative',
    zIndex: 2,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      transform: 'translateY(-1px)',
      boxShadow: theme.custom.boxShadow,
    },
    '&.Mui-selected': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.common.white,
      '& .MuiTypography-root': {
        color: theme.palette.common.white,
      },
      '& .MuiSvgIcon-root': {
        color: theme.palette.common.white,
      },
      '&:hover': {
        backgroundColor: theme.palette.primary.dark,
      },
    },
    '&:last-child': {
      marginBottom: theme.spacing(4),
    },
  },
  sessionActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
}));

const DirectChatHistoryPanel = ({
  chatSessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onEditSession,
  onDeleteSessionConfirmation,
  onDownloadSession,
  currentSortCriteria,
  onSortChange,
}) => {
  const classes = useStyles();

  return (
    <div className={classes.chatLog}> {/* Root element for the panel */}
      <div className={classes.historyPanelContent}> {/* Inner content wrapper */}
        <Box mb={2}> {/* Adjusted margin */}
          <GradientText variant="h1" fontWeight="600" fontSize={'2rem'} gutterBottom>
            Chat History
          </GradientText>
        </Box>
        <Button
          variant="contained"
          color="primary"
          className={classes.newChatButton}
          onClick={onNewChat}
        >
          Start New Chat Session
        </Button>

        <div className={classes.sortControlContainer}>
          <FormControl variant="outlined" size="small" className={classes.formControl}>
            <InputLabel id="sort-by-label">Sort By</InputLabel>
            <Select
              labelId="sort-by-label"
              value={currentSortCriteria}
              onChange={onSortChange}
              label="Sort By"
            >
              <MenuItem value="createdAt_desc">Creation Date (Newest First)</MenuItem>
              <MenuItem value="createdAt_asc">Creation Date (Oldest First)</MenuItem>
              <MenuItem value="updatedAt_desc">Modification Date (Newest First)</MenuItem>
              <MenuItem value="updatedAt_asc">Modification Date (Oldest First)</MenuItem>
            </Select>
          </FormControl>
        </div>

        <div className={classes.chatSessionsContainer}>
          <List className={classes.sessionsList}>
            {chatSessions.map((session) => (
              <React.Fragment key={session.id}>
                <ListItem
                  button
                  className={classes.chatSessionItem}
                  selected={session.id === currentSessionId}
                  onClick={() => onSelectSession(session.id)}
                >
                  <div style={{ flex: 1 }}>
                    <ListItemText
                      primary={session.name}
                      secondary={
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          style={{ paddingTop: '0.25rem', display: 'block', fontSize: '0.75rem' }}
                        >
                          Created: {new Date(session.created_at).toLocaleDateString()} {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <br />
                          Updated: {new Date(session.updated_at).toLocaleDateString()} {new Date(session.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <br />
                          ID: {session.id.split('-')[0]}
                        </Typography>
                      }
                    />
                  </div>
                  <div className={classes.sessionActions}>
                    <Tooltip title="Edit">
                      <IconButton edge="end" aria-label="edit" onClick={(e) => { e.stopPropagation(); onEditSession(session.id);}} color="primary">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={(e) => onDeleteSessionConfirmation(e, session.id)}
                        style={{ color: '#ea4335' }}
                      >
                        <DeleteIcon style={{ color: '#ea4335' }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download">
                      <IconButton edge="end" aria-label="download" onClick={(e) => { e.stopPropagation(); onDownloadSession(session.id);}} color="primary">
                        <GetAppIcon />
                      </IconButton>
                    </Tooltip>
                  </div>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DirectChatHistoryPanel);
