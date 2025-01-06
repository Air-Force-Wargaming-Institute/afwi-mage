import React, { useState } from 'react';
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
import BuildIcon from '@material-ui/icons/Build';
import CreateVectorStore from './vectorstore/CreateVectorStore';
import ManageVectorStores from './vectorstore/ManageVectorStores';

function BuildRetrievalDatabases() {
  const [selectedPage, setSelectedPage] = useState('build');

  const navigationItems = [
    {
      id: 'build',
      label: 'Build Retrieval Database',
      icon: <BuildIcon />,
    },
    {
      id: 'manage',
      label: 'Manage Databases',
      icon: <StorageIcon />,
    },
  ];

  const renderContent = () => {
    switch (selectedPage) {
      case 'build':
        return <CreateVectorStore />;
      case 'manage':
        return <ManageVectorStores />;
      default:
        return null;
    }
  };

  return (
    <div className="root-container">
      {/* Navigation Menu */}
      <Paper className="side-nav">
        <Typography variant="h6" className="section-title">
          Retriever Systems
        </Typography>
        <Divider className="divider" />
        <List>
          {navigationItems.map((item) => (
            <ListItem
              button
              key={item.id}
              className={`nav-item ${selectedPage === item.id ? 'active' : ''}`}
              onClick={() => setSelectedPage(item.id)}
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
        {renderContent()}
      </Paper>
    </div>
  );
}

export default BuildRetrievalDatabases;
