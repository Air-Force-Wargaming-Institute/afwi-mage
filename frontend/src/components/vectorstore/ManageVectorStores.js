import React, { useState } from 'react';
import {
  Typography,
  makeStyles,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  TextField,
} from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import SearchIcon from '@material-ui/icons/Search';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  searchInput: {
    flexGrow: 1,
    marginRight: theme.spacing(2),
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: '0.3s',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: theme.shadows[4],
    },
  },
  cardContent: {
    flexGrow: 1,
  },
  cardActions: {
    justifyContent: 'flex-end',
  },
}));

function ManageVectorStores() {
  const classes = useStyles();
  const [searchTerm, setSearchTerm] = useState('');

  // Dummy data - replace with actual data from your backend
  const [vectorStores] = useState([
    {
      id: 1,
      name: 'Technical Documentation',
      description: 'Vector store containing technical documentation and manuals',
      documentCount: 45,
      lastUpdated: '2024-03-20',
    },
    // Add more dummy data as needed
  ]);

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <Typography variant="h4" color="primary">
          Manage Vector Stores
        </Typography>
      </div>

      <div className={classes.searchBar}>
        <TextField
          className={classes.searchInput}
          variant="outlined"
          placeholder="Search vector stores..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon color="action" />,
          }}
        />
      </div>

      <Grid container spacing={3}>
        {vectorStores.map((store) => (
          <Grid item xs={12} sm={6} md={4} key={store.id}>
            <Card className={classes.card}>
              <CardContent className={classes.cardContent}>
                <Typography variant="h6" gutterBottom>
                  {store.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {store.description}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Documents: {store.documentCount}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Last Updated: {store.lastUpdated}
                </Typography>
              </CardContent>
              <CardActions className={classes.cardActions}>
                <IconButton size="small" color="primary">
                  <EditIcon />
                </IconButton>
                <IconButton size="small" color="secondary">
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </div>
  );
}

export default ManageVectorStores; 