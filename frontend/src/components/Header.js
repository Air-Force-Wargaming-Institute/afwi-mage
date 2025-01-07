import React, { useState, useContext, useEffect } from 'react';
import { Link, useLocation, useHistory } from 'react-router-dom';
import { IconButton, Menu, MenuItem, Avatar, Typography } from '@material-ui/core';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import SettingsIcon from '@material-ui/icons/Settings';
import HelpIcon from '@material-ui/icons/Help';
import SupervisorAccountIcon from '@material-ui/icons/SupervisorAccount';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import logo from '../assets/afwi_logo.png';
import HomeIcon from '@material-ui/icons/Home';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CallSplitIcon from '@material-ui/icons/CallSplit';
import RateReviewIcon from '@material-ui/icons/RateReview';
import TuneIcon from '@material-ui/icons/Tune';
import PlayCircleFilledIcon from '@material-ui/icons/PlayCircleFilled';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import { FaDatabase } from 'react-icons/fa';
import GroupWorkIcon from '@material-ui/icons/GroupWork';
import BuildIcon from '@material-ui/icons/Build';
import ChatIcon from '@material-ui/icons/Chat';
import LibraryBooksIcon from '@material-ui/icons/LibraryBooks';
import FolderIcon from '@material-ui/icons/Folder';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import StorageIcon from '@material-ui/icons/Storage';
import robotIcon from '../assets/robot-icon.png';
import { AuthContext } from '../contexts/AuthContext';

function Header() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, logout, user } = useContext(AuthContext);
  const history = useHistory();

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

  const handleClick = () => {
    setMenuOpen(!menuOpen);
  };

  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  const handleAdminClick = () => {
    history.push('/admin');
    setMenuOpen(false);
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

  const subMenuItems = [
    { label: 'Generate Dataset', path: '/generate-dataset' },
    { label: 'Fine-Tune', path: '/fine-tune' },
  ];

  const navigationItems = [
    {
      title: 'Home',
      path: '/home',
      icon: <HomeIcon />,
    },
    // ... rest of the navigation items
  ];

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left-content">
          <div className="logo-title-container">
            <img src={logo} alt="AFWI Logo" className="logo" />
            <div className="title-container" style={{textAlign:'left'}}>
              <h2 style={{color:'white'}}>Air Force Wargaming Institute</h2>
              <h1 style={{color:'white'}}>Multi-Agent Generative Engine</h1>
            </div>
          </div>
          
          <nav className="main-nav">
            <ul>
              <li>
                <Link 
                  to="/home" 
                  className={activeTab === 'home' ? 'active' : ''}
                  onClick={() => setActiveTab('home')}
                >
                  <HomeIcon /> Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/multi-agent" 
                  className={activeTab === 'multi-agent' ? 'active' : ''}
                  onClick={() => setActiveTab('multi-agent')}
                >
                  <GroupWorkIcon /> Multi-Agent Portal
                </Link>
              </li>
              <li>
                <Link 
                  to="/fine-tuning" 
                  className={activeTab === 'fine-tuning' ? 'active' : ''}
                  onClick={() => setActiveTab('fine-tuning')}
                >
                  <TuneIcon /> Fine-Tuning
                </Link>
              </li>
              <li>
                <Link 
                  to="/retrieval" 
                  className={activeTab === 'retrieval' ? 'active' : ''}
                  onClick={() => setActiveTab('retrieval')}
                >
                  <LibraryBooksIcon /> Retriever Systems
                </Link>
              </li>
              <li>
                <Link 
                  to="/document-library" 
                  className={activeTab === 'document-library' ? 'active' : ''}
                  onClick={() => setActiveTab('document-library')}
                >
                  <FolderIcon /> Document Library
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="user-account" style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
          }}>
            <span style={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.75rem',
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              lineHeight: '1',
              marginBottom: '0.25rem'
            }}>
              Logged in as
            </span>
            <span style={{ 
              color: 'white',
              fontSize: '1rem',
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              lineHeight: '1.2'
            }}>
              {user?.username}
            </span>
          </div>
          <IconButton 
            onClick={handleClick}
            style={{ padding: '8px' }}
          >
            <Avatar style={{ width: 32, height: 32 }}>
              <AccountCircleIcon style={{ color: '#fff' }} />
            </Avatar>
          </IconButton>
          <div className={`user-menu ${menuOpen ? 'open' : ''}`}>
            {user?.permission === 'admin' && (
              <div className="menu-item" onClick={handleAdminClick}>
                <SupervisorAccountIcon />
                Admin Dashboard
              </div>
            )}
            <div className="menu-item" onClick={handleLogout}>
              <ExitToAppIcon />
              Logout
            </div>
            <div className="menu-item">
              <SettingsIcon />
              Settings
            </div>
            <div className="menu-item">
              <HelpIcon />
              Help/Support
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'multi-agent' && (
        <nav className="workflow-nav">
          <ul>
            <li>
              <Link 
                to="/multi-agent" 
                className={location.pathname === '/multi-agent' ? 'active' : ''}
              >
                <HelpOutlineIcon /> Guide
              </Link>
            </li>
            <li>
              <Link 
                to="/multi-agent/builder" 
                className={isActive('/multi-agent/builder')}
              >
                <BuildIcon /> Builder
              </Link>
            </li>
            <li>
              <Link 
                to="/multi-agent/chat" 
                className={isActive('/multi-agent/chat')}
              >
                <ChatIcon /> Chat
              </Link>
            </li>
          </ul>
        </nav>
      )}
      {activeTab === 'fine-tuning' && (
        <nav className="workflow-nav">
          <ul>
            <li>
              <Link 
                to="/fine-tuning" 
                className={location.pathname === '/fine-tuning' ? 'active' : ''}
              >
                <HelpOutlineIcon /> Guide
              </Link>
            </li>
            <li className="workflow-step">
              <Link to="/fine-tuning/extract" className={isActive('/fine-tuning/extract')}>
                <span className="extract-icon"><CallSplitIcon /></span> Extract
              </Link>
              <ArrowForwardIcon className="arrow" />
            </li>
            <li className="workflow-step">
              <Link to="/fine-tuning/generate" className={isActive('/fine-tuning/generate')}>
                <SettingsIcon /> Generate
              </Link>
              <ArrowForwardIcon className="arrow" />
            </li>
            <li className="workflow-step">
              <Link to="/fine-tuning/fine-tune" className={isActive('/fine-tuning/fine-tune')}><TuneIcon /> Fine-Tune</Link>
              <ArrowForwardIcon className="arrow" />
            </li>
            <li className="workflow-step">
              <Link to="/fine-tuning/test" className={isActive('/fine-tuning/test')}>
                <PlayCircleFilledIcon /> Test
              </Link>
            </li>
          </ul>
        </nav>
      )}
      {activeTab === 'retrieval' && (
        <nav className="workflow-nav">
          <ul>
            <li>
              <Link 
                to="/retrieval" 
                className={location.pathname === '/retrieval' ? 'active' : ''}
              >
                <HelpOutlineIcon /> Guide
              </Link>
            </li>
            <li><Link to="/retrieval/build-databases" className={isActive('/retrieval/build-databases')}><StorageIcon /> Build Retrieval Databases</Link></li>
            <li>
              <Link to="/retrieval/librarian-agents" className={isActive('/retrieval/librarian-agents')}>
                <img src={robotIcon} alt="Robot Icon" style={{ width: '24px', height: '24px', marginRight: '5px' }} />
                Librarian Agents
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export default Header;
