import React from 'react';
import Flag from 'react-world-flags';
import { makeStyles } from '@material-ui/core/styles';
import { Box, Tooltip } from '@material-ui/core';
import PublicIcon from '@material-ui/icons/Public';
import SecurityIcon from '@material-ui/icons/Security';
import BusinessIcon from '@material-ui/icons/Business';
import AccountBalanceIcon from '@material-ui/icons/AccountBalance';

// Organization icon mapping
const ORGANIZATION_ICONS = {
  'NATO': {
    icon: SecurityIcon,
    color: '#004990', // NATO blue
    title: 'North Atlantic Treaty Organization'
  },
  'UN': {
    icon: PublicIcon, 
    color: '#5B92E5', // UN blue
    title: 'United Nations'
  },
  'EU': {
    icon: AccountBalanceIcon,
    color: '#0065A4', // EU blue
    title: 'European Union'
  },
  'ASEAN': {
    icon: BusinessIcon,
    color: '#00538A', // ASEAN blue
    title: 'Association of Southeast Asian Nations'
  },
  'BRICS': {
    icon: BusinessIcon,
    color: '#E09111', // Orange
    title: 'Brazil, Russia, India, China, South Africa'
  },
  'AU': {
    icon: PublicIcon,
    color: '#4AA147', // AU green
    title: 'African Union'
  },
  'default': {
    icon: BusinessIcon,
    color: '#888888',
    title: 'Organization'
  }
};

const useStyles = makeStyles((theme) => ({
  flagContainer: {
    width: 30,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '2px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  flag: {
    width: '100%',
    height: 'auto',
    objectFit: 'cover',
  },
  orgIcon: {
    fontSize: '1.2rem',
  },
}));

function FlagIcon({ entityId, entityType = 'nation', tooltip = true }) {
  const classes = useStyles();

  // Handle country flags
  if (entityType === 'nation') {
    return (
      <Box className={classes.flagContainer}>
        <Flag code={entityId} className={classes.flag} />
      </Box>
    );
  }
  
  // Handle organization icons
  const orgConfig = ORGANIZATION_ICONS[entityId] || ORGANIZATION_ICONS.default;
  const IconComponent = orgConfig.icon;
  
  const icon = (
    <Box 
      className={classes.flagContainer} 
      style={{ backgroundColor: orgConfig.color }}
    >
      <IconComponent className={classes.orgIcon} style={{ color: 'white' }} />
    </Box>
  );
  
  return tooltip ? (
    <Tooltip title={orgConfig.title || entityId}>
      {icon}
    </Tooltip>
  ) : icon;
}

export default FlagIcon; 