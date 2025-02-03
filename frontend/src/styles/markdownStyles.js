import React, { useState } from 'react';
import { alpha, useTheme } from '@material-ui/core/styles';
import { Typography, Box } from '@material-ui/core';
import Link from '@material-ui/core/Link';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import IconButton from '@material-ui/core/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import TableContainer from '@material-ui/core/TableContainer';
import Paper from '@material-ui/core/Paper';

// Base styles that all markdown elements inherit
export const markdownBaseStyles = {
  lineHeight: 1.2,
  margin: 0,
  padding: 0,
  textAlign: 'left',
};

// Spacing utilities
const createSpacing = (theme) => ({
  elementSpacing: {
    '& > * + *': {
      marginTop: theme.spacing(1),
    },
  },
  contentSpacing: {
    '& > p + p': { marginTop: theme.spacing(1) },
    '& > h1 + p, & > h2 + p, & > h3 + p': { marginTop: theme.spacing(0.5) },
    '& > p + h1, & > p + h2, & > p + h3': { marginTop: theme.spacing(1.5) },
    '& > blockquote + p': { marginTop: theme.spacing(1) },
    '& > p + blockquote': { marginTop: theme.spacing(1) },
  },
});

// Function to create element-specific styles with theme support
export const createMarkdownElementStyles = (theme) => {
  const spacing = createSpacing(theme);
  
  return {
    root: {
      ...markdownBaseStyles,
      ...spacing.elementSpacing,
      ...spacing.contentSpacing,
    },
    paragraph: {
      ...markdownBaseStyles,
      display: 'block',
      width: '100%',
      fontSize: '1rem',
      color: theme.palette.text.primary,
      '& + &': { marginTop: theme.spacing(1) },
      '& br': {
        display: 'block',
        content: '""',
        marginTop: '0.5em',
      },
    },
    heading: {
      ...markdownBaseStyles,
      fontWeight: 600,
      color: theme.palette.text.primary,
      marginBottom: theme.spacing(1),
      h1: { 
        fontSize: '1.5rem',
        marginTop: theme.spacing(2),
      },
      h2: { 
        fontSize: '1.3rem',
        marginTop: theme.spacing(1.5),
      },
      h3: { 
        fontSize: '1.1rem',
        marginTop: theme.spacing(1),
      },
      h4: { fontSize: '1rem' },
      h5: { fontSize: '0.9rem' },
      h6: { fontSize: '0.8rem' },
    },
    list: {
      ...markdownBaseStyles,
      margin: 0,
      padding: 0,
      paddingLeft: theme.spacing(2),
      listStylePosition: 'outside',
      '& > li': {
        margin: 0,
        padding: 0,
      },
      '& ul, & ol': {
        margin: 0,
        padding: 0,
        paddingLeft: theme.spacing(2),
      }
    },
    listItem: {
      ...markdownBaseStyles,
      margin: 0,
      padding: 0,
      display: 'list-item',
      '& p': {
        display: 'inline',
        margin: 0,
        padding: 0,
      },
      '& > *:first-child': {
        margin: 0,
      },
      '& > *:last-child': {
        margin: 0,
      }
    },
    link: {
      ...markdownBaseStyles,
      color: theme.palette.primary.main,
      textDecoration: 'none',
      '&:hover': {
        textDecoration: 'underline',
      }
    },
    blockQuote: {
      ...markdownBaseStyles,
      borderLeft: `4px solid ${theme.palette.primary.main}`,
      margin: theme.spacing(1, 0),
      padding: theme.spacing(0.5, 2),
      backgroundColor: alpha(theme.palette.primary.main, 0.04),
      borderRadius: `0 ${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0`,
      color: theme.palette.text.secondary,
      position: 'relative',
      '&::before': {
        content: '"""',
        position: 'absolute',
        left: theme.spacing(0.5),
        top: 0,
        color: alpha(theme.palette.primary.main, 0.3),
        fontSize: '1.5rem',
        fontFamily: 'Georgia, serif',
      },
      '& p': {
        margin: 0,
        fontStyle: 'italic',
      },
      '& > * + *': {
        marginTop: theme.spacing(0.5),
      },
    },
    codeBlock: {
      ...markdownBaseStyles,
      margin: theme.spacing(0.25, 0),
      padding: theme.spacing(0.75),
      backgroundColor: '#1e1e1e',
      borderRadius: theme.shape.borderRadius,
      overflow: 'auto',
    },
    tableContainer: {
      width: '100%',
      overflowX: 'auto',
      margin: theme.spacing(1, 0),
      borderRadius: theme.shape.borderRadius,
      border: `1px solid ${theme.palette.divider}`,
      backgroundColor: theme.palette.background.paper,
      position: 'relative',
      '&:hover': {
        '& thead': {
          boxShadow: theme.shadows[2],
        }
      }
    },
    table: {
      ...markdownBaseStyles,
      width: '100%',
      borderCollapse: 'separate',
      borderSpacing: 0,
      '& thead': {
        backgroundColor: theme.palette.primary.main,
        position: 'sticky',
        top: 0,
        zIndex: 1,
        transition: 'box-shadow 0.2s',
      },
      '& th': {
        backgroundColor: theme.palette.primary.main,
        color: '#ffffff',
        fontWeight: 600,
        padding: theme.spacing(1.5),
        borderBottom: `2px solid ${alpha(theme.palette.common.white, 0.1)}`,
        textAlign: 'left',
        fontSize: '0.875rem',
        whiteSpace: 'nowrap',
        '&[align="center"]': {
          textAlign: 'center',
        },
        '&[align="right"]': {
          textAlign: 'right',
        },
        '&:first-of-type': {
          borderTopLeftRadius: theme.shape.borderRadius,
        },
        '&:last-of-type': {
          borderTopRightRadius: theme.shape.borderRadius,
        },
      },
      '& td': {
        padding: theme.spacing(1.5),
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
        fontSize: '0.875rem',
        '&[align="center"]': {
          textAlign: 'center',
        },
        '&[align="right"]': {
          textAlign: 'right',
        },
      },
      '& tr:nth-of-type(odd)': {
        backgroundColor: alpha(theme.palette.primary.main, 0.02),
      },
      '& tr:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.04),
      },
      '& tr:last-child td': {
        borderBottom: 'none',
      },
    },
    inlineCode: {
      ...markdownBaseStyles,
      backgroundColor: alpha(theme.palette.primary.main, 0.05),
      padding: '0.2em 0.4em',
      borderRadius: theme.shape.borderRadius,
      fontSize: '85%',
      fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
      color: theme.palette.primary.main,
      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
      whiteSpace: 'nowrap',
    },
  };
};

