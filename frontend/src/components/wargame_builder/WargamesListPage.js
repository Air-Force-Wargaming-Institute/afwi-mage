import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Divider,
  Chip,
  Button,
  CircularProgress,
  Snackbar
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { makeStyles } from '@material-ui/core/styles';
import { StyledContainer, GradientText, GradientBorderCard } from '../../styles/StyledComponents';
import { AddButton, DeleteButton, EditButton, CopyButton } from '../../styles/ActionButtons';
import CreateWargameModal from './CreateWargameModal';
import WargameEditorModal from './WargameEditorModal';
import CalendarTodayIcon from '@material-ui/icons/CalendarToday';
import UpdateIcon from '@material-ui/icons/Update';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import AddIcon from '@material-ui/icons/Add';
import { useWargameService } from '../../services/wargameService';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
    },
  },
  cardContent: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  cardActionArea: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  noBuildsMessage: {
    textAlign: 'center',
    marginTop: theme.spacing(4),
  },
  actionsContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: theme.spacing(1),
    width: '100%',
  },
  dateInfo: {
    marginTop: theme.spacing(2),
    width: '100%',
  },
  dateItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
  },
  dateIcon: {
    fontSize: '1rem',
    marginRight: theme.spacing(1),
    opacity: 0.7,
  },
  statusChip: {
    marginTop: theme.spacing(1),
    marginRight: theme.spacing(1),
    height: 24,
    fontSize: '0.7rem',
  },
  cardHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(1),
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '300px',
  },
}));

