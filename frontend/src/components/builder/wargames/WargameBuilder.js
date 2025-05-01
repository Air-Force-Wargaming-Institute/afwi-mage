import React from 'react';
import WargamesListPage from './WargamesListPage';
import { Box } from '@material-ui/core';

function WargameBuilder() {
  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <WargamesListPage />
    </Box>
  );
}

export default WargameBuilder;
