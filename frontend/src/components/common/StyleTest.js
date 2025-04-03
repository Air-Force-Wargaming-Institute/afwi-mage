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
  TableRow
} from '@material-ui/core';
import HomeIcon from '@material-ui/icons/Home';
import FolderIcon from '@material-ui/icons/Folder';
import StorageIcon from '@material-ui/icons/Storage';
import TuneIcon from '@material-ui/icons/Tune';
import ChatIcon from '@material-ui/icons/Chat';
import InfoIcon from '@material-ui/icons/Info';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';

const StyleTest = () => {
  return (
    <Container className="container" style={{ marginTop: '20px' }}>
      <Paper className="main-content" style={{ marginBottom: '30px' }}>
        <Typography variant="h4" className="section-title" gutterBottom>
          MAGE Style Guide & Component Library
        </Typography>
        <Typography variant="body1" paragraph>
          This page displays all styled components and elements used throughout the application.
          Use this as a reference when implementing new features to maintain design consistency.
        </Typography>

        {/* COLOR PALETTE */}
        <div className="section">
          <Typography variant="h5" className="section-subtitle">Color Palette (CSS Variables)</Typography>
          <Grid container spacing={2}>
            <Grid item xs={4} sm={2}>
              <div style={{ 
                background: 'var(--primary-color)', 
                height: '80px', 
                borderRadius: 'var(--border-radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexDirection: 'column'
              }}>
                <Typography variant="body2">--primary-color</Typography>
              </div>
            </Grid>
            <Grid item xs={4} sm={2}>
              <div style={{ 
                background: 'var(--secondary-color)', 
                height: '80px', 
                borderRadius: 'var(--border-radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexDirection: 'column'
              }}>
                <Typography variant="body2">--secondary-color</Typography>
              </div>
            </Grid>
            <Grid item xs={4} sm={2}>
              <div style={{ 
                background: 'var(--background-color)', 
                height: '80px', 
                borderRadius: 'var(--border-radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexDirection: 'column'
              }}>
                <Typography variant="body2">--background-color</Typography>
              </div>
            </Grid>
            <Grid item xs={4} sm={2}>
              <div style={{ 
                background: 'var(--text-color-light)', 
                height: '80px', 
                borderRadius: 'var(--border-radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'black',
                flexDirection: 'column'
              }}>
                <Typography variant="body2">--text-color-light</Typography>
              </div>
            </Grid>
            <Grid item xs={4} sm={2}>
              <div style={{ 
                background: 'var(--text-color-dark)', 
                height: '80px', 
                borderRadius: 'var(--border-radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexDirection: 'column'
              }}>
                <Typography variant="body2">--text-color-dark</Typography>
              </div>
            </Grid>
            <Grid item xs={4} sm={2}>
              <div style={{ 
                background: 'var(--container-bg-color)', 
                height: '80px', 
                borderRadius: 'var(--border-radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'black',
                flexDirection: 'column'
              }}>
                <Typography variant="body2">--container-bg-color</Typography>
              </div>
            </Grid>
          </Grid>
        </div>

        <Divider className="divider" />

        {/* TYPOGRAPHY */}
        <div className="section">
          <Typography variant="h5" className="section-subtitle">Typography</Typography>
          
          <Paper className="info-box">
            <h1>h1 Heading</h1>
            <h2>h2 Heading</h2>
            <h3>h3 Heading</h3>
            <h4>h4 Heading</h4>
            <h5>h5 Heading</h5>
            <h6>h6 Heading</h6>
            <p>Regular paragraph text. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            <p className="text-secondary">Secondary text with reduced opacity</p>
            <span className="bold">Bold text element</span>
          </Paper>

          <Paper className="info-box" style={{ marginTop: '16px' }}>
            <Typography variant="h4" className="section-title">MUI Typography: h4 with section-title class</Typography>
            <Typography variant="h5" className="section-subtitle">MUI Typography: h5 with section-subtitle class</Typography>
            <Typography variant="body1">MUI Typography: Body 1 text for primary content</Typography>
            <Typography variant="body2">MUI Typography: Body 2 text for secondary content</Typography>
          </Paper>
        </div>

        <Divider className="divider" />

        {/* CONTAINERS */}
        <div className="section">
          <Typography variant="h5" className="section-subtitle">Container Elements</Typography>
          
          <div style={{ marginBottom: '20px' }}>
            <Typography variant="body2" gutterBottom><code>.container</code> - Main container with padding and border radius</Typography>
            <div className="container" style={{ height: 'auto', padding: '20px', marginBottom: '16px', position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                top: '4px', 
                right: '8px', 
                background: 'var(--primary-color)', 
                color: 'white', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontSize: '11px',
                fontFamily: 'monospace'
              }}>
                .container
              </div>
              Container with className="container"
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <Typography variant="body2" gutterBottom><code>.main-content</code> - Main content area with background and shadow</Typography>
            <div className="main-content" style={{ padding: '20px', marginBottom: '16px', position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                top: '4px', 
                right: '8px', 
                background: 'var(--primary-color)', 
                color: 'white', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontSize: '11px',
                fontFamily: 'monospace'
              }}>
                .main-content
              </div>
              Container with className="main-content"
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <Typography variant="body2" gutterBottom><code>.info-box</code> - Information box with lighter background</Typography>
            <div className="info-box" style={{ marginBottom: '16px', position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                top: '4px', 
                right: '8px', 
                background: 'var(--primary-color)', 
                color: 'white', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontSize: '11px',
                fontFamily: 'monospace'
              }}>
                .info-box
              </div>
              Container with className="info-box"
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <Typography variant="body2" gutterBottom><code>.paper</code> - Paper element for content sections</Typography>
            <div className="paper" style={{ marginBottom: '16px', position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                top: '4px', 
                right: '8px', 
                background: 'var(--primary-color)', 
                color: 'white', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontSize: '11px',
                fontFamily: 'monospace'
              }}>
                .paper
              </div>
              Container with className="paper"
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <Typography variant="body2" gutterBottom><code>.root-container</code> - Root layout container (with side nav)</Typography>
            <div className="root-container" style={{ height: 'auto', marginBottom: '16px', position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                top: '4px', 
                right: '8px', 
                background: 'var(--primary-color)', 
                color: 'white', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontSize: '11px',
                fontFamily: 'monospace',
                zIndex: 1
              }}>
                .root-container
              </div>
              <div className="side-nav" style={{ position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', 
                  top: '4px', 
                  right: '8px', 
                  background: '#5c5c5c', 
                  color: 'white', 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  fontSize: '11px',
                  fontFamily: 'monospace'
                }}>
                  .side-nav
                </div>
                <Typography variant="body1">Side Navigation</Typography>
                <div className="nav-item" style={{ position: 'relative' }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: '4px', 
                    right: '8px', 
                    background: '#5c5c5c', 
                    color: 'white', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontSize: '11px',
                    fontFamily: 'monospace'
                  }}>
                    .nav-item
                  </div>
                  <span className="nav-icon">📁</span>
                  <span className="nav-text">Nav Item</span>
                </div>
                <div className="nav-item active" style={{ position: 'relative' }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: '4px', 
                    right: '8px', 
                    background: '#ffffff', 
                    color: 'var(--primary-color)', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontSize: '11px',
                    fontFamily: 'monospace'
                  }}>
                    .nav-item.active
                  </div>
                  <span className="nav-icon">📊</span>
                  <span className="nav-text">Active Nav Item</span>
                </div>
              </div>
              <div className="main-content" style={{ flex: 1, padding: '20px', position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', 
                  top: '4px', 
                  right: '8px', 
                  background: 'var(--primary-color)', 
                  color: 'white', 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  fontSize: '11px',
                  fontFamily: 'monospace'
                }}>
                  .main-content
                </div>
                Root container with side navigation and main content area
              </div>
            </div>
          </div>
        </div>

        <Divider className="divider" />

        {/* BUTTONS */}
        <div className="section">
          <Typography variant="h5" className="section-subtitle">Buttons</Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" gutterBottom><code>.app-button</code> - Primary button</Typography>
              <button className="app-button">App Button</button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" gutterBottom><code>.upload-button</code> - Upload button</Typography>
              <button className="upload-button app-button">Upload Button</button>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" gutterBottom><code>[disabled]</code> - Disabled button</Typography>
              <button className="app-button" disabled>Disabled Button</button>
            </Grid>
          </Grid>

          <Grid container spacing={2} style={{ marginTop: '16px' }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" gutterBottom>Material-UI Buttons</Typography>
              <Button variant="contained" color="primary" style={{ marginRight: '8px' }}>Primary</Button>
              <Button variant="contained" color="secondary" style={{ marginRight: '8px' }}>Secondary</Button>
              <Button variant="outlined" color="primary">Outlined</Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" gutterBottom>Action Buttons</Typography>
              <Button size="small" className="action-button" startIcon={<EditIcon />}>Edit</Button>
              <Button size="small" className="action-button" startIcon={<DeleteIcon />}>Delete</Button>
              <Button size="small" className="action-button" startIcon={<AddIcon />}>Add</Button>
            </Grid>
          </Grid>
        </div>

        <Divider className="divider" />

        {/* FORM ELEMENTS */}
        <div className="section">
          <Typography variant="h5" className="section-subtitle">Form Elements</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <div style={{ marginBottom: '16px' }}>
                <Typography variant="body2" gutterBottom>Text Input</Typography>
                <input type="text" placeholder="Standard text input" style={{ width: '100%' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <Typography variant="body2" gutterBottom>Select Dropdown</Typography>
                <select style={{ width: '100%' }}>
                  <option>Option 1</option>
                  <option>Option 2</option>
                  <option>Option 3</option>
                </select>
              </div>
              <div>
                <Typography variant="body2" gutterBottom>Textarea</Typography>
                <textarea placeholder="Standard textarea" rows={4} style={{ width: '100%' }}></textarea>
              </div>
            </Grid>
            <Grid item xs={12} sm={6}>
              <div style={{ marginBottom: '16px' }}>
                <Typography variant="body2" gutterBottom>Material-UI Text Field</Typography>
                <TextField label="Standard" variant="outlined" fullWidth />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <Typography variant="body2" gutterBottom>Material-UI with Helper Text</Typography>
                <TextField 
                  label="With Helper" 
                  variant="outlined" 
                  helperText="Helper text goes here" 
                  fullWidth 
                />
              </div>
              <div>
                <Typography variant="body2" gutterBottom>Material-UI with Error</Typography>
                <TextField 
                  label="Error State" 
                  variant="outlined" 
                  error
                  helperText="Error message goes here" 
                  fullWidth 
                />
              </div>
            </Grid>
          </Grid>

          <div style={{ marginTop: '24px' }}>
            <Typography variant="body2" gutterBottom>File Upload Dropzone</Typography>
            <div className="dropzone">
              <Typography variant="body1">Drop files here or click to browse</Typography>
              <Button variant="contained" color="primary" className="upload-button" style={{ marginTop: '8px' }}>
                Browse Files
              </Button>
            </div>
          </div>
        </div>

        <Divider className="divider" />

        {/* TABLES */}
        <div className="section">
          <Typography variant="h5" className="section-subtitle">Tables</Typography>

          <Typography variant="body2" gutterBottom>Standard Table with Hover Effects</Typography>
          <div className="table-container">
            <Table className="table">
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
                    <Button size="small" className="action-button" startIcon={<EditIcon />}>Edit</Button>
                    <Button size="small" className="action-button" startIcon={<DeleteIcon />}>Delete</Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>2</TableCell>
                  <TableCell>Document 2</TableCell>
                  <TableCell>DOCX</TableCell>
                  <TableCell>
                    <Button size="small" className="action-button" startIcon={<EditIcon />}>Edit</Button>
                    <Button size="small" className="action-button" startIcon={<DeleteIcon />}>Delete</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <Divider className="divider" />

        {/* CARDS AND LISTS */}
        <div className="section">
          <Typography variant="h5" className="section-subtitle">Cards and Lists</Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" gutterBottom>Material-UI Card</Typography>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Card Title</Typography>
                  <Typography variant="body2">
                    Card content with text. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </Typography>
                  <Button variant="contained" color="primary" style={{ marginTop: '16px' }}>
                    Action
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" gutterBottom>Feature Card</Typography>
              <div className="feature-card">
                <div className="feature-icon">🚀</div>
                <div className="feature-title">Feature Title</div>
                <div className="feature-description">Feature description text goes here.</div>
              </div>
            </Grid>
          </Grid>

          <div style={{ marginTop: '24px' }}>
            <Typography variant="body2" gutterBottom>Material-UI List</Typography>
            <Paper>
              <List>
                <ListItem button className="list-item">
                  <ListItemIcon className="list-item-icon">
                    <FolderIcon />
                  </ListItemIcon>
                  <ListItemText className="list-item-text" primary="Documents" secondary="12 items" />
                </ListItem>
                <ListItem button className="list-item">
                  <ListItemIcon className="list-item-icon">
                    <StorageIcon />
                  </ListItemIcon>
                  <ListItemText className="list-item-text" primary="Databases" secondary="3 items" />
                </ListItem>
                <ListItem button className="list-item">
                  <ListItemIcon className="list-item-icon">
                    <ChatIcon />
                  </ListItemIcon>
                  <ListItemText className="list-item-text" primary="Conversations" secondary="24 items" />
                </ListItem>
              </List>
            </Paper>
          </div>

          <div style={{ marginTop: '24px' }}>
            <Typography variant="body2" gutterBottom>Feature Grid</Typography>
            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <div className="feature-title">Analytics</div>
                <div className="feature-description">Powerful analytics tools</div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🤖</div>
                <div className="feature-title">Automation</div>
                <div className="feature-description">Automate your workflow</div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📱</div>
                <div className="feature-title">Responsive</div>
                <div className="feature-description">Works on all devices</div>
              </div>
            </div>
          </div>
        </div>

        <Divider className="divider" />

        {/* UTILITY CLASSES */}
        <div className="section">
          <Typography variant="h5" className="section-subtitle">Utility Classes</Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Paper className="info-box">
                <Typography variant="body2" gutterBottom><code>.mt-2</code> - Margin Top (16px)</Typography>
                <div className="mt-2" style={{ background: '#f0f0f0', padding: '8px' }}>
                  Element with margin-top
                </div>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper className="info-box">
                <Typography variant="body2" gutterBottom><code>.mb-3</code> - Margin Bottom (24px)</Typography>
                <div className="mb-3" style={{ background: '#f0f0f0', padding: '8px' }}>
                  Element with margin-bottom
                </div>
                <div style={{ background: '#e0e0e0', padding: '8px' }}>Next element</div>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper className="info-box">
                <Typography variant="body2" gutterBottom><code>.bold</code> - Bold Text</Typography>
                <p>Regular text with <span className="bold">bold text</span> inside.</p>
              </Paper>
            </Grid>
          </Grid>
        </div>
      </Paper>
    </Container>
  );
};

export default StyleTest;

