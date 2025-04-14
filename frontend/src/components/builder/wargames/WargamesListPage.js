import React, { useState, useEffect } from 'react';
import { Typography, Box, Grid, Card, CardContent, CardActionArea } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { StyledContainer, GradientText } from '../../../styles/StyledComponents';
import { AddButton } from '../../../styles/ActionButtons';
import CreateWargameModal from './CreateWargameModal';
import WargameEditorModal from './WargameEditorModal';

const useStyles = makeStyles((theme) => ({
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.15s ease-in-out',
    '&:hover': {
      transform: 'scale(1.03)',
    },
  },
  cardContent: {
    flexGrow: 1,
  },
  noBuildsMessage: {
    textAlign: 'center',
    marginTop: theme.spacing(4),
  },
}));

function WargamesListPage() {
  const classes = useStyles();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [selectedWargame, setSelectedWargame] = useState(null);
  
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
        { id: '1', name: 'East Asia Confrontation', description: 'Analysis of potential conflicts in the South China Sea' },
        { id: '2', name: 'European Energy Crisis', description: 'Simulation of European responses to energy infrastructure disruption' },
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
      createdAt: new Date().toISOString()
    };
    
    // Add it to our list of wargames
    const updatedWargames = [...wargameBuilds, newWargame];
    setWargameBuilds(updatedWargames);
    
    // Close the create modal
    handleCloseCreateModal();
    
    // Open the editor modal for the new wargame
    setTimeout(() => handleOpenEditorModal(newWargame), 100);
  };

  return (
    <StyledContainer>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <GradientText variant="h4" component="h1">
          Wargame Builder
        </GradientText>
        <AddButton 
          tooltip="Create New Wargame Build"
          onClick={handleOpenCreateModal} 
        />
      </Box>
      
      {wargameBuilds.length > 0 ? (
        <Grid container spacing={3}>
          {wargameBuilds.map((wargame) => (
            <Grid item xs={12} sm={6} md={4} key={wargame.id}>
              <Card className={classes.card}>
                <CardActionArea onClick={() => handleOpenEditorModal(wargame)}>
                  <CardContent className={classes.cardContent}>
                    <GradientText variant="h6" component="h2" gutterBottom>
                      {wargame.name}
                    </GradientText>
                    <Typography variant="body2" color="textSecondary" component="p">
                      {wargame.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
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