import React, { useState, useEffect } from 'react';
import { useHistory, useLocation, Route, Switch, Redirect } from 'react-router-dom';
import { 
  makeStyles, 
  Paper, 
  Tabs, 
  Tab, 
  Box, 
  Typography,
  Container,
  useTheme,
  useMediaQuery
} from '@material-ui/core';
import BuildIcon from '@material-ui/icons/Build';
import ChatIcon from '@material-ui/icons/Chat';
import MultiAgentBuilder from './MultiAgentBuilder';
import MultiAgentHILChat from './MultiAgentHILChat';
import agentTeamIcon from '../assets/agent-team.png';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 170px)',
    overflow: 'hidden',
    marginTop: '10px',
    width: '100%',
    maxWidth: '100%',
    padding: 0,
  },
  tabsContainer: {
    backgroundColor: theme.palette.background.paper,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '16px',
    borderRadius: '8px 8px 0 0',
    position: 'relative',
    zIndex: 5,
    display: 'inline-flex',
    justifyContent: 'center',
    alignSelf: 'center',
    width: 'auto',
    minWidth: '420px',
    [theme.breakpoints.down('sm')]: {
      minWidth: '100%',
    },
  },
  tabs: {
    minHeight: '48px',
    width: '100%',
    '& .MuiTab-root': {
      minHeight: '48px',
      padding: '6px 22px',
      minWidth: '180px',
      [theme.breakpoints.down('sm')]: {
        minWidth: 'auto',
      },
    },
    '& .Mui-selected': {
      fontWeight: theme.typography.fontWeightBold,
      '& .MuiTab-wrapper': {
        fontWeight: 700,
      },
      '& span': {
        fontWeight: 700,
      }
    },
    '& .MuiTabs-flexContainer': {
      justifyContent: 'center',
    },
    '& .MuiTabs-indicator': {
      maxWidth: '100%',
    }
  },
  tabContent: {
    flexGrow: 1,
    overflow: 'hidden',
    borderRadius: '0 0 8px 8px',
    height: 'calc(100% - 60px)',
    position: 'relative',
    boxShadow: 'none',
    backgroundColor: 'transparent',
    display: 'flex',
  },
  tabLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    fontWeight: theme.typography.fontWeightMedium,
    [theme.breakpoints.down('sm')]: {
      fontSize: '0.8rem',
      flexDirection: 'column',
      gap: '4px',
    }
  },
  selectedTabLabel: {
    fontWeight: theme.typography.fontWeightBold,
  },
  tabIcon: {
    marginRight: theme.spacing(1),
    [theme.breakpoints.down('sm')]: {
      marginRight: 0,
      marginBottom: theme.spacing(0.5),
    }
  },
  tabPanel: {
    height: '100%',
    overflow: 'auto',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    '&.hidden': {
      display: 'none',
    }
  }
}));

// Tab Panel component for content
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  const classes = useStyles();

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`team-chat-tabpanel-${index}`}
      aria-labelledby={`team-chat-tab-${index}`}
      className={`${classes.tabPanel} ${value !== index ? 'hidden' : ''}`}
      {...other}
    >
      {value === index && (
        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function TeamChatContainer() {
  const classes = useStyles();
  const location = useLocation();
  const history = useHistory();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState(0);

  // Set the active tab based on the current URL path
  useEffect(() => {
    if (location.pathname.includes('/team-chat/builder')) {
      setActiveTab(0);
    } else if (location.pathname.includes('/team-chat/chat')) {
      setActiveTab(1);
    }
  }, [location.pathname]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    
    // Navigate to the appropriate URL
    if (newValue === 0) {
      history.push('/multi-agent/team-chat/builder/agent-portfolio');
    } else {
      history.push('/multi-agent/team-chat/chat');
    }
  };

  return (
    <Container className={classes.root} maxWidth={false}>
      <Paper className={classes.tabsContainer} elevation={1}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          indicatorColor="primary"
          textColor="primary"
          variant={isMobile ? "fullWidth" : "standard"}
          centered
          className={classes.tabs}
          aria-label="Team chat tabs"
        >
          <Tab 
            label={
              <span className={`${classes.tabLabel} ${activeTab === 0 ? classes.selectedTabLabel : ''}`}>
                <BuildIcon className={classes.tabIcon} />
                {isMobile ? "Build" : "Build Agents & Teams"}
              </span>
            } 
            id="team-chat-tab-0" 
            aria-controls="team-chat-tabpanel-0" 
          />
          <Tab 
            label={
              <span className={`${classes.tabLabel} ${activeTab === 1 ? classes.selectedTabLabel : ''}`}>
                <img 
                  src={agentTeamIcon} 
                  alt="Team Chat" 
                  style={{ 
                    width: '24px', 
                    height: '24px', 
                    marginRight: theme.spacing(1),
                    verticalAlign: 'middle',
                    [theme.breakpoints.down('sm')]: {
                      marginRight: 0,
                      marginBottom: theme.spacing(0.5),
                    }
                  }} 
                />
                {isMobile ? "Chat" : "Chat with Agent Teams"}
              </span>
            } 
            id="team-chat-tab-1" 
            aria-controls="team-chat-tabpanel-1" 
          />
        </Tabs>
      </Paper>
      
      <Paper className={classes.tabContent} elevation={0}>
        <TabPanel value={activeTab} index={0}>
          <MultiAgentBuilder />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <MultiAgentHILChat />
        </TabPanel>
      </Paper>
      
      {/* Redirect support */}
      <Switch>
        <Route exact path="/multi-agent/team-chat">
          <Redirect to="/multi-agent/team-chat/chat" />
        </Route>
      </Switch>
    </Container>
  );
}

export default TeamChatContainer; 