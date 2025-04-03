import React, { useState, useContext, useEffect } from 'react';
import { Link, useLocation, useHistory } from 'react-router-dom';
import { 
  IconButton, 
  Avatar, 
  Box, 
  Typography, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  useTheme,
  alpha
} from '@material-ui/core';
import { makeStyles, styled } from '@material-ui/core/styles';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import SettingsIcon from '@material-ui/icons/Settings';
import HelpIcon from '@material-ui/icons/Help';
import SupervisorAccountIcon from '@material-ui/icons/SupervisorAccount';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import logo from '../assets/afwi_logo.png';
import HomeIcon from '@material-ui/icons/Home';
import CallSplitIcon from '@material-ui/icons/CallSplit';
import TuneIcon from '@material-ui/icons/Tune';
import PlayCircleFilledIcon from '@material-ui/icons/PlayCircleFilled';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import GroupWorkIcon from '@material-ui/icons/GroupWork';
import BuildIcon from '@material-ui/icons/Build';
import ChatIcon from '@material-ui/icons/Chat';
import LibraryBooksIcon from '@material-ui/icons/LibraryBooks';
import FolderIcon from '@material-ui/icons/Folder';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import StorageIcon from '@material-ui/icons/Storage';
import robotIcon from '../assets/robot-icon.png';
import { AuthContext } from '../contexts/AuthContext';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import agentTeamIcon from '../assets/agent-team.png';
import BarChartIcon from '@material-ui/icons/BarChart';
import PaletteIcon from '@material-ui/icons/Palette';

// Styled components using Material-UI's styled API
const HeaderRoot = styled('header')(({ theme }) => ({
  position: 'relative',
  top: 0,
  zIndex: 1000,
  minHeight: 80,
  backgroundColor: theme.palette.background.header,
  boxShadow: theme.custom.boxShadow,
  padding: '10px 20px',
}));

const HeaderContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
}));

const HeaderLeftContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
}));

const LogoTitleContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
}));

const Logo = styled('img')(({ theme }) => ({
  height: 40,
  width: 'auto',
  marginRight: 15,
}));

const TitleContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
}));

// Create component-specific styles using makeStyles for complex selectors
const useStyles = makeStyles((theme) => ({
  mainNav: {
    display: 'flex',
    alignItems: 'center',
    '& ul': {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      display: 'flex',
      alignItems: 'center',
    },
    '& li': {
      fontSize: 20,
      margin: '0 8px',
      display: 'flex',
      alignItems: 'center',
    }
  },
  navLink: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textDecoration: 'none',
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    position: 'relative',
    transition: theme.custom.transition,
    borderRadius: theme.shape.borderRadius,
    '&:hover': {
      color: 'white',
      backgroundColor: theme.palette.primary.main,
    },
    '&.active': {
      color: 'white',
      backgroundColor: theme.palette.primary.main,
      position: 'relative',
      '&::after': {
        content: '""',
        position: 'absolute',
        bottom: -16,
        left: 0,
        width: '100%',
        height: 25,
        background: `linear-gradient(to bottom, ${theme.palette.primary.main} 0%, transparent 100%)`,
        borderRadius: '0px 0px 4px 4px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
      }
    },
    '& svg': {
      fontSize: 24,
      marginRight: 5,
      position: 'relative',
      top: -1,
    }
  },
  workflowNav: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    marginTop: 10,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    paddingTop: 10,
    '& ul': {
      listStyleType: 'none',
      padding: 0,
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    '& li': {
      margin: '0 10px',
      display: 'flex',
      alignItems: 'center',
    }
  },
  workflowLink: {
    color: theme.palette.text.primary,
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    padding: '5px 10px',
    fontSize: 14,
    position: 'relative',
    transition: theme.custom.transition,
    borderRadius: theme.shape.borderRadius,
    '&:hover': {
      color: 'white',
      backgroundColor: theme.palette.primary.main,
    },
    '&.active': {
      color: 'white',
      backgroundColor: theme.palette.primary.main,
      '&::after': {
        content: '""',
        position: 'absolute',
        bottom: -12,
        left: 0,
        width: '100%',
        height: 18,
        background: `linear-gradient(to bottom, ${theme.palette.primary.main} 0%, transparent 100%)`,
        borderRadius: '0px 0px 4px 4px',
      }
    }
  },
  userAccount: {
    position: 'fixed',
    right: 20,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    [theme.breakpoints.down('lg')]: {
      display: 'none',
    }
  },
  avatar: {
    background: `linear-gradient(135deg, #00008B, #800080, #8B0000)`,
    border: '2px solid white',
    '& .MuiSvgIcon-root': {
      fontSize: '1.5rem',
      margin: 0,
    }
  },
  workflowStep: {
    display: 'flex',
    alignItems: 'center',
  },
  arrow: {
    color: 'white',
    marginLeft: 5,
    fontSize: 14,
    opacity: 0.8,
  },
  extractIcon: {
    transform: 'rotate(180deg)',
    display: 'inline-block',
  },
  gradientText: {
    background: theme.custom.gradients.horizontal,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    color: 'transparent'
  },
  menuItem: {
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.1),
    }
  }
}));

