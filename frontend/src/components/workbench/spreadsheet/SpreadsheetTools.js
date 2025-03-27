import React, { useState, useContext, useEffect } from 'react';
import { WorkbenchContext } from '../../../contexts/WorkbenchContext';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CodeIcon from '@mui/icons-material/Code';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import '../../../App.css'; // Import App.css for styling

/**
 * SpreadsheetTools component for LLM-powered column transformations
 * Allows users to:
 * - Select input columns from a spreadsheet
 * - Specify transformation instructions
 * - Create new output columns
 * - Apply transformations with LLM assistance
 */
const SpreadsheetTools = () => {
  const {
    spreadsheets,
    selectedSpreadsheet,
    isLoading,
    error,
    developmentMode,
    apiBaseUrl,
    getSpreadsheetSheets,
    getSpreadsheetSummary,
    performCellOperation
  } = useContext(WorkbenchContext);

  // State for selected spreadsheet and column information
  const [activeSpreadsheetId, setActiveSpreadsheetId] = useState('');
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [columns, setColumns] = useState([]);
  const [activeStep, setActiveStep] = useState(0);

  // State for transformation configuration
  const [selectedInputColumns, setSelectedInputColumns] = useState([]);
  const [outputColumns, setOutputColumns] = useState([{ name: '', description: '' }]);
  const [transformationInstructions, setTransformationInstructions] = useState('');
  const [previewData, setPreviewData] = useState([]);
  const [outputPreview, setOutputPreview] = useState([]);
  const [processingMode, setProcessingMode] = useState('all'); // 'all' or 'sample'

  // State for advanced options
  const [advancedOptions, setAdvancedOptions] = useState({
    includeHeaders: true,
    includeAdjacentRows: false,
    adjacentRowCount: 1,
    batchSize: 10,
    errorHandling: 'continue' // 'continue', 'stop', or 'retry'
  });

  // State for processing status
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformationError, setTransformationError] = useState(null);
  const [transformationProgress, setTransformationProgress] = useState(0);
  const [transformationResults, setTransformationResults] = useState(null);

  // Handle spreadsheet selection
  const handleSpreadsheetChange = async (spreadsheetId) => {
    setActiveSpreadsheetId(spreadsheetId);
    setSelectedSheet('');
    setColumns([]);
    setSelectedInputColumns([]);
    setOutputColumns([{ name: '', description: '' }]);
    setTransformationInstructions('');
    setPreviewData([]);
    setOutputPreview([]);
    
    // Fetch sheet names for the selected spreadsheet
    try {
      if (!developmentMode) {
        const sheetsData = await getSpreadsheetSheets(spreadsheetId);
        setSheetNames(sheetsData.sheets || []);
      } else {
        // Mock sheet names for development mode
        const mockSheetNames = ['Sheet1', 'Sheet2', 'Sheet3'];
        setSheetNames(mockSheetNames);
      }
      setActiveStep(0);
    } catch (err) {
      console.error('Error fetching sheet names:', err);
    }
  };

  // Handle sheet selection
  const handleSheetChange = async (sheetName) => {
    setSelectedSheet(sheetName);
    setColumns([]);
    setSelectedInputColumns([]);
    
    // Fetch column information and preview data
    try {
      if (!developmentMode) {
        const summaryData = await getSpreadsheetSummary(activeSpreadsheetId, sheetName);
        setColumns(summaryData.column_summaries || []);

        // Fetch preview data
        const previewResult = await performCellOperation(activeSpreadsheetId, {
          operation: 'read',
          sheet_name: sheetName,
          cell_range: 'A1:Z10' // Get first 10 rows for preview
        });

        if (previewResult.success) {
          setPreviewData(previewResult.data.values);
        }
      } else {
        // Mock column information for development mode
        const mockColumns = [
          {
            name: 'Date',
            dtype: 'datetime64[ns]',
            count: 1250,
            null_count: 0,
            unique_count: 180,
            sample_values: ['2023-01-15', '2023-02-05', '2023-03-10']
          },
          {
            name: 'Region',
            dtype: 'object',
            count: 1250,
            null_count: 5,
            unique_count: 4,
            sample_values: ['North', 'South', 'East', 'West']
          },
          {
            name: 'Product',
            dtype: 'object',
            count: 1250,
            null_count: 2,
            unique_count: 10,
            sample_values: ['Widget A', 'Widget B', 'Widget C']
          },
          {
            name: 'Sales',
            dtype: 'float64',
            count: 1250,
            null_count: 0,
            unique_count: 875,
            min: 5000,
            max: 250000,
            mean: 85450,
            median: 75000,
            std: 35000,
            sample_values: [12500, 18200, 9800]
          }
        ];
        setColumns(mockColumns);

        // Mock preview data
        const mockPreviewData = [
          ['Date', 'Region', 'Product', 'Sales'],
          ['2023-01-15', 'North', 'Widget A', 12500],
          ['2023-02-05', 'South', 'Widget B', 18200],
          ['2023-01-27', 'East', 'Widget A', 9800],
          ['2023-02-12', 'West', 'Widget C', 22300],
          ['2023-03-03', 'North', 'Widget B', 15700]
        ];
        setPreviewData(mockPreviewData);
      }
    } catch (err) {
      console.error('Error fetching column information:', err);
    }
  };

  // Handle input column selection
  const handleInputColumnChange = (event) => {
    setSelectedInputColumns(event.target.value);
  };

  // Handle output column changes
  const handleOutputColumnChange = (index, field, value) => {
    const updatedOutputColumns = [...outputColumns];
    updatedOutputColumns[index] = {
      ...updatedOutputColumns[index],
      [field]: value
    };
    setOutputColumns(updatedOutputColumns);
  };

  // Add a new output column
  const handleAddOutputColumn = () => {
    setOutputColumns([...outputColumns, { name: '', description: '' }]);
  };

  // Remove an output column
  const handleRemoveOutputColumn = (index) => {
    const updatedOutputColumns = outputColumns.filter((_, i) => i !== index);
    setOutputColumns(updatedOutputColumns.length ? updatedOutputColumns : [{ name: '', description: '' }]);
  };

  // Handle advanced options changes
  const handleAdvancedOptionChange = (option, value) => {
    setAdvancedOptions({
      ...advancedOptions,
      [option]: value
    });
  };

  // Generate output column previews
  const generateOutputPreview = () => {
    if (developmentMode) {
      // In development mode, create sample outputs
      setIsTransforming(true);
      setTimeout(() => {
        const mockOutputs = [
          ['Transformed_Sales', 'Region_Category', 'Performance_Score'],
          ['$12,500.00', 'Northern Territory', '78'],
          ['$18,200.00', 'Southern Territory', '92'],
          ['$9,800.00', 'Eastern Territory', '65'],
          ['$22,300.00', 'Western Territory', '98'],
          ['$15,700.00', 'Northern Territory', '83']
        ];
        setOutputPreview(mockOutputs);
        setIsTransforming(false);
        setTransformationProgress(100);
      }, 2000);
    } else {
      // In production mode, call the API
      // This would be implemented when the backend is available
      console.log('Backend API would be called here with:', {
        spreadsheetId: activeSpreadsheetId,
        sheetName: selectedSheet,
        inputColumns: selectedInputColumns,
        outputColumns: outputColumns.map(col => col.name),
        instructions: transformationInstructions,
        options: advancedOptions
      });
    }
  };

  // Reset transformation
  const handleReset = () => {
    setSelectedInputColumns([]);
    setOutputColumns([{ name: '', description: '' }]);
    setTransformationInstructions('');
    setOutputPreview([]);
    setTransformationProgress(0);
    setTransformationError(null);
    setActiveStep(0);
  };

  // Move to the next step
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  // Move to the previous step
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Convert sample values to string representation
  const formatSampleValues = (values) => {
    if (!values || !Array.isArray(values)) return 'No samples';
    return values.slice(0, 3).join(', ') + (values.length > 3 ? '...' : '');
  };

  // Get column type icon/color
  const getColumnTypeInfo = (dtype) => {
    if (dtype.includes('int') || dtype.includes('float')) {
      return {
        label: 'Numeric',
        color: '#4caf50'
      };
    } else if (dtype.includes('datetime')) {
      return {
        label: 'Date/Time',
        color: '#ff9800'
      };
    } else {
      return {
        label: 'Text',
        color: '#2196f3'
      };
    }
  };

  // Step content for the transformation stepper
  const getStepContent = (step) => {
    switch (step) {
      case 0: // Select input columns
        return (
          <Box mt={2}>
            <FormControl fullWidth variant="outlined" style={{ marginBottom: '20px' }}>
              <InputLabel>Input Columns</InputLabel>
              <Select
                multiple
                value={selectedInputColumns}
                onChange={handleInputColumnChange}
                label="Input Columns"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={value}
                        sx={{ 
                          backgroundColor: columns.find(col => col.name === value) ? 
                            getColumnTypeInfo(columns.find(col => col.name === value).dtype).color + '20' : 
                            undefined 
                        }}
                      />
                    ))}
                  </Box>
                )}
              >
                {columns.map((column) => (
                  <MenuItem key={column.name} value={column.name}>
                    <Box display="flex" alignItems="center" width="100%">
                      <Box>
                        <Typography variant="body1">{column.name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {getColumnTypeInfo(column.dtype).label} • {column.unique_count} unique values
                        </Typography>
                      </Box>
                      <Box ml="auto">
                        <Chip
                          label={getColumnTypeInfo(column.dtype).label}
                          size="small"
                          style={{ 
                            backgroundColor: getColumnTypeInfo(column.dtype).color + '20',
                            color: getColumnTypeInfo(column.dtype).color
                          }}
                        />
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedInputColumns.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>Selected Column Preview:</Typography>
                <Grid container spacing={2}>
                  {selectedInputColumns.map(colName => {
                    const columnInfo = columns.find(col => col.name === colName);
                    return (
                      <Grid item xs={12} md={6} key={colName}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle1" color="primary">{colName}</Typography>
                            <Typography variant="caption" display="block" color="textSecondary">
                              Type: {getColumnTypeInfo(columnInfo?.dtype || 'object').label}
                            </Typography>
                            <Typography variant="caption" display="block" color="textSecondary">
                              Sample values: {formatSampleValues(columnInfo?.sample_values)}
                            </Typography>
                            {columnInfo?.null_count > 0 && (
                              <Typography variant="caption" display="block" color="error">
                                Contains {columnInfo.null_count} missing values
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}
          </Box>
        );

      case 1: // Configure output columns
        return (
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Define the output columns that will be created or modified:
            </Typography>
            
            {outputColumns.map((column, index) => (
              <Box 
                key={index} 
                mb={2} 
                p={2} 
                border="1px solid #e0e0e0" 
                borderRadius="4px"
                position="relative"
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Column Name"
                      variant="outlined"
                      value={column.name}
                      onChange={(e) => handleOutputColumnChange(index, 'name', e.target.value)}
                      placeholder="e.g., Transformed_Sales"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Description (optional)"
                      variant="outlined"
                      value={column.description}
                      onChange={(e) => handleOutputColumnChange(index, 'description', e.target.value)}
                      placeholder="e.g., Sales values formatted as currency"
                    />
                  </Grid>
                </Grid>
                
                {outputColumns.length > 1 && (
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => handleRemoveOutputColumn(index)}
                    style={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            ))}
            
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddOutputColumn}
              variant="outlined"
              color="primary"
              size="small"
              style={{ marginTop: '8px' }}
            >
              Add Output Column
            </Button>
          </Box>
        );

      case 2: // Transformation instructions
        return (
          <Box mt={2}>
            <TextField
              fullWidth
              label="Transformation Instructions"
              variant="outlined"
              multiline
              rows={6}
              value={transformationInstructions}
              onChange={(e) => setTransformationInstructions(e.target.value)}
              placeholder="Describe how the input columns should be transformed into the output columns. Be specific about the format, calculations, and business rules to apply."
              helperText="Example: Convert sales values to proper currency format with $ sign and two decimal places. For the Region_Category, map North and South to 'Primary Region' and East and West to 'Secondary Region'."
            />
            
            <Box mt={3}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>
                    <SettingsIcon style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    Advanced Options
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={advancedOptions.includeHeaders}
                            onChange={(e) => handleAdvancedOptionChange('includeHeaders', e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Include column headers in context"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={advancedOptions.includeAdjacentRows}
                            onChange={(e) => handleAdvancedOptionChange('includeAdjacentRows', e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Include adjacent rows in context"
                      />
                    </Grid>
                    
                    {advancedOptions.includeAdjacentRows && (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Adjacent Row Count"
                          type="number"
                          InputProps={{ inputProps: { min: 1, max: 5 } }}
                          value={advancedOptions.adjacentRowCount}
                          onChange={(e) => handleAdvancedOptionChange('adjacentRowCount', parseInt(e.target.value))}
                          variant="outlined"
                        />
                      </Grid>
                    )}
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Batch Size"
                        type="number"
                        InputProps={{ inputProps: { min: 1, max: 50 } }}
                        value={advancedOptions.batchSize}
                        onChange={(e) => handleAdvancedOptionChange('batchSize', parseInt(e.target.value))}
                        variant="outlined"
                        helperText="Number of rows to process in each batch"
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Error Handling</InputLabel>
                        <Select
                          value={advancedOptions.errorHandling}
                          onChange={(e) => handleAdvancedOptionChange('errorHandling', e.target.value)}
                          label="Error Handling"
                        >
                          <MenuItem value="continue">Continue on Error</MenuItem>
                          <MenuItem value="stop">Stop on Error</MenuItem>
                          <MenuItem value="retry">Retry on Error (up to 3 times)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Processing Mode</InputLabel>
                        <Select
                          value={processingMode}
                          onChange={(e) => setProcessingMode(e.target.value)}
                          label="Processing Mode"
                        >
                          <MenuItem value="all">Process All Rows</MenuItem>
                          <MenuItem value="sample">Process Sample (first 10 rows)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Box>
          </Box>
        );

      case 3: // Review and execute
        return (
          <Box mt={2}>
            <Typography variant="subtitle1" gutterBottom>Transformation Summary</Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Input Columns</Typography>
                <List dense>
                  {selectedInputColumns.map((column) => (
                    <ListItem key={column}>
                      <ListItemText 
                        primary={column} 
                        secondary={columns.find(col => col.name === column)?.dtype} 
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Output Columns</Typography>
                <List dense>
                  {outputColumns.map((column, index) => (
                    <ListItem key={index}>
                      <ListItemText 
                        primary={column.name} 
                        secondary={column.description || 'No description'} 
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Transformation Instructions</Typography>
                <Paper variant="outlined" style={{ padding: '16px', backgroundColor: '#f5f5f5' }}>
                  <Typography variant="body2">
                    {transformationInstructions || 'No instructions provided'}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Box mt={2} display="flex" justifyContent="center">
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={isTransforming ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                    onClick={generateOutputPreview}
                    disabled={isTransforming}
                  >
                    {isTransforming ? 'Processing...' : 'Execute Transformation'}
                  </Button>
                </Box>
                
                {isTransforming && (
                  <Box mt={2} display="flex" flexDirection="column" alignItems="center">
                    <Typography variant="body2" color="textSecondary">
                      {processingMode === 'sample' ? 'Processing sample data...' : 'Processing all data...'}
                    </Typography>
                    <Box width="100%" mt={1}>
                      <LinearProgressWithLabel value={transformationProgress} />
                    </Box>
                  </Box>
                )}
                
                {transformationError && (
                  <Box mt={2}>
                    <Alert severity="error" onClose={() => setTransformationError(null)}>
                      {transformationError}
                    </Alert>
                  </Box>
                )}
              </Grid>
            </Grid>
            
            {outputPreview.length > 0 && (
              <Box mt={4}>
                <Typography variant="subtitle1" gutterBottom>Output Preview</Typography>
                
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {outputPreview[0].map((header, index) => (
                          <TableCell key={index} style={{ fontWeight: 'bold' }}>
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {outputPreview.slice(1).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex}>{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Box mt={2} display="flex" justifyContent="space-between">
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<SaveIcon />}
                    disabled={isTransforming}
                  >
                    Save Transformation
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleReset}
                    disabled={isTransforming}
                  >
                    Reset
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  // Component for linear progress with label
  const LinearProgressWithLabel = ({ value }) => {
    return (
      <Box display="flex" alignItems="center" width="100%">
        <Box width="100%" mr={1}>
          <div 
            style={{
              height: 10,
              borderRadius: 5,
              backgroundColor: '#e0e0e0',
              position: 'relative'
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 5,
                backgroundColor: '#1976d2',
                width: `${value}%`,
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </Box>
        <Box minWidth={35}>
          <Typography variant="body2" color="textSecondary">{`${Math.round(value)}%`}</Typography>
        </Box>
      </Box>
    );
  };

  // Main component render
  return (
    <div>
      <Typography variant="h5" component="h1" gutterBottom className="section-title">
        Column Transformation Tool
      </Typography>
      
      <Typography variant="body1" paragraph>
        Transform spreadsheet columns with AI assistance. Select input columns, specify output format, 
        and provide transformation instructions. The system will process the data and create new columns 
        based on your requirements.
      </Typography>
      
      <Paper elevation={0} style={{ marginTop: '24px', padding: '24px' }}>
        {developmentMode && (
          <Chip 
            icon={<CodeIcon />}
            label="Development Mode" 
            color="primary" 
            variant="outlined" 
            style={{ marginBottom: '16px' }} 
          />
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Select Spreadsheet</InputLabel>
              <Select
                value={activeSpreadsheetId}
                onChange={(e) => handleSpreadsheetChange(e.target.value)}
                label="Select Spreadsheet"
              >
                <MenuItem value="" disabled>
                  <em>Select a spreadsheet</em>
                </MenuItem>
                {spreadsheets.map((sheet) => (
                  <MenuItem key={sheet.id} value={sheet.id}>
                    {sheet.filename}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl 
              fullWidth 
              variant="outlined" 
              disabled={!activeSpreadsheetId || sheetNames.length === 0}
            >
              <InputLabel>Select Sheet</InputLabel>
              <Select
                value={selectedSheet}
                onChange={(e) => handleSheetChange(e.target.value)}
                label="Select Sheet"
              >
                <MenuItem value="" disabled>
                  <em>Select a sheet</em>
                </MenuItem>
                {sheetNames.map((sheet) => (
                  <MenuItem key={sheet} value={sheet}>
                    {sheet}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        {activeSpreadsheetId && selectedSheet && columns.length > 0 && (
          <Box mt={4}>
            <Divider style={{ margin: '24px 0' }}>
              <Chip 
                label="Transformation Configuration" 
                color="primary"
              />
            </Divider>
            
            <Stepper activeStep={activeStep} orientation="vertical">
              <Step>
                <StepLabel>
                  <Typography>Select Input Columns</Typography>
                </StepLabel>
                <StepContent>
                  {getStepContent(0)}
                  <Box sx={{ mb: 2, mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{ mt: 1, mr: 1 }}
                      disabled={selectedInputColumns.length === 0}
                    >
                      Continue
                    </Button>
                  </Box>
                </StepContent>
              </Step>
              
              <Step>
                <StepLabel>
                  <Typography>Define Output Columns</Typography>
                </StepLabel>
                <StepContent>
                  {getStepContent(1)}
                  <Box sx={{ mb: 2, mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{ mt: 1, mr: 1 }}
                      disabled={!outputColumns[0].name}
                    >
                      Continue
                    </Button>
                    <Button
                      onClick={handleBack}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      Back
                    </Button>
                  </Box>
                </StepContent>
              </Step>
              
              <Step>
                <StepLabel>
                  <Typography>Provide Transformation Instructions</Typography>
                </StepLabel>
                <StepContent>
                  {getStepContent(2)}
                  <Box sx={{ mb: 2, mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{ mt: 1, mr: 1 }}
                      disabled={!transformationInstructions}
                    >
                      Continue
                    </Button>
                    <Button
                      onClick={handleBack}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      Back
                    </Button>
                  </Box>
                </StepContent>
              </Step>
              
              <Step>
                <StepLabel>
                  <Typography>Review and Execute</Typography>
                </StepLabel>
                <StepContent>
                  {getStepContent(3)}
                  <Box sx={{ mb: 2, mt: 2 }}>
                    <Button
                      onClick={handleBack}
                      sx={{ mt: 1, mr: 1 }}
                      disabled={isTransforming}
                    >
                      Back
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            </Stepper>
          </Box>
        )}
        
        {activeSpreadsheetId && !selectedSheet && (
          <Box mt={4} textAlign="center">
            <Typography color="textSecondary">
              Please select a sheet to continue
            </Typography>
          </Box>
        )}
        
        {!activeSpreadsheetId && (
          <Box mt={4} textAlign="center">
            <Typography color="textSecondary">
              Please select a spreadsheet to begin transformation
            </Typography>
          </Box>
        )}
      </Paper>
    </div>
  );
};

export default SpreadsheetTools; 