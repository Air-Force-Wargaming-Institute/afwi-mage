import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  TextField,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  makeStyles,
  Chip
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import SearchIcon from '@material-ui/icons/Search';
import TuneIcon from '@material-ui/icons/Tune';
import InfoIcon from '@material-ui/icons/Info';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import { testVectorStoreQuery } from '../../services/vectorStoreService';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  queryInput: {
    marginBottom: theme.spacing(2),
  },
  resultContainer: {
    marginTop: theme.spacing(3),
  },
  resultItem: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderLeft: `4px solid ${theme.palette.primary.main}`,
  },
  relevanceScore: {
    fontWeight: 'bold',
    color: theme.palette.primary.main,
  },
  source: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  divider: {
    margin: theme.spacing(1, 0),
  },
  querySettings: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  slider: {
    width: '100%',
    marginTop: theme.spacing(3),
  },
  queryButton: {
    marginTop: theme.spacing(2),
  },
  expandedSettings: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: theme.shape.borderRadius,
    boxShadow: 'none',
    '&:before': {
      display: 'none',
    },
  },
  settingsDetails: {
    flexDirection: 'column',
  },
  noResults: {
    textAlign: 'center',
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
  },
  exampleContainer: {
    marginTop: theme.spacing(2),
  },
  exampleChip: {
    margin: theme.spacing(0.5),
    cursor: 'pointer',
  },
  highlightedText: {
    backgroundColor: 'rgba(255, 235, 59, 0.3)',
    padding: '0 1px',
    borderRadius: '2px',
  },
  settingsFormControl: {
    marginBottom: theme.spacing(2),
    minWidth: 120,
  },
  matchMetadata: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  metadataChip: {
    backgroundColor: theme.palette.background.default,
  },
}));

