import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  TextField,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  TablePagination,
  Tooltip,
  Grid,
  FormHelperText,
  Collapse,
  IconButton,
  FormControlLabel,
  Checkbox,
  FormGroup,
  FormLabel
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import SearchIcon from '@material-ui/icons/Search';
import TuneIcon from '@material-ui/icons/Tune';
import InfoIcon from '@material-ui/icons/Info';
import AnalyticsIcon from '@material-ui/icons/Assessment';
import EmojiObjectsIcon from '@material-ui/icons/EmojiObjects';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import { AuthContext } from '../../contexts/AuthContext';
import { useTheme } from '@material-ui/core/styles';

// Import styled components
import {
  GradientBorderPaper,
  AnimatedGradientPaper,
  SubtleGlowPaper,
  HighContrastGradientPaper,
  GradientCornersPaper,
  GradientText,
  StyledContainer,
  useContainerStyles
} from '../../styles/StyledComponents';

// Import action buttons
import {
  DeleteButton,
  EditButton,
  DownloadButton,
  ViewButton,
  AddButton,
  CopyButton
} from '../../styles/ActionButtons';

import { testVectorStoreQuery, analyzeVectorStore, llmQueryVectorStore } from '../../services/vectorStoreService';
import { MetadataDisplay, SecurityClassification } from './MetadataDisplay';

// Helper function to get color based on relevance score
const getScoreColor = (score) => {
  // Normalize score to be between 0 and 1 if it's not already
  // Handles distance scores (0-2) and relevance scores (0-1)
  let normalizedScore = 0;
  if (typeof score === 'number') {
    if (score >= 0 && score <= 1) { // Assumes 0-1 relevance score
      normalizedScore = score;
    } else if (score > 1 && score <= 2) { // Assumes 0-2 distance score (lower is better)
      normalizedScore = (2 - score) / 2; // Convert distance to relevance
    } else if (score < 0) { // Handle potential cosine similarity scores (-1 to 1)
      normalizedScore = (score + 1) / 2;
    }
  }

  if (normalizedScore >= 0.8) return '#4caf50'; // High relevance - green
  if (normalizedScore >= 0.6) return '#8bc34a'; // Good relevance - light green
  if (normalizedScore >= 0.4) return '#ffc107'; // Medium relevance - amber
  return '#ff9800'; // Low relevance - orange
};

// Define standard classification levels
const CLASSIFICATION_LEVELS = ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP SECRET'];

// Component-specific styles
const useStyles = {
  root: theme => ({
    padding: theme.spacing(3),
  }),
  queryInput: theme => ({
    marginBottom: theme.spacing(2),
  }),
  resultContainer: theme => ({
    marginTop: theme.spacing(3),
  }),
  resultItem: theme => ({
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    '& .metadata-section': {
      marginBottom: theme.spacing(2),
    },
  }),
  relevanceScore: theme => ({
    fontWeight: 'bold',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    '& .score-bar': {
      width: '100%',
      height: '4px',
      borderRadius: '2px',
      marginTop: '2px',
    },
  }),
  source: theme => ({
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  }),
  divider: theme => ({
    margin: theme.spacing(1, 0),
  }),
  querySettings: theme => ({
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  }),
  slider: theme => ({
    width: '100%',
    marginTop: theme.spacing(3),
  }),
  queryButton: theme => ({
    marginTop: theme.spacing(2),
  }),
  expandedSettings: theme => ({
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: theme.shape.borderRadius,
    boxShadow: 'none',
    '&:before': {
      display: 'none',
    },
  }),
  settingsDetails: theme => ({
    flexDirection: 'column',
    padding: theme.spacing(1, 2, 2),
  }),
  compactAlert: theme => ({
    padding: theme.spacing(1, 2),
    marginBottom: theme.spacing(1),
  }),
  compactSliderContainer: theme => ({
    marginBottom: theme.spacing(1.5),
  }),
  sliderLabel: theme => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(0.5),
  }),
  sliderCaption: theme => ({
    marginTop: theme.spacing(0.5),
  }),
  noResults: theme => ({
    textAlign: 'center',
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: theme.shape.borderRadius,
    border: '1px dashed rgba(0, 0, 0, 0.1)',
    '& .icon': {
      fontSize: 48,
      opacity: 0.5,
      marginBottom: theme.spacing(2),
    },
  }),
  exampleContainer: theme => ({
    marginTop: theme.spacing(2),
  }),
  exampleChip: theme => ({
    margin: theme.spacing(0.5),
    cursor: 'pointer',
  }),
  highlightedText: theme => ({
    backgroundColor: 'rgba(255, 235, 59, 0.3)',
    padding: '0 1px',
    borderRadius: '2px',
  }),
  settingsFormControl: theme => ({
    marginBottom: theme.spacing(2),
    minWidth: 120,
  }),
  matchMetadata: theme => ({
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  }),
  metadataChip: theme => ({
    backgroundColor: theme.palette.background.default,
  }),
  analyzeButton: theme => ({
    marginBottom: theme.spacing(3),
  }),
  analysisPaper: theme => ({
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    backgroundColor: 'rgba(232, 244, 253, 0.3)',
    border: '1px solid rgba(25, 118, 210, 0.12)',
  }),
  analysisHeader: theme => ({
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  }),
  analysisIcon: theme => ({
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main,
  }),
  analysisSection: theme => ({
    marginBottom: theme.spacing(2),
  }),
  llmAnswerContainer: theme => ({
    marginTop: theme.spacing(3),
    padding: theme.spacing(3),
    backgroundColor: 'rgba(250, 250, 250, 0.8)',
    border: '1px solid rgba(0, 0, 0, 0.12)',
    borderRadius: theme.shape.borderRadius,
    '& .answer-header': {
      marginBottom: theme.spacing(2),
      display: 'flex',
      alignItems: 'center',
      '& .icon': {
        marginRight: theme.spacing(1),
        color: theme.palette.primary.main,
      },
    },
  }),
  llmAnswer: theme => ({
    whiteSpace: 'pre-wrap',
    '& p': {
      marginBottom: theme.spacing(1.5),
    },
    '& code': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
      padding: '2px 4px',
      borderRadius: '3px',
      fontSize: '0.9em',
    },
  }),
  sourcesList: theme => ({
    marginTop: theme.spacing(3),
    '& .source-header': {
      marginBottom: theme.spacing(1),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  }),
  sourcesHeading: theme => ({
    marginBottom: theme.spacing(1),
    fontWeight: 500,
  }),
  queryModeSelector: theme => ({
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  }),
  queryModeButton: theme => ({
    margin: theme.spacing(0, 1),
  }),
  activeModeButton: theme => ({
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
  }),
  infoCard: theme => ({
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: 'rgba(232, 244, 253, 0.5)',
    borderLeft: `4px solid ${theme.palette.info.main}`,
  }),
  modeInfoCard: theme => ({
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: 'rgba(232, 244, 253, 0.3)',
  }),
  helpIcon: theme => ({
    fontSize: '1rem',
    marginLeft: theme.spacing(0.5),
    color: theme.palette.info.main,
    cursor: 'pointer',
  }),
  modeDescription: theme => ({
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  }),
  compactRelevanceBox: theme => ({
    padding: theme.spacing(0.75),
    fontSize: '0.75rem',
    borderRadius: 4,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  sliderDivider: theme => ({
    position: 'relative',
    paddingRight: theme.spacing(3),
    '&::after': {
      content: '""',
      position: 'absolute',
      right: 0,
      top: '10%',
      height: '80%',
      width: '1px',
      backgroundColor: 'rgba(0, 0, 0, 0.12)',
      [theme.breakpoints.down('xs')]: {
        display: 'none'
      }
    }
  }),
  sliderRightContainer: theme => ({
    paddingLeft: theme.spacing(3),
  }),
  expandedDocContainer: theme => ({
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: 'rgba(245, 245, 245, 0.9)',
    border: '1px solid rgba(0, 0, 0, 0.12)',
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    position: 'relative',
    width: '100%',
    '& .metadata-section': {
      marginBottom: theme.spacing(1.5),
    },
  }),
  expandedDocText: theme => ({
    whiteSpace: 'pre-wrap',
    fontSize: '0.875rem',
    maxHeight: '500px',
    overflow: 'auto',
    backgroundColor: 'white',
    padding: theme.spacing(1.5),
    border: '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(1.5),
    wordBreak: 'break-word',
    textOverflow: 'clip',
  }),
  expandedDocTextLimited: theme => ({
    maxHeight: '200px',
  }),
  showMoreButton: theme => ({
    marginTop: theme.spacing(1),
    textTransform: 'none',
    fontSize: '0.75rem',
  }),
  expandedDocHeader: theme => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1.5),
  }),
  expandedDocMetadata: theme => ({
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  }),
  documentChip: theme => ({
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
      transform: 'translateY(-1px)',
    },
  }),
  filterSection: theme => ({
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(1),
    borderTop: `1px solid ${theme.palette.divider}`,
  }),
  checkboxGroup: theme => ({
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
  }),
  checkboxLabel: theme => ({
    marginRight: theme.spacing(2),
  }),
};

