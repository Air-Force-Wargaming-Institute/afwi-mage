import React, { useContext } from 'react';
import { Typography, Button, Box } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import { getApiUrl, getGatewayUrl } from '../../config';
import { AuthContext } from '../../contexts/AuthContext';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  button: {
    marginLeft: theme.spacing(2),
  },
}));

function LLMLibrary() {
  const classes = useStyles();
  const { user, token } = useContext(AuthContext);

  const handleSetupNewLLM = () => {
    // TODO: Implement the logic to set up a new LLM
    console.log("Set-up New LLM button clicked");
  };

  return (
    <div className={classes.root}>
      <Box className={classes.header}>
        <Typography variant="h4">LLM Library</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleSetupNewLLM}
          className={classes.button}
        >
          Set-up New LLM
        </Button>
      </Box>
      <Typography variant="body1">
        This is the LLM Library for the Multi-Agent Builder. Here you can view and manage your Language Models.
      </Typography>
      {/* TODO: Add a list or grid of existing LLMs */}
    </div>
  );
}

export default LLMLibrary;