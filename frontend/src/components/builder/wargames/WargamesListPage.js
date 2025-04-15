import React, { useState, useEffect } from 'react';
import { Typography, Box, Grid, Card, CardContent, CardActionArea, Divider, Chip, Button } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { StyledContainer, GradientText, GradientBorderCard } from '../../../styles/StyledComponents';
import { AddButton, DeleteButton, EditButton, CopyButton } from '../../../styles/ActionButtons';
import CreateWargameModal from './CreateWargameModal';
import WargameEditorModal from './WargameEditorModal';
import CalendarTodayIcon from '@material-ui/icons/CalendarToday';
import UpdateIcon from '@material-ui/icons/Update';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import AddIcon from '@material-ui/icons/Add';

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
}));

function WargamesListPage() {
  const classes = useStyles();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [selectedWargame, setSelectedWargame] = useState(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [wargameToDelete, setWargameToDelete] = useState(null);
  
  // Initialize with mock data - we'll use localStorage to persist wargames
  const [wargameBuilds, setWargameBuilds] = useState(() => {
    try {
      // Try to load wargames from localStorage
      const savedWargames = localStorage.getItem('wargameBuilds');
      if (savedWargames) {
        return JSON.parse(savedWargames);
      }
      
      // Default mock data if no saved wargames
      return [
        { 
          id: '1', 
          name: 'East Asia Confrontation', 
          description: 'Analysis of potential conflicts in the South China Sea',
          createdAt: '2023-03-15T10:30:00Z',
          modifiedAt: '2023-05-20T14:45:00Z',
          lastExecuted: '2023-05-22T09:15:00Z',
          securityClassification: 'UNCLASSIFIED'
        },
        { 
          id: '2', 
          name: 'European Energy Crisis', 
          description: 'Simulation of European responses to energy infrastructure disruption',
          createdAt: '2023-04-10T08:20:00Z',
          modifiedAt: '2023-06-05T11:30:00Z',
          lastExecuted: null,
          securityClassification: 'CONFIDENTIAL'
        },
      ];
    } catch (error) {
      console.error("Error loading wargame builds from localStorage:", error);
      return [];
    }
  });

  // Save wargames to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('wargameBuilds', JSON.stringify(wargameBuilds));
    } catch (error) {
      console.error("Error saving wargame builds to localStorage:", error);
    }
  }, [wargameBuilds]);

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleOpenEditorModal = (wargame) => {
    console.log("Opening editor for wargame:", wargame);
    setSelectedWargame(wargame);
    setIsEditorModalOpen(true);
  };

  const handleCloseEditorModal = () => {
    setIsEditorModalOpen(false);
    setSelectedWargame(null);
  };

  const handleCreateWargame = (wargameData) => {
    console.log("Creating new wargame build:", wargameData); 
    
    // Create a new wargame object with an ID
    const newWargame = {
      id: Date.now().toString(), // Simple ID generation
      ...wargameData,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      lastExecuted: null
    };
    
    // Add it to our list of wargames
    const updatedWargames = [...wargameBuilds, newWargame];
    setWargameBuilds(updatedWargames);
    
    // Close the create modal
    handleCloseCreateModal();
    
    // Open the editor modal for the new wargame
    setTimeout(() => handleOpenEditorModal(newWargame), 100);
  };

  // New handlers for the action buttons
  const handleDuplicateWargame = (event, wargame) => {
    event.stopPropagation(); // Prevent event bubbling to card click

    // Create a duplicate with a new ID and updated timestamps
    const duplicatedWargame = {
      ...wargame,
      id: Date.now().toString(),
      name: `${wargame.name} (Copy)`,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      lastExecuted: null
    };
    
    setWargameBuilds([...wargameBuilds, duplicatedWargame]);
  };

  const handleDeleteWargame = (event, wargameId) => {
    event.stopPropagation(); // Prevent event bubbling to card click
    
    const updatedWargames = wargameBuilds.filter(wargame => wargame.id !== wargameId);
    setWargameBuilds(updatedWargames);
  };

  const handleEditWargame = (event, wargame) => {
    event.stopPropagation(); // Prevent event bubbling to card click
    handleOpenEditorModal(wargame);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <StyledContainer>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <GradientText variant="h4" component="h1">
          Wargame Builder
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
      
      {wargameBuilds.length > 0 ? (
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
                      <GradientText variant="h6" component="h2">
                        {wargame.name}
                      </GradientText>
                    </Box>
                    
                    {/* Add Designer field */}
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
                    
                    <Typography variant="body2" color="textSecondary" component="p">
                      {wargame.description}
                    </Typography>
                    
                    <Box className={classes.dateInfo}>
                      <Divider style={{ margin: '8px 0' }} />
                      
                      <Box className={classes.dateItem}>
                        <CalendarTodayIcon className={classes.dateIcon} />
                        <Typography variant="caption">
                          Created: {formatDate(wargame.createdAt)}
                        </Typography>
                      </Box>
                      
                      <Box className={classes.dateItem}>
                        <UpdateIcon className={classes.dateIcon} />
                        <Typography variant="caption">
                          Modified: {formatDate(wargame.modifiedAt)}
                        </Typography>
                      </Box>
                      
                      <Box className={classes.dateItem}>
                        <PlayArrowIcon className={classes.dateIcon} />
                        <Typography variant="caption">
                          Last Executed: {formatDate(wargame.lastExecuted)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
                
                <Box className={classes.actionsContainer}>
                  <CopyButton 
                    tooltip="Duplicate Wargame"
                    onClick={(e) => handleDuplicateWargame(e, wargame)}
                  />
                  <EditButton 
                    tooltip="Edit Wargame"
                    onClick={(e) => handleEditWargame(e, wargame)}
                  />
                  <DeleteButton 
                    tooltip="Delete Wargame"
                    onClick={(e) => handleDeleteWargame(e, wargame.id)}
                  />
                </Box>
              </GradientBorderCard>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box className={classes.noBuildsMessage}>
          <Typography variant="body1" paragraph>
            You haven't created any wargame builds yet.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Click the '+' button above to create your first wargame build.
          </Typography>
        </Box>
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
    </StyledContainer>
  );
}

export default WargamesListPage; 