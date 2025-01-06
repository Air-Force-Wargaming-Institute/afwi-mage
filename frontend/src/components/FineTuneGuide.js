import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Container,
  Paper,
  Typography,
  Box,
  Divider,
} from '@material-ui/core';
import { 
  Description as FileIcon,
  Code as GenerateIcon,
  Settings as CogIcon,
  ChevronRight as ArrowIcon,
  PlayCircleFilled as TestIcon,
} from '@material-ui/icons';

function FineTuneGuide() {
  const steps = [
    {
      icon: <FileIcon fontSize="large" />,
      title: 'Extract',
      description: 'Automatically extract relevant content from your documents using AI.'
    },
    {
      icon: <GenerateIcon fontSize="large" />,
      title: 'Generate',
      description: 'Use AI to generate a comprehensive training dataset based on extracted content.'
    },
    {
      icon: <CogIcon fontSize="large" />,
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
    <main>
      <Container>
        <Paper className="main-content">
          <div className="section">
            <Typography variant="h4" className="section-title">
              Fine-Tuning Guide
            </Typography>
            <Typography variant="subtitle1" className="text-secondary">
              Streamline your document processing and fine-tuning workflow with our advanced AI-powered platform
            </Typography>
          </div>

          <Box className="section">
            <Typography variant="body1" paragraph>
              From document processing to deployment, we guide you through every step of creating your custom language model.
              Follow our streamlined process to transform your documents into a powerful, fine-tuned LLM.
            </Typography>
          </Box>

          <Divider className="divider" />

          <Box className="section">
            <Typography variant="h5" className="section-subtitle">
              Fine-Tuning Process
            </Typography>

            <div className="feature-grid">
              {steps.map((step, index) => (
                <React.Fragment key={step.title}>
                  <div className="feature-card">
                    <div className="feature-icon">
                      {step.icon}
                    </div>
                    <Typography variant="h6" className="feature-title">
                      {step.title}
                    </Typography>
                    <Typography variant="body2" className="feature-description">
                      {step.description}
                    </Typography>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowIcon className="process-arrow" fontSize="large" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </Box>

          <Divider className="divider" />

          <Box className="section" style={{ textAlign: 'center' }}>
            <Link to="/fine-tuning/extract" className="app-button">
              Get Started
            </Link>
          </Box>
        </Paper>
      </Container>
    </main>
  );
}

export default FineTuneGuide;