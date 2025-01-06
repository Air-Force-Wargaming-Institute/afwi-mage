import React, { useContext } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  makeStyles,
  Button,
  Card,
  CardContent,
  CardActions,
  Box,
} from '@material-ui/core';
import { useHistory } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import GroupWorkIcon from '@material-ui/icons/GroupWork';
import TuneIcon from '@material-ui/icons/Tune';
import LibraryBooksIcon from '@material-ui/icons/LibraryBooks';
import FolderIcon from '@material-ui/icons/Folder';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  mainContainer: {
    backgroundColor: 'white',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  welcome: {
    marginBottom: theme.spacing(4),
  },
  welcomeTitle: {
    color: theme.palette.primary.main,
    fontWeight: 500,
  },
  welcomeSubtitle: {
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(1),
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: theme.shadows[4],
    },
  },
  cardContent: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
  cardIcon: {
    fontSize: '2.5rem',
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(2),
  },
  cardTitle: {
    marginBottom: theme.spacing(2),
    color: theme.palette.primary.main,
    fontWeight: 500,
  },
  cardDescription: {
    marginBottom: theme.spacing(2),
    color: theme.palette.text.secondary,
  },
  section: {
    marginBottom: theme.spacing(4),
  },
  actionButton: {
    marginTop: 'auto',
    fontWeight: 500,
  },
  adminSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(4),
  },
  adminContent: {
    padding: theme.spacing(3),
  },
  description: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(3),
  },
  iconContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: theme.spacing(2),
  },
}));

function Home() {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);

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
    <Container className={classes.root}>
      <Paper className={classes.mainContainer}>
        <Box className={classes.welcome}>
          <Typography variant="h4" className={classes.welcomeTitle} gutterBottom>
            Welcome to MAGE
          </Typography>
          <Typography variant="h6" className={classes.welcomeSubtitle}>
            Multi-Agent Generative Engine
          </Typography>
        </Box>

        <Box className={classes.section}>
          <Typography variant="body1" className={classes.description}>
            MAGE is a comprehensive platform designed for fine-tuning Local Language Models (LLMs) in air-gapped environments.
            Select a portal below to get started with your AI development journey.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {features.map((feature) => (
            <Grid item xs={12} sm={6} md={3} key={feature.title}>
              <Card className={classes.card}>
                <CardContent className={classes.cardContent}>
                  <div className={classes.iconContainer}>
                    {feature.icon}
                  </div>
                  <Typography variant="h6" className={classes.cardTitle}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" className={classes.cardDescription}>
                    {feature.description}
                  </Typography>
                </CardContent>
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
              </Card>
            </Grid>
          ))}
        </Grid>

        {user?.permission === 'admin' && (
          <Paper elevation={1} className={classes.adminSection}>
            <Box className={classes.adminContent}>
              <Typography variant="h6" gutterBottom color="primary">
                Administrator Tools
              </Typography>
              <Typography variant="body2" className={classes.description}>
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
          </Paper>
        )}
      </Paper>
    </Container>
  );
}

export default Home; 