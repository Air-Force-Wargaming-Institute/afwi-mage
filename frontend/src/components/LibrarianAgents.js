import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@material-ui/core';
import PersonIcon from '@material-ui/icons/Person';
import SearchIcon from '@material-ui/icons/Search';
import MenuBookIcon from '@material-ui/icons/MenuBook';
import EmojiObjectsIcon from '@material-ui/icons/EmojiObjects';

function LibrarianAgents() {
  return (
    <main>
      <Container>
        <Paper className="main-content">
          <div className="section">
            <Typography variant="h4" className="section-title">
              Librarian Agents
            </Typography>
            <Typography variant="subtitle1" className="text-secondary">
              Intelligent AI assistants for managing and accessing your knowledge base
            </Typography>
          </div>

          {/* Introduction */}
          <Box className="section">
            <Typography variant="body1" paragraph>
              Librarian Agents are specialized AI assistants that help manage and facilitate access to your 
              organization's knowledge base. They act as intelligent intermediaries between users and your 
              document repositories, providing advanced search capabilities and contextual understanding.
            </Typography>
          </Box>

          <Divider className="divider" />

          {/* Features Section */}
          <Box className="section">
            <Typography variant="h5" className="section-subtitle">
              <EmojiObjectsIcon className="icon" /> Key Features
            </Typography>
            
            <Box className="info-box">
              <List>
                <ListItem className="list-item">
                  <ListItemIcon className="list-item-icon">
                    <SearchIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={<span className="list-item-text">Intelligent Search</span>}
                    secondary="Advanced query processing for optimal search results"
                  />
                </ListItem>
                <ListItem className="list-item">
                  <ListItemIcon className="list-item-icon">
                    <MenuBookIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={<span className="list-item-text">Context Management</span>}
                    secondary="Maintains conversation context for more relevant information retrieval"
                  />
                </ListItem>
                <ListItem className="list-item">
                  <ListItemIcon className="list-item-icon">
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={<span className="list-item-text">Personalized Assistance</span>}
                    secondary="Adapts to user preferences and research patterns"
                  />
                </ListItem>
              </List>
            </Box>
          </Box>

          <Divider className="divider" />

          {/* Coming Soon Section */}
          <Box className="section">
            <Typography variant="h5" className="section-subtitle">
              Coming Soon
            </Typography>
            <Typography variant="body1" className="text-secondary">
              The Librarian Agents feature is currently under development. Stay tuned for updates as we 
              work to bring you intelligent document management and information retrieval capabilities.
            </Typography>
            <Typography variant="body1" className="final-text">
              Our team is working to ensure that Librarian Agents will seamlessly integrate with your 
              existing document repositories and retrieval systems, providing an intuitive and powerful 
              way to access and manage your organization's knowledge.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </main>
  );
}

export default LibrarianAgents;
