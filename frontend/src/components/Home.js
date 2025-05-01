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
import PublicIcon from '@material-ui/icons/Public';
import { 
  GradientBorderPaper, 
  GradientBorderCard, 
  AnimatedGradientPaper,
  StyledContainer,
  GradientText
} from '../styles/StyledComponents';
import mageCoiImage from '../assets/AFWI_MAGE_COIN.png';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    paddingTop: theme.spacing(70),
  },
  coinImage: {
    width: 300,
    height: 300,
    marginBottom: theme.spacing(2),
    filter: 'drop-shadow(0px 10px 20px rgba(0, 0, 0, 0.4))',
  },
  welcomeText: {
    textAlign: 'center',
    marginBottom: theme.spacing(0),
    fontSize: '3.5rem',
  },
  transparentPaper: {
    backgroundColor: 'transparent',
    boxShadow: 'none',
    marginTop: theme.spacing(0),
  },
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
  featuresContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    margin: theme.spacing(0, -1.5),
  },
  featureItem: {
    width: 'calc(20% - 24px)',
    margin: theme.spacing(0, 1.5, 3, 1.5),
    [theme.breakpoints.down('md')]: {
      width: 'calc(33.333% - 24px)',
    },
    [theme.breakpoints.down('sm')]: {
      width: 'calc(50% - 24px)',
    },
    [theme.breakpoints.down('xs')]: {
      width: '100%',
    },
  },
  cardTitle: {
    fontSize: '1.4rem',
    fontWeight: 600,
    marginBottom: theme.spacing(1.5),
    lineHeight: 1.3,
    letterSpacing: '0.02em',
  }
}));

function Home() {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const theme = useTheme();

  const features = [
    {
      title: 'Build a Wargame (Pre-Alpha)',
      description: 'Execute and analyze geopolitical wargame simulations using multi-agent systems, the DIME framework, and integrated cross-domain warfare.',
      path: '/wargame-builder',
      buttonText: 'Build a Wargame',
      icon: <PublicIcon className={classes.cardIcon} />
    },
    {
      title: 'Agent Portal',
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
    <Box className={classes.root}>
      <img src={mageCoiImage} alt="AFWI MAGE Coin" className={classes.coinImage} />
      
      <GradientText variant="h1" fontWeight="600" fontSize={'4rem'} className={classes.welcomeText}>
        Welcome to MAGE
      </GradientText>
      
      <StyledContainer maxWidth="xl">
        <AnimatedGradientPaper elevation={3} className={classes.transparentPaper}>
          <Box className={classes.featuresContainer}>
            {features.map((feature) => (
              <Box key={feature.title} className={classes.featureItem}>
                <GradientBorderCard elevation={2} className={classes.card}>
                  <Box className={classes.cardContent}>
                    <Box className={classes.iconContainer}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" color="primary" gutterBottom fontWeight={500} className={classes.cardTitle}>
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
              </Box>
            ))}
          </Box>

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
    </Box>
  );
}

export default Home; 