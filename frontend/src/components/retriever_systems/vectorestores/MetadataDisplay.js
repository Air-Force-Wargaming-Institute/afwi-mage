import React from 'react';
import {
  Box,
  Chip,
  Grid,
  Typography,
  Tooltip,
  makeStyles
} from '@material-ui/core';
import {
  Description as DocumentIcon,
  Image as ImageIcon,
  TableChart as TableIcon,
  Language as LanguageIcon,
  Timer as TimerIcon,
  Security as SecurityIcon,
  Info as InfoIcon,
  Grain as ChunkIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
  metadataSection: {
    marginBottom: theme.spacing(2),
  },
  sectionTitle: {
    marginBottom: theme.spacing(1),
    display: 'flex',
    alignItems: 'center',
    '& svg': {
      marginRight: theme.spacing(1),
      fontSize: '1.2rem',
    },
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  securityChip: {
    fontWeight: 'bold',
  },
  infoIcon: {
    fontSize: '1rem',
    marginLeft: theme.spacing(0.5),
    color: theme.palette.info.main,
    cursor: 'help',
  },
  unknownChip: {
    backgroundColor: theme.palette.grey[200],
    color: theme.palette.grey[800],
    borderColor: theme.palette.grey[400],
    fontStyle: 'italic',
  },
}));

// Security classification colors
const getSecurityColor = (classification) => {
  const normalizedClass = classification ? classification.toUpperCase().split('//')[0] : 'UNCLASSIFIED';
  const colors = {
    'UNCLASSIFIED': '#4caf50',
    'CONFIDENTIAL': '#ff9800',
    'SECRET': '#f44336',
    'TOP SECRET': '#9c27b0',
    'default': '#757575'
  };
  return colors[normalizedClass] || colors.default;
};

export const SecurityClassification = ({ classification, labelPrefix = "Document:" }) => {
  const classes = useStyles();
  const displayClassification = classification || 'UNKNOWN';
  const isUnknown = displayClassification === 'UNKNOWN';
  const labelText = isUnknown ? `${labelPrefix} Unknown` : `${labelPrefix} ${displayClassification}`;
  const color = isUnknown ? getSecurityColor('default') : getSecurityColor(displayClassification);
  const chipClass = isUnknown ? classes.unknownChip : classes.securityChip;
  
  return (
    <Tooltip title={`${labelPrefix} Security Classification${isUnknown ? ' (Could not be determined)' : ''}`}>
      <Chip
        icon={<SecurityIcon style={{ color: color }} />}
        label={labelText}
        className={`${classes.chip} ${chipClass}`}
        style={{
          backgroundColor: `${color}20`,
          color: color,
          borderColor: color
        }}
        variant="outlined"
        size="small"
      />
    </Tooltip>
  );
};

export const ChunkSecurityClassification = ({ classification, labelPrefix = "Chunk:" }) => {
  const classes = useStyles();
  const displayClassification = classification || 'UNKNOWN';
  const isUnknown = displayClassification === 'UNKNOWN';
  const labelText = isUnknown ? `${labelPrefix} Unknown` : `${labelPrefix} ${displayClassification}`;
  const color = isUnknown ? getSecurityColor('default') : getSecurityColor(displayClassification);
  const chipClass = isUnknown ? classes.unknownChip : classes.securityChip;
  
  return (
    <Tooltip title={`Chunk-Specific Security Classification${isUnknown ? ' (Not detected/inherited)' : ' (Determined from portion markings or inherited)'}`}>
      <Chip
        icon={<ChunkIcon style={{ color: color }} />}
        label={labelText}
        className={`${classes.chip} ${chipClass}`}
        style={{
          backgroundColor: `${color}20`,
          color: color,
          borderColor: color
        }}
        variant="outlined"
        size="small"
      />
    </Tooltip>
  );
};

