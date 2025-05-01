import React, { useState } from 'react';
import { useHistory, useLocation, Route, Switch, Redirect } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  makeStyles
} from '@material-ui/core';
import StorageIcon from '@material-ui/icons/Storage';
import robotIcon from '../assets/robot-icon.png';
import agentTeamIcon from '../assets/agent-team.png';
import { Link } from 'react-router-dom';
import LLMLibrary from './builder/LLMLibrary';
import AgentPortfolio from './builder/AgentPortfolio';
import AgentTeams from './builder/AgentTeams';
import SystemPrompts from './builder/SystemPrompts';
import TextFieldsIcon from '@material-ui/icons/TextFields';
import AccountTreeIcon from '@material-ui/icons/AccountTree';
import ConversationTree from './builder/ConversationTree';
import PublicIcon from '@material-ui/icons/Public';
import WargamesListPage from './builder/wargames/WargamesListPage';

const useStyles = makeStyles((theme) => ({
  navHeader: {
    padding: theme.spacing(1, 0, 1, 3),
    marginTop: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontWeight: theme.typography.fontWeightMedium,
    fontSize: '0.85rem',
    textTransform: 'uppercase',
  },
}));

function MultiAgentBuilder() {
  const location = useLocation();
  const history = useHistory();
  const classes = useStyles();

  const navigationItems = [
    {
      type: 'item',
      id: 'llm-library',
      label: 'LLM Library',
      path: '/multi-agent/team-chat/builder/llm-library',
      icon: <StorageIcon />,
      component: LLMLibrary
    },
    {
      type: 'item',
      id: 'agent-portfolio',
      label: 'Agent Portfolio',
      path: '/multi-agent/team-chat/builder/agent-portfolio',
      icon: <img 
        src={robotIcon} 
        alt="Robot Icon" 
        style={{ 
          width: '20px', 
          height: '26px',
          filter: location.pathname === '/multi-agent/team-chat/builder/agent-portfolio' ? 'none' : 'invert(32%) sepia(69%) saturate(2411%) hue-rotate(182deg) brightness(94%) contrast(101%)'
        }} 
      />,
      component: AgentPortfolio
    },
    {
      type: 'item',
      id: 'agent-teams',
      label: 'Agent Teams',
      path: '/multi-agent/team-chat/builder/agent-teams',
      icon: <img 
        src={agentTeamIcon} 
        alt="Agent Team Icon" 
        style={{ 
          width: '24px', 
          height: '24px',
          filter: location.pathname === '/multi-agent/team-chat/builder/agent-teams' ? 'invert(1)' : 'invert(32%) sepia(69%) saturate(2411%) hue-rotate(182deg) brightness(94%) contrast(101%)'
        }} 
      />,
      component: AgentTeams
    },
    {
      type: 'divider',
      id: 'dev-divider'
    },
    {
      type: 'divider',
      id: 'dev-divider'
    },
    {
      type: 'divider',
      id: 'dev-divider'
    },
    {
      type: 'header',
      id: 'dev-header',
      label: 'Developer Tools'
    },
    {
      type: 'item',
      id: 'system-prompts',
      label: 'System Prompts',
      path: '/multi-agent/team-chat/builder/system-prompts',
      icon: <TextFieldsIcon />,
      component: SystemPrompts
    },
    {
      type: 'item',
      id: 'conversation-tree',
      label: 'Conversation Tree',
      path: '/multi-agent/team-chat/builder/conversation-tree',
      icon: <AccountTreeIcon />,
      component: ConversationTree
    }
  ];

  return (
    <div className="root-container">
      {/* Navigation Menu */}
      <Paper className="side-nav">
        <Typography variant="h6" className="section-title">
          Builder Resources
        </Typography>
        <Divider className="divider" />
        <List>
          {navigationItems.map((item) => {
            if (item.type === 'divider') {
              return <Divider key={item.id} className="divider" style={{ margin: '8px 0' }} />;
            }
            if (item.type === 'header') {
              return (
                <Typography
                  key={item.id}
                  variant="caption"
                  className={classes.navHeader}
                >
                  {item.label}
                </Typography>
              );
            }
            return (
              <ListItem
                button
                key={item.id}
                component={Link}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <ListItemIcon className="nav-icon">
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  className="nav-text"
                />
              </ListItem>
            );
          })}
        </List>
      </Paper>

      {/* Main Content */}
      <Paper className="main-content">
        <Switch>
          <Route exact path="/multi-agent/team-chat/builder/llm-library" component={LLMLibrary} />
          <Route exact path="/multi-agent/team-chat/builder/agent-portfolio" component={AgentPortfolio} />
          <Route exact path="/multi-agent/team-chat/builder/agent-teams" component={AgentTeams} />
          <Route exact path="/multi-agent/team-chat/builder/system-prompts" component={SystemPrompts} />
          <Route exact path="/multi-agent/team-chat/builder/conversation-tree" component={ConversationTree} />
          <Route exact path="/multi-agent/team-chat/builder/wargames" component={WargamesListPage} />
          <Route path="/multi-agent/team-chat/builder">
            <Redirect to="/multi-agent/team-chat/builder/agent-portfolio" />
          </Route>
        </Switch>
      </Paper>
    </div>
  );
}

export default MultiAgentBuilder;