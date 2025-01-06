import React from 'react';
import { List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';
import { Link } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';

// Import icons individually
import MenuBookIcon from '@material-ui/icons/MenuBook';
import LibraryBooksIcon from '@material-ui/icons/LibraryBooks';
import PersonIcon from '@material-ui/icons/Person';
import GroupIcon from '@material-ui/icons/Group';

const useStyles = makeStyles((theme) => ({
  navLink: {
    textDecoration: 'none',
    color: theme.palette.text.primary,
  },
  listItem: {
    paddingLeft: theme.spacing(3),
  },
  icon: {
    minWidth: '40px',
    color: theme.palette.primary.main, // Add this line to ensure icons have a color
  },
}));

function Navigation() {
  const classes = useStyles();

  const navItems = [
    { text: 'User Guide', icon: MenuBookIcon, path: '/user-guide' },
    { text: 'LLM Library', icon: LibraryBooksIcon, path: '/llm-library' },
    { text: 'Agent Portfolio', icon: PersonIcon, path: '/agent-portfolio' },
    { text: 'Agent Teams', icon: GroupIcon, path: '/agent-teams' },
  ];

  return (
    <List>
      {navItems.map((item) => (
        <Link to={item.path} key={item.text} className={classes.navLink}>
          <ListItem button className={classes.listItem}>
            <ListItemIcon className={classes.icon}>
              <item.icon />
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        </Link>
      ))}
    </List>
  );
}

export default Navigation;