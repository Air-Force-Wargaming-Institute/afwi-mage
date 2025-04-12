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
import { styled } from '@mui/material/styles';
import TableChartIcon from '@mui/icons-material/TableChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import TransformIcon from '@mui/icons-material/Transform';
import { WorkbenchContext } from '../../contexts/WorkbenchContext';
import { GradientText } from '../../styles/StyledComponents';
import '../../App.css'; // Import App.css for styling

// Create styled component for the animated sidebar
const AnimatedSidebar = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(2),
  height: 'fit-content',
  width: '250px',
  marginRight: '16px',
  backgroundColor: 'transparent',
  color: theme.palette.text.primary,
  border: `${theme.custom?.borderWidth?.regular || 2}px solid transparent`,
  borderRadius: theme.shape.borderRadius,
  boxSizing: 'border-box',
  overflow: 'hidden',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  background: 'transparent',
  alignSelf: 'flex-start',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    background: theme.custom?.gradients?.horizontal || 'linear-gradient(to right, #4285f4, #5794ff, #2c5cc5)',
    animation: '$borderGlow 8s infinite alternate',
    borderRadius: theme.shape.borderRadius,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: theme.custom?.borderWidth?.regular || 2,
    left: theme.custom?.borderWidth?.regular || 2,
    right: theme.custom?.borderWidth?.regular || 2,
    bottom: theme.custom?.borderWidth?.regular || 2,
    borderRadius: theme.shape.borderRadius - (theme.custom?.borderWidth?.regular || 2)/2,
    background: 'rgba(30, 30, 30, 0.9)',
    zIndex: -1,
  },
  '& > *': {
    position: 'relative',
    zIndex: 1
  },
  '@keyframes borderGlow': {
    '0%': {
      opacity: 1,
      background: 'linear-gradient(to right, #4285f4, #5794ff, #2c5cc5)',
      backgroundSize: '200% 200%',
      backgroundPosition: '0% 0%',
      filter: 'brightness(1.1) contrast(1.1)',
    },
    '50%': {
      opacity: 1,
      background: 'linear-gradient(to right, #2c5cc5, #4285f4, #5794ff)',
      backgroundSize: '200% 200%',
      backgroundPosition: '100% 50%',
      filter: 'brightness(1.2) contrast(1.2)',
    },
    '100%': {
      opacity: 1,
      background: 'linear-gradient(to right, #5794ff, #2c5cc5, #4285f4)',
      backgroundSize: '200% 200%',
      backgroundPosition: '0% 100%',
      filter: 'brightness(1.1) contrast(1.1)',
    },
  },
}));

// Create styled component for nav items with improved hover effects
const NavItem = styled(ListItem)(({ theme, active }) => ({
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(1),
  transition: theme.custom?.transition || 'all 0.3s ease',
  padding: theme.spacing(1.5, 1.5),
  cursor: 'pointer',
  backgroundColor: active ? theme.palette.primary.main : 'transparent',
  '&:hover': {
    backgroundColor: active ? theme.palette.primary.dark : 'rgba(66, 133, 244, 0.39)',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
  },
  '&.active': {
    backgroundColor: theme.palette.primary.main,
  },
  '& .MuiListItemIcon-root': {
    color: active ? 'white' : theme.palette.primary.main,
    minWidth: 40,
  },
  '& .MuiListItemText-primary': {
    fontWeight: active ? 600 : 400,
    fontSize: '0.95rem',
    color: active ? 'white' : '#ffffff',
  },
  '& .MuiListItemText-secondary': {
    color: active ? 'rgba(255, 255, 255, 0.7)' : '#bbbbbb',
    fontSize: '0.75rem',
  },
}));

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
    <AnimatedSidebar elevation={3}>
      <Box sx={{ mb: 0, textAlign: 'center' }}>
        <GradientText variant="h6" component="h2" fontWeight="600" className="section-title">
          Analysis Tools
        </GradientText>
      </Box>
      
      <Divider sx={{ mt: 0.5, mb: 0, opacity: 0.6 }} />
      
      <List sx={{ px: 0.5 }}>
        {tools.map((tool) => (
          <NavItem 
            key={tool.id}
            active={selectedTool === tool.id ? 1 : 0}
            onClick={() => handleToolSelect(tool.id)}
            className={selectedTool === tool.id ? 'active' : ''}
          >
            <ListItemIcon>
              {tool.icon}
            </ListItemIcon>
            <ListItemText 
              primary={tool.name}
              secondary={tool.description}
            />
          </NavItem>
        ))}
      </List>
    </AnimatedSidebar>
  );
};

export default Sidebar; 