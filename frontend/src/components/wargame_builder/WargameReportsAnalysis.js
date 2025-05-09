import React from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Grid
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { GradientText } from '../../styles/StyledComponents';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  sectionTitle: {
    marginBottom: theme.spacing(3),
  },
  reportsPaper: {
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    height: '400px',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  dashboardPaper: {
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    height: '400px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  reportsIcon: {
    fontSize: '3rem',
    marginBottom: theme.spacing(2),
    opacity: 0.6,
  },
  section: {
    marginBottom: theme.spacing(4),
  },
  simulationSection: {
    marginTop: theme.spacing(4),
  },
  analysisSection: {
    marginTop: theme.spacing(6),
  }
}));

function WargameReportsAnalysis({ wargameData }) {
  const classes = useStyles();

  return (
    <Box className={classes.root}>
      <GradientText variant="h4" component="h1" className={classes.sectionTitle}>
        Reports and Analysis
      </GradientText>
      
      <Typography variant="body1" paragraph>
        This section displays experiment results and analytics after the wargame has been executed.
        You'll be able to view detailed reports, outcome summaries, and interactive visualizations.
      </Typography>
      
      <Box className={classes.simulationSection}>
        <GradientText variant="h5" component="h2">
          Wargame Analysis & Reports
        </GradientText>
        
        <Grid container spacing={4} style={{ marginTop: '16px' }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Reports</Typography>
            <Paper className={classes.reportsPaper} elevation={2}>
              <Box textAlign="center" display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%">
                <Typography 
                  variant="body1" 
                  className={classes.reportsIcon}
                >
                  📄
                </Typography>
                <Typography variant="h6" gutterBottom>
                  No Experiment Reports Available
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Detailed reports will appear here after wargames complete.
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Dashboard</Typography>
            <Paper className={classes.dashboardPaper} elevation={2}>
              <Typography 
                variant="body1" 
                className={classes.reportsIcon}
              >
                📊
              </Typography>
              <Typography variant="h6" gutterBottom>
                No Dashboard Data Available
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Interactive visualizations and metrics will appear here
                after experimentation runs are complete.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
      
      <Box className={classes.analysisSection}>
        <GradientText variant="h5" component="h2">
          Research Objective Outcomes
        </GradientText>
        
        <Typography variant="body2" paragraph style={{ marginTop: '8px' }}>
          Once the wargame is executed, this section will show how each of your research objectives was addressed by the experimental outcomes.
        </Typography>
        
        <Box p={3} border={1} borderColor="rgba(255,255,255,0.12)" borderRadius={4} bgcolor="rgba(0,0,0,0.2)" textAlign="center">
          <Typography variant="body1" style={{ opacity: 0.7 }}>
            {wargameData?.researchObjectives?.length > 0 ? (
              `Outcome analysis for ${wargameData.researchObjectives.length} research objectives will appear here after execution.`
            ) : (
              'No research objectives defined. Please define objectives in the Configure and Setup tab.'
            )}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default WargameReportsAnalysis;
