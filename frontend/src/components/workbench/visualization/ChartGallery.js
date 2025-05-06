import React, { useState, useContext, useEffect } from 'react';
import { WorkbenchContext } from '../../../contexts/WorkbenchContext';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  CardActions, 
  Button, 
  CircularProgress, 
  Alert, 
  IconButton 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { 
  GradientText, 
  GradientBorderPaper, 
  SubtleGlowPaper 
} from '../../../styles/StyledComponents';
import { DeleteButton } from '../../../styles/ActionButtons'; // Assuming you have a styled DeleteButton
import '../../../App.css';

const ChartGallery = () => {
  const {
    galleryVisualizations,
    fetchGalleryVisualizations,
    deleteVisualization,
    isLoading,
    error,
    connectionError
  } = useContext(WorkbenchContext);

  // Fetch visualizations when the component mounts
  useEffect(() => {
    fetchGalleryVisualizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, []); // Run only once on mount

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this visualization?')) {
      try {
        await deleteVisualization(id);
        // Optionally show a success message (e.g., using a Snackbar)
      } catch (err) {
        // Error handling is done within the context function, but you could add UI feedback here
        console.error("Failed to delete visualization from gallery component.");
        // Optionally show an error message
      }
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <CircularProgress />;
    }

    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }

    if (connectionError) {
      return <Alert severity="warning">Could not connect to backend to load visualizations.</Alert>;
    }
    
    if (!galleryVisualizations || galleryVisualizations.length === 0) {
        return (
            <SubtleGlowPaper sx={{p: 3, textAlign: 'center'}}>
                <Typography variant="body1" color="text.secondary">
                    No saved visualizations found. Generate some using the Chart Builder!
                </Typography>
            </SubtleGlowPaper>
        );
    }

    return (
      <Grid container spacing={3}>
        {galleryVisualizations.map((viz) => (
          <Grid item xs={12} sm={6} md={4} key={viz.id}>
            <GradientBorderPaper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardMedia
                component="img"
                height="200"
                // Use data_url directly for display. Need error handling/placeholder
                image={viz.data_url || 'placeholder.png'} // Use placeholder if no data_url
                alt={viz.title || 'Visualization'}
                sx={{ 
                    objectFit: 'contain', 
                    backgroundColor: '#1A1A1A', // Background for contained images
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                // Add basic error handling for the image source itself
                onError={(e) => {
                  e.target.onerror = null; // Prevent infinite loop
                  e.target.src = 'placeholder.png'; // Path to a generic placeholder image
                  console.warn(`Failed to load image for visualization ${viz.id}`);
                }} 
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h6" component="div" fontWeight="600" color="primary.light">
                  {viz.title || 'Untitled Visualization'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Prompt: {viz.prompt || 'N/A'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Created: {viz.created_at ? new Date(viz.created_at).toLocaleString() : 'N/A'}
                </Typography>
                 <Typography variant="caption" display="block" color="text.secondary">
                  Source: {viz.spreadsheet_id || 'N/A'}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.1)', p: 1 }}>
                {/* Use styled DeleteButton or standard IconButton */}
                <DeleteButton 
                  onClick={() => handleDelete(viz.id)}
                  tooltip="Delete Visualization"
                  disabled={isLoading} // Disable while any loading is happening
                />
                 {/* <IconButton size="small" onClick={() => handleDelete(viz.id)} color="error" disabled={isLoading}>
                   <DeleteIcon />
                 </IconButton> */}
              </CardActions>
            </GradientBorderPaper>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box sx={{ marginTop: '-10px' }}>
      <GradientText variant="h3" component="h1" gutterBottom className="section-title" sx={{ fontSize: '2.2rem', fontWeight: 600, mb: 1 }}>
        Visualization Gallery
      </GradientText>
      <Typography variant="body1" sx={{ mt: -1, mb: 3 }}>
        Review and manage your previously generated visualizations.
      </Typography>
      {renderContent()}
    </Box>
  );
};

export default ChartGallery;
