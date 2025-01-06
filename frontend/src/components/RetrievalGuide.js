import React from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Divider,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText 
} from '@material-ui/core';
import StorageIcon from '@material-ui/icons/Storage';
import SearchIcon from '@material-ui/icons/Search';
import MenuBookIcon from '@material-ui/icons/MenuBook';
import EmojiObjectsIcon from '@material-ui/icons/EmojiObjects';
import SchoolIcon from '@material-ui/icons/School';

function RetrievalGuide() {
  return (
    <main>
      <Container>
        <Paper className="main-content">
          <Typography variant="h4" className="section-title">
            Retriever Systems Guide
          </Typography>
          
          {/* Introduction */}
          <Box className="section">
            <Typography variant="body1" paragraph>
              Welcome to the Retriever Systems guide. This guide will help you understand how Retrieval Augmented Generation (RAG), 
              Vector Stores, and Librarian Agents work together to enhance your AI system's capabilities with accurate, 
              contextual information retrieval.
            </Typography>
          </Box>

          <Divider className="divider" />

          {/* RAG Section */}
          <Box className="section">
            <Typography variant="h5" className="section-subtitle">
              <EmojiObjectsIcon className="icon" /> Retrieval Augmented Generation (RAG)
            </Typography>
            
            <Typography variant="body1" paragraph>
              RAG is a technique that enhances Large Language Models (LLMs) by combining their generative capabilities 
              with the ability to retrieve and reference specific information from a knowledge base.
            </Typography>

            <Box className="info-box">
              <Typography variant="h6" gutterBottom className="section-title">
                Key Benefits of RAG:
              </Typography>
              <List>
                <ListItem className="list-item">
                  <ListItemIcon>
                    <SchoolIcon className="icon" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Enhanced Accuracy" 
                    secondary="Provides factual, up-to-date information from your documents"
                  />
                </ListItem>
                <ListItem className="list-item">
                  <ListItemIcon>
                    <SearchIcon className="icon" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Contextual Responses" 
                    secondary="Generates answers based on your specific organizational knowledge"
                  />
                </ListItem>
                <ListItem className="list-item">
                  <ListItemIcon>
                    <MenuBookIcon className="icon" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Reduced Hallucination" 
                    secondary="Minimizes incorrect or made-up information in responses"
                  />
                </ListItem>
              </List>
            </Box>
          </Box>

          <Divider className="divider" />

          {/* Vector Stores Section */}
          <Box className="section">
            <Typography variant="h5" className="section-subtitle">
              <StorageIcon className="icon" /> Vector Stores
            </Typography>

            <Typography variant="body1" paragraph>
              Vector stores are specialized databases that store and retrieve text as mathematical vectors, 
              enabling semantic search capabilities. They convert text into numerical representations that 
              capture the meaning and context of the content.
            </Typography>

            <Box className="info-box">
              <Typography variant="h6" gutterBottom className="section-title">
                How Vector Stores Work:
              </Typography>
              <List>
                <ListItem className="list-item">
                  <ListItemText 
                    primary="1. Text Embedding" 
                    secondary="Documents are converted into high-dimensional vectors using embedding models"
                  />
                </ListItem>
                <ListItem className="list-item">
                  <ListItemText 
                    primary="2. Similarity Search" 
                    secondary="Queries find the most semantically similar content using vector similarity"
                  />
                </ListItem>
                <ListItem className="list-item">
                  <ListItemText 
                    primary="3. Efficient Retrieval" 
                    secondary="Advanced indexing enables fast searching across large document collections"
                  />
                </ListItem>
              </List>
            </Box>
          </Box>

          <Divider className="divider" />

          {/* Librarian Agents Section */}
          <Box className="section">
            <Typography variant="h5" className="section-subtitle">
              <MenuBookIcon className="icon" /> Librarian Agents
            </Typography>

            <Typography variant="body1" paragraph>
              Librarian Agents are specialized AI assistants that manage and facilitate access to your organization's 
              knowledge base. They act as intelligent intermediaries between users, other AI agents, and the retriever system.
            </Typography>

            <Box className="info-box">
              <Typography variant="h6" gutterBottom className="section-title">
                Librarian Agent Capabilities:
              </Typography>
              <List>
                <ListItem className="list-item">
                  <ListItemText 
                    primary="Intelligent Query Processing" 
                    secondary="Reformulates user questions to optimize search results"
                  />
                </ListItem>
                <ListItem className="list-item">
                  <ListItemText 
                    primary="Context Management" 
                    secondary="Maintains conversation context for more relevant information retrieval"
                  />
                </ListItem>
                <ListItem className="list-item">
                  <ListItemText 
                    primary="Source Citation" 
                    secondary="Provides references to source documents for verification"
                  />
                </ListItem>
                <ListItem className="list-item">
                  <ListItemText 
                    primary="Multi-Step Research" 
                    secondary="Conducts thorough research across multiple documents and topics"
                  />
                </ListItem>
              </List>
            </Box>

            <Typography variant="body1" className="final-text">
              Our Librarian Agents work seamlessly with the retriever system to provide accurate, contextual 
              information while maintaining transparency about information sources. They can assist both 
              users and other AI agents in accessing and utilizing your organization's knowledge base effectively.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </main>
  );
}

export default RetrievalGuide;
