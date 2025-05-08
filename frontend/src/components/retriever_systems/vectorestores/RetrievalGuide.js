import React from 'react';
import { 
  Typography, 
  Divider,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText 
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import StorageIcon from '@material-ui/icons/Storage';
import SearchIcon from '@material-ui/icons/Search';
import MenuBookIcon from '@material-ui/icons/MenuBook';
import EmojiObjectsIcon from '@material-ui/icons/EmojiObjects';
import SchoolIcon from '@material-ui/icons/School';
import { 
  StyledContainer, 
  GradientBorderPaper, 
  AnimatedGradientPaper,
  SubtleGlowPaper,
  GradientText 
} from '../../../styles/StyledComponents';

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
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(3),
    display: 'flex',
    alignItems: 'center',
    '& .MuiSvgIcon-root': {
      marginRight: theme.spacing(1),
    },
  },
  sectionSubtitle: {
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    '& .MuiSvgIcon-root': {
      marginRight: theme.spacing(1),
      color: theme.palette.primary.main,
    },
  },
  icon: {
    color: theme.palette.primary.main,
    marginRight: theme.spacing(1),
  },
  divider: {
    margin: theme.spacing(4, 0),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoBox: {
    padding: theme.spacing(3),
    backgroundColor: theme.palette.background.lighter,
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(2),
  },
  listItem: {
    padding: theme.spacing(1, 0),
  },
  listItemIcon: {
    minWidth: 40,
    color: theme.palette.primary.main,
  },
  finalText: {
    marginTop: theme.spacing(3),
    fontStyle: 'italic',
  }
}));

function RetrievalGuide() {
  const classes = useStyles();

  return (
    <StyledContainer maxWidth="lg">
      <AnimatedGradientPaper elevation={3} className={classes.root}>
      <Box mb={3}>
          <GradientText variant="h1" fontWeight="600" fontSize={'4rem'} gutterBottom>
            Retrieval Systems Guide
          </GradientText>

          
          {/* Introduction */}
          <SubtleGlowPaper elevation={2}>
            <Typography variant="body1" paragraph>
              Welcome to the Retriever Systems guide. This guide will help you understand how Retrieval Augmented Generation (RAG), 
              Vector Stores, and Librarian Agents work together to enhance your AI system's capabilities with accurate, 
              contextual information retrieval.
            </Typography>
          </SubtleGlowPaper>
        </Box>

        <Divider className={classes.divider} />

        {/* RAG Section */}
        <Box className={classes.section}>
          <Typography variant="h5" className={classes.sectionSubtitle}>
            <EmojiObjectsIcon className={classes.icon} /> Retrieval Augmented Generation (RAG)
          </Typography>
          
          <Typography variant="body1" paragraph>
            RAG is a technique that enhances Large Language Models (LLMs) by combining their generative capabilities 
            with the ability to retrieve and reference specific information from a knowledge base.
          </Typography>

          <GradientBorderPaper elevation={2}>
            <Typography variant="h6" gutterBottom className={classes.sectionTitle}>
              Key Benefits of RAG:
            </Typography>
            <List>
              <ListItem className={classes.listItem}>
                <ListItemIcon className={classes.listItemIcon}>
                  <SchoolIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Enhanced Accuracy" 
                  secondary="Provides factual, up-to-date information from your documents"
                />
              </ListItem>
              <ListItem className={classes.listItem}>
                <ListItemIcon className={classes.listItemIcon}>
                  <SearchIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Contextual Responses" 
                  secondary="Generates answers based on your specific organizational knowledge"
                />
              </ListItem>
              <ListItem className={classes.listItem}>
                <ListItemIcon className={classes.listItemIcon}>
                  <MenuBookIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Reduced Hallucination" 
                  secondary="Minimizes incorrect or made-up information in responses"
                />
              </ListItem>
            </List>
          </GradientBorderPaper>
        </Box>

        <Divider className={classes.divider} />

        {/* Vector Stores Section */}
        <Box className={classes.section}>
          <Typography variant="h5" className={classes.sectionSubtitle}>
            <StorageIcon className={classes.icon} /> Vector Stores
          </Typography>

          <Typography variant="body1" paragraph>
            Vector stores are specialized databases that store and retrieve text as mathematical vectors, 
            enabling semantic search capabilities. They convert text into numerical representations that 
            capture the meaning and context of the content.
          </Typography>

          <SubtleGlowPaper elevation={2}>
            <Typography variant="h6" gutterBottom className={classes.sectionTitle}>
              How Vector Stores Work:
            </Typography>
            <List>
              <ListItem className={classes.listItem}>
                <ListItemText 
                  primary="1. Text Embedding" 
                  secondary="Documents are converted into high-dimensional vectors using embedding models"
                />
              </ListItem>
              <ListItem className={classes.listItem}>
                <ListItemText 
                  primary="2. Similarity Search" 
                  secondary="Queries find the most semantically similar content using vector similarity"
                />
              </ListItem>
              <ListItem className={classes.listItem}>
                <ListItemText 
                  primary="3. Efficient Retrieval" 
                  secondary="Advanced indexing enables fast searching across large document collections"
                />
              </ListItem>
            </List>
          </SubtleGlowPaper>
        </Box>

        <Divider className={classes.divider} />

        {/* Librarian Agents Section */}
        <Box className={classes.section}>
          <Typography variant="h5" className={classes.sectionSubtitle}>
            <MenuBookIcon className={classes.icon} /> Librarian Agents
          </Typography>

          <Typography variant="body1" paragraph>
            Librarian Agents are specialized AI assistants that manage and facilitate access to your organization's 
            knowledge base. They act as intelligent intermediaries between users, other AI agents, and the retriever system.
          </Typography>

          <GradientBorderPaper elevation={2}>
            <Typography variant="h6" gutterBottom className={classes.sectionTitle}>
              Librarian Agent Capabilities:
            </Typography>
            <List>
              <ListItem className={classes.listItem}>
                <ListItemText 
                  primary="Intelligent Query Processing" 
                  secondary="Reformulates user questions to optimize search results"
                />
              </ListItem>
              <ListItem className={classes.listItem}>
                <ListItemText 
                  primary="Context Management" 
                  secondary="Maintains conversation context for more relevant information retrieval"
                />
              </ListItem>
              <ListItem className={classes.listItem}>
                <ListItemText 
                  primary="Source Citation" 
                  secondary="Provides references to source documents for verification"
                />
              </ListItem>
              <ListItem className={classes.listItem}>
                <ListItemText 
                  primary="Multi-Step Research" 
                  secondary="Conducts thorough research across multiple documents and topics"
                />
              </ListItem>
            </List>
          </GradientBorderPaper>

          <Typography variant="body1" className={classes.finalText}>
            Our Librarian Agents work seamlessly with the retriever system to provide accurate, contextual 
            information while maintaining transparency about information sources. They can assist both 
            users and other AI agents in accessing and utilizing your organization's knowledge base effectively.
          </Typography>
        </Box>
      </AnimatedGradientPaper>
    </StyledContainer>
  );
}

export default RetrievalGuide;
