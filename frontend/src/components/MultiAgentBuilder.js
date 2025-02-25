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

function MultiAgentBuilder() {
  const location = useLocation();
  const history = useHistory();

  const navigationItems = [
    {
      id: 'llm-library',
      label: 'LLM Library',
      path: '/multi-agent/builder/llm-library',
      icon: <StorageIcon />,
      component: LLMLibrary
    },
    {
      id: 'agent-portfolio',
      label: 'Agent Portfolio',
      path: '/multi-agent/builder/agent-portfolio',
      icon: <img 
        src={robotIcon} 
        alt="Robot Icon" 
        style={{ 
          width: '20px', 
          height: '26px',
          filter: location.pathname === '/multi-agent/builder/agent-portfolio' ? 'none' : 'invert(1)'
        }} 
      />,
      component: AgentPortfolio
    },
    {
      id: 'agent-teams',
      label: 'Agent Teams',
      path: '/multi-agent/builder/agent-teams',
      icon: <img 
        src={agentTeamIcon} 
        alt="Agent Team Icon" 
        style={{ 
          width: '24px', 
          height: '24px',
          filter: location.pathname === '/multi-agent/builder/agent-teams' ? 'invert(1)' : 'none'
        }} 
      />,
      component: AgentTeams
    },
    {
      id: 'system-prompts',
      label: 'System Prompts',
      path: '/multi-agent/builder/system-prompts',
      icon: <TextFieldsIcon />,
      component: SystemPrompts
    },
    {
      id: 'conversation-tree',
      label: 'Conversation Tree',
      path: '/multi-agent/builder/conversation-tree',
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
          {navigationItems.map((item) => (
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
          ))}
        </List>
      </Paper>

      {/* Main Content */}
      <Paper className="main-content">
        <Switch>
          <Route exact path="/multi-agent/builder/llm-library" component={LLMLibrary} />
          <Route exact path="/multi-agent/builder/agent-portfolio" component={AgentPortfolio} />
          <Route exact path="/multi-agent/builder/agent-teams" component={AgentTeams} />
          <Route exact path="/multi-agent/builder/system-prompts" component={SystemPrompts} />
          <Route exact path="/multi-agent/builder/conversation-tree" component={ConversationTree} />
          <Route path="/multi-agent/builder">
            <Redirect to="/multi-agent/builder/llm-library" />
          </Route>
        </Switch>
      </Paper>
    </div>
  );
}

export default MultiAgentBuilder;