function HeaderStyled() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const auth = useContext(AuthContext) || { logout: () => {}, user: null };
  const { logout, user } = auth;
  const history = useHistory();
  const classes = useStyles();
  const theme = useTheme();

  useEffect(() => {
    if (location.pathname === '/home') {
      setActiveTab('home');
    } else if (location.pathname.startsWith('/multi-agent')) {
      setActiveTab('multi-agent');
    } else if (location.pathname.startsWith('/fine-tuning')) {
      setActiveTab('fine-tuning');
    } else if (location.pathname.startsWith('/retrieval')) {
      setActiveTab('retrieval');
    } else if (location.pathname.startsWith('/document-library')) {
      setActiveTab('document-library');
    }
  }, [location.pathname]);

  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    history.push('/login');
  };

  const handleAdminClick = () => {
    history.push('/admin');
    handleMenuClose();
  };

  const handleStyleTestClick = () => {
    history.push('/style-test');
    handleMenuClose();
  };

  const isActive = (path) => {
    if (path === '/fine-tuning' || path === '/retrieval' || path === '/multi-agent') {
      return location.pathname === path ? 'active' : '';
    }
    
    if (path === '/multi-agent/builder') {
      return location.pathname.startsWith(path) ? 'active' : '';
    }
    
    return location.pathname === path ? 'active' : '';
  };

  return (
    <HeaderRoot>
      <HeaderContent>
        <HeaderLeftContent>
          <LogoTitleContainer>
            <Logo src={logo} alt="AFWI Logo" />
            <TitleContainer>
              <Typography variant="h6" style={{margin: 0, lineHeight: 1.2, fontSize: 14, fontWeight: 'normal'}}>
                Air Force Wargaming Institute
              </Typography>
              <Typography variant="h5" style={{margin: 0, lineHeight: 1.2, fontSize: 20}}>
                Multi-Agent Generative Engine
              </Typography>
            </TitleContainer>
          </LogoTitleContainer>
          
          <Box className={classes.mainNav}>
            <ul>
              <li>
                <Link 
                  to="/home" 
                  className={`${classes.navLink} ${activeTab === 'home' ? 'active' : ''}`}
                  onClick={() => setActiveTab('home')}
                >
                  <HomeIcon /> Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/multi-agent" 
                  className={`${classes.navLink} ${activeTab === 'multi-agent' ? 'active' : ''}`}
                  onClick={() => setActiveTab('multi-agent')}
                >
                  <Box component="img"
                    src={robotIcon} 
                    alt="Agent Portal" 
                    style={{ 
                      width: '20px', 
                      height: '24px', 
                      marginRight: '5px',
                      verticalAlign: 'middle'
                    }} 
                  /> 
                  Agent Portal
                </Link>
              </li>
              <li>
                <Link 
                  to="/fine-tuning" 
                  className={`${classes.navLink} ${activeTab === 'fine-tuning' ? 'active' : ''}`}
                  onClick={() => setActiveTab('fine-tuning')}
                >
                  <TuneIcon /> Fine-Tuning
                </Link>
              </li>
              <li>
                <Link 
                  to="/retrieval" 
                  className={`${classes.navLink} ${activeTab === 'retrieval' ? 'active' : ''}`}
                  onClick={() => setActiveTab('retrieval')}
                >
                  <LibraryBooksIcon /> Retriever Systems
                </Link>
              </li>
              <li>
                <Link 
                  to="/document-library" 
                  className={`${classes.navLink} ${activeTab === 'document-library' ? 'active' : ''}`}
                  onClick={() => setActiveTab('document-library')}
                >
                  <FolderIcon /> Document Library
                </Link>
              </li>
            </ul>
          </Box>

          <Box className={classes.userAccount}>
            <Box display="flex" flexDirection="column" alignItems="flex-end">
              <Typography variant="caption" color="textSecondary">
                Logged in as
              </Typography>
              <Typography variant="body2" color="textPrimary">
                {user?.username}
              </Typography>
            </Box>
            <IconButton onClick={handleMenuOpen} size="small">
              <Avatar className={classes.avatar}>
                <AccountCircleIcon />
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={handleMenuClose}
              getContentAnchorEl={null}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              {user?.permission === 'admin' && (
                <MenuItem onClick={handleAdminClick} className={classes.menuItem}>
                  <ListItemIcon>
                    <SupervisorAccountIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Admin Dashboard" />
                </MenuItem>
              )}
              <MenuItem onClick={handleStyleTestClick} className={classes.menuItem}>
                <ListItemIcon>
                  <PaletteIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText primary="Style Test" /> 
              </MenuItem>
              <MenuItem onClick={handleLogout} className={classes.menuItem}>
                <ListItemIcon>
                  <ExitToAppIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </MenuItem>
              <MenuItem className={classes.menuItem}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText primary="Settings" />
              </MenuItem>
              <MenuItem className={classes.menuItem}>
                <ListItemIcon>
                  <HelpIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText primary="Help/Support" />
              </MenuItem>
            </Menu>
          </Box>
        </HeaderLeftContent>
      </HeaderContent>

      {activeTab === 'multi-agent' && (
        <Box className={classes.workflowNav}>
          <ul>
            <li>
              <Link 
                to="/multi-agent/guide" 
                className={`${classes.workflowLink} ${location.pathname === '/multi-agent/guide' ? 'active' : ''}`}
              >
                <HelpOutlineIcon style={{marginRight: 5}} /> Guide
              </Link>
            </li>
            <li>
              <Link 
                to="/multi-agent/team-chat" 
                className={`${classes.workflowLink} ${location.pathname.includes('/multi-agent/team-chat') ? 'active' : ''}`}
              >
                <Box 
                  component="img"
                  src={agentTeamIcon} 
                  alt="Team Chat" 
                  sx={{ 
                    width: 24, 
                    height: 24, 
                    filter: 'invert(1)',
                    marginRight: 1,
                    verticalAlign: 'middle'
                  }}
                /> 
                Multi-Agent Chat
              </Link>
            </li>
            <li>
              <Link 
                to="/multi-agent/direct-chat" 
                className={`${classes.workflowLink} ${isActive('/multi-agent/direct-chat')}`}
              >
                <ChatIcon style={{marginRight: 5}} /> Direct Chat
              </Link>
            </li>
            <li>
              <Link 
                to="/multi-agent/workbench" 
                className={`${classes.workflowLink} ${isActive('/multi-agent/workbench')}`}
              >
                <BarChartIcon style={{marginRight: 5}} /> Analysis Workbench
              </Link>
            </li>
          </ul>
        </Box>
      )}

      {activeTab === 'fine-tuning' && (
        <Box className={classes.workflowNav}>
          <ul>
            <li>
              <Link 
                to="/fine-tuning" 
                className={`${classes.workflowLink} ${location.pathname === '/fine-tuning' ? 'active' : ''}`}
              >
                <HelpOutlineIcon style={{marginRight: 5}} /> Guide
              </Link>
            </li>
            <li className={classes.workflowStep}>
              <Link to="/fine-tuning/extract" className={`${classes.workflowLink} ${isActive('/fine-tuning/extract')}`}>
                <span className={classes.extractIcon}><CallSplitIcon style={{marginRight: 5}} /></span> Extract
              </Link>
              <ArrowForwardIcon className={classes.arrow} />
            </li>
            <li className={classes.workflowStep}>
              <Link to="/fine-tuning/generate" className={`${classes.workflowLink} ${isActive('/fine-tuning/generate')}`}>
                <SettingsIcon style={{marginRight: 5}} /> Generate
              </Link>
              <ArrowForwardIcon className={classes.arrow} />
            </li>
            <li className={classes.workflowStep}>
              <Link to="/fine-tuning/fine-tune" className={`${classes.workflowLink} ${isActive('/fine-tuning/fine-tune')}`}>
                <TuneIcon style={{marginRight: 5}} /> Fine-Tune
              </Link>
              <ArrowForwardIcon className={classes.arrow} />
            </li>
            <li className={classes.workflowStep}>
              <Link to="/fine-tuning/test" className={`${classes.workflowLink} ${isActive('/fine-tuning/test')}`}>
                <PlayCircleFilledIcon style={{marginRight: 5}} /> Test
              </Link>
            </li>
          </ul>
        </Box>
      )}

      {activeTab === 'retrieval' && (
        <Box className={classes.workflowNav}>
          <ul>
            <li>
              <Link 
                to="/retrieval" 
                className={`${classes.workflowLink} ${location.pathname === '/retrieval' ? 'active' : ''}`}
              >
                <HelpOutlineIcon style={{marginRight: 5}} /> Guide
              </Link>
            </li>
            <li>
              <Link to="/retrieval/build-databases" className={`${classes.workflowLink} ${isActive('/retrieval/build-databases')}`}>
                <StorageIcon style={{marginRight: 5}} /> Build Retrieval Databases
              </Link>
            </li>
            <li>
              <Link to="/retrieval/manage-databases" className={`${classes.workflowLink} ${isActive('/retrieval/manage-databases')}`}>
                <StorageIcon style={{marginRight: 5}} /> Manage Retrieval Databases
              </Link>
            </li>
            <li>
              <Link to="/retrieval/librarian-agents" className={`${classes.workflowLink} ${isActive('/retrieval/librarian-agents')}`}>
                <Box 
                  component="img" 
                  src={robotIcon} 
                  alt="Robot Icon" 
                  sx={{
                    width: 24, 
                    height: 24, 
                    marginRight: 1
                  }}
                />
                Librarian Agents
              </Link>
            </li>
          </ul>
        </Box>
      )}
    </HeaderRoot>
  );
}

export default HeaderStyled; 