// Enhanced CodeBlock component with copy functionality and language display
const CodeBlock = ({ className, children }) => {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeStyles = {
    position: 'relative',
    '& pre': {
      margin: 0,
      padding: theme.spacing(2),
      paddingTop: theme.spacing(4), // Space for language label
      backgroundColor: '#1e1e1e',
      borderRadius: theme.shape.borderRadius,
      overflow: 'auto',
    },
    '& code': {
      fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  };

  const languageLabelStyles = {
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(5), // Space for copy button
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const copyButtonStyles = {
    position: 'absolute',
    top: theme.spacing(0.5),
    right: theme.spacing(0.5),
    color: 'rgba(255, 255, 255, 0.7)',
    '&:hover': {
      color: 'rgba(255, 255, 255, 0.9)',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  };
  
  if (language) {
    return (
      <Box sx={codeStyles}>
        {language && <Typography sx={languageLabelStyles}>{language}</Typography>}
        <CopyToClipboard text={String(children)} onCopy={handleCopy}>
          <IconButton size="small" sx={copyButtonStyles}>
            {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
          </IconButton>
        </CopyToClipboard>
        <SyntaxHighlighter
          style={materialDark}
          language={language}
          PreTag="div"
          showLineNumbers={true}
          wrapLines={true}
          customStyle={{
            margin: 0,
            padding: theme.spacing(2),
            backgroundColor: 'transparent',
          }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </Box>
    );
  }
  
  return <code className={className}>{children}</code>;
};

// Create a reusable markdown components factory
export const createMarkdownComponents = (theme) => ({
  p: ({ children }) => (
    <Typography
      variant="body1"
      component="p"
      sx={createMarkdownElementStyles(theme).paragraph}
    >
      {children}
    </Typography>
  ),
  h1: ({ children }) => (
    <Typography
      variant="h5"
      component="h1"
      sx={{ ...createMarkdownElementStyles(theme).heading, ...createMarkdownElementStyles(theme).heading.h1 }}
    >
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography
      variant="h6"
      component="h2"
      sx={{ ...createMarkdownElementStyles(theme).heading, ...createMarkdownElementStyles(theme).heading.h2 }}
    >
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography
      variant="subtitle1"
      component="h3"
      sx={{ ...createMarkdownElementStyles(theme).heading, ...createMarkdownElementStyles(theme).heading.h3 }}
    >
      {children}
    </Typography>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={createMarkdownElementStyles(theme).list}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={createMarkdownElementStyles(theme).list}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Box component="li" sx={createMarkdownElementStyles(theme).listItem}>
      {children}
    </Box>
  ),
  blockquote: ({ children }) => (
    <Box
      component="blockquote"
      sx={createMarkdownElementStyles(theme).blockQuote}
    >
      {children}
    </Box>
  ),
  pre: ({ children }) => (
    <Box
      component="pre"
      sx={createMarkdownElementStyles(theme).codeBlock}
    >
      {children}
    </Box>
  ),
  a: ({ href, children }) => (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      sx={createMarkdownElementStyles(theme).link}
    >
      {children}
    </Link>
  ),
  code: ({ inline, className, children }) => {
    if (inline) {
      return (
        <Box
          component="code"
          sx={createMarkdownElementStyles(theme).inlineCode}
        >
          {children}
        </Box>
      );
    }
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  table: ({ children }) => (
    <TableContainer 
      component={Paper} 
      sx={createMarkdownElementStyles(theme).tableContainer}
      elevation={0}
    >
      <Box
        component="table"
        sx={createMarkdownElementStyles(theme).table}
      >
        {children}
      </Box>
    </TableContainer>
  ),
  thead: ({ children }) => (
    <Box component="thead">
      {children}
    </Box>
  ),
  tbody: ({ children }) => (
    <Box component="tbody">
      {children}
    </Box>
  ),
  tr: ({ children }) => (
    <Box component="tr">
      {children}
    </Box>
  ),
  th: ({ children, align }) => (
    <Box 
      component="th"
      align={align || 'left'}
    >
      {children}
    </Box>
  ),
  td: ({ children, align }) => (
    <Box 
      component="td"
      align={align || 'left'}
    >
      {children}
    </Box>
  ),
});

// Create a custom hook for markdown components
export const useMarkdownComponents = () => {
  const theme = useTheme();
  return createMarkdownComponents(theme);
}; 