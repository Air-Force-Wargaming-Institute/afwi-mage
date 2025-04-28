import React, { useRef, useEffect } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress
} from '@material-ui/core';

// Define PropTypes if using TypeScript or for better documentation
// import PropTypes from 'prop-types';

function AgentCreationChat({
  prompt,
  onPromptChange,
  onGenerate,
  isLoading,
  // Add any other props needed, e.g., specific styles or error states
}) {
  const inputRef = useRef(null);

  // Focus the input field when the component mounts
  useEffect(() => {
    // Optional: Add a small delay if focus doesn't work immediately
    // setTimeout(() => inputRef.current?.focus(), 100); 
    inputRef.current?.focus();
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <Box mb={3}> {/* Add some margin below the AI section */}
      <Typography variant="subtitle1" gutterBottom>
        Describe your Agent using AI to help write the Agent instructions
      </Typography>
      <Box display="flex" alignItems="center">
        <TextField
          inputRef={inputRef} // Assign the ref here
          margin="dense"
          name="aiPrompt"
          label="Describe the agent you want to create..."
          type="text"
          fullWidth
          multiline
          rows={2} // Adjust rows as needed
          value={prompt}
          onChange={onPromptChange}
          disabled={isLoading}
          variant="outlined" // Use outlined variant for consistency perhaps
        />
        <Box ml={1} display="flex" alignItems="center" position="relative">
          <Button
            variant="contained"
            color="secondary"
            onClick={onGenerate}
            disabled={!prompt || isLoading}
            style={{ height: '56px' }} // Adjust height if necessary based on TextField variant/rows
          >
            Generate
          </Button>
          {isLoading && (
            <CircularProgress
              size={24}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginTop: '-12px',
                marginLeft: '-12px',
              }}
            />
          )}
           {/* Consider adding a tooltip or help icon here too */}
        </Box>
      </Box>
      <Typography variant="subtitle2" gutterBottom style={{ marginTop: '16px' }}>
         Or fill out the details manually below:
      </Typography>
    </Box>
  );
}

/* Optional: Define propTypes for validation and documentation
AgentCreationChat.propTypes = {
  prompt: PropTypes.string.isRequired,
  onPromptChange: PropTypes.func.isRequired,
  onGenerate: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
};
*/

export default AgentCreationChat;
