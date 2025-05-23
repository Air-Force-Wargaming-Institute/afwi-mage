import React, { useState, useContext, useEffect } from 'react';
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
    width: '100%',
  },
  prompt: {
    backgroundColor: theme.palette.grey[100],
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(1),
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
  interactionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
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
  const { user, token } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [expandedInteractions, setExpandedInteractions] = useState(new Set());
  const [expandedIndividualInteractions, setExpandedIndividualInteractions] = useState(new Set());
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
      const response = await axios.get(getGatewayUrl('/api/chat/conversations/list'),
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
      );
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

  const handleIndividualInteractionToggle = (interactionId) => {
    setExpandedIndividualInteractions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(interactionId)) {
        newSet.delete(interactionId);
      } else {
        newSet.add(interactionId);
      }
      return newSet;
    });
  };

  const handlePageChange = (event, value) => {
    setPage(value);
    // Collapse all nodes when changing pages
    setExpandedNodes(new Set());
    setExpandedInteractions(new Set());
    setExpandedIndividualInteractions(new Set());
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

  const renderInteraction = (interaction, classes) => {
    const isExpanded = expandedIndividualInteractions.has(interaction.id);
    
    return (
      <Box key={interaction.id} className={classes.interaction}>
        <Box 
          className={classes.interactionHeader}
          onClick={() => handleIndividualInteractionToggle(interaction.id)}
        >
          <Box display="flex" alignItems="center">
            <IconButton size="small">
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography variant="caption" color="textSecondary">
              {interaction.metadata?.prompt_name ? 
                `Prompt: ${interaction.metadata.prompt_name}` : 
                'Prompt:'}
            </Typography>
          </Box>
          {interaction.metadata?.model && (
            <Chip
              className={classes.chip}
              label={`Model: ${interaction.metadata.model}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
        
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box className={classes.prompt}>
            <ReactMarkdown className={classes.markdown}>
              {interaction.prompt}
            </ReactMarkdown>
          </Box>
          <Box className={classes.response}>
            <Typography variant="caption" color="textSecondary">Response:</Typography>
            {renderResponse(interaction.response, interaction.metadata?.metadata, classes)}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const renderConversation = (conversation, classes) => {
    const isExpanded = expandedNodes.has(conversation.id);

    // Build a hierarchical structure from flat nodes
    const buildNodeHierarchy = (nodes) => {
      const rootNodes = [];
      const childrenMap = {};

      // First pass: identify root nodes and create children containers
      Object.entries(nodes || {}).forEach(([nodeId, node]) => {
        if (!node.parent_id) {
          // This is a root node (expert or system)
          rootNodes.push({ id: nodeId, ...node, children: [] });
        } else {
          // This is a child node (collaborator)
          if (!childrenMap[node.parent_id]) {
            childrenMap[node.parent_id] = [];
          }
          childrenMap[node.parent_id].push({ id: nodeId, ...node, children: [] });
        }
      });

      // Second pass: attach children to their parents
      rootNodes.forEach(node => {
        if (childrenMap[node.id]) {
          node.children = childrenMap[node.id];
        }
      });

      return rootNodes;
    };

    const hierarchicalNodes = buildNodeHierarchy(conversation.nodes);

    // Recursive function to render a node and its children
    const renderNode = (node, depth = 0) => {
      const nodeId = node.id;
      const isNodeExpanded = expandedInteractions.has(nodeId);
      const paddingLeft = 16 + (depth * 16); // Increase padding based on depth
      
      return (
        <React.Fragment key={nodeId}>
          <ListItem 
            className={classes.nested}
            button
            onClick={(e) => {
              e.stopPropagation();
              handleSubNodeToggle(nodeId);
            }}
            style={{ paddingLeft }}
          >
            <IconButton size="small">
              {isNodeExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <ListItemText
              primary={
                <Box className={classes.nodeHeader}>
                  <Typography variant="subtitle2">
                    {node.name} ({node.role})
                  </Typography>
                  {node.role === "collaborator" && (
                    <Chip
                      size="small"
                      label="Collaborator"
                      color="secondary"
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </Box>
              }
            />
          </ListItem>
          <Collapse in={isNodeExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {/* Render interactions */}
              {node.interactions && node.interactions.map(interaction => (
                <ListItem key={interaction.id} className={classes.nested} style={{ paddingLeft: paddingLeft + 32 }}>
                  {renderInteraction(interaction, classes)}
                </ListItem>
              ))}
              
              {/* Render child nodes (collaborators) */}
              {node.children && node.children.length > 0 && (
                <Box ml={2}>
                  {node.children.map(childNode => renderNode(childNode, depth + 1))}
                </Box>
              )}
            </List>
          </Collapse>
        </React.Fragment>
      );
    };

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
            {hierarchicalNodes.map(node => renderNode(node))}
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