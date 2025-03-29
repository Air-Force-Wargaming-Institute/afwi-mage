import React, { useState, useContext, useEffect, useRef } from 'react';
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
  Tooltip,
  FormHelperText
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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import '../../../App.css'; // Import App.css for styling
import JobMonitor from '../common/JobMonitor'; // Import JobMonitor component

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
    getSpreadsheetSheets,
    getSpreadsheetSummary,
    performCellOperation,
    isLoading,
    connectionError,
    apiBaseUrl,
    uploadSpreadsheet,
    fetchSpreadsheets,
    transformSpreadsheet,
    trackTransformationJob,
    getJobStatus,
    cancelJob,
    setActiveJobId
  } = useContext(WorkbenchContext);

  // State for selected spreadsheet and column information
  const [activeSpreadsheetId, setActiveSpreadsheetId] = useState('');
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [columns, setColumns] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  
  // File upload ref and state
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState(null);

  // State for transformation configuration
  const [selectedInputColumns, setSelectedInputColumns] = useState([]);
  const [outputColumns, setOutputColumns] = useState([{ 
    name: '', 
    description: '', 
    isNew: true,
    outputType: 'text',
    typeOptions: {}
  }]);
  const [transformationInstructions, setTransformationInstructions] = useState('');
  const [previewData, setPreviewData] = useState([]);
  const [outputPreview, setOutputPreview] = useState([]);
  const [processingMode, setProcessingMode] = useState('preview'); // 'all', 'preview'
  const [createDuplicate, setCreateDuplicate] = useState(true); // Option to create duplicate spreadsheet

  // State for advanced options
  const [advancedOptions, setAdvancedOptions] = useState({
    includeHeaders: true,
    errorHandling: 'continue' // 'continue', 'stop', or 'retry'
  });

  // State for processing status
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformationError, setTransformationError] = useState(null);
  const [transformationProgress, setTransformationProgress] = useState(0);
  const [transformationResults, setTransformationResults] = useState(null);
  
  // AbortController for canceling pending requests
  const abortControllerRef = useRef(null);
  // Track component mounted state
  const isMountedRef = useRef(true);

  // Fetch spreadsheets when component mounts and handle cleanup
  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true;
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchSpreadsheets();
    
    // Cleanup function
    return () => {
      // Set unmounted flag
      isMountedRef.current = false;
      
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Check if current spreadsheet ID is still valid when spreadsheets list changes
  useEffect(() => {
    if (activeSpreadsheetId && spreadsheets.length > 0) {
      // Check if the active spreadsheet still exists in the list
      const spreadsheetExists = spreadsheets.some(sheet => sheet.id === activeSpreadsheetId);
      
      if (!spreadsheetExists) {
        console.log('Selected spreadsheet no longer exists in list, clearing selection');
        setActiveSpreadsheetId('');
        setSelectedSheet('');
        setSheetNames([]);
        setUploadError('The previously selected spreadsheet is no longer available. Please select another one.');
      }
    }
  }, [spreadsheets, activeSpreadsheetId]);

  // Safe setState functions that check if component is still mounted
  const safeSetState = (stateSetter) => (value) => {
    if (isMountedRef.current) {
      stateSetter(value);
    }
  };

  // Handle spreadsheet selection
  const handleSpreadsheetChange = async (spreadsheetId) => {
    // Special case for upload option
    if (spreadsheetId === 'upload_new') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }
    
    setActiveSpreadsheetId(spreadsheetId);
    setSelectedSheet('');
    setColumns([]);
    setSelectedInputColumns([]);
    setOutputColumns([{ 
      name: '', 
      description: '', 
      isNew: true,
      outputType: 'text',
      typeOptions: {}
    }]);
    setTransformationInstructions('');
    setPreviewData([]);
    setOutputPreview([]);
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    // Fetch sheet names for the selected spreadsheet
    try {
      const sheetsData = await getSpreadsheetSheets(spreadsheetId, { signal: abortControllerRef.current.signal });
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setSheetNames(sheetsData.sheets || []);
        setActiveStep(0);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      console.error('Error fetching sheet names:', err);
      
      // If we get a 404 error, it means the spreadsheet doesn't exist
      if (err.response && (err.response.status === 404 || err.response.status === 400)) {
        console.log('Spreadsheet not found, clearing selection');
        setActiveSpreadsheetId('');
        
        // Show an error message
        setUploadError(`The selected spreadsheet was not found. It may have been deleted or the backend service was restarted.`);
        
        // Refresh the spreadsheet list
        fetchSpreadsheets();
      }
    }
  };

  // Handle file selection for upload
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExt = `.${file.name.split('.').pop().toLowerCase()}`;
    
    if (!validExtensions.includes(fileExt)) {
      setUploadError(`Invalid file type. Allowed: ${validExtensions.join(', ')}`);
      return;
    }
    
    try {
      setUploadError(null);
      // Upload the file
      const response = await uploadSpreadsheet(file);
      
      // Refresh spreadsheet list
      await fetchSpreadsheets();
      
      // Select the newly uploaded spreadsheet
      if (response && response.id) {
        handleSpreadsheetChange(response.id);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError('Failed to upload file. Please try again.');
    } finally {
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle sheet selection
  const handleSheetChange = async (sheetName) => {
    setSelectedSheet(sheetName);
    setColumns([]);
    setSelectedInputColumns([]);
    
    // Fetch column information and preview data
    try {
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
    
    if (field === 'outputType') {
      // Reset type options when output type changes
      let defaultTypeOptions = {};
      
      // Set default options based on the selected type
      switch(value) {
        case 'boolean':
          defaultTypeOptions = { trueValue: 'Yes', falseValue: 'No' };
          break;
        case 'list':
          defaultTypeOptions = { options: '' };
          break;
        case 'number':
          defaultTypeOptions = { format: 'decimal' };
          break;
        default:
          defaultTypeOptions = {};
      }
      
      updatedOutputColumns[index] = {
        ...updatedOutputColumns[index],
        [field]: value,
        typeOptions: defaultTypeOptions
      };
    } else if (field.startsWith('typeOption.')) {
      // Handle nested type option changes
      const optionKey = field.split('.')[1];
      updatedOutputColumns[index] = {
        ...updatedOutputColumns[index],
        typeOptions: {
          ...updatedOutputColumns[index].typeOptions,
          [optionKey]: value
        }
      };
    } else {
      // Handle regular field changes
      updatedOutputColumns[index] = {
        ...updatedOutputColumns[index],
        [field]: value
      };
    }
    
    setOutputColumns(updatedOutputColumns);
  };

  // Add a new output column
  const handleAddOutputColumn = () => {
    setOutputColumns([...outputColumns, { 
      name: '', 
      description: '', 
      isNew: true,
      outputType: 'text',
      typeOptions: {}
    }]);
  };

  // Remove an output column
  const handleRemoveOutputColumn = (index) => {
    const updatedOutputColumns = outputColumns.filter((_, i) => i !== index);
    setOutputColumns(updatedOutputColumns.length ? updatedOutputColumns : [{ 
      name: '', 
      description: '', 
      isNew: true,
      outputType: 'text',
      typeOptions: {}
    }]);
  };

  // Handle advanced options changes
  const handleAdvancedOptionChange = (option, value) => {
    setAdvancedOptions({
      ...advancedOptions,
      [option]: value
    });
  };

  // Generate output column previews
  const generateOutputPreview = async () => {
    if (!isMountedRef.current) return;
    
    setIsTransforming(true);
    setTransformationProgress(0);
    setOutputPreview([]);
    setTransformationError(null);
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      // Validate output columns to ensure they have proper instructions
      const invalidColumns = outputColumns.filter(col => !col.description.trim());
      if (invalidColumns.length > 0) {
        throw new Error('All output columns must have instructions. Please provide instructions for each column.');
      }
      
      // Prepare transformation parameters
      const transformationParams = {
        sheet_name: selectedSheet,
        input_columns: selectedInputColumns,
        output_columns: outputColumns.map(col => ({
          name: col.name,
          description: col.description,
          is_new: col.isNew,
          output_type: col.outputType,
          type_options: col.typeOptions
        })),
        include_headers: advancedOptions.includeHeaders,
        processing_mode: processingMode,
        error_handling: advancedOptions.errorHandling,
        create_duplicate: createDuplicate
      };
      
      console.log('Calling transformSpreadsheet with params:', JSON.stringify(transformationParams));
      
      // Check if the function exists
      if (typeof transformSpreadsheet !== 'function') {
        throw new Error('transformSpreadsheet function is not available. This may indicate a configuration issue.');
      }
      
      // Call the transform API
      const result = await transformSpreadsheet(
        activeSpreadsheetId, 
        transformationParams,
        { signal: abortControllerRef.current.signal }
      );
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsTransforming(false);
        
        if (result.success) {
          if (result.preview) {
            setOutputPreview(result.preview);
            // If we're in preview mode, set a success message
            if (processingMode === 'preview') {
              setTransformationResults({
                status: 'preview_success',
                previewRows: result.preview.length - 1 // Subtract 1 for header row
              });
            } else if (result.job_id) {
              // For full processing, track the job using the context function
              const job = trackTransformationJob(result.job_id, transformationParams);
              setTransformationResults({
                job_id: result.job_id,
                status: 'submitted'
              });
              
              console.log('Full dataset transformation started with job ID:', result.job_id);
              console.log('Job parameters:', JSON.stringify(transformationParams));
            }
          } 
        } else {
          setTransformationError(result.error || 'Unknown error occurred during transformation');
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        console.error('Error generating preview:', error);
        setIsTransforming(false);
        
        // More detailed error message
        let errorMessage = 'Failed to generate preview';
        if (error.response && error.response.data) {
          errorMessage += `: ${error.response.data.detail || error.response.data.error || JSON.stringify(error.response.data)}`;
        } else if (error.message) {
          errorMessage += `: ${error.message}`;
        }
        
        setTransformationError(errorMessage);
      }
    }
  };

  // Continue processing after preview success
  const handleContinueProcessing = async () => {
    // Switch to processing all data
    setProcessingMode('all');
    // Run the transformation again with the full dataset
    await generateOutputPreview();
  };
  
  // Return to column configuration for refinement
  const handleRefineOptions = () => {
    // Go back to the column configuration step
    setActiveStep(1);
    // Clear the preview results but keep the configuration
    setOutputPreview([]);
    setTransformationResults(null);
  };

  // Reset transformation
  const handleReset = () => {
    setSelectedInputColumns([]);
    setOutputColumns([{ 
      name: '', 
      description: '', 
      isNew: true,
      outputType: 'text',
      typeOptions: {}
    }]);
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
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 300,
                    },
                  },
                }}
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
          <Box mt={2} style={{ overflow: 'visible' }}>
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
                style={{ overflow: 'visible' }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Column Definition</InputLabel>
                      <Select
                        value={column.isNew ? "create_new" : "use_existing"}
                        onChange={(e) => {
                          const isNew = e.target.value === "create_new";
                          handleOutputColumnChange(index, 'isNew', isNew);
                          // Reset column name if we switch to creating a new column
                          if (isNew && !column.isNew) {
                            handleOutputColumnChange(index, 'name', '');
                          }
                        }}
                        label="Column Definition"
                      >
                        <MenuItem value="create_new">Create New Column</MenuItem>
                        <MenuItem value="use_existing">Overwrite Existing Column</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    {column.isNew ? (
                      <TextField
                        fullWidth
                        label="New Column Name"
                        variant="outlined"
                        value={column.name}
                        onChange={(e) => handleOutputColumnChange(index, 'name', e.target.value)}
                        placeholder="e.g., Transformed_Sales"
                        required
                      />
                    ) : (
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Existing Column</InputLabel>
                        <Select
                          value={column.name}
                          onChange={(e) => handleOutputColumnChange(index, 'name', e.target.value)}
                          label="Existing Column"
                          displayEmpty
                        >
                          <MenuItem value="" disabled>
                            <em>Select a column</em>
                          </MenuItem>
                          {columns.map((col) => (
                            <MenuItem 
                              key={col.name} 
                              value={col.name}
                              disabled={selectedInputColumns.includes(col.name)}
                            >
                              {col.name}
                            </MenuItem>
                          ))}
                        </Select>
                        {selectedInputColumns.includes(column.name) && (
                          <FormHelperText error>
                            Cannot use input column as output
                          </FormHelperText>
                        )}
                      </FormControl>
                    )}
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Output Type</InputLabel>
                      <Select
                        value={column.outputType}
                        onChange={(e) => handleOutputColumnChange(index, 'outputType', e.target.value)}
                        label="Output Type"
                      >
                        <MenuItem value="text">Free Text</MenuItem>
                        <MenuItem value="boolean">Boolean (Yes/No)</MenuItem>
                        <MenuItem value="list">List of Options</MenuItem>
                        <MenuItem value="number">Number</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {/* Conditional UI based on output type */}
                  {column.outputType === 'boolean' && (
                    <Grid container item xs={12} spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="True Value"
                          variant="outlined"
                          value={column.typeOptions.trueValue}
                          onChange={(e) => handleOutputColumnChange(index, 'typeOption.trueValue', e.target.value)}
                          placeholder="e.g., Yes, True, 1"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="False Value"
                          variant="outlined"
                          value={column.typeOptions.falseValue}
                          onChange={(e) => handleOutputColumnChange(index, 'typeOption.falseValue', e.target.value)}
                          placeholder="e.g., No, False, 0"
                        />
                      </Grid>
                    </Grid>
                  )}
                  
                  {column.outputType === 'list' && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Comma-separated List of Options"
                        variant="outlined"
                        value={column.typeOptions.options}
                        onChange={(e) => handleOutputColumnChange(index, 'typeOption.options', e.target.value)}
                        placeholder="e.g., Red, Green, Blue"
                        helperText="Enter possible values separated by commas"
                      />
                    </Grid>
                  )}
                  
                  {column.outputType === 'number' && (
                    <Grid item xs={12}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Number Format</InputLabel>
                        <Select
                          value={column.typeOptions.format}
                          onChange={(e) => handleOutputColumnChange(index, 'typeOption.format', e.target.value)}
                          label="Number Format"
                        >
                          <MenuItem value="decimal">Decimal (e.g., 123.45)</MenuItem>
                          <MenuItem value="integer">Integer (e.g., 123)</MenuItem>
                          <MenuItem value="percentage">Percentage (e.g., 45%)</MenuItem>
                          <MenuItem value="currency">Currency (e.g., $123.45)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Column Instructions. Describe in plain language what you want MAGE to do in this column."
                      variant="outlined"
                      multiline
                      rows={3}
                      value={column.description}
                      onChange={(e) => handleOutputColumnChange(index, 'description', e.target.value)}
                      placeholder="Instructions for how to transform the input columns into this output column"
                      required
                      helperText="Be specific about the format, calculations, or transformations to apply"
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

      case 2: // Advanced options (replacing Transformation Instructions)
        return (
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Configure processing options:
            </Typography>
            
            <Paper variant="outlined" style={{ padding: '16px' }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={createDuplicate}
                        onChange={(e) => setCreateDuplicate(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Create duplicate spreadsheet (recommended)"
                  />
                  <Typography variant="caption" display="block" color="textSecondary" style={{ marginLeft: '30px' }}>
                    When enabled, transforms will be applied to a copy of the original spreadsheet. 
                    This preserves your original data.
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
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
                  <Typography variant="caption" display="block" color="textSecondary" style={{ marginLeft: '30px' }}>
                    Provides column names to the AI to improve understanding of data meaning.
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
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
                    <FormHelperText>
                      Determines how to handle errors encountered during processing.
                    </FormHelperText>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>
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
                        primary={`${column.name} (${column.isNew ? 'New' : 'Existing'})`} 
                        secondary={`Type: ${column.outputType}`} 
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Processing Options</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Create Duplicate Spreadsheet" 
                      secondary={createDuplicate ? "Yes (preserves original data)" : "No (modifies original)"}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Error Handling" 
                      secondary={advancedOptions.errorHandling === 'continue' ? 'Continue on Error' : 
                                advancedOptions.errorHandling === 'stop' ? 'Stop on Error' : 
                                'Retry on Error (up to 3 times)'}
                    />
                  </ListItem>
                </List>
              </Grid>
              
              <Grid item xs={12}>
                {transformationResults?.status === 'preview_success' ? (
                  <Box mt={2} textAlign="center">
                    <Alert 
                      severity="success" 
                      style={{ marginBottom: '16px' }}
                    >
                      Preview successful! Processed {transformationResults.previewRows} rows.
                    </Alert>
                    <Box display="flex" justifyContent="center" gap={2}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleContinueProcessing}
                        disabled={isTransforming}
                      >
                        Confirm & Process All Data
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={handleRefineOptions}
                        disabled={isTransforming}
                      >
                        Refine Configuration
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box mt={2} display="flex" justifyContent="center">
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={isTransforming ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                      onClick={generateOutputPreview}
                      disabled={isTransforming}
                    >
                      {isTransforming ? 'Processing...' : 'Generate Preview (First 10 Rows)'}
                    </Button>
                  </Box>
                )}
                
                {isTransforming && (
                  <Box mt={2} display="flex" flexDirection="column" alignItems="center">
                    <Typography variant="body2" color="textSecondary">
                      {processingMode === 'preview' ? 'Processing sample data...' : 'Processing all data...'}
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
                
                <TableContainer component={Paper} variant="outlined" style={{ maxHeight: '400px', overflow: 'auto' }}>
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
            
            {/* Add JobMonitor for tracking transformation jobs */}
            {transformationResults?.job_id && processingMode === 'all' && (
              <Box mt={4}>
                <Typography variant="subtitle1" gutterBottom>Job Status</Typography>
                <JobMonitor 
                  onViewResults={(job) => {
                    // Refresh the spreadsheet list when job completes
                    if (job.status === 'completed') {
                      fetchSpreadsheets();
                      // If there's a result URL, offer to open it
                      if (job.result_url) {
                        const shouldOpen = window.confirm('Transformation complete! Would you like to view the results?');
                        if (shouldOpen) {
                          window.open(job.result_url, '_blank');
                        }
                      }
                    }
                  }}
                />
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
    <div style={{ width: '100%' }}>
      <Typography variant="h5" component="h1" gutterBottom className="section-title">
        Column Transformation Tool
      </Typography>
      
      <Typography variant="body1" paragraph>
        Transform spreadsheet columns with AI assistance. Select input columns, specify output format, 
        and provide transformation instructions. The system will process the data and create new columns 
        based on your requirements.
      </Typography>
      
      {/* Hidden file input for upload */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        accept=".xlsx,.xls,.csv"
      />
      
      {uploadError && (
        <Alert severity="error" style={{ marginBottom: '16px' }} onClose={() => setUploadError(null)}>
          {uploadError}
        </Alert>
      )}
      
      <Paper elevation={0} style={{ marginTop: '24px', padding: '24px', width: '100%' }}>
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
                <MenuItem value="upload_new" style={{ color: '#1976d2' }}>
                  <CloudUploadIcon style={{ marginRight: '8px' }} />
                  Upload new spreadsheet...
                </MenuItem>
                <Divider />
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
          <Box mt={4} style={{ overflow: 'visible' }}>
            <Divider style={{ margin: '24px 0' }}>
              <Chip 
                label="Transformation Configuration" 
                color="primary"
              />
            </Divider>
            
            <Stepper activeStep={activeStep} orientation="vertical" style={{ overflow: 'visible' }}>
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
                  <Typography>Advanced Options</Typography>
                </StepLabel>
                <StepContent>
                  {getStepContent(2)}
                  <Box sx={{ mb: 2, mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{ mt: 1, mr: 1 }}
                      disabled={outputColumns.some(col => !col.description.trim())}
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