const QueryTester = ({ vectorStore }) => {
  const theme = useTheme();
  const containerClasses = useContainerStyles();
  
  // Convert style functions to actual styles with theme
  const classes = {};
  Object.keys(useStyles).forEach(key => {
    classes[key] = useStyles[key](theme);
  });
  const { user, token } = useContext(AuthContext);
  
  const [queryText, setQueryText] = useState('');
  const [queryResults, setQueryResults] = useState(null);
  const [displayedResults, setDisplayedResults] = useState([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState(null);
  const [topK, setTopK] = useState(5);
  const [scoreThreshold, setScoreThreshold] = useState(0.5);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [sampleSize, setSampleSize] = useState(50);
  const [samplingStrategy, setSamplingStrategy] = useState('random');
  
  // LLM response state
  const [llmResponse, setLlmResponse] = useState(null);
  const [queryMode, setQueryMode] = useState('raw'); // 'raw' or 'llm'
  
  // Track if user has performed a query yet
  const [hasSearched, setHasSearched] = useState(false);
  
  // Default example queries to show before analysis is complete
  const defaultExampleQueries = [
    "What are the main topics in this data?",
    "Can you summarize the key information?",
    "What are the most important concepts?",
  ];
  
  // New state variable for document expansion
  const [expandedDocId, setExpandedDocId] = useState(null);
  const [showFullText, setShowFullText] = useState({});
  
  // Add state for classification filtering
  const [selectedClassifications, setSelectedClassifications] = useState(CLASSIFICATION_LEVELS);
  
  // Memory cleanup effect
  useEffect(() => {
    // Cleanup function to release memory when component unmounts
    return () => {
      // Clear large state objects to free memory
      setQueryResults(null);
      setDisplayedResults([]);
      setLlmResponse(null);
      setAnalysis(null);
    };
  }, []);
  
  // Update displayed results when page changes
  useEffect(() => {
    if (queryResults && queryResults.length > 0) {
      // Only show the current page of results
      const startIdx = page * rowsPerPage;
      const endIdx = Math.min(startIdx + rowsPerPage, queryResults.length);
      setDisplayedResults(queryResults.slice(startIdx, endIdx));
    } else {
      setDisplayedResults([]);
    }
  }, [queryResults, page, rowsPerPage]);
  
  // Handle query mode selection
  const handleQueryModeChange = (mode) => {
    setQueryMode(mode);
  };
  
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
  
  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Reset analysis handler
  const handleResetAnalysis = () => {
    setAnalysis(null);
    // Scroll to the top to show the analysis options
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Memoize the executeQuery function to prevent unnecessary re-renders
  const executeQuery = useCallback(async () => {
    if (!queryText.trim()) return;

    // Reset state
    setIsQuerying(true);
    setError(null);
    setQueryResults(null);
    setLlmResponse(null);
    setPage(0);
    setDisplayedResults([]);
    setHasSearched(true);

    try {
      const queryOptions = {
        top_k: topK,
        score_threshold: scoreThreshold,
        allowed_classifications: selectedClassifications,
        truncate_text: false,
        max_text_length: 10000
      };

      if (queryMode === 'raw') {
        const results = await testVectorStoreQuery(
          vectorStore.id, 
          queryText.trim(),
          queryOptions,
          token
        );
        
        // Update state with results
        setQueryResults(results);
        
        // Update displayed results (first page)
        setDisplayedResults(results.slice(0, rowsPerPage));
        
        if (results.length === 0) {
          setError('No results found for this query. Try adjusting your search terms or query settings.');
        }
      } else {
        const response = await llmQueryVectorStore(
          vectorStore.id,
          queryText.trim(),
          {
            ...queryOptions,
            use_llm: true,
            include_sources: true
          },
          token
        );
        
        setLlmResponse(response);
        
        if (!response.sources || response.sources.length === 0) {
          setError('No relevant information found. Try adjusting your search terms or query settings.');
        }
      }
    } catch (error) {
      console.error('Error executing query:', error);
      setError(error.response?.data?.detail || 'Error executing query. Please try again.');
    } finally {
      setIsQuerying(false);
    }
  }, [queryText, queryMode, topK, scoreThreshold, vectorStore.id, rowsPerPage, token, selectedClassifications]);

  // Update the analyzeVectorstore callback to use raw_response directly
  const analyzeVectorstore = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const analysisResult = await analyzeVectorStore(
        vectorStore.id,
        {
          sample_size: sampleSize,
          summary_length: 'long',
          sampling_strategy: samplingStrategy
        },
        token
      );
      
      // Log the raw response for debugging
      console.log("Analysis result received:", analysisResult);
      console.log("Raw LLM response length:", analysisResult.raw_response?.length || 0);
      
      // We're now using the raw LLM response directly without extraction
      setAnalysis(analysisResult);
      
    } catch (error) {
      console.error('Error analyzing vectorstore:', error);
      setError(error.response?.data?.detail || 'Error analyzing vectorstore. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [vectorStore.id, sampleSize, samplingStrategy]);

  // Highlights query terms in the result text - memoized to improve performance
  const highlightQueryTerms = useCallback((text) => {
    if (!text || !queryText) return text;

    const queryTerms = queryText
      .toLowerCase()
      .split(/\s+/) // Split by whitespace
      .filter(term => term.length > 3) // Keep the length filter
      .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // Escape regex special chars

    if (queryTerms.length === 0) return text;

    // Refined regex: Use word boundaries (\b) to match whole words only
    const regex = new RegExp(`\\b(${queryTerms.join('|')})\\b`, 'gi');

    // Replace matched terms with highlighted span
    // Using a function ensures proper handling of case in the original text
    return text.replace(regex, (match) =>
      `<span class="highlighted-term">${match}</span>`
    );
  }, [queryText]); // Depend only on queryText

  // Helper function to get relevance label based on score
  const getRelevanceLabel = (score) => {
      // Normalize score first
      let normalizedScore = 0;
      if (typeof score === 'number') {
          if (score >= 0 && score <= 1) {
              normalizedScore = score;
          } else if (score > 1 && score <= 2) {
              normalizedScore = (2 - score) / 2;
          } else if (score < 0) {
              normalizedScore = (score + 1) / 2;
          }
      }

      if (normalizedScore >= 0.8) return 'Very High';
      if (normalizedScore >= 0.6) return 'High';
      if (normalizedScore >= 0.4) return 'Moderate';
      return 'Low';
  };

  const renderResultItem = (result, index) => {
    // Create HTML with highlighted terms
    const highlightedHtml = highlightQueryTerms(result.text);

    // Get normalized score (0-1) for display consistency
    const originalScore = result.score; // Keep the original score from backend
    let normalizedScore = 0;
    let scoreType = 'Relevance'; // Default assumption

    if (typeof originalScore === 'number') {
        if (originalScore >= 0 && originalScore <= 1) { // Assumes 0-1 relevance score
            normalizedScore = originalScore;
            scoreType = 'Relevance';
        } else if (originalScore > 1 && originalScore <= 2) { // Assumes 0-2 distance score (lower is better)
            normalizedScore = (2 - originalScore) / 2; // Convert distance to relevance
            scoreType = 'Similarity (from distance)';
        } else if (originalScore < 0) { // Handle potential cosine similarity scores (-1 to 1)
             normalizedScore = (originalScore + 1) / 2;
             scoreType = 'Similarity (from cosine)';
        }
    }

    // Define tooltip content
    const tooltipContent = (
      <div>
        <Typography variant="body2">
          <strong>{scoreType}: {getRelevanceLabel(normalizedScore)}</strong> ({(normalizedScore * 100).toFixed(1)}%)
        </Typography>
        <Typography variant="caption" display="block" color="textSecondary">
          Score indicates semantic relevance to query (0=Low, 1=High).
        </Typography>
        {typeof originalScore === 'number' && originalScore !== normalizedScore && (
          <Typography variant="caption" display="block" color="textSecondary">
            (Original backend score: {originalScore.toFixed(2)})
          </Typography>
        )}
      </div>
    );

    return (
      <GradientBorderPaper key={index} style={classes.resultItem} elevation={2}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle1">
              Match {page * rowsPerPage + index + 1}
            </Typography>
            <SecurityClassification classification={result.metadata?.chunk_classification || result.metadata?.security_classification} />
          </Box>
          {/* Make score more prominent */}
          <Tooltip title={tooltipContent}>
            <Box textAlign="right">
              {/* Score Value */}
              <Typography
                variant="h6" // Increased size
                style={{
                  fontWeight: 'bold', // Bolded
                  color: getScoreColor(originalScore), // Color based on original score interpretation
                  marginBottom: '4px' // Add space below score
                }}
              >
                {normalizedScore.toFixed(2)}
              </Typography>
              {/* Score Bar */}
              <div
                style={{
                  width: '60px', // Fixed width for the bar container
                  height: '6px', // Thicker bar
                  backgroundColor: 'rgba(0, 0, 0, 0.1)', // Background for the bar area
                  borderRadius: '3px',
                  overflow: 'hidden', // Ensure inner bar respects border radius
                  marginLeft: 'auto' // Align bar to the right
                }}
              >
                <div
                  style={{
                    width: `${normalizedScore * 100}%`,
                    height: '100%',
                    backgroundColor: getScoreColor(originalScore), // Use original score for color logic
                    borderRadius: '3px',
                  }}
                 />
               </div>
             </Box>
          </Tooltip>
        </Box>

        {/* Enhanced Metadata Display */}
        <MetadataDisplay metadata={result.metadata} />

        <Divider style={classes.divider} />

        <Typography variant="body2"
          dangerouslySetInnerHTML={{
            __html: highlightedHtml.replace(
              /<span class="highlighted-term">(.+?)<\/span>/g,
              '<span style="background-color:rgba(255,235,59,0.3);padding:0 1px;border-radius:2px;">$1</span>'
            )
          }}
        />

        {/* Add expand/collapse button if text is long */}
        {result.text.length > 500 && (
          <Button
            style={classes.showMoreButton}
            onClick={() => toggleShowFullText(result.metadata?.document_id || index)}
            size="small"
            color="primary"
            variant="text"
          >
            {showFullText[result.metadata?.document_id || index] ? "Show less" : "Show more"}
          </Button>
        )}
      </GradientBorderPaper>
    );
  };

  // Function to render markdown content
  const renderMarkdown = useCallback((markdown) => {
    console.log("Rendering markdown content:", markdown);
    
    if (!markdown) {
      console.log("Markdown content is empty or null");
      return <Typography color="textSecondary">No content available to display.</Typography>;
    }
    
    try {
      // Make sure we're working with the complete text
      const fullText = markdown.toString();
      
      // Enhanced markdown to HTML conversion
      let html = fullText
        // Headers
        .replace(/^### (.*$)/gim, '<h3 style="margin-top: 16px; margin-bottom: 8px; font-size: 1.1rem;">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 style="margin-top: 20px; margin-bottom: 10px; font-size: 1.25rem;">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 style="margin-top: 24px; margin-bottom: 12px; font-size: 1.5rem;">$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Unordered Lists
        .replace(/^\s*[\-\*]\s+(.*$)/gim, '<li style="margin-bottom: 4px;">$1</li>')
        // Numbered Lists
        .replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li style="margin-bottom: 4px;">$2</li>')
        // Code (inline)
        .replace(/`([^`]+)`/g, '<code style="background-color: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
        // Code blocks
        .replace(/```([\s\S]*?)```/g, '<pre style="background-color: rgba(0,0,0,0.05); padding: 12px; border-radius: 4px; overflow-x: auto; margin: 12px 0;"><code style="font-family: monospace;">$1</code></pre>')
        // Blockquotes
        .replace(/^\> (.*$)/gim, '<blockquote style="border-left: 4px solid #ddd; padding-left: 12px; color: #666; margin: 12px 0;">$1</blockquote>')
        // Horizontal Rule
        .replace(/^---$/gim, '<hr style="border: 0; height: 1px; background-color: #ddd; margin: 16px 0;">')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #1976d2; text-decoration: none;">$1</a>');
      
      // Fix lists (wrap in <ul> or <ol>)
      html = html.replace(/<li style="margin-bottom: 4px;">(.*?)(?=<\/li>)/g, (match) => {
        if (match.trim().startsWith('<li')) {
          return match; // Already wrapped
        }
        return `<ul style="margin-top: 8px; margin-bottom: 8px; padding-left: 24px;">${match}`;
      });

      // Handle paragraphs better (each double newline creates a new paragraph)
      html = html.split(/\n\n+/).map(paragraph => {
        if (
          paragraph.trim().startsWith('<h1') || 
          paragraph.trim().startsWith('<h2') || 
          paragraph.trim().startsWith('<h3') || 
          paragraph.trim().startsWith('<ul') || 
          paragraph.trim().startsWith('<ol') || 
          paragraph.trim().startsWith('<blockquote') || 
          paragraph.trim().startsWith('<pre')
        ) {
          return paragraph; // Don't wrap elements that are already block-level
        }
        return `<p style="margin-bottom: 12px; line-height: 1.5;">${paragraph}</p>`;
      }).join('');
      
      return (
        <div 
          dangerouslySetInnerHTML={{ __html: html }} 
          style={{ 
            overflow: 'auto', 
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap'
          }} 
        />
      );
    } catch (error) {
      console.error("Error rendering markdown:", error);
      return (
        <div>
          <Typography color="error">Error rendering content. Raw content:</Typography>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            backgroundColor: '#f5f5f5', 
            padding: '8px', 
            borderRadius: '4px',
            wordBreak: 'break-word', 
            overflow: 'auto',
            maxWidth: '100%'
          }}>
            {markdown}
          </pre>
        </div>
      );
    }
  }, []);

  // Helper function to format sampling strategy for display
  const formatSamplingStrategy = (strategy) => {
    const strategies = {
      'random': 'Random',
      'grouped_by_source': 'Grouped by Source',
      'temporal': 'Temporal',
      'clustering': 'Clustering-based'
    };
    return strategies[strategy] || strategy;
  };

  // Function to handle document expansion/collapse
  const handleDocExpand = (sourceId) => {
    if (expandedDocId === sourceId) {
      setExpandedDocId(null); // Collapse if already expanded
    } else {
      setExpandedDocId(sourceId); // Expand the clicked one
    }
  };
  
  // Function to toggle show more/less text
  const toggleShowFullText = (sourceId) => {
    setShowFullText(prev => ({
      ...prev,
      [sourceId]: !prev[sourceId]
    }));
  };

  // Handle classification checkbox changes
  const handleClassificationChange = (event) => {
    const { name, checked } = event.target;
    setSelectedClassifications(prev =>
      checked
        ? [...prev, name] // Add classification
        : prev.filter(c => c !== name) // Remove classification
    );
  };

  return (
    <StyledContainer maxWidth="lg" style={classes.root}>
      <Typography variant="h6" gutterBottom style={{ color: '#e0e0e0' }}>
        Test Vector Store Query
      </Typography>
      
      <Typography variant="body2" color="textSecondary" paragraph style={{ color: '#b0b0b0' }}>
        Test your vector store's retrieval capabilities by analyzing its content or querying for specific information.
      </Typography>
      
      {/* Two-column layout using Grid */}
      <Grid container spacing={3}>
        {/* Left Column - Quick Test & Analysis */}
        <Grid item xs={12} md={6}>
          <SubtleGlowPaper style={{ 
            padding: 16, 
            marginBottom: 8, 
            backgroundColor: '#212b36', 
            display: 'flex', 
            alignItems: 'center',
            border: '1px solid rgba(65, 90, 115, 0.3)'
          }}>
            <AnalyticsIcon style={{ marginRight: 8, color: '#4285f4' }} />
            <Typography variant="subtitle1" style={{ fontWeight: 500, color: '#e0e0e0' }}>
              Quick Test & Analysis
            </Typography>
          </SubtleGlowPaper>
          
          {/* Analysis section */}
          {!analysis && !isAnalyzing && (
            <GradientBorderPaper style={{ padding: 16, marginBottom: 24, border: '1px dashed rgba(0, 0, 0, 0.12)' }}>
              <Box display="flex" alignItems="center" mb={1}>
                <InfoIcon color="primary" style={{ marginRight: 8 }} />
                <Typography variant="subtitle1">
                  First Step: Analyze Your Vector Store
                </Typography>
              </Box>
              <Typography variant="body2" paragraph>
                Running an analysis helps you understand what's in your data and suggests useful queries you can try.
                This process examines document content, identifies key topics and themes, and generates relevant example queries.
              </Typography>
              
              <Box mb={2}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl variant="outlined" size="small" fullWidth>
                      <InputLabel id="sample-size-label">Sample Size</InputLabel>
                      <Select
                        labelId="sample-size-label"
                        value={sampleSize}
                        onChange={(e) => setSampleSize(e.target.value)}
                        label="Sample Size"
                      >
                        <MenuItem value={50}>50 chunks (recommended)</MenuItem>
                        <MenuItem value={100}>100 chunks</MenuItem>
                        <MenuItem value={200}>200 chunks</MenuItem>
                        <MenuItem value={500}>500 chunks</MenuItem>
                        <MenuItem value={1000}>1000 chunks</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl variant="outlined" size="small" fullWidth>
                      <InputLabel id="sampling-strategy-label">Sampling Strategy</InputLabel>
                      <Select
                        labelId="sampling-strategy-label"
                        value={samplingStrategy}
                        onChange={(e) => setSamplingStrategy(e.target.value)}
                        label="Sampling Strategy"
                      >
                        <MenuItem value="random">Random Sampling</MenuItem>
                        <MenuItem value="grouped_by_source">Grouped by Source</MenuItem>
                        <MenuItem value="temporal">Temporal Distribution</MenuItem>
                        <MenuItem value="clustering">Clustering-based</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <Typography variant="caption" color="textSecondary" style={{ marginTop: 8, display: 'block' }}>
                  Larger samples (1000+ chunks) provide more comprehensive analysis but take longer to process.
                </Typography>
              </Box>
              
              <Button
                variant="contained"
                color="primary"
                onClick={analyzeVectorstore}
                disabled={isAnalyzing}
                startIcon={isAnalyzing ? <CircularProgress size={20} color="inherit" /> : <AnalyticsIcon />}
                fullWidth
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Vector Store Content'}
              </Button>
            </GradientBorderPaper>
          )}
          
          {isAnalyzing && !analysis && (
            <GradientBorderPaper style={{ padding: 16, marginBottom: 24, textAlign: 'center' }}>
              <CircularProgress size={40} />
              <Typography variant="subtitle1" style={{ marginTop: 16 }}>
                Analyzing your vector store...
              </Typography>
              <Typography variant="body2" color="textSecondary">
                This may take a moment as we analyze the content and structure of your data.
              </Typography>
            </GradientBorderPaper>
          )}
          
          {analysis && (
            <AnimatedGradientPaper style={{
              ...classes.analysisPaper, 
              backgroundColor: '#1a2027',
              border: '1px solid rgba(65, 90, 115, 0.5)',
              color: '#e0e0e0'
            }} elevation={1}>
              <div style={classes.analysisHeader}>
                <AnalyticsIcon style={{...classes.analysisIcon, color: '#4285f4'}} />
                <Typography variant="h6" style={{ color: '#e0e0e0' }}>
                  Vectorstore Analysis
                </Typography>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  size="small"
                  startIcon={<ExpandMoreIcon />}
                  style={{ marginLeft: 'auto' }}
                  onClick={handleResetAnalysis}
                  disabled={isAnalyzing}
                >
                  Reset & Reanalyze
                </Button>
              </div>
              
              <Alert 
                severity="success" 
                variant="outlined" 
                style={{ 
                  marginBottom: 16, 
                  backgroundColor: 'rgba(76, 175, 80, 0.15)',
                  color: '#e0e0e0',
                  border: '1px solid rgba(76, 175, 80, 0.5)'
                }}
              >
                <Typography variant="body2" style={{ color: '#e0e0e0' }}>
                  Analysis completed! This helps you understand what's in your vector store and suggests useful queries to try.
                </Typography>
              </Alert>
              
              {/* Analysis options section - only visible when analysis is complete */}
              {analysis && (
                <GradientCornersPaper style={{ 
                  padding: 16, 
                  marginBottom: 16, 
                  backgroundColor: '#212b36',
                  border: '1px solid rgba(65, 90, 115, 0.3)',
                  color: '#e0e0e0'
                }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <InfoIcon style={{ color: '#4285f4', marginRight: 8 }} />
                    <Typography variant="subtitle1" style={{ color: '#e0e0e0' }}>
                      Analysis Parameters
                    </Typography>
                    {isAnalyzing && (
                      <Box display="flex" alignItems="center" ml={2}>
                        <CircularProgress size={16} style={{ marginRight: 8 }} />
                        <Typography variant="body2" color="textSecondary">
                          Analysis in progress...
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  
                  <Grid container spacing={2}>
                    {/* Display sample size and strategy for analysis */}
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" gutterBottom style={{ color: '#e0e0e0' }}>
                        <strong>Sample Size:</strong> {analysis?.sample_size || sampleSize}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" gutterBottom style={{ color: '#e0e0e0' }}>
                        <strong>Sampling Method:</strong> {formatSamplingStrategy(analysis?.sampling_strategy || samplingStrategy)}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {/* Include basic explanation of the analysis process */}
                  <Alert severity="info" style={{
                    ...classes.compactAlert, 
                    marginTop: 8,
                    backgroundColor: 'rgba(25, 118, 210, 0.15)',
                    color: '#e0e0e0',
                    border: '1px solid rgba(25, 118, 210, 0.3)'
                  }}>
                    <Typography variant="body2" style={{ color: '#e0e0e0' }}>
                      The analysis examines your vector store content and suggests relevant queries. 
                      Use the suggested queries below to explore your data effectively.
                    </Typography>
                  </Alert>
                </GradientCornersPaper>
              )}
              
              <div style={classes.analysisSection}>
                <Typography variant="subtitle1" gutterBottom style={{ color: '#e0e0e0' }}>
                  LLM Analysis (Raw Response)
                  <Tooltip title="This is the unprocessed output directly from the LLM">
                    <HelpOutlineIcon style={{...classes.helpIcon, color: '#4285f4'}} />
                  </Tooltip>
                </Typography>
                <GradientBorderPaper variant="outlined" style={{ 
                  padding: 16, 
                  backgroundColor: 'rgba(30, 30, 30, 0.9)',
                  maxHeight: '800px',
                  overflow: 'auto',
                  color: '#e0e0e0',
                  border: '1px solid rgba(65, 90, 115, 0.5)'
                }}>
                  {analysis?.raw_response ? (
                    renderMarkdown(analysis.raw_response)
                  ) : (
                    <Typography color="textSecondary">
                      No analysis available. The LLM did not return any content.
                    </Typography>
                  )}
                </GradientBorderPaper>
                
                <Box mt={1} display="flex" justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<span role="img" aria-label="copy">📋</span>}
                    onClick={() => {
                      if (analysis?.raw_response) {
                        navigator.clipboard.writeText(analysis.raw_response);
                        // You could add a snackbar notification here
                      }
                    }}
                  >
                    Copy LLM Response
                  </Button>
                </Box>
              </div>
              
              <div style={classes.analysisSection}>
                <Typography variant="subtitle1" gutterBottom style={{ color: '#e0e0e0' }}>
                  Document Information
                </Typography>
                <Box display="flex" flexWrap="wrap">
                  <SubtleGlowPaper variant="outlined" style={{ 
                    padding: 12, 
                    margin: '0 8px 8px 0', 
                    backgroundColor: '#212b36', 
                    color: '#e0e0e0',
                    flexGrow: 1,
                    border: '1px solid rgba(65, 90, 115, 0.5)'
                  }}>
                    <Typography variant="body2" align="center" style={{ color: '#e0e0e0' }}>
                      <strong>{analysis.document_count}</strong><br/>
                      Documents
                    </Typography>
                  </SubtleGlowPaper>
                  <SubtleGlowPaper variant="outlined" style={{ 
                    padding: 12, 
                    margin: '0 0 8px 0', 
                    backgroundColor: '#212b36', 
                    color: '#e0e0e0',
                    flexGrow: 1,
                    border: '1px solid rgba(65, 90, 115, 0.5)'
                  }}>
                    <Typography variant="body2" align="center" style={{ color: '#e0e0e0' }}>
                      <strong>{analysis.chunk_count}</strong><br/>
                      Chunks
                    </Typography>
                  </SubtleGlowPaper>
                </Box>
                <Box display="flex" flexWrap="wrap" mt={1}>
                  <SubtleGlowPaper variant="outlined" style={{ 
                    padding: 12, 
                    margin: '0 8px 8px 0', 
                    backgroundColor: '#212b36', 
                    color: '#e0e0e0',
                    flexGrow: 1,
                    border: '1px solid rgba(65, 90, 115, 0.5)'
                  }}>
                    <Typography variant="body2" align="center" style={{ color: '#e0e0e0' }}>
                      <strong>{analysis.sample_size}</strong><br/>
                      Samples Analyzed
                    </Typography>
                  </SubtleGlowPaper>
                  <SubtleGlowPaper variant="outlined" style={{ 
                    padding: 12, 
                    margin: '0 0 8px 0', 
                    backgroundColor: '#212b36', 
                    color: '#e0e0e0',
                    flexGrow: 1,
                    border: '1px solid rgba(65, 90, 115, 0.5)'
                  }}>
                    <Typography variant="body2" align="center" style={{ color: '#e0e0e0' }}>
                      <strong>{formatSamplingStrategy(analysis.sampling_strategy)}</strong><br/>
                      Sampling Method
                    </Typography>
                  </SubtleGlowPaper>
                </Box>
              </div>
              
              <div style={classes.analysisSection}>
                <Typography variant="subtitle1" gutterBottom style={{ color: '#e0e0e0' }}>
                  Suggested Queries
                  <Tooltip title="Try these queries to test your vectorstore's retrieval capabilities">
                    <HelpOutlineIcon style={{...classes.helpIcon, color: '#4285f4'}} />
                  </Tooltip>
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom style={{ color: '#b0b0b0' }}>
                  Click on any suggestion to try it:
                </Typography>
                <Box display="flex" flexWrap="wrap" mt={1}>
                  {analysis?.example_queries && analysis.example_queries.length > 0 ? (
                    analysis.example_queries.map((query, index) => {
                      // Clean query from markdown formatting for display in chip
                      const cleanQuery = query.replace(/[*#_`]/g, '');
                      const displayQuery = cleanQuery.length > 60 ? cleanQuery.substring(0, 57) + '...' : cleanQuery;
                      
                      return (
                        <Chip
                          key={index}
                          label={displayQuery}
                          onClick={() => handleExampleClick(query)}
                          style={{
                            ...classes.exampleChip, 
                            margin: '0 8px 8px 0', 
                            maxWidth: '100%', 
                            height: 'auto', 
                            whiteSpace: 'normal', 
                            padding: '4px 0',
                            backgroundColor: 'rgba(65, 90, 115, 0.2)',
                            border: '1px solid rgba(66, 133, 244, 0.5)',
                            color: '#e0e0e0'
                          }}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      )
                    })
                  ) : (
                    <Typography variant="body2" style={{ color: '#b0b0b0' }}>
                      No suggested queries available from the LLM. Try one of the default queries below.
                    </Typography>
                  )}
                  
                  {(!analysis?.example_queries || analysis.example_queries.length === 0) && (
                    <Box display="flex" flexWrap="wrap" mt={1}>
                      {defaultExampleQueries.map((query, index) => (
                        <Chip
                          key={index}
                          label={query}
                          onClick={() => handleExampleClick(query)}
                          style={{
                            ...classes.exampleChip, 
                            margin: '0 8px 8px 0',
                            backgroundColor: 'rgba(65, 90, 115, 0.2)',
                            border: '1px solid rgba(66, 133, 244, 0.5)',
                            color: '#e0e0e0'
                          }}
                          color="secondary"
                          variant="outlined"
                          size="small"
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </div>
              
              <Box mt={2}>
                <Typography variant="body2" style={{ color: '#b0b0b0' }}>
                  <InfoIcon fontSize="small" style={{ verticalAlign: 'middle', marginRight: 4, color: '#4285f4' }} />
                  Try both the Raw Results and AI-Enhanced modes with the same query to see how they differ.
                </Typography>
              </Box>
            </AnimatedGradientPaper>
          )}
        </Grid>

        {/* Right Column - Query Input and Settings */}
        <Grid item xs={12} md={6}>
          <SubtleGlowPaper style={{ 
            padding: 16, 
            marginBottom: 8, 
            backgroundColor: '#212b36', 
            display: 'flex', 
            alignItems: 'center',
            border: '1px solid rgba(65, 90, 115, 0.3)' 
          }}>
            <SearchIcon style={{ marginRight: 8, color: '#4285f4' }} />
            <Typography variant="subtitle1" style={{ fontWeight: 500, color: '#e0e0e0' }}>
              Query & Test
            </Typography>
          </SubtleGlowPaper>
          
          <GradientBorderPaper style={{ 
            padding: 16, 
            marginBottom: 16,
            backgroundColor: '#1a2027',
            color: '#e0e0e0',
            border: '1px solid rgba(65, 90, 115, 0.5)'
          }}>
            <Typography variant="subtitle1" gutterBottom style={{ color: '#e0e0e0' }}>
              Enter a Query
            </Typography>
            
            <TextField
              label="Enter your query"
              variant="outlined"
              fullWidth
              value={queryText}
              onChange={handleQueryChange}
              style={classes.queryInput}
              placeholder="What would you like to know about this data?"
              disabled={isQuerying}
            />
            
            {analysis && (
              <Box style={classes.exampleContainer}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  <strong>Quick Start:</strong> Try one of these example queries:
                </Typography>
                <Box display="flex" flexWrap="wrap">
                  {analysis?.example_queries && analysis.example_queries.length > 0 ? (
                    analysis.example_queries.slice(0, 3).map((example, index) => (
                      <Chip
                        key={index}
                        label={example}
                        onClick={() => handleExampleClick(example)}
                        style={{...classes.exampleChip, margin: '0 8px 8px 0'}}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    ))
                  ) : (
                    defaultExampleQueries.slice(0, 3).map((example, index) => (
                      <Chip
                        key={index}
                        label={example}
                        onClick={() => handleExampleClick(example)}
                        style={{...classes.exampleChip, margin: '0 8px 8px 0'}}
                        color="secondary"
                        variant="outlined"
                        size="small"
                      />
                    ))
                  )}
                </Box>
              </Box>
            )}
            
            {/* Query Mode Selector moved below query input */}
            <GradientCornersPaper style={{ padding: '12px', marginTop: '16px', marginBottom: '16px' }}>
              <Box display="flex" alignItems="center">
                <Typography variant="body2" color="textSecondary" style={{ marginRight: '12px' }}>
                  <strong>Query Modes:</strong>
                </Typography>
                
                <Box display="flex" alignItems="center">
                  <Tooltip title="Returns direct vector matches based on semantic similarity">
                    <Button
                      style={{
                        ...classes.queryModeButton,
                        ...(queryMode === 'raw' ? classes.activeModeButton : {})
                      }}
                      variant={queryMode === 'raw' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => handleQueryModeChange('raw')}
                      startIcon={<SearchIcon />}
                    >
                      Raw Results
                    </Button>
                  </Tooltip>
                  <Typography variant="body2" color="textSecondary" style={{ marginLeft: '8px', marginRight: '16px' }}>
                    See exact matching document chunks
                  </Typography>
                </Box>
                
                <Box display="flex" alignItems="center">
                  <Tooltip title="Uses an LLM to generate a coherent answer based on the documents">
                    <Button
                      style={{
                        ...classes.queryModeButton,
                        ...(queryMode === 'llm' ? classes.activeModeButton : {})
                      }}
                      variant={queryMode === 'llm' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => handleQueryModeChange('llm')}
                      startIcon={<EmojiObjectsIcon />}
                    >
                      AI-Enhanced
                    </Button>
                  </Tooltip>
                  <Typography variant="body2" color="textSecondary" style={{ marginLeft: '8px' }}>
                    Get an AI-generated answer from documents
                  </Typography>
                </Box>
              </Box>
            </GradientCornersPaper>
            
            {/* Run Query button moved below query mode selector */}
            <Button
              variant="contained"
              color="primary"
              style={classes.queryButton}
              onClick={executeQuery}
              disabled={!queryText.trim() || isQuerying}
              startIcon={isQuerying ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              fullWidth
            >
              {isQuerying ? 'Querying...' : queryMode === 'raw' ? 'Run Query' : 'Ask AI'}
            </Button>
            
            <Accordion 
              expanded={settingsExpanded} 
              onChange={() => setSettingsExpanded(!settingsExpanded)}
              style={{...classes.expandedSettings, marginTop: 16}}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="query-settings-content"
                id="query-settings-header"
              >
                <TuneIcon style={{ marginRight: 8 }} />
                <Typography>Query Settings</Typography>
              </AccordionSummary>
              <AccordionDetails style={classes.settingsDetails}>
                <Typography variant="body2" color="textSecondary" gutterBottom style={{ marginBottom: 8 }}>
                  Adjust how many results to return and the minimum relevance score.
                </Typography>
                
                {/* Place both sliders side by side in a Grid */}
                <Grid container spacing={2}>
                  {/* Maximum Results Slider */}
                  <Grid 
                    item 
                    xs={12} 
                    sm={6}
                    style={classes.sliderDivider}
                  >
                    <Box style={{...classes.compactSliderContainer, paddingRight: 16}}>
                      <Box style={classes.sliderLabel}>
                        <Typography variant="body2" id="max-results-slider">
                          Maximum Results: <strong>{topK}</strong>
                        </Typography>
                      </Box>
                      <Slider
                        value={topK}
                        onChange={(event, newValue) => setTopK(newValue)}
                        aria-labelledby="max-results-slider"
                        valueLabelDisplay="auto"
                        step={1}
                        marks={[
                          { value: 3, label: '3' },
                          { value: 10, label: '10' },
                          { value: 20, label: '20' }
                        ]}
                        min={3}
                        max={20}
                        style={classes.slider}
                      />
                      <Typography variant="caption" color="textSecondary" style={classes.sliderCaption}>
                        Max document chunks to retrieve
                      </Typography>
                    </Box>
                  </Grid>
                  
                  {/* Relevance Threshold Slider */}
                  <Grid item xs={12} sm={6}>
                    <Box style={{...classes.compactSliderContainer, paddingLeft: 16}}>
                      <Box style={classes.sliderLabel}>
                        <Typography variant="body2" id="score-threshold-slider">
                          Relevance Threshold: <strong>{scoreThreshold.toFixed(2)}</strong>
                        </Typography>
                      </Box>
                      <Slider
                        value={scoreThreshold}
                        onChange={(event, newValue) => setScoreThreshold(newValue)}
                        aria-labelledby="score-threshold-slider"
                        valueLabelDisplay="auto"
                        step={0.05}
                        marks={[
                          { value: 0, label: '0' },
                          { value: 0.5, label: '0.5' },
                          { value: 1, label: '1' }
                        ]}
                        min={0}
                        max={1}
                        style={classes.slider}
                      />
                      <Typography variant="caption" color="textSecondary" style={classes.sliderCaption}>
                        Higher = more relevant results. Only results with a score above this threshold will be shown.
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                {/* Classification Filter Section */}
                <Box style={classes.filterSection}>
                  <FormLabel component="legend">Filter by Classification</FormLabel>
                  <FormGroup style={classes.checkboxGroup}>
                    {CLASSIFICATION_LEVELS.map((level) => (
                      <FormControlLabel
                        key={level}
                        control={
                          <Checkbox
                            checked={selectedClassifications.includes(level)}
                            onChange={handleClassificationChange}
                            name={level}
                            size="small"
                          />
                        }
                        label={level}
                        style={classes.checkboxLabel}
                      />
                    ))}
                  </FormGroup>
                  <FormHelperText>Select the classification levels to include in the results.</FormHelperText>
                </Box>
              </AccordionDetails>
            </Accordion>
          </GradientBorderPaper>
          
          {error && (
            <Alert severity="warning" style={{ marginBottom: 16 }}>
              {error}
            </Alert>
          )}
          
          {/* LLM Response Section */}
          {queryMode === 'llm' && llmResponse && (
            <div style={{
              ...classes.llmAnswerContainer,
              backgroundColor: '#1a2027',
              border: '1px solid rgba(65, 90, 115, 0.5)',
              color: '#e0e0e0'
            }}>
              <Box mb={2}>
                <Alert severity="info" style={{
                  backgroundColor: '#2c3a47',
                  color: '#e0e0e0',
                  border: '1px solid rgba(25, 118, 210, 0.3)'
                }}>
                  <Typography variant="body2" style={{ color: '#e0e0e0' }}>
                    This response was generated by AI based on the most relevant document chunks found in your vector store.
                    The sources used are listed below the answer.
                  </Typography>
                </Alert>
              </Box>
              
              <Typography variant="h6" gutterBottom style={{ color: '#e0e0e0' }}>
                AI Response
              </Typography>
              
              <HighContrastGradientPaper elevation={1} style={{ 
                padding: '16px', 
                backgroundColor: '#1e272e', 
                color: '#e0e0e0',
                border: '1px solid rgba(65, 90, 115, 0.5)'
              }}>
                <div style={{
                  ...classes.llmAnswer,
                  color: '#e0e0e0'
                }}>
                  {renderMarkdown(llmResponse.answer)}
                </div>
              </HighContrastGradientPaper>

              {/* Add a button to copy the response to clipboard */}
              <Box mt={1} display="flex" justifyContent="flex-end">
                <CopyButton
                  onClick={() => {
                    navigator.clipboard.writeText(llmResponse.answer);
                    // You could add a snackbar notification here
                  }}
                  tooltip="Copy response"
                />
              </Box>
              
              {llmResponse.sources && llmResponse.sources.length > 0 && (
                <div style={{
                  ...classes.sourcesList,
                  backgroundColor: '#2c3a47',
                  padding: '16px',
                  marginTop: '24px',
                  borderRadius: '4px',
                  border: '1px solid rgba(65, 90, 115, 0.5)'
                }}>
                  <Typography variant="subtitle2" style={{
                    ...classes.sourcesHeading,
                    color: '#e0e0e0'
                  }}>
                    Sources Used:
                  </Typography>
                  
                  <GradientBorderPaper variant="outlined" style={{ 
                    padding: '12px', 
                    backgroundColor: '#212b36',
                    color: '#e0e0e0',
                    border: '1px solid rgba(65, 90, 115, 0.5)'
                  }}>
                    <Typography variant="body2" style={{ color: '#b0b0b0' }} gutterBottom>
                      The AI response is based on these {llmResponse.sources.length} document chunks:
                    </Typography>
                    
                    <Box display="flex" flexWrap="wrap" mt={1}>
                      {llmResponse.sources.map((source, index) => {
                        // Extract document ID from metadata
                        const sourceId = `source-${index}-${source.metadata?.document_id || index}`;
                        const isExpanded = expandedDocId === sourceId;
                        
                        return (
                          <React.Fragment key={index}>
                            <Tooltip title="Click to view full document text">
                              <Chip
                                size="small"
                                label={
                                  <Box display="flex" alignItems="center">
                                    <span>Source {index + 1}</span>
                                    {isExpanded ? 
                                      <ExpandLessIcon fontSize="small" style={{ marginLeft: 4, width: 16, height: 16 }} /> :
                                      <ExpandMoreIcon fontSize="small" style={{ marginLeft: 4, width: 16, height: 16 }} />
                                    }
                                  </Box>
                                }
                                style={{ 
                                  ...classes.metadataChip,
                                  ...classes.documentChip,
                                  margin: '0 4px 4px 0',
                                  backgroundColor: `${getScoreColor(source.score)}20`,
                                  border: `1px solid ${getScoreColor(source.score)}`,
                                  fontWeight: source.score >= 0.7 ? 'bold' : 'normal',
                                  color: '#e0e0e0'
                                }}
                                onClick={() => handleDocExpand(sourceId)}
                              />
                            </Tooltip>
                            
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit style={{ width: '100%' }}>
                              <div style={{
                                ...classes.expandedDocContainer,
                                backgroundColor: '#212b36',
                                border: '1px solid rgba(65, 90, 115, 0.5)',
                                color: '#e0e0e0'
                              }}>
                                <div style={classes.expandedDocHeader}>
                                  <Typography variant="subtitle2" style={{ color: '#e0e0e0' }}>
                                    Source Document {index + 1}
                                  </Typography>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => setExpandedDocId(null)}
                                    aria-label="close"
                                    style={{ color: '#e0e0e0' }}
                                  >
                                    <ExpandLessIcon fontSize="small" />
                                  </IconButton>
                                </div>
                                
                                {/* Enhanced metadata display for source */}
                                <MetadataDisplay metadata={source.metadata} />
                                
                                <div style={{
                                  ...classes.expandedDocText,
                                  ...((!showFullText[sourceId]) ? classes.expandedDocTextLimited : {}),
                                  backgroundColor: '#1a2027',
                                  border: '1px solid rgba(65, 90, 115, 0.3)',
                                  color: '#e0e0e0',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  overflow: 'auto'
                                }}>
                                  {source.text || source.text_preview || "Full document text not available."}
                                </div>
                                
                                {(source.text && source.text.length > 500) && (
                                  <Button 
                                    style={{
                                      ...classes.showMoreButton,
                                      color: '#4285f4'
                                    }}
                                    onClick={() => toggleShowFullText(sourceId)}
                                    size="small"
                                    color="primary"
                                    variant="text"
                                  >
                                    {showFullText[sourceId] ? "Show less" : "Show more"}
                                  </Button>
                                )}
                              </div>
                            </Collapse>
                          </React.Fragment>
                        );
                      })}
                    </Box>
                    
                    <Typography variant="body2" style={{ color: '#b0b0b0', marginTop: 8 }}>
                      Sources are ordered by relevance. Darker colors indicate higher relevance to your query.
                      Click on any source to view its full text and metadata.
                    </Typography>
                  </GradientBorderPaper>
                </div>
              )}
            </div>
          )}
          
          {/* Raw Query Results Section with Pagination */}
          {queryMode === 'raw' && queryResults && queryResults.length > 0 && (
            <div style={classes.resultContainer}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" gutterBottom>
                  Query Results ({queryResults.length})
                </Typography>
              </Box>
              
              <Alert severity="info" style={{ marginBottom: 16 }}>
                <Typography variant="body2">
                  Showing document chunks that semantically match your query, ordered by relevance score. 
                  Highlighted terms indicate key matches with your query.
                </Typography>
                
                {/* Add compact legend for relevance scores */}
                <Box mt={1} display="flex" alignItems="center" flexWrap="wrap">
                  <Typography variant="caption" color="textSecondary" style={{ marginRight: 8 }}>
                    <strong>Relevance scale:</strong>
                  </Typography>
                  <Box display="flex" alignItems="center" flexWrap="wrap">
                    <Box p={0.5} mr={1} style={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', borderLeft: '4px solid #ff9800', borderRadius: 4, fontSize: '0.75rem' }}>
                      <Typography variant="caption">0.0-0.4: Low</Typography>
                    </Box>
                    <Box p={0.5} mr={1} style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)', borderLeft: '4px solid #ffc107', borderRadius: 4, fontSize: '0.75rem' }}>
                      <Typography variant="caption">0.4-0.6: Moderate</Typography>
                    </Box>
                    <Box p={0.5} mr={1} style={{ backgroundColor: 'rgba(139, 195, 74, 0.1)', borderLeft: '4px solid #8bc34a', borderRadius: 4, fontSize: '0.75rem' }}>
                      <Typography variant="caption">0.6-0.8: High</Typography>
                    </Box>
                    <Box p={0.5} style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', borderLeft: '4px solid #4caf50', borderRadius: 4, fontSize: '0.75rem' }}>
                      <Typography variant="caption">0.8-1.0: Very High</Typography>
                    </Box>
                  </Box>
                </Box>
              </Alert>
              
              {displayedResults.map((result, index) => renderResultItem(result, index))}
              
              {/* Add pagination */}
              <TablePagination
                component="div"
                count={queryResults.length}
                page={page}
                onChangePage={handleChangePage}
                rowsPerPage={rowsPerPage}
                onChangeRowsPerPage={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
              />
            </div>
          )}
          
          {queryMode === 'raw' && queryResults && queryResults.length === 0 && (
            <GradientBorderPaper style={classes.noResults}>
              <InfoIcon color="disabled" style={{ fontSize: 48, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>
                No Matching Results
              </Typography>
              <Typography variant="body2">
                Try adjusting your query or lowering the relevance threshold to see more results.
              </Typography>
            </GradientBorderPaper>
          )}
          
          {!hasSearched && !queryResults && !llmResponse && !isQuerying && (
            <GradientBorderPaper style={{ 
              padding: 24, 
              marginTop: 16, 
              textAlign: 'center', 
              backgroundColor: 'rgba(245, 245, 245, 0.7)',
              border: '1px dashed rgba(0, 0, 0, 0.12)',
              minHeight: analysis ? '300px' : '400px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <SearchIcon style={{ fontSize: 48, color: 'rgba(0, 0, 0, 0.3)', marginBottom: 16 }} />
              <Typography variant="h6" gutterBottom>
                Enter a query to search your vector store
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ maxWidth: '80%', marginBottom: 16 }}>
                {analysis 
                  ? "Type your own question or click one of the example queries above to search through your documents." 
                  : "First analyze your vector store to understand what's in it, then ask questions to search through your documents."}
              </Typography>
              
              {!analysis && (
                <Box mt={2} display="flex" flexWrap="wrap" justifyContent="center">
                  {defaultExampleQueries.map((example, index) => (
                    <Chip
                      key={index}
                      label={example}
                      onClick={() => handleExampleClick(example)}
                      style={{...classes.exampleChip, margin: '4px'}}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              )}

              {analysis && (
                <Button
                  variant="outlined"
                  color="primary"
                  style={{ marginTop: 16 }}
                  disabled={!queryText.trim()}
                  onClick={executeQuery}
                  startIcon={<SearchIcon />}
                >
                  Run Query
                </Button>
              )}
            </GradientBorderPaper>
          )}
          
          {isQuerying && (
            <GradientBorderPaper style={{ 
              padding: 24, 
              marginTop: 16, 
              textAlign: 'center',
              backgroundColor: 'rgba(250, 250, 250, 0.8)',
              border: '1px solid rgba(25, 118, 210, 0.12)',
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <CircularProgress size={48} color="primary" />
              <Typography variant="h6" style={{ marginTop: 24, color: '#1976d2' }}>
                {queryMode === 'raw' ? 'Searching Vector Store...' : 'Generating AI Response...'}
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ maxWidth: '80%', marginTop: 8 }}>
                {queryMode === 'raw' 
                  ? 'Finding the most semantically similar document chunks to your query...' 
                  : 'The AI is analyzing relevant documents to generate a comprehensive response to your question...'}
              </Typography>
              <Typography variant="caption" color="textSecondary" style={{ marginTop: 24 }}>
                This may take a few seconds depending on the complexity of your query.
              </Typography>
            </GradientBorderPaper>
          )}
        </Grid>
      </Grid>
    </StyledContainer>
  );
};

export default QueryTester; 