export const DocumentContext = ({ context }) => {
  const classes = useStyles();
  if (!context) return null;

  return (
    <div className={classes.metadataSection}>
      <Typography variant="subtitle2" className={classes.sectionTitle}>
        <DocumentIcon />
        Document Information
      </Typography>
      <Grid container spacing={1}>
        {context.title && (
          <Grid item>
            <Tooltip title="Document Title">
              <Chip label={`Title: ${context.title}`} className={classes.chip} />
            </Tooltip>
          </Grid>
        )}
        {context.author && (
          <Grid item>
            <Tooltip title="Document Author">
              <Chip label={`Author: ${context.author}`} className={classes.chip} />
            </Tooltip>
          </Grid>
        )}
        {context.creation_date && (
          <Grid item>
            <Tooltip title="Creation Date">
              <Chip label={`Created: ${new Date(context.creation_date).toLocaleDateString()}`} className={classes.chip} />
            </Tooltip>
          </Grid>
        )}
        {context.category && (
          <Grid item>
            <Tooltip title="Document Category">
              <Chip label={`Category: ${context.category}`} className={classes.chip} />
            </Tooltip>
          </Grid>
        )}
      </Grid>
    </div>
  );
};

export const ContentInfo = ({ info }) => {
  const classes = useStyles();
  if (!info) return null;

  return (
    <div className={classes.metadataSection}>
      <Typography variant="subtitle2" className={classes.sectionTitle}>
        <InfoIcon />
        Content Analysis
      </Typography>
      <Grid container spacing={1}>
        {info.language && (
          <Grid item>
            <Tooltip title="Document Language">
              <Chip
                icon={<LanguageIcon />}
                label={`Language: ${info.language.toUpperCase()}`}
                className={classes.chip}
              />
            </Tooltip>
          </Grid>
        )}
        <Grid item>
          <Tooltip title="Contains Images">
            <Chip
              icon={<ImageIcon />}
              label={info.has_images ? 'Has Images' : 'No Images'}
              className={classes.chip}
              color={info.has_images ? 'primary' : 'default'}
              variant="outlined"
            />
          </Tooltip>
        </Grid>
        <Grid item>
          <Tooltip title="Contains Tables">
            <Chip
              icon={<TableIcon />}
              label={info.has_tables ? 'Has Tables' : 'No Tables'}
              className={classes.chip}
              color={info.has_tables ? 'primary' : 'default'}
              variant="outlined"
            />
          </Tooltip>
        </Grid>
        {info.estimated_reading_time > 0 && (
          <Grid item>
            <Tooltip title="Estimated Reading Time">
              <Chip
                icon={<TimerIcon />}
                label={`${info.estimated_reading_time} min read`}
                className={classes.chip}
              />
            </Tooltip>
          </Grid>
        )}
      </Grid>
    </div>
  );
};

export const PageInfo = ({ info }) => {
  const classes = useStyles();
  if (!info) return null;

  return (
    <div className={classes.metadataSection}>
      <Typography variant="subtitle2" className={classes.sectionTitle}>
        Page Information
        <Tooltip title="Information about the specific page where this content was found">
          <InfoIcon className={classes.infoIcon} />
        </Tooltip>
      </Typography>
      <Grid container spacing={1}>
        <Grid item>
          <Chip
            label={`Page ${info.page} of ${info.total_pages}`}
            className={classes.chip}
          />
        </Grid>
        {info.page_word_count > 0 && (
          <Grid item>
            <Chip
              label={`${info.page_word_count} words`}
              className={classes.chip}
            />
          </Grid>
        )}
        {info.is_first_page && (
          <Grid item>
            <Chip
              label="First Page"
              color="primary"
              variant="outlined"
              className={classes.chip}
            />
          </Grid>
        )}
        {info.is_last_page && (
          <Grid item>
            <Chip
              label="Last Page"
              color="primary"
              variant="outlined"
              className={classes.chip}
            />
          </Grid>
        )}
      </Grid>
    </div>
  );
};