const QueryTester = ({ vectorStore }) => {
  const classes = useStyles();
  const [queryText, setQueryText] = useState('');
  const [queryResults, setQueryResults] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState(null);
  const [topK, setTopK] = useState(5);
  const [scoreThreshold, setScoreThreshold] = useState(0.5);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  
  // Example queries - would normally be based on the vectorstore content
  const exampleQueries = [
    "What are the main features of the product?",
    "How does the pricing model work?",
    "What security measures are in place?",
    "Explain the technical architecture"
  ];

  const handleQueryChange = (event) => {
    setQueryText(event.target.value);
  };

  const handleTopKChange = (event, newValue) => {
    setTopK(newValue);
  };

  const handleScoreThresholdChange = (event, newValue) => {
    setScoreThreshold(newValue);
  };

  const handleExampleClick = (example) => {
    setQueryText(example);
  };

  const executeQuery = async () => {
    if (!queryText.trim()) return;

    setIsQuerying(true);
    setError(null);
    setQueryResults(null);

    try {
      const results = await testVectorStoreQuery(
        vectorStore.id, 
        queryText.trim(),
        { 
          top_k: topK,
          score_threshold: scoreThreshold
        }
      );
      
      setQueryResults(results);
      
      if (results.length === 0) {
        setError('No results found for this query. Try adjusting your search terms or query settings.');
      }
      
    } catch (error) {
      console.error('Error executing query:', error);
      setError(error.response?.data?.detail || 'Error executing query. Please try again.');
    } finally {
      setIsQuerying(false);
    }
  };

  // Highlights query terms in the result text
  const highlightQueryTerms = (text) => {
    if (!text || !queryText) return text;
    
    const queryTerms = queryText
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 3) // Filter out small words
      .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // Escape regex special chars
    
    if (queryTerms.length === 0) return text;
    
    const regex = new RegExp(`(${queryTerms.join('|')})`, 'gi');
    return text.replace(regex, '<span class="highlighted-term">$1</span>');
  };

  const renderResultItem = (result, index) => {
    // Create HTML with highlighted terms
    const highlightedHtml = highlightQueryTerms(result.text);
    
    return (
      <Paper key={index} className={classes.resultItem} elevation={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1">
            Match {index + 1}
          </Typography>
          <Typography className={classes.relevanceScore}>
            Relevance: {result.score.toFixed(4)}
          </Typography>
        </Box>
        
        <div className={classes.matchMetadata}>
          {result.metadata?.source && (
            <Chip 
              size="small" 
              label={`Source: ${result.metadata.source.split('/').pop()}`} 
              className={classes.metadataChip}
            />
          )}
          {result.metadata?.page && (
            <Chip 
              size="small" 
              label={`Page: ${result.metadata.page}`} 
              className={classes.metadataChip}
            />
          )}
          {result.metadata?.chunk_id && (
            <Chip 
              size="small" 
              label={`Chunk: ${result.metadata.chunk_id}`} 
              className={classes.metadataChip}
            />
          )}
        </div>
        
        <Divider className={classes.divider} />
        
        <Typography variant="body2" 
          dangerouslySetInnerHTML={{ 
            __html: highlightedHtml.replace(
              /<span class="highlighted-term">(.+?)<\/span>/g, 
              '<span style="background-color:rgba(255,235,59,0.3);padding:0 1px;border-radius:2px;">$1</span>'
            ) 
          }} 
        />
      </Paper>
    );
  };

  return (
    <div className={classes.root}>
      <Typography variant="h6" gutterBottom>
        Test Vector Store Query
      </Typography>
      
      <Typography variant="body2" color="textSecondary" paragraph>
        Enter a query to test the vector store's retrieval capabilities. The system will return the most relevant document chunks.
      </Typography>
      
      <TextField
        label="Enter your query"
        variant="outlined"
        fullWidth
        value={queryText}
        onChange={handleQueryChange}
        className={classes.queryInput}
        placeholder="What would you like to know about this data?"
        disabled={isQuerying}
      />
      
      <Box className={classes.exampleContainer}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Example queries:
        </Typography>
        {exampleQueries.map((example, index) => (
          <Chip
            key={index}
            label={example}
            onClick={() => handleExampleClick(example)}
            className={classes.exampleChip}
            color="primary"
            variant="outlined"
            size="small"
          />
        ))}
      </Box>
      
      <Accordion 
        expanded={settingsExpanded} 
        onChange={() => setSettingsExpanded(!settingsExpanded)}
        className={classes.expandedSettings}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="query-settings-content"
          id="query-settings-header"
        >
          <TuneIcon style={{ marginRight: 8 }} />
          <Typography>Query Settings</Typography>
        </AccordionSummary>
        <AccordionDetails className={classes.settingsDetails}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Adjust how many results to return and the minimum relevance score.
          </Typography>
          
          <FormControl className={classes.settingsFormControl} variant="outlined">
            <InputLabel id="results-count-label">Results</InputLabel>
            <Select
              labelId="results-count-label"
              value={topK}
              onChange={(e) => setTopK(e.target.value)}
              label="Results"
            >
              <MenuItem value={3}>3 results</MenuItem>
              <MenuItem value={5}>5 results</MenuItem>
              <MenuItem value={10}>10 results</MenuItem>
              <MenuItem value={20}>20 results</MenuItem>
            </Select>
          </FormControl>
          
          <Typography id="score-threshold-slider" gutterBottom>
            Relevance Threshold: {scoreThreshold.toFixed(2)}
          </Typography>
          <Slider
            value={scoreThreshold}
            onChange={handleScoreThresholdChange}
            aria-labelledby="score-threshold-slider"
            valueLabelDisplay="auto"
            step={0.05}
            marks
            min={0}
            max={1}
            className={classes.slider}
          />
          <Typography variant="body2" color="textSecondary">
            Higher values return only more relevant results, lower values include more results.
          </Typography>
        </AccordionDetails>
      </Accordion>
      
      <Button
        variant="contained"
        color="primary"
        className={classes.queryButton}
        onClick={executeQuery}
        disabled={!queryText.trim() || isQuerying}
        startIcon={isQuerying ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
        fullWidth
      >
        {isQuerying ? 'Querying...' : 'Run Query'}
      </Button>
      
      {error && (
        <Alert severity="warning" style={{ marginTop: 16 }}>
          {error}
        </Alert>
      )}
      
      {queryResults && queryResults.length > 0 && (
        <div className={classes.resultContainer}>
          <Typography variant="h6" gutterBottom>
            Query Results ({queryResults.length})
          </Typography>
          {queryResults.map((result, index) => renderResultItem(result, index))}
        </div>
      )}
      
      {queryResults && queryResults.length === 0 && (
        <Paper className={classes.noResults}>
          <InfoIcon color="disabled" style={{ fontSize: 48, opacity: 0.5 }} />
          <Typography variant="h6" gutterBottom>
            No Matching Results
          </Typography>
          <Typography variant="body2">
            Try adjusting your query or lowering the relevance threshold to see more results.
          </Typography>
        </Paper>
      )}
    </div>
  );
};

export default QueryTester; 