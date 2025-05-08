import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Typography,
  Box,
  Divider,
  Button,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { 
  CallSplit as ExtractIcon,
  Settings as GenerateIcon,
  Tune as TuneIcon,
  ChevronRight as ArrowIcon,
  PlayCircleFilled as TestIcon,
} from '@material-ui/icons';
import { 
  StyledContainer, 
  GradientBorderPaper, 
  AnimatedGradientPaper,
  SubtleGlowPaper,
  GradientText
} from '../../styles/StyledComponents';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    maxWidth: '1600px',
    margin: '0 auto',
    paddingTop: theme.spacing(10), // Add padding to prevent content from being hidden under the header
  },
  section: {
    marginBottom: theme.spacing(6),
  },
  sectionTitle: {
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(1),
  },
  sectionSubtitle: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(3),
  },
  divider: {
    margin: theme.spacing(4, 0),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureGrid: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    margin: theme.spacing(4, 0),
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column',
    },
  },
  featureCard: {
    flex: '0 0 200px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(3),
    textAlign: 'center',
    marginBottom: theme.spacing(2),
  },
  featureIcon: {
    marginBottom: theme.spacing(2),
    '& svg': {
      fontSize: '3rem',
      color: theme.palette.primary.main,
    },
    '& .extract-icon': {
      color: theme.palette.primary.main,
    },
  },
  featureTitle: {
    marginBottom: theme.spacing(1),
    fontWeight: 600,
  },
  featureDescription: {
    color: theme.palette.text.secondary,
  },
  processArrow: {
    color: theme.palette.primary.main,
    margin: theme.spacing(0, 2),
    [theme.breakpoints.down('sm')]: {
      transform: 'rotate(90deg)',
      margin: theme.spacing(1, 0),
    },
  },
  actionButton: {
    marginTop: theme.spacing(2),
    textDecoration: 'none',
  },
}));

function FineTuneGuide() {
  const classes = useStyles();
  
  const steps = [
    {
      icon: <span className="extract-icon"><ExtractIcon fontSize="large" /></span>,
      title: 'Extract',
      description: 'Automatically extract relevant content from your documents using AI.'
    },
    {
      icon: <GenerateIcon fontSize="large" />,
      title: 'Generate',
      description: 'Use AI to generate a comprehensive training dataset based on extracted content.'
    },
    {
      icon: <TuneIcon fontSize="large" />,
      title: 'Fine-Tune',
      description: 'Prepare and initiate the fine-tuning process for your custom LLM.'
    },
    {
      icon: <TestIcon fontSize="large" />,
      title: 'Test',
      description: 'Interact with your fine-tuned model to test its performance and capabilities.'
    }
  ];

  return (
    <StyledContainer maxWidth="lg">
      <AnimatedGradientPaper elevation={3} className={classes.root}>
        <Box mb={3}>
          <GradientText variant="h1" fontWeight="600" fontSize={'4rem'} gutterBottom>
            Fine-Tuning Guide
          </GradientText>
          <Typography variant="subtitle1" color="textSecondary">
            Streamline your document processing and fine-tuning workflow with our advanced AI-powered platform
          </Typography>
        </Box>

        <Box className={classes.section}>
          <SubtleGlowPaper elevation={2}>
            <Typography variant="body1" paragraph>
              From document processing to deployment, we guide you through every step of creating your custom language model.
              Follow our streamlined process to transform your documents into a powerful, fine-tuned LLM.
            </Typography>
          </SubtleGlowPaper>
        </Box>

        <Divider className={classes.divider} />

        <Box className={classes.section}>
          <Typography variant="h5" className={classes.sectionTitle}>
            Fine-Tuning Process
          </Typography>

          <GradientBorderPaper elevation={2}>
            <Box className={classes.featureGrid}>
              {steps.map((step, index) => (
                <React.Fragment key={step.title}>
                  <Box className={classes.featureCard}>
                    <Box className={classes.featureIcon}>
                      {step.icon}
                    </Box>
                    <Typography variant="h6" className={classes.featureTitle}>
                      {step.title}
                    </Typography>
                    <Typography variant="body2" className={classes.featureDescription}>
                      {step.description}
                    </Typography>
                  </Box>
                  {index < steps.length - 1 && (
                    <ArrowIcon className={classes.processArrow} fontSize="large" />
                  )}
                </React.Fragment>
              ))}
            </Box>
          </GradientBorderPaper>
        </Box>

        <Divider className={classes.divider} />

        <Box className={classes.section} textAlign="center">
          <Button 
            component={Link} 
            to="/fine-tuning/extract" 
            variant="contained" 
            color="primary" 
            size="large"
            className={classes.actionButton}
          >
            Get Started
          </Button>
        </Box>
      </AnimatedGradientPaper>
    </StyledContainer>
  );
}

export default FineTuneGuide;