function WargamesListPage() {
  const classes = useStyles();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [selectedWargame, setSelectedWargame] = useState(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [wargameToDelete, setWargameToDelete] = useState(null);
  const [wargameBuilds, setWargameBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { listWargames, deleteWargame, getWargame, createWargame } = useWargameService();

  useEffect(() => {
    const fetchWargames = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listWargames();
        setWargameBuilds(data || []);
      } catch (err) {
        console.error("Error fetching wargame list:", err);
        setError(err.message || "Failed to load wargames.");
        setWargameBuilds([]);
      } finally {
        setLoading(false);
      }
    };
    fetchWargames();
  }, [listWargames]);

  const handleOpenCreateModal = () => setIsCreateModalOpen(true);
  const handleCloseCreateModal = () => setIsCreateModalOpen(false);

  const handleOpenEditorModal = async (wargameSummary) => {
    setLoading(true);
    setError(null);
    try {
      const fullWargameData = await getWargame(wargameSummary.id);
      setSelectedWargame(fullWargameData);
      setIsEditorModalOpen(true);
    } catch (err) {
      console.error(`Error fetching full wargame data for ${wargameSummary.id}:`, err);
      setError(err.message || `Failed to load wargame '${wargameSummary.name}'.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseEditorModal = () => {
    setIsEditorModalOpen(false);
    setSelectedWargame(null);
  };

  const handleCreateWargame = async (wargameData) => {
    setError(null);
    try {
      const newWargame = await createWargame(wargameData);
      setWargameBuilds(prevBuilds => [...prevBuilds, newWargame]);
      handleCloseCreateModal();
      setSelectedWargame(newWargame);
      setIsEditorModalOpen(true);
    } catch (err) {
      console.error("Error creating wargame:", err);
      setError(err.message || "Failed to create wargame.");
    }
  };

  const handleDuplicateWargame = async (event, wargame) => {
    event.stopPropagation();
    setError(null);
    setLoading(true);
    try {
      const fullWargameToDuplicate = await getWargame(wargame.id);
      const duplicatedWargameData = {
        ...fullWargameToDuplicate,
        id: undefined,
        name: `${fullWargameToDuplicate.name} (Copy)`,
        createdAt: undefined,
        modifiedAt: undefined,
        lastExecuted: null,
      };
      delete duplicatedWargameData.id;
      delete duplicatedWargameData.createdAt;
      delete duplicatedWargameData.modifiedAt;
      const newWargame = await createWargame(duplicatedWargameData);
      setWargameBuilds(prevBuilds => [...prevBuilds, newWargame]);
    } catch (err) {
      console.error("Error duplicating wargame:", err);
      setError(err.message || "Failed to duplicate wargame.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWargameClick = (event, wargame) => {
    event.stopPropagation();
    setWargameToDelete(wargame);
    setIsConfirmDeleteOpen(true);
  };

  const handleCloseConfirmDelete = () => {
    setIsConfirmDeleteOpen(false);
    setWargameToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!wargameToDelete) return;
    setError(null);
    try {
      await deleteWargame(wargameToDelete.id);
      setWargameBuilds(prevBuilds => prevBuilds.filter(wg => wg.id !== wargameToDelete.id));
    } catch (err) {
      console.error("Error deleting wargame:", err);
      setError(err.message || `Failed to delete wargame '${wargameToDelete.name}'.`);
    } finally {
      handleCloseConfirmDelete();
    }
  };

  const handleEditWargame = (event, wargame) => {
    event.stopPropagation();
    handleOpenEditorModal(wargame);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <StyledContainer>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <GradientText variant="h4" component="h1">
          Wargame Builder (Pre-Alpha)
        </GradientText>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateModal}
        >
          Create New Wargame Build
        </Button>
      </Box>

      {loading && (
        <Box className={classes.loadingContainer}>
          <CircularProgress />
          <Typography style={{ marginLeft: 16 }}>Loading Wargames...</Typography>
        </Box>
      )}

      {error && !loading && (
        <Box my={2}>
          <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
        </Box>
      )}

      {!loading && wargameBuilds.length === 0 && !error && (
        <Box className={classes.noBuildsMessage}>
          <Typography variant="body1" paragraph>You haven't created any wargame builds yet.</Typography>
          <Typography variant="body2" color="textSecondary">Click the '+' button above to create your first wargame build.</Typography>
        </Box>
      )}

      {!loading && wargameBuilds.length > 0 && (
        <Grid container spacing={3}>
          {wargameBuilds.map((wargame) => (
            <Grid item xs={12} sm={6} md={4} key={wargame.id}>
              <GradientBorderCard className={classes.card}>
                <CardActionArea
                  className={classes.cardActionArea}
                  onClick={() => handleOpenEditorModal(wargame)}
                >
                  <CardContent className={classes.cardContent}>
                    <Box className={classes.cardHeader}>
                      <GradientText variant="h6" component="h2">{wargame.name}</GradientText>
                    </Box>
                    {wargame.designer && (
                      <Typography variant="body2" style={{ 
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'rgba(255, 255, 255, 0.7)'
                      }}>
                        <b>Designer:</b>&nbsp;{wargame.designer}
                      </Typography>
                    )}
                    <Typography variant="body2" color="textSecondary" component="p">{wargame.description}</Typography>
                    <Box className={classes.dateInfo}>
                      <Divider style={{ margin: '8px 0' }} />
                      <Box className={classes.dateItem}><CalendarTodayIcon className={classes.dateIcon} /><Typography variant="caption">Created: {formatDate(wargame.createdAt)}</Typography></Box>
                      <Box className={classes.dateItem}><UpdateIcon className={classes.dateIcon} /><Typography variant="caption">Modified: {formatDate(wargame.modifiedAt)}</Typography></Box>
                      <Box className={classes.dateItem}><PlayArrowIcon className={classes.dateIcon} /><Typography variant="caption">Last Executed: {formatDate(wargame.lastExecuted)}</Typography></Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
                <Box className={classes.actionsContainer}>
                  <CopyButton tooltip="Duplicate Wargame" onClick={(e) => handleDuplicateWargame(e, wargame)} />
                  <EditButton tooltip="Edit Wargame" onClick={(e) => handleEditWargame(e, wargame)} />
                  <DeleteButton tooltip="Delete Wargame" onClick={(e) => handleDeleteWargameClick(e, wargame)} />
                </Box>
              </GradientBorderCard>
            </Grid>
          ))}
        </Grid>
      )}

      <CreateWargameModal
        open={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onCreate={handleCreateWargame}
      />

      <WargameEditorModal
        open={isEditorModalOpen}
        onClose={handleCloseEditorModal}
        wargameData={selectedWargame}
      />

      <Dialog
        open={isConfirmDeleteOpen}
        onClose={handleCloseConfirmDelete}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the wargame build "{wargameToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="secondary" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setError(null)} severity="error" variant="filled">
          {error}
        </Alert>
      </Snackbar>
    </StyledContainer>
  );
}

export default WargamesListPage; 