import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Collapse,
  IconButton,
  TextField,
  Chip,
} from '@material-ui/core';
import Pagination from '@material-ui/lab/Pagination';
import { makeStyles } from '@material-ui/core/styles';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
  Chat as ChatIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@material-ui/icons';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

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
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
  },
  searchField: {
    flexGrow: 1,
    marginRight: theme.spacing(1),
  },
  treeContainer: {
    marginTop: theme.spacing(2),
  },
  nested: {
    paddingLeft: theme.spacing(4),
  },
  nodeContent: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  metadata: {
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
    marginTop: theme.spacing(1),
  },
  interaction: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
  },
  prompt: {
    backgroundColor: theme.palette.grey[100],
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
  },
  response: {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  relevancyChip: {
    marginLeft: theme.spacing(1),
  },
  nodeHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  markdown: {
    '& p': {
      margin: 0,
    },
    '& code': {
      backgroundColor: theme.palette.grey[100],
      padding: '2px 4px',
      borderRadius: 4,
    },
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    padding: theme.spacing(4),
  },
  noData: {
    padding: theme.spacing(4),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  pageInfo: {
    textAlign: 'center',
    marginBottom: theme.spacing(1),
    color: theme.palette.text.secondary,
  }
}));

function ConversationTree() {
  const classes = useStyles();
  const [conversations, setConversations] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [expandedInteractions, setExpandedInteractions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(5);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Reset to first page when search term changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('http://localhost:8009/conversations/list');
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load conversations. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleNodeToggle = (nodeId) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleSubNodeToggle = (nodeId) => {
    setExpandedInteractions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handlePageChange = (event, value) => {
    setPage(value);
    // Collapse all nodes when changing pages
    setExpandedNodes(new Set());
    setExpandedInteractions(new Set());
  };

  const renderResponse = (response, metadata, classes) => {
    // If we have structured response data, render it accordingly
    if (metadata?.response_type && metadata?.response_data) {
      switch (metadata.response_type) {
        case 'relevancy_check':
          return (
            <>
              <ReactMarkdown className={classes.markdown}>
                {metadata.response_data.reason}
              </ReactMarkdown>
              <Box mt={1}>
                <Chip
                  className={classes.relevancyChip}
                  icon={metadata.response_data.relevant ? <CheckCircleIcon /> : <CancelIcon />}
                  label={metadata.response_data.relevant ? "Relevant" : "Not Relevant"}
                  color={metadata.response_data.relevant ? "primary" : "default"}
                  size="small"
                />
              </Box>
            </>
          );
        default:
          return (
            <ReactMarkdown className={classes.markdown}>
              {response}
            </ReactMarkdown>
          );
      }
    }
    
    // Default string response
    return (
      <ReactMarkdown className={classes.markdown}>
        {response}
      </ReactMarkdown>
    );
  };

  const renderInteraction = (interaction, classes) => (
    <Box key={interaction.id} className={classes.interaction}>
      <Box className={classes.prompt}>
        <Typography variant="caption" color="textSecondary">
          {interaction.metadata?.prompt_name ? 
            `Prompt: ${interaction.metadata.prompt_name}` : 
            'Prompt:'}
        </Typography>
        <ReactMarkdown className={classes.markdown}>
          {interaction.prompt}
        </ReactMarkdown>
      </Box>
      <Box className={classes.response}>
        <Typography variant="caption" color="textSecondary">Response:</Typography>
        {renderResponse(interaction.response, interaction.metadata, classes)}
      </Box>
      {interaction.metadata && (
        <Box mt={1}>
          {interaction.metadata.model && (
            <Chip
              className={classes.chip}
              label={`Model: ${interaction.metadata.model}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      )}
    </Box>
  );

  const renderConversation = (conversation, classes) => {
    const isExpanded = expandedNodes.has(conversation.id);

    return (
      <Paper key={conversation.id} elevation={1} style={{ margin: '8px 0' }}>
        <ListItem 
          button 
          onClick={() => handleNodeToggle(conversation.id)}
        >
          <IconButton size="small">
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          <ListItemText
            primary={
              <div className={classes.nodeContent}>
                <Box className={classes.nodeHeader}>
                  <ChatIcon style={{ marginRight: 8 }} />
                  <Typography variant="subtitle1">
                    {conversation.question}
                  </Typography>
                </Box>
                <Typography className={classes.metadata}>
                  Created: {new Date(conversation.timestamp).toLocaleString()}
                  {conversation.session_id && (
                    <Chip
                      className={classes.chip}
                      label={`Session: ${conversation.session_id}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Typography>
              </div>
            }
          />
        </ListItem>
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {Object.entries(conversation.nodes || {}).map(([nodeId, node]) => {
              const isSubNodeExpanded = expandedInteractions.has(nodeId);
              
              return (
                <React.Fragment key={nodeId}>
                  <ListItem 
                    className={classes.nested}
                    button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubNodeToggle(nodeId);
                    }}
                  >
                    <IconButton size="small">
                      {isSubNodeExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                    <ListItemText
                      primary={
                        <Box className={classes.nodeHeader}>
                          <Typography variant="subtitle2">
                            {node.name} ({node.role})
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  <Collapse in={isSubNodeExpanded} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {node.interactions && node.interactions.map(interaction => (
                        <ListItem key={interaction.id} className={classes.nested} style={{ paddingLeft: 48 }}>
                          {renderInteraction(interaction, classes)}
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </React.Fragment>
              );
            })}
          </List>
        </Collapse>
      </Paper>
    );
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredConversations.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedConversations = filteredConversations.slice(startIndex, endIndex);

  return (
    <div className={classes.root}>
      <Box className={classes.header}>
        <Typography variant="h4">Conversation Tree</Typography>
      </Box>

      <Box className={classes.searchBox}>
        <TextField
          className={classes.searchField}
          variant="outlined"
          size="small"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon color="action" />,
          }}
        />
      </Box>

      <Paper className={classes.treeContainer}>
        {loading ? (
          <div className={classes.loading}>
            <CircularProgress />
          </div>
        ) : error ? (
          <div className={classes.noData}>
            <Typography color="error">{error}</Typography>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className={classes.noData}>
            <Typography>No conversations found</Typography>
          </div>
        ) : (
          <>
            <Typography className={classes.pageInfo}>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredConversations.length)} of {filteredConversations.length} conversations
            </Typography>
            <List>
              {paginatedConversations.map(conversation => 
                renderConversation(conversation, classes)
              )}
            </List>
            {totalPages > 1 && (
              <Box className={classes.paginationContainer}>
                <Pagination 
                  count={totalPages} 
                  page={page} 
                  onChange={handlePageChange} 
                  color="primary" 
                  showFirstButton 
                  showLastButton
                />
              </Box>
            )}
          </>
        )}
      </Paper>
    </div>
  );
}

export default ConversationTree; 