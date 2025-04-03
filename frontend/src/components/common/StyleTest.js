// This file is component is located in the frontend/src/components/common directory
// It is used to test the styles of the app
// It is not used in the app, but it is useful to have it here
// It is only accessible from the user account dropdown in the header menu when logged in as the admin user
// It contains a comphrehensive set os styles and formatting used throughout the app, to include modular components like the filelist

import React from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  TextField, 
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  useTheme,
  IconButton
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import HomeIcon from '@material-ui/icons/Home';
import FolderIcon from '@material-ui/icons/Folder';
import StorageIcon from '@material-ui/icons/Storage';
import TuneIcon from '@material-ui/icons/Tune';
import ChatIcon from '@material-ui/icons/Chat';
import InfoIcon from '@material-ui/icons/Info';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import CodeIcon from '@material-ui/icons/Code';
import VisibilityIcon from '@material-ui/icons/Visibility';
import GetAppIcon from '@material-ui/icons/GetApp';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// Import our styled components
import { 
  GradientBorderPaper, 
  AnimatedGradientPaper, 
  GradientBorderCard,
  GradientCornersPaper,
  GradientText,
  SubtleGlowPaper,
  HighContrastGradientPaper,
  AnimatedSideNav,
  AnimatedContentArea,
  StyledContainer,
  useContainerStyles
} from '../../styles/StyledComponents';

// Import action buttons from the dedicated file
import {
  DeleteButton,
  EditButton,
  DownloadButton,
  ViewButton,
  AddButton,
  CopyButton,
  DeleteActionButton,
  DeleteText,
  withDeleteStyling,
  DELETE_COLOR
} from '../../styles/ActionButtons';

// Create component-specific styles using makeStyles
const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  colorBox: {
    height: 80,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1)
  },
  textSample: {
    marginBottom: theme.spacing(1)
  },
  flexCenter: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  navItem: {
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(1),
    transition: theme.custom.transition,
    padding: theme.spacing(1, 1.5),
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover
    },
    '&.active': {
      backgroundColor: theme.palette.primary.main,
      '& $navIcon, & $navText': {
        color: 'white'
      }
    }
  },
  navIcon: {
    minWidth: 40,
    color: theme.palette.primary.main
  },
  navText: {
    color: theme.palette.text.primary
  },
  gradientText: {
    background: theme.custom.gradients.horizontal,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    color: 'transparent',
    fontWeight: 600
  }
}));

