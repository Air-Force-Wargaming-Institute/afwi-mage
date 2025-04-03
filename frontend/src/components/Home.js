import React, { useContext } from 'react';
import {
  Grid,
  Typography,
  makeStyles,
  Button,
  CardActions,
  Box,
  useTheme,
  alpha,
} from '@material-ui/core';
import { useHistory } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import GroupWorkIcon from '@material-ui/icons/GroupWork';
import TuneIcon from '@material-ui/icons/Tune';
import LibraryBooksIcon from '@material-ui/icons/LibraryBooks';
import FolderIcon from '@material-ui/icons/Folder';
import { 
  GradientBorderPaper, 
  GradientBorderCard, 
  AnimatedGradientPaper,
  StyledContainer,
  GradientText
} from '../styles/StyledComponents';

const useStyles = makeStyles((theme) => ({
  iconContainer: {
    display: 'flex', 
    justifyContent: 'center',
    marginBottom: theme.spacing(2),
  },
  cardIcon: {
    fontSize: '2.5rem',
    color: theme.palette.primary.main,
  },
  actionButton: {
    fontWeight: 500,
    transition: theme.custom.transition,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.custom.boxShadow,
    }
  },
  adminSection: {
    marginTop: theme.spacing(4),
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  cardContent: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
}));

function Home() {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const theme = useTheme();

  const features = [
    {
      title: 'Multi-Agent Portal',
      description: 'Build, manage, and chat with multi-agent systems for complex problem-solving and decision-making.',
      path: '/multi-agent',
      buttonText: 'Access Portal',
      icon: <GroupWorkIcon className={classes.cardIcon} />
    },
    {
      title: 'Fine-Tuning Portal',
      description: 'Fine-tune language models with custom datasets for specialized tasks and domains.',
      path: '/fine-tuning',
      buttonText: 'Start Fine-Tuning',
      icon: <TuneIcon className={classes.cardIcon} />
    },
    {
      title: 'Retrieval Portal',
      description: 'Create and manage knowledge bases for your agents to efficiently retrieval information and answer questions.',
      path: '/retrieval',
      buttonText: 'Manage Knowledge Bases',
      icon: <LibraryBooksIcon className={classes.cardIcon} />
    },
    {
      title: 'Document Library',
      description: 'Access and manage your document repository for training and reference.',
      path: '/document-library',
      buttonText: 'Browse the Library',
      icon: <FolderIcon className={classes.cardIcon} />
    },
  ];

  return (
    <StyledContainer maxWidth="lg">
      <AnimatedGradientPaper elevation={3}>
        <Box mb={3}>
          <GradientText variant="h1" fontWeight="600" fontSize={'4rem'} gutterBottom>
            Welcome to MAGE
          </GradientText>
        </Box>

        <Box mb={4}>
          <Typography variant="body1" color="textSecondary" paragraph>
            MAGE is a versatile platform that empowers wargame designers, participants, and analysts to build multi-agent systems that use fine-tuned Large Language Models (LLMs) in local secure environments and air-gapped systems. 
            It offers a suite of tools for building AI multi-agent teams, fine-tune LLMs, build retrieval systems for AI agents, and manage a critical knowledge bases. 
            Select a portal below to explore MAGE's capabilities.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {features.map((feature) => (
            <Grid item xs={12} sm={6} md={3} key={feature.title}>
              <GradientBorderCard elevation={2} className={classes.card}>
                <Box className={classes.cardContent}>
                  <Box className={classes.iconContainer}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" color="primary" gutterBottom fontWeight={500}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    {feature.description}
                  </Typography>
                </Box>
                <CardActions>
                  <Button
                    color="primary"
                    variant="contained"
                    onClick={() => history.push(feature.path)}
                    className={classes.actionButton}
                    fullWidth
                  >
                    {feature.buttonText}
                  </Button>
                </CardActions>
              </GradientBorderCard>
            </Grid>
          ))}
        </Grid>

        {user?.permission === 'admin' && (
          <GradientBorderPaper elevation={2} className={classes.adminSection}>
            <Box p={3}>
              <Typography variant="h6" color="primary" gutterBottom>
                Administrator Tools
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Access administrative functions to manage users and monitor system status.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => history.push('/admin')}
                className={classes.actionButton}
              >
                Access Admin Dashboard
              </Button>
            </Box>
          </GradientBorderPaper>
        )}
      </AnimatedGradientPaper>
    </StyledContainer>
  );
}

export default Home; 