export const ChunkInfo = ({ info }) => {
  const classes = useStyles();
  if (!info) return null;

  // Safely access nested properties with fallbacks
  const position = info.position || {};
  const chunkNumber = position.chunk_number || info.index + 1 || 1;
  const totalChunks = position.of_total || info.total_chunks || 1;
  const percentage = position.percentage || Math.round((chunkNumber / totalChunks) * 100);
  const wordCount = info.word_count || 0;

  return (
    <div className={classes.metadataSection}>
      <Typography variant="subtitle2" className={classes.sectionTitle}>
        Chunk Information
        <Tooltip title="Information about this specific text chunk">
          <InfoIcon className={classes.infoIcon} />
        </Tooltip>
      </Typography>
      <Grid container spacing={1}>
        <Grid item>
          <Chip
            label={`Chunk ${chunkNumber} of ${totalChunks}`}
            className={classes.chip}
          />
        </Grid>
        {wordCount > 0 && (
          <Grid item>
            <Chip
              label={`${wordCount} words`}
              className={classes.chip}
            />
          </Grid>
        )}
        <Grid item>
          <Tooltip title="Position in Document">
            <Chip
              label={`${percentage}% through document`}
              className={classes.chip}
            />
          </Tooltip>
        </Grid>
      </Grid>
    </div>
  );
};

export const MetadataDisplay = ({ metadata }) => {
  const classes = useStyles();
  if (!metadata) return null;

  // Get both classifications
  const docSecurity = metadata.security_classification;
  const chunkSecurity = metadata.chunk_classification;
  
  // Determine if chunk security needs separate display
  const showChunkSecurity = chunkSecurity && 
                            (docSecurity !== chunkSecurity || docSecurity === null);
  
  // For page info, check both structured and flat format
  const pageInfo = metadata.page_info || {
    page: metadata.page || 'N/A',
    total_pages: metadata.total_pages || 'N/A',
    is_first_page: metadata.is_first_page || false,
    is_last_page: metadata.is_last_page || false,
    page_percentage: metadata.page_percentage || 0,
    page_word_count: metadata.page_word_count || 0,
    page_has_images: metadata.page_has_images || false,
    page_has_tables: metadata.page_has_tables || false
  };
  
  // For chunk info, check both structured and flat format
  const chunkInfo = metadata.chunk_info || {
    index: metadata.chunk_index || 0,
    total_chunks: metadata.total_chunks || 1,
    char_count: metadata.char_count || 0,
    word_count: metadata.word_count || 0,
    position: metadata.position || {
      chunk_number: metadata.chunk_number || 1,
      of_total: metadata.of_total || 1,
      percentage: metadata.chunk_percentage || 0
    }
  };
  
  // For document context, check both structured and flat format
  const documentContext = metadata.document_context || {
    title: metadata.title || '',
    author: metadata.author || '',
    creation_date: metadata.creation_date || '',
    last_modified: metadata.last_modified || '',
    content_status: metadata.content_status || '',
    category: metadata.category || '',
    content_analysis: metadata.content_analysis || {
      has_images: metadata.has_images || false,
      has_tables: metadata.has_tables || false,
      total_words: metadata.total_words || 0,
      estimated_reading_time: metadata.estimated_reading_time || 0,
      language: metadata.language || 'en'
    }
  };
  
  // For content analysis, handle nested structure or direct properties
  const contentAnalysis = documentContext.content_analysis || documentContext || {
    has_images: metadata.has_images || false,
    has_tables: metadata.has_tables || false,
    total_words: metadata.total_words || 0,
    estimated_reading_time: metadata.estimated_reading_time || 0,
    language: metadata.language || 'en'
  };

  return (
    <Box className={classes.metadataSection}>
      <Box display="flex" flexWrap="wrap" alignItems="center" mb={1}>
        <SecurityClassification classification={docSecurity} labelPrefix="Chunk:" />
        
        {showChunkSecurity && (
          <ChunkSecurityClassification classification={chunkSecurity} labelPrefix="Chunk:" />
        )}
      </Box>
      
      <DocumentContext context={documentContext} />
      <ContentInfo info={contentAnalysis} />
      <PageInfo info={pageInfo} />
      <ChunkInfo info={chunkInfo} />
    </Box>
  );
};

export default MetadataDisplay; 