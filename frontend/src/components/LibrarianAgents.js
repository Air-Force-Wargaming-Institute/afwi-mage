import React from 'react';
import {
  Container,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme
} from '@material-ui/core';
import PersonIcon from '@material-ui/icons/Person';
import SearchIcon from '@material-ui/icons/Search';
import MenuBookIcon from '@material-ui/icons/MenuBook';
import EmojiObjectsIcon from '@material-ui/icons/EmojiObjects';

// Import styled components
import { 
  AnimatedGradientPaper, 
  GradientText,
  GradientBorderPaper,
  SubtleGlowPaper,
  StyledContainer,
  useContainerStyles
} from '../styles/StyledComponents';

function LibrarianAgents() {
  const theme = useTheme();
  const containerClasses = useContainerStyles();

  return (
    <main>
      <StyledContainer>
        <AnimatedGradientPaper elevation={3} style={{ marginBottom: theme.spacing(4) }}>
          <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
            <GradientText component="h1" style={{ fontSize: '4rem', fontWeight: 700, textAlign: 'center', marginBottom: theme.spacing(2) }}>
              Manage Librarian Agents (Coming Soon)
            </GradientText>
            <Typography variant="h6" color="textSecondary" style={{ textAlign: 'center' , fontSize:'3rem'}}>
              Manage Intelligent AI assistants that can access and navigate your knowledge sources
            </Typography>
          </Box>

          {/* Introduction */}
          <Box mb={4}>
            <Typography variant="body1" paragraph>
              Librarian Agents are specialized AI assistants that help manage and facilitate access to your 
              organization's knowledge base. They act as intelligent intermediaries between users and your 
              document repositories, providing advanced search capabilities and contextual understanding.
            </Typography>
          </Box>

          <Divider style={{ margin: `${theme.spacing(4)}px 0` }} />

          {/* Features Section */}
          <Box mb={4}>
            <Typography variant="h5" style={{ 
              display: 'flex',
              alignItems: 'center',
              marginBottom: theme.spacing(2)
            }}>
              <EmojiObjectsIcon style={{ marginRight: theme.spacing(1), color: theme.palette.primary.main }} /> 
              Key Features
            </Typography>
            
            <GradientBorderPaper className={containerClasses.infoBox}>
              <List>
                <ListItem>
                  <ListItemIcon style={{ color: theme.palette.primary.main }}>
                    <SearchIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={<Typography variant="subtitle1" style={{ fontWeight: 600 }}>Intelligent Search</Typography>}
                    secondary="Advanced query processing for optimal search results"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon style={{ color: theme.palette.primary.main }}>
                    <MenuBookIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={<Typography variant="subtitle1" style={{ fontWeight: 600 }}>Context Management</Typography>}
                    secondary="Maintains conversation context for more relevant information retrieval"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon style={{ color: theme.palette.primary.main }}>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={<Typography variant="subtitle1" style={{ fontWeight: 600 }}>Personalized Assistance</Typography>}
                    secondary="Adapts to user preferences and research patterns"
                  />
                </ListItem>
              </List>
            </GradientBorderPaper>
          </Box>

          <Divider style={{ margin: `${theme.spacing(4)}px 0` }} />

          {/* Coming Soon Section */}
          <Box mb={4}>
            <Typography variant="h5" style={{ marginBottom: theme.spacing(2) }}>
              Coming Soon
            </Typography>
            
            <SubtleGlowPaper elevation={2} style={{ padding: theme.spacing(3) }}>
              <Typography variant="body1" paragraph>
                The Librarian Agents feature is currently under development.
              </Typography>
              <Typography variant="body1">
                Our team is working to ensure that Librarian Agents will seamlessly integrate with 
                existing document repositories and retrieval systems, providing an intuitive and powerful 
                way to access and manage organizational knowledge.
              </Typography>
            </SubtleGlowPaper>
          </Box>
        </AnimatedGradientPaper>
      </StyledContainer>
    </main>
  );
}

export default LibrarianAgents;
