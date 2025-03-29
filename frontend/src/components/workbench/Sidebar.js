import React, { useContext } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  Typography,
  Paper
} from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import TransformIcon from '@mui/icons-material/Transform';
import { WorkbenchContext } from '../../contexts/WorkbenchContext';
import '../../App.css'; // Import App.css for styling

const Sidebar = () => {
  const { selectedTool, setSelectedTool } = useContext(WorkbenchContext);

  const tools = [
    { 
      id: 'spreadsheet', 
      name: 'Upload/Manage Spreadsheets', 
      icon: <TableChartIcon />, 
      description: 'Upload and manage spreadsheet files' 
    },
    { 
      id: 'column-transform', 
      name: 'Column Transformation', 
      icon: <TransformIcon />, 
      description: 'Transform data columns with AI-powered instructions' 
    },
    { 
      id: 'visualization', 
      name: 'Data Visualization', 
      icon: <BarChartIcon />, 
      description: 'Create charts and graphs from your data' 
    }
  ];

  const handleToolSelect = (toolId) => {
    setSelectedTool(toolId);
  };

  return (
    <Paper 
      elevation={3}
      className="side-nav"
      style={{ marginRight: '16px' }}
    >
      <Typography variant="h6" className="section-title" style={{ backgroundColor: 'white', color: 'var(--text-color-dark)' }}>
        Analysis Tools
      </Typography>
      
      <Divider className="divider" />
      
      <List>
        {tools.map((tool) => (
          <ListItem 
            button 
            key={tool.id}
            onClick={() => handleToolSelect(tool.id)}
            className={`nav-item ${selectedTool === tool.id ? 'active' : ''}`}
          >
            <ListItemIcon className="nav-icon">
              {tool.icon}
            </ListItemIcon>
            <ListItemText 
              primary={tool.name}
              secondary={tool.description}
              className="nav-text"
              primaryTypographyProps={{
                fontWeight: selectedTool === tool.id ? 'bold' : 'normal',
                color: selectedTool === tool.id ? 'white' : 'inherit',
              }}
              secondaryTypographyProps={{
                color: selectedTool === tool.id ? 'rgba(255, 255, 255, 0.7)' : 'inherit',
              }}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default Sidebar; 