const StyleTest = () => {
  const classes = useStyles();
  const containerClasses = useContainerStyles();
  const theme = useTheme();

  return (
    <StyledContainer maxWidth="lg">
      <AnimatedGradientPaper elevation={3} style={{ marginBottom: theme.spacing(4) }}>
        <Typography variant="h4" gutterBottom>
          MAGE Material-UI Theme Guide
        </Typography>
        <Typography variant="body1" paragraph>
          This page displays the Material-UI theme implementation with styled components.
          Use this as a reference for implementing the new theming system across the application.
        </Typography>

        {/* COLOR PALETTE */}
        <Box mb={4}>
          <Typography variant="h5" gutterBottom>Theme Color Palette</Typography>
          <Box fontSize="12px" mb={2} fontFamily="monospace" color="text.secondary">
            Colors defined in: src/styles/theme.js (palette section)
          </Box>
          <Grid container spacing={2} style={{ marginTop: theme.spacing(2) }}>
            <Grid item xs={4} sm={2}>
              <Box className={classes.colorBox} bgcolor="primary.main">
                <Typography variant="body2" style={{ color: 'white' }}>primary.main</Typography>
              </Box>
            </Grid>
            <Grid item xs={4} sm={2}>
              <Box className={classes.colorBox} bgcolor="secondary.main">
                <Typography variant="body2" style={{ color: 'white' }}>secondary.main</Typography>
              </Box>
            </Grid>
            <Grid item xs={4} sm={2}>
              <Box className={classes.colorBox} bgcolor="primary.light">
                <Typography variant="body2" style={{ color: 'white' }}>primary.light</Typography>
              </Box>
            </Grid>
            <Grid item xs={4} sm={2}>
              <Box className={classes.colorBox} bgcolor="background.default">
                <Typography variant="body2" style={{ color: 'white' }}>background.default</Typography>
              </Box>
            </Grid>
            <Grid item xs={4} sm={2}>
              <Box className={classes.colorBox} bgcolor="text.primary" style={{ color: 'black' }}>
                <Typography variant="body2">text.primary</Typography>
              </Box>
            </Grid>
            <Grid item xs={4} sm={2}>
              <Box className={classes.colorBox} bgcolor="text.secondary">
                <Typography variant="body2" style={{ color: 'white' }}>text.secondary</Typography>
              </Box>
            </Grid>
          </Grid>
          
          <Grid container spacing={2} style={{ marginTop: theme.spacing(2) }}>
            <Grid item xs={4} sm={2}>
              <Box className={classes.colorBox} bgcolor="background.paper">
                <Typography variant="body2" style={{ color: 'white' }}>background.paper</Typography>
              </Box>
            </Grid>
            <Grid item xs={4} sm={2}>
              <Box className={classes.colorBox} bgcolor="background.lighter">
                <Typography variant="body2" style={{ color: 'white' }}>background.lighter</Typography>
              </Box>
            </Grid>
            <Grid item xs={4} sm={2}>
              <Box className={classes.colorBox} style={{ 
                background: theme.custom.gradients.gradient1,
              }}>
                <Typography variant="body2" style={{ color: 'white' }}>gradients.gradient1</Typography>
              </Box>
            </Grid>
            <Grid item xs={4} sm={2}>
              <Box className={classes.colorBox} bgcolor="background.card">
                <Typography variant="body2" style={{ color: 'white' }}>background.card</Typography>
              </Box>
            </Grid>
            <Grid item xs={4} sm={2}>
              <Box className={classes.colorBox} bgcolor="action.hover">
                <Typography variant="body2" style={{ color: 'white' }}>action.hover</Typography>
              </Box>
            </Grid>
            <Grid item xs={4} sm={2}>
              <Box className={classes.colorBox} bgcolor="primary.main">
                <Typography variant="body2" style={{ color: 'white' }}>table-header-bg</Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Divider style={{ margin: `${theme.spacing(4)}px 0` }} />

        {/* TYPOGRAPHY */}
        <Box mb={4}>
          <Typography variant="h5" gutterBottom>Typography</Typography>
          <Box fontSize="12px" mb={2} fontFamily="monospace" color="text.secondary">
            Typography styles defined in: src/styles/theme.js (typography section)
          </Box>
          
          <GradientBorderPaper elevation={2} style={{ marginBottom: theme.spacing(3) }}>
            <Typography variant="h1" className={classes.textSample}>h1 Heading</Typography>
            <Typography variant="h2" className={classes.textSample}>h2 Heading</Typography>
            <Typography variant="h3" className={classes.textSample}>h3 Heading</Typography>
            <Typography variant="h4" className={classes.textSample}>h4 Heading</Typography>
            <Typography variant="h5" className={classes.textSample}>h5 Heading</Typography>
            <Typography variant="h6" className={classes.textSample}>h6 Heading</Typography>
            <Typography variant="body1" className={classes.textSample}>
              Body 1 text for primary content. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </Typography>
            <Typography variant="body2" color="textSecondary" className={classes.textSample}>
              Body 2 text for secondary content with reduced emphasis.
            </Typography>
            <Typography variant="body1" className={classes.textSample}>
              Text with <Box component="span" fontWeight="fontWeightBold" display="inline">bold</Box>, 
              <Box component="span" fontStyle="italic" display="inline"> italic</Box>, and 
              <Box component="span" color="primary.main" display="inline"> primary color</Box> styling.
            </Typography>
            <Typography variant="body1" className={classes.gradientText} style={{ marginBottom: theme.spacing(2) }}>
              Gradient text effect
            </Typography>
            <Box display="flex" alignItems="center">
              <Typography variant="caption" style={{ marginRight: theme.spacing(1) }}>caption</Typography>
              <Typography variant="body2" style={{ marginRight: theme.spacing(1) }}>body2</Typography>
              <Typography variant="body1" style={{ marginRight: theme.spacing(1) }}>body1</Typography>
              <Typography variant="subtitle2" style={{ marginRight: theme.spacing(1) }}>subtitle2</Typography>
              <Typography variant="subtitle1" style={{ marginRight: theme.spacing(1) }}>subtitle1</Typography>
              <Typography variant="h6">h6</Typography>
            </Box>
          </GradientBorderPaper>
        </Box>

        <Divider style={{ margin: `${theme.spacing(4)}px 0` }} />

        {/* CONTAINERS */}
        <Box mb={4}>
          <Typography variant="h5" gutterBottom>Styled Container Components</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box mb={3}>
                <Typography variant="body2" gutterBottom>GradientBorderPaper - Standard content container</Typography>
                <GradientBorderPaper elevation={2} style={{ position: 'relative' }}>
                  <Box position="absolute" top={8} right={8} bgcolor="primary.main" borderRadius={4} p={0.5} style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                    GradientBorderPaper
                  </Box>
                  <Box fontSize="12px" mb={2} fontFamily="monospace" color="text.secondary">
                    Modify in: src/styles/StyledComponents.js
                  </Box>
                  Container with gradient border (hairline width)
                </GradientBorderPaper>
              </Box>

              <Box mb={3}>
                <Typography variant="body2" gutterBottom>SubtleGlowPaper - Ultra thin gradient effect</Typography>
                <SubtleGlowPaper elevation={2} style={{ position: 'relative' }}>
                  <Box position="absolute" top={8} right={8} bgcolor="primary.main" borderRadius={4} p={0.5} style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                    SubtleGlowPaper
                  </Box>
                  <Box fontSize="12px" mb={2} fontFamily="monospace" color="text.secondary">
                    Modify in: src/styles/StyledComponents.js
                  </Box>
                  Container with subtle gradient glow (box-shadow based)
                </SubtleGlowPaper>
              </Box>

              <Box mb={3}>
                <Typography variant="body2" gutterBottom>AnimatedGradientPaper - Enhanced animated gradient border</Typography>
                <AnimatedGradientPaper elevation={2} style={{ position: 'relative' }}>
                  <Box position="absolute" top={8} right={8} bgcolor="primary.main" borderRadius={4} p={0.5} style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                    AnimatedGradientPaper
                  </Box>
                  <Box fontSize="12px" mb={2} fontFamily="monospace" color="text.secondary">
                    Modify in: src/styles/StyledComponents.js <br/>
                    Animation keyframes in: src/styles/ThemeProvider.js
                  </Box>
                  Container with animated gradient border
                </AnimatedGradientPaper>
              </Box>

              <Box mb={3}>
                <Typography variant="body2" gutterBottom>HighContrastGradientPaper - Maximum visibility border</Typography>
                <HighContrastGradientPaper elevation={2} style={{ position: 'relative' }}>
                  <Box position="absolute" top={8} right={8} bgcolor="primary.main" borderRadius={4} p={0.5} style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                    HighContrastGradientPaper
                  </Box>
                  <Box fontSize="12px" mb={2} fontFamily="monospace" color="text.secondary">
                    Modify in: src/styles/StyledComponents.js <br/>
                    Animation keyframes in: src/styles/ThemeProvider.js
                  </Box>
                  High-intensity border with pulsing animation effect
                </HighContrastGradientPaper>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box mb={3}>
                <Typography variant="body2" gutterBottom>GradientCornersPaper - Accent corners</Typography>
                <GradientCornersPaper elevation={2} style={{ position: 'relative' }}>
                  <Box position="absolute" top={8} right={8} bgcolor="primary.main" borderRadius={4} p={0.5} style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                    GradientCornersPaper
                  </Box>
                  <Box fontSize="12px" mb={2} fontFamily="monospace" color="text.secondary">
                    Modify in: src/styles/StyledComponents.js
                  </Box>
                  Container with gradient accent corners
                </GradientCornersPaper>
              </Box>

              <Box mb={3}>
                <Typography variant="body2" gutterBottom>containerClasses.infoBox - Information box with gradient border</Typography>
                <Box className={containerClasses.infoBox} style={{ position: 'relative' }}>
                  <Box position="absolute" top={8} right={8} bgcolor="primary.main" borderRadius={4} p={0.5} style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                    containerClasses.infoBox
                  </Box>
                  <Box fontSize="12px" mb={2} fontFamily="monospace" color="text.secondary">
                    Modify in: src/styles/StyledComponents.js (useContainerStyles)
                  </Box>
                  Info box with horizontal gradient border
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Box mb={3} mt={3}>
            <Typography variant="body2" gutterBottom>GradientBorderCard - Card with gradient border on hover</Typography>
            <GradientBorderCard elevation={2} style={{ maxWidth: '400px', position: 'relative' }}>
              <Box position="absolute" top={8} right={8} bgcolor="primary.main" borderRadius={4} p={0.5} style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                GradientBorderCard
              </Box>
              <Box fontSize="12px" mb={2} fontFamily="monospace" color="text.secondary">
                Modify in: src/styles/StyledComponents.js
              </Box>
              <Typography variant="h5" gutterBottom>Card Title</Typography>
              <Typography variant="body2" paragraph>
                Card content with gradient border that becomes more visible on hover.
              </Typography>
              <Button variant="contained" color="primary">Card Action</Button>
            </GradientBorderCard>
          </Box>

          <Box mb={3} mt={4}>
            <Typography variant="body2" gutterBottom>Layout with side navigation</Typography>
            <Box display="flex" style={{ height: 'auto', marginBottom: theme.spacing(2), position: 'relative' }}>
              <AnimatedSideNav>
                <Typography variant="body1" gutterBottom>Side Navigation</Typography>
                <Box className={classes.navItem} display="flex" alignItems="center">
                  <Box className={classes.navIcon} mr={1}><HomeIcon /></Box>
                  <span className={classes.navText}>Dashboard</span>
                </Box>
                <Box className={classes.navItem} display="flex" alignItems="center">
                  <Box className={classes.navIcon} mr={1}><FolderIcon /></Box>
                  <span className={classes.navText}>Documents</span>
                </Box>
                <Box className={`${classes.navItem} active`} display="flex" alignItems="center">
                  <Box className={classes.navIcon} mr={1}><StorageIcon /></Box>
                  <span className={classes.navText}>Databases</span>
                </Box>
                <Box className={classes.navItem} display="flex" alignItems="center">
                  <Box className={classes.navIcon} mr={1}><ChatIcon /></Box>
                  <span className={classes.navText}>Conversations</span>
                </Box>
              </AnimatedSideNav>
              <AnimatedContentArea>
                <Box fontSize="12px" mb={2} fontFamily="monospace" color="text.secondary">
                  Both side navigation and content area use the AnimatedGradientPaper styling<br/>
                  Modify in: src/styles/StyledComponents.js
                </Box>
                Content area with animated border styling
              </AnimatedContentArea>
            </Box>
          </Box>
        </Box>

        <Divider style={{ margin: `${theme.spacing(4)}px 0` }} />

        {/* BUTTONS */}
        <Box mb={4}>
          <Typography variant="h5" gutterBottom>Buttons</Typography>
          <Box fontSize="12px" mb={2} fontFamily="monospace" color="text.secondary">
            Button styles defined in: src/styles/theme.js (overrides.MuiButton section)
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Box mb={3}>
                <Typography variant="body2" gutterBottom>Contained Button (Primary)</Typography>
                <Button variant="contained" color="primary">Primary Button</Button>
              </Box>
              <Box mb={3}>
                <Typography variant="body2" gutterBottom>Contained Button (Secondary)</Typography>
                <Button variant="contained" color="secondary">Secondary Button</Button>
              </Box>
              <Box mb={3}>
                <Typography variant="body2" gutterBottom>Outlined Button</Typography>
                <Button variant="outlined" color="primary">Outlined Button</Button>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Box mb={3}>
                <Typography variant="body2" gutterBottom>Text Button</Typography>
                <Button color="primary">Text Button</Button>
              </Box>
              <Box mb={3}>
                <Typography variant="body2" gutterBottom>Disabled Button</Typography>
                <Button variant="contained" color="primary" disabled>Disabled Button</Button>
              </Box>
              <Box mb={3}>
                <Typography variant="body2" gutterBottom>With Elevation and Hover Lift</Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  style={{ 
                    boxShadow: theme.custom.boxShadow,
                    transition: theme.custom.transition
                  }}
                  className="hover-lift" // We'll still need this class for now
                >
                  Hover Lift Effect
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Box mb={3}>
                <Typography variant="body2" gutterBottom>Buttons with Icons</Typography>
                <Box display="flex" flexWrap="wrap">
                  <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<AddIcon />}
                    style={{ marginRight: theme.spacing(1), marginBottom: theme.spacing(1) }}
                  >
                    Add
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    startIcon={<EditIcon />}
                    style={{ marginRight: theme.spacing(1), marginBottom: theme.spacing(1) }}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    startIcon={<DeleteIcon style={{ color: '#ea4335' }} />}
                    style={{ 
                      marginRight: theme.spacing(1), 
                      marginBottom: theme.spacing(1), 
                      color: '#ea4335',
                      borderColor: '#ea4335'
                    }}
                  >
                    Delete
                  </Button>
                </Box>
              </Box>
              <Box mt={2}>
                <Typography variant="body2" gutterBottom>Action Buttons</Typography>
                <Box display="flex" flexWrap="wrap" alignItems="center">
                  <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', mr: 2 }}>
                    <IconButton color="primary" size="small">
                      <EditIcon />
                    </IconButton>
                    <Typography variant="caption" color="primary">Edit</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', mr: 2 }}>
                    <IconButton color="error" size="small">
                      <DeleteIcon style={{ color: '#ea4335' }}/>
                    </IconButton>
                    <Typography variant="caption" style={{ color: '#ea4335' }}>Delete</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                    <IconButton color="primary" size="small">
                      <AddIcon style={{ color: '#4285f4' }}/>
                    </IconButton>
                    <Typography variant="caption" color="primary">Add</Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Divider style={{ margin: `${theme.spacing(4)}px 0` }} />

        {/* ACTION BUTTONS */}
        <Box mb={4}>
          <Typography variant="h5" gutterBottom>Action Buttons</Typography>
          <Box fontSize="12px" mb={2} fontFamily="monospace" color="text.secondary">
            Action button styles defined in: src/styles/ActionButtons.js and src/styles/theme.js<br/>
            Note: All delete-related elements (icons, text, buttons) use red color
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <GradientBorderPaper>
                <Typography variant="h6" gutterBottom>Standard Action Buttons</Typography>
                <Box display="flex" flexWrap="wrap" alignItems="center">
                  <DeleteButton onClick={() => alert('Delete clicked')} />
                  <EditButton onClick={() => alert('Edit clicked')} />
                  <DownloadButton onClick={() => alert('Download clicked')} />
                  <ViewButton onClick={() => alert('View clicked')} />
                  <AddButton onClick={() => alert('Add clicked')} />
                  <CopyButton onClick={() => alert('Copy clicked')} />
                </Box>
                <Box mt={2}>
                  <Typography variant="body2">
                    These buttons use the styled components from ActionButtons.js with proper tooltips
                  </Typography>
                </Box>
              </GradientBorderPaper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <GradientBorderPaper>
                <Typography variant="h6" gutterBottom>Direct Material-UI IconButton Usage</Typography>
                <Box display="flex" flexWrap="wrap" alignItems="center">
                  <IconButton color="error" size="small" style={{ color: '#ea4335' }}>
                    <DeleteIcon style={{ color: '#ea4335' }} />
                  </IconButton>
                  <IconButton color="primary" size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton color="primary" size="small">
                    <GetAppIcon />
                  </IconButton>
                  <IconButton color="primary" size="small">
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton color="secondary" size="small">
                    <AddIcon />
                  </IconButton>
                </Box>
                <Box mt={2}>
                  <Typography variant="body2">
                    These buttons use direct Material-UI IconButton with color props from theme.js overrides
                  </Typography>
                </Box>
              </GradientBorderPaper>
            </Grid>
          </Grid>

          <Box mt={3}>
            <GradientBorderPaper>
              <Typography variant="h6" gutterBottom>Text Buttons with Icons</Typography>
              <Box display="flex" flexWrap="wrap" alignItems="center" gap={2}>
                <DeleteActionButton onClick={() => alert('Delete text button clicked')}>
                  Delete Item
                </DeleteActionButton>
                <Button color="primary" startIcon={<EditIcon />}>
                  Edit Item
                </Button>
                <Button color="primary" startIcon={<GetAppIcon />}>
                  Download Item
                </Button>
                <Button color="secondary" startIcon={<AddIcon />}>
                  Add Item
                </Button>
              </Box>
              <Box mt={2}>
                <Typography variant="body2">
                  Delete text button uses red color while others use their respective theme colors
                </Typography>
              </Box>
            </GradientBorderPaper>
          </Box>

          <Box mt={3}>
            <GradientBorderPaper>
              <Typography variant="h6" gutterBottom>Delete-Specific Styling Options</Typography>
              <Box display="flex" flexDirection="column" alignItems="flex-start" gap={2}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>1. Delete Text (uses DeleteText component)</Typography>
                  <DeleteText>This text uses the DeleteText component for consistent red styling</DeleteText>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" gutterBottom>2. Consistent DELETE_COLOR export</Typography>
                  <Typography style={{ color: DELETE_COLOR }}>
                    Any component can use the DELETE_COLOR export for consistency: {DELETE_COLOR}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>3. Delete Button with Icon</Typography>
                  <Button 
                    variant="contained" 
                    style={{ backgroundColor: DELETE_COLOR, color: 'white' }}
                    startIcon={<DeleteIcon />}
                  >
                    Delete with Consistent Color
                  </Button>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" gutterBottom>4. Standard Material-UI Button with error color</Typography>
                  <Button 
                    variant="contained" 
                    color="error"
                    startIcon={<DeleteIcon style={{ color: 'white' }} />}
                  >
                    Delete
                  </Button>
                </Box>
              </Box>
              <Box mt={2}>
                <Typography variant="body2">
                  These examples demonstrate different ways to ensure delete elements consistently use red styling
                </Typography>
              </Box>
            </GradientBorderPaper>
          </Box>

          <Box mt={3}>
            <GradientBorderPaper>
              <Typography variant="h6" gutterBottom>Action Buttons in Context</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Annual Report</TableCell>
                      <TableCell>PDF</TableCell>
                      <TableCell>2023-05-10</TableCell>
                      <TableCell>
                        <Box display="flex">
                          <ViewButton tooltip="View document" />
                          <DownloadButton tooltip="Download document" />
                          <EditButton tooltip="Edit document" />
                          <DeleteButton tooltip="Delete document" />
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Project Plan</TableCell>
                      <TableCell>DOCX</TableCell>
                      <TableCell>2023-06-15</TableCell>
                      <TableCell>
                        <Box display="flex" flexWrap="wrap" alignItems="center">
                          <Box mr={1}>
                            <Button size="small" color="primary" startIcon={<VisibilityIcon />}>View</Button>
                          </Box>
                          <DeleteActionButton size="small">Delete</DeleteActionButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </GradientBorderPaper>
          </Box>
        </Box>

        <Divider style={{ margin: `${theme.spacing(4)}px 0` }} />

        {/* FORM ELEMENTS */}
        <Box mb={4}>
          <Typography variant="h5" gutterBottom>Form Elements</Typography>
          <Box fontSize="12px" mb={2} fontFamily="monospace" color="text.secondary">
            Form element styles defined in: src/styles/theme.js (overrides.MuiInputBase, MuiOutlinedInput, etc.)
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Box mb={3}>
                <Typography variant="body2" gutterBottom>Text Field</Typography>
                <TextField label="Standard" variant="outlined" fullWidth />
              </Box>
              <Box mb={3}>
                <Typography variant="body2" gutterBottom>Select Dropdown</Typography>
                <TextField
                  select
                  label="Select Option"
                  variant="outlined"
                  fullWidth
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option>Option 1</option>
                  <option>Option 2</option>
                  <option>Option 3</option>
                </TextField>
              </Box>
              <Box>
                <Typography variant="body2" gutterBottom>Textarea</Typography>
                <TextField
                  label="Multiline"
                  multiline
                  rows={4}
                  variant="outlined"
                  fullWidth
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box mb={3}>
                <Typography variant="body2" gutterBottom>Text Field with Helper Text</Typography>
                <TextField 
                  label="With Helper" 
                  variant="outlined" 
                  helperText="Helper text goes here" 
                  fullWidth 
                />
              </Box>
              <Box mb={3}>
                <Typography variant="body2" gutterBottom>Required Field</Typography>
                <TextField 
                  label="Required Field" 
                  variant="outlined" 
                  required
                  fullWidth 
                />
              </Box>
              <Box>
                <Typography variant="body2" gutterBottom>Error State</Typography>
                <TextField 
                  label="Error State" 
                  variant="outlined" 
                  error
                  helperText="Error message goes here" 
                  fullWidth 
                />
              </Box>
            </Grid>
          </Grid>

          <Box mt={4}>
            <Typography variant="body2" gutterBottom>File Upload Dropzone</Typography>
            <Box className={containerClasses.dropzone}>
              <Typography variant="body1">Drop files here or click to browse</Typography>
              <Button variant="contained" color="primary" style={{ marginTop: theme.spacing(2) }}>
                Browse Files
              </Button>
            </Box>
          </Box>
        </Box>

        <Divider style={{ margin: `${theme.spacing(4)}px 0` }} />

        {/* TABLES */}
        <Box mb={4}>
          <Typography variant="h5" gutterBottom>Tables</Typography>
          <Box fontSize="12px" mb={2} fontFamily="monospace" color="text.secondary">
            Table styles defined in: src/styles/theme.js (overrides.MuiTable, MuiTableRow, etc.)
          </Box>

          <Typography variant="body2" gutterBottom>Dark Mode Table with Hover Effects</Typography>
          <TableContainer component={GradientBorderPaper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>1</TableCell>
                  <TableCell>Document 1</TableCell>
                  <TableCell>PDF</TableCell>
                  <TableCell>
                    <Button size="small" color="primary" startIcon={<EditIcon />}>Edit</Button>
                    <Button 
                      size="small" 
                      color="error" 
                      startIcon={<DeleteIcon style={{ color: '#ea4335' }} />}
                      style={{ color: '#ea4335' }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2</TableCell>
                  <TableCell>Document 2</TableCell>
                  <TableCell>DOCX</TableCell>
                  <TableCell>
                    <Button size="small" color="primary" startIcon={<EditIcon />}>Edit</Button>
                    <Button 
                      size="small" 
                      color="error" 
                      startIcon={<DeleteIcon style={{ color: '#ea4335' }} />}
                      style={{ color: '#ea4335' }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>3</TableCell>
                  <TableCell>Document 3</TableCell>
                  <TableCell>TXT</TableCell>
                  <TableCell>
                    <Button size="small" color="primary" startIcon={<EditIcon />}>Edit</Button>
                    <Button 
                      size="small" 
                      color="error" 
                      startIcon={<DeleteIcon style={{ color: '#ea4335' }} />}
                      style={{ color: '#ea4335' }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Divider style={{ margin: `${theme.spacing(4)}px 0` }} />

        {/* CARDS AND LISTS */}
        <Box mb={4}>
          <Typography variant="h5" gutterBottom>Cards and Lists</Typography>
          <Box fontSize="12px" mb={2} fontFamily="monospace" color="text.secondary">
            Card styles defined in: src/styles/theme.js (overrides.MuiCard)<br/>
            List styles defined in: src/styles/theme.js (overrides.MuiListItem, MuiListItemIcon, etc.)
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" gutterBottom>Material-UI Card with Dark Theme</Typography>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Card Title</Typography>
                  <Typography variant="body2">
                    Card content with text. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    style={{ marginTop: theme.spacing(2) }}
                  >
                    Action
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" gutterBottom>Feature Card with Gradient</Typography>
              <GradientBorderCard>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Box fontSize="2rem" mb={2}>🚀</Box>
                  <Typography variant="h6" gutterBottom>Feature Title</Typography>
                  <Typography variant="body2" align="center">Feature description text goes here.</Typography>
                </Box>
              </GradientBorderCard>
            </Grid>
          </Grid>

          <Box mt={4}>
            <Typography variant="body2" gutterBottom>Material-UI List with Dark Theme</Typography>
            <GradientBorderPaper>
              <List>
                <ListItem button>
                  <ListItemIcon>
                    <FolderIcon />
                  </ListItemIcon>
                  <ListItemText primary="Documents" secondary="12 items" />
                </ListItem>
                <ListItem button>
                  <ListItemIcon>
                    <StorageIcon />
                  </ListItemIcon>
                  <ListItemText primary="Databases" secondary="3 items" />
                </ListItem>
                <ListItem button>
                  <ListItemIcon>
                    <ChatIcon />
                  </ListItemIcon>
                  <ListItemText primary="Conversations" secondary="24 items" />
                </ListItem>
              </List>
            </GradientBorderPaper>
          </Box>

          <Box mt={4}>
            <Typography variant="body2" gutterBottom>Feature Grid with Hover Effects</Typography>
            <Box display="flex" flexWrap="wrap" justifyContent="center">
              <GradientBorderCard style={{ width: 200, margin: theme.spacing(1) }}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Box fontSize="2rem" mb={2}>📊</Box>
                  <Typography variant="h6" gutterBottom>Analytics</Typography>
                  <Typography variant="body2" align="center">Powerful analytics tools</Typography>
                </Box>
              </GradientBorderCard>
              <GradientBorderCard style={{ width: 200, margin: theme.spacing(1) }}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Box fontSize="2rem" mb={2}>🤖</Box>
                  <Typography variant="h6" gutterBottom>Automation</Typography>
                  <Typography variant="body2" align="center">Automate your workflow</Typography>
                </Box>
              </GradientBorderCard>
              <GradientBorderCard style={{ width: 200, margin: theme.spacing(1) }}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Box fontSize="2rem" mb={2}>📱</Box>
                  <Typography variant="h6" gutterBottom>Responsive</Typography>
                  <Typography variant="body2" align="center">Works on all devices</Typography>
                </Box>
              </GradientBorderCard>
            </Box>
          </Box>
        </Box>

        <Divider style={{ margin: `${theme.spacing(4)}px 0` }} />

        {/* MUI SYSTEM PROPS */}
        <Box mb={4}>
          <Typography variant="h5" gutterBottom>MUI Box System Props (Replacing Utility Classes)</Typography>
          <Box fontSize="12px" mb={2} fontFamily="monospace" color="text.secondary">
            Box system props are part of Material-UI core - styling values from theme.js
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <GradientBorderPaper>
                <Typography variant="body2" gutterBottom>Spacing & Margin Props</Typography>
                <Box bgcolor="background.lighter" p={2} borderRadius={1} mb={2}>No margin (m={0})</Box>
                <Box bgcolor="background.lighter" p={2} borderRadius={1} m={2} mb={2}>Margin 16px (m={2})</Box>
                <Box bgcolor="background.lighter" p={2} borderRadius={1} m={3} mb={2}>Margin 24px (m={3})</Box>
                <Box bgcolor="background.lighter" p={2} borderRadius={1} mt={3} mb={2}>Top margin (mt={3})</Box>
                <Box bgcolor="background.lighter" p={2} borderRadius={1} mb={3}>Bottom margin (mb={3})</Box>
                <Box bgcolor="background.lighter" p={2} borderRadius={1} mx="auto" width="50%">Horizontal auto (mx="auto")</Box>
              </GradientBorderPaper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <GradientBorderPaper>
                <Typography variant="body2" gutterBottom>Display & Flex Props</Typography>
                <Box display="flex" bgcolor="background.lighter" p={2} borderRadius={1} mb={2}>
                  <Box bgcolor="primary.main" p={2} borderRadius={1} mr={2}>item 1</Box>
                  <Box bgcolor="primary.main" p={2} borderRadius={1}>item 2</Box>
                </Box>
                <Box display="flex" justifyContent="space-between" bgcolor="background.lighter" p={2} borderRadius={1} mb={2}>
                  <Box bgcolor="primary.main" p={2} borderRadius={1}>start</Box>
                  <Box bgcolor="primary.main" p={2} borderRadius={1}>end</Box>
                </Box>
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  bgcolor="background.lighter"
                  p={3}
                  borderRadius={1}
                  height={80}
                >
                  <Box bgcolor="primary.main" p={2} borderRadius={1}>centered</Box>
                </Box>
              </GradientBorderPaper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <GradientBorderPaper>
                <Typography variant="body2" gutterBottom>Color & Typography Props</Typography>
                <Box color="text.primary" mb={1}>color="text.primary"</Box>
                <Box color="text.secondary" mb={1}>color="text.secondary"</Box>
                <Box color="primary.main" mb={1}>color="primary.main"</Box>
                <GradientText mb={1}>GradientText component</GradientText>
                <Box
                  textOverflow="ellipsis"
                  overflow="hidden"
                  whiteSpace="nowrap"
                  mb={1}
                  width={150}
                >
                  This text is truncated with ellipsis because it's too long
                </Box>
                <Box bgcolor="primary.main" p={2} borderRadius={1} mb={1} color="white">bgcolor="primary.main"</Box>
                <Box
                  p={2}
                  borderRadius={1}
                  color="white"
                  style={{ background: theme.custom.gradients.gradient1 }}
                >
                  Using gradient background
                </Box>
              </GradientBorderPaper>
            </Grid>
          </Grid>
        </Box>
      </AnimatedGradientPaper>
    </StyledContainer>
  );
};

export default StyleTest;

