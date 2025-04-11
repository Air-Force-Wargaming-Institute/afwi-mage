import React, { useState, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
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
  FormHelperText,
  LinearProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import '../../../App.css'; // Import App.css for styling
import JobMonitor from '../common/JobMonitor'; // Import JobMonitor component
// Import styled components
import {
  GradientBorderPaper,
  AnimatedGradientPaper,
  SubtleGlowPaper,
  GradientCornersPaper,
  GradientBorderCard,
  GradientText,
  HighContrastGradientPaper,
  useContainerStyles
} from '../../../styles/StyledComponents';

// Import action buttons
import {
  DeleteButton,
  EditButton,
  AddButton,
  DeleteActionButton,
  DeleteText,
  DELETE_COLOR
} from '../../../styles/ActionButtons';

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
    getSpreadsheetSheets,
    getSpreadsheetSummary,
    performCellOperation,
    apiBaseUrl,
    uploadSpreadsheet,
    fetchSpreadsheets,
    transformSpreadsheet,
    trackTransformationJob,
    transformationState,
    updateTransformationState,
    resetTransformationState,
    setActiveView
  } = useContext(WorkbenchContext);

  // State for selected spreadsheet and column information
  const [activeSpreadsheetId, setActiveSpreadsheetId] = useState(() => 
    transformationState?.activeSpreadsheetId || '');
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(() => 
    transformationState?.selectedSheet || '');
  const [columns, setColumns] = useState([]);
  const [activeStep, setActiveStep] = useState(() => 
    transformationState?.activeStep || 0);
  
  // File upload ref and state
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState(null);
  const [sheetsLoaded, setSheetsLoaded] = useState(false);

  // State for transformation configuration
  const [selectedInputColumns, setSelectedInputColumns] = useState(() => 
    transformationState?.selectedInputColumns || []);
  const [outputColumns, setOutputColumns] = useState(() => 
    transformationState?.outputColumns || [{ 
      name: '', 
      description: '', 
      isNew: true,
      outputType: 'text',
      typeOptions: {}
    }]);
  const [outputPreview, setOutputPreview] = useState([]);
  const [processingMode, setProcessingMode] = useState(() =>
    transformationState?.processingMode || 'preview');
  const [createDuplicate, setCreateDuplicate] = useState(() =>
    transformationState?.createDuplicate !== undefined ? transformationState.createDuplicate : true);

  // State for advanced options
  const [advancedOptions, setAdvancedOptions] = useState(() =>
    transformationState?.advancedOptions || {
      includeHeaders: true,
      errorHandling: 'continue'
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

  // Function to persist state changes to context
  const persistState = useCallback((updates = {}) => {
    // Create current state snapshot
    const currentState = {
      activeSpreadsheetId,
      selectedSheet,
      activeStep,
      selectedInputColumns,
      outputColumns,
      processingMode,
      createDuplicate,
      advancedOptions,
      columns, // Persist columns too
      ...updates // Apply any updates passed in
    };

    // Update the context
    updateTransformationState(currentState);
  }, [
    activeSpreadsheetId,
    selectedSheet,
    activeStep,
    selectedInputColumns,
    outputColumns,
    processingMode,
    createDuplicate,
    advancedOptions,
    columns,
    updateTransformationState // Added dependency
  ]);

  // Update persistence when key states change
  useEffect(() => {
    persistState();
  }, [persistState]); // Use the stable persistState callback

  // Moved sheet fetching logic into separate useCallback
  const handleSheetChange = useCallback(async (sheetName) => {
    setSelectedSheet(sheetName);

    // If the newly selected sheet is different from the persisted one,
    // reset columns and selections.
    if (sheetName !== transformationState?.selectedSheet) {
      setColumns([]);
      setSelectedInputColumns([]);
    }

    try {
      const summaryData = await getSpreadsheetSummary(activeSpreadsheetId, sheetName);
      const fetchedColumns = summaryData.column_summaries || [];
      setColumns(fetchedColumns);
      // Persist columns immediately after fetching
      persistState({ selectedSheet: sheetName, columns: fetchedColumns }); // Persist selectedSheet here too

      const previewResult = await performCellOperation(activeSpreadsheetId, {
        operation: 'read',
        sheet_name: sheetName,
        cell_range: 'A1:Z10'
      });

      if (previewResult.success) {
        // setPreviewData(previewResult.data.values); // Removed unused state update
      }
    } catch (err) {
      console.error('Error fetching column information:', err);
    }
  // Add dependencies for useCallback
  }, [activeSpreadsheetId, getSpreadsheetSummary, performCellOperation, persistState, transformationState?.selectedSheet]);

  // Fetch sheet names for a given spreadsheet ID - wrapped in useCallback
  const fetchSheetsForActiveId = useCallback(async (spreadsheetId) => {
    if (!isMountedRef.current || !spreadsheetId) return;

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      console.log(`Fetching sheets for restored/selected spreadsheet ID: ${spreadsheetId}`);
      const sheetsData = await getSpreadsheetSheets(spreadsheetId, { signal: abortControllerRef.current.signal });

      if (isMountedRef.current) {
        const fetchedSheetNames = sheetsData.sheets || [];
        setSheetNames(fetchedSheetNames);
        setSheetsLoaded(true); // Mark sheets as loaded for this ID
        console.log('Sheet names loaded:', fetchedSheetNames);

        // Determine the sheet to select after loading
        let sheetToSelect = null;
        if (selectedSheet && fetchedSheetNames.includes(selectedSheet)) {
          // If a valid sheet was restored, use it
          sheetToSelect = selectedSheet;
          console.log(`Restored selectedSheet '${selectedSheet}' is valid.`);
        } else if (fetchedSheetNames.length > 0) {
          // Otherwise, if sheets exist, select the first one
          sheetToSelect = fetchedSheetNames[0];
          if (selectedSheet) {
             console.warn(`Restored selectedSheet '${selectedSheet}' not found in loaded sheets: ${fetchedSheetNames}. Selecting first available sheet: '${sheetToSelect}'.`);
          } else {
             console.log(`No initial sheet selected, selecting first available sheet: '${sheetToSelect}'.`);
          }
        } else {
          // No sheets found
           console.warn(`No sheets loaded for spreadsheet ${spreadsheetId}.`);
           if (selectedSheet) {
              console.warn(`Restored selectedSheet '${selectedSheet}' cannot be selected.`);
           }
        }

        // Call handleSheetChange ONLY if we determined a valid sheet to select
        if (sheetToSelect) {
          handleSheetChange(sheetToSelect);
        } else {
          // If no sheet could be selected (e.g., empty spreadsheet), reset related state
          setSelectedSheet('');
          setColumns([]);
          persistState({ selectedSheet: '', columns: [] }); // Persist the reset
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Sheet fetch request was aborted');
        return;
      }
      console.error(`Error fetching sheet names for ID ${spreadsheetId}:`, err);
      if (isMountedRef.current) {
        setSheetNames([]); // Clear sheet names on error
        setSheetsLoaded(false); // Mark as not loaded
        setSelectedSheet(''); // Reset selected sheet on error
        setColumns([]);      // Reset columns on error
        persistState({ selectedSheet: '', columns: [] }); // Persist the reset

        if (err.response && (err.response.status === 404 || err.response.status === 400)) {
          setUploadError(`Spreadsheet with ID ${spreadsheetId} not found.`);
          setActiveSpreadsheetId(''); // Clear invalid ID
        } else {
           setUploadError('Error fetching sheet names.');
        }
      }
    }
  // Add dependencies
  }, [getSpreadsheetSheets, selectedSheet, handleSheetChange, persistState, setUploadError, setActiveSpreadsheetId]);

  // Fetch spreadsheets list on initial mount
  useEffect(() => {
    isMountedRef.current = true;
    fetchSpreadsheets(); // Fetch the list of available spreadsheets

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchSpreadsheets]); // Depend only on fetchSpreadsheets for initial list load

  // Fetch sheets for the activeSpreadsheetId when it changes or is restored
  useEffect(() => {
    if (activeSpreadsheetId && isMountedRef.current) {
      // Reset loaded status before fetching
      setSheetsLoaded(false);
      // Fetch sheets for the current ID
      fetchSheetsForActiveId(activeSpreadsheetId);
    } else if (!activeSpreadsheetId && isMountedRef.current) {
       // Clear sheets and related state if ID becomes empty
       setSheetNames([]);
       setSheetsLoaded(false);
       setSelectedSheet('');
       setColumns([]);
       persistState({ selectedSheet: '', columns: [] }); // Persist reset
    }
  // Fetch sheets only when activeSpreadsheetId changes.
  // fetchSheetsForActiveId includes selectedSheet in its dependency array
  // to handle the restoration logic correctly after sheets are loaded.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpreadsheetId]);

  // Check if current spreadsheet ID is still valid when spreadsheets list changes
  useEffect(() => {
    if (activeSpreadsheetId && spreadsheets.length > 0) {
      // Check if the active spreadsheet still exists in the list
      const spreadsheetExists = spreadsheets.some(sheet => sheet.id === activeSpreadsheetId);
      
      if (!spreadsheetExists) {
        console.log('Selected spreadsheet no longer exists in list, clearing selection');
        setActiveSpreadsheetId('');
        
        // Show an error message
        setUploadError(`The selected spreadsheet was not found. It may have been deleted or the backend service was restarted.`);
        
        // Refresh the spreadsheet list
        fetchSpreadsheets();
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
    if (spreadsheetId === 'upload_new') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    // Check if the ID actually changed
    const idChanged = spreadsheetId !== activeSpreadsheetId;

    // Update active ID - this will trigger the useEffect to fetch sheets
    setActiveSpreadsheetId(spreadsheetId);

    // Reset sheet-specific states immediately
    setSelectedSheet('');
    setColumns([]);
    setSheetNames([]); // Clear sheet names immediately
    setSheetsLoaded(false); // Reset loaded flag
    setUploadError(null); // Clear any previous upload errors

    // If the spreadsheet ID *actually* changed, reset the configuration and step
    if (idChanged) {
      console.log('Spreadsheet ID changed, resetting configuration and step.');
      setSelectedInputColumns([]);
      setOutputColumns([{ name: '', description: '', isNew: true, outputType: 'text', typeOptions: {} }]);
      setOutputPreview([]);
      setActiveStep(0);
      // Persist the reset configuration due to ID change
      persistState({
        activeSpreadsheetId: spreadsheetId,
        selectedSheet: '', // Reset sheet
        columns: [], // Reset columns
        selectedInputColumns: [],
        outputColumns: [{ name: '', description: '', isNew: true, outputType: 'text', typeOptions: {} }],
        activeStep: 0
      });
    } else {
      // If the ID didn't change (e.g., re-selecting the same one),
      // just persist the current ID and reset sheet/columns
      persistState({ activeSpreadsheetId: spreadsheetId, selectedSheet: '', columns: [] });
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

  // Handle column definition change (Create New or Use Existing)
  const handleColumnDefinitionChange = (index, value) => {
    const isNewSelected = value === "create_new";
    const updatedOutputColumns = [...outputColumns];
    
    // Update both isNew and name in a single state update
    updatedOutputColumns[index] = {
      ...updatedOutputColumns[index],
      isNew: isNewSelected,
      // Clear name if switching to Create New
      name: isNewSelected ? '' : updatedOutputColumns[index].name
    };
    
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
  const generateOutputPreview = async (overrideMode = null) => {
    if (!isMountedRef.current) return;
    
    // Determine the mode to use: override first, then state
    const currentMode = overrideMode || processingMode;
    
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
        processing_mode: currentMode,
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
          // Handle preview results if present (typically for 'preview' mode)
          if (result.preview && currentMode === 'preview') {
            setOutputPreview(result.preview);
            setTransformationResults({
              status: 'preview_success',
              previewRows: result.preview.length - 1 // Subtract 1 for header row
            });
          } 
          // Handle job submission results if present (typically for 'all' mode)
          else if (result.job_id) {
            // For full processing, track the job using the context function
            const job = trackTransformationJob(result.job_id, transformationParams);
            setTransformationResults({
              job_id: result.job_id,
              status: 'submitted'
            });
            
            console.log('Full dataset transformation started with job ID:', result.job_id);
            console.log('Job parameters:', JSON.stringify(transformationParams));
          }
          // Handle cases where success is true but neither preview nor job_id is returned (should not happen ideally)
          else {
              console.warn("Transformation successful but no preview or job ID returned.");
              // Potentially set a generic success message or leave state as is?
              // For now, let's clear the transformation results to avoid confusion
              setTransformationResults({ status: 'unknown_success' }); 
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

  // Handle continuing with full processing
  const handleContinueProcessing = async () => {
    // Set processing mode to 'all' first
    setProcessingMode('all');
    // Then run the transformation again with the full dataset
    await generateOutputPreview('all');
  };
  
  // Return to column configuration for refinement
  const handleRefineOptions = () => {
    // Go back to the column configuration step
    setActiveStep(1);
    // Clear the preview results but keep the configuration
    setOutputPreview([]);
    setTransformationResults(null);
  };

  // Start a completely new transformation workflow
  const handleStartNewWorkflow = () => {
    // Reset all state and go back to step 0
    handleReset();
  };

  // Execute another transformation on the current spreadsheet
  const handleAnotherTransformation = () => {
    // Keep the current spreadsheet and sheet, but reset other data
    // and go back to step 0 (select input columns)
    const currentSpreadsheetId = activeSpreadsheetId;
    const currentSheet = selectedSheet;
    const currentColumns = columns;
    
    // Partial reset that preserves the spreadsheet selection
    setSelectedInputColumns([]);
    setOutputColumns([{ 
      name: '', 
      description: '', 
      isNew: true,
      outputType: 'text',
      typeOptions: {}
    }]);
    setOutputPreview([]);
    setTransformationResults(null);
    setTransformationProgress(0);
    setTransformationError(null);
    setActiveStep(0);
    
    // Preserve the current spreadsheet and sheet in state
    setActiveSpreadsheetId(currentSpreadsheetId);
    setSelectedSheet(currentSheet);
    setColumns(currentColumns);
    
    // Update the persistence
    updateTransformationState({
      activeSpreadsheetId: currentSpreadsheetId,
      selectedSheet: currentSheet,
      columns: currentColumns,
      activeStep: 0,
      selectedInputColumns: [],
      outputColumns: [{ 
        name: '', 
        description: '', 
        isNew: true,
        outputType: 'text',
        typeOptions: {}
      }]
    });
  };

  // Navigate to the Upload/Manage Spreadsheets page
  const handleGoToSpreadsheetLibrary = () => {
    // This assumes the WorkbenchContext has a method to change the active view
    if (typeof setActiveView === 'function') {
      setActiveView('library');
    } else {
      // Fallback - open in a new tab if direct navigation isn't available
      window.open('/workbench/spreadsheets', '_blank');
    }
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
    setOutputPreview([]);
    setTransformationProgress(0);
    setTransformationError(null);
    setActiveStep(0);
    
    // Clear persisted state
    resetTransformationState();
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
    return values.slice(0, 5).join(', ') + (values.length > 5 ? '...' : '');
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
            <SubtleGlowPaper 
              elevation={2} 
              sx={{ 
                p: 2,
                bgcolor: 'rgba(33, 150, 243, 0.04)', 
                borderColor: 'primary.light'
              }}
            >
              <Typography variant="subtitle2" fontWeight="600" color="primary.main" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Box component="span" sx={{ 
                  width: 24, 
                  height: 24, 
                  borderRadius: '50%', 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1,
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}>1</Box>
                Select Columns to Use for Transformation
              </Typography>

              <FormControl 
                fullWidth 
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: theme => theme.shape?.borderRadius || 10,
                    backgroundColor: 'transparent',
                    color: 'white',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                      borderWidth: '1px',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                      borderWidth: '2px',
                    },
                    '& .MuiSelect-icon': {
                      color: 'primary.main',
                    },
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: 'primary.main',
                    }
                  },
                  '& .MuiInputBase-input': {
                    color: 'white',
                  },
                  '& .MuiSelect-select': {
                    color: 'white',
                  }
                }}
              >
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
                              undefined,
                            borderRadius: theme => theme.shape?.borderRadius/2 || 5,
                            '& .MuiChip-label': {
                              color: 'text.primary',
                            }
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
                      sx: {
                        bgcolor: 'background.default',
                        color: 'white',
                        borderRadius: theme => theme.shape?.borderRadius || 10,
                        boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                        border: '1px solid',
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        '& .MuiMenuItem-root': {
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                          '&.Mui-selected': {
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': {
                              bgcolor: 'primary.dark',
                            }
                          },
                          '&.Mui-disabled': {
                            color: 'rgba(255, 255, 255, 0.38)',
                          }
                        },
                        '& .MuiListSubheader-root': {
                          color: 'rgba(255, 255, 255, 0.7)',
                        }
                      }
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
                            size="medium"
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
                        <Grid item xs={12} sm={6} md={4} key={colName}>
                          <GradientBorderCard sx={{ 
                            transition: theme => theme.custom?.transition || 'all 0.3s ease',
                            '&:hover': {
                              boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                              transform: 'translateY(-2px)'
                            }
                          }}>
                            <CardContent>
                              <Typography variant="subtitle1" color="primary" fontWeight="500">{colName}</Typography>
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
                          </GradientBorderCard>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              )}
            </SubtleGlowPaper>
          </Box>
        );

      case 1: // Configure output columns
        return (
          <Box mt={2} style={{ overflow: 'visible' }}>
            <SubtleGlowPaper 
              elevation={2} 
              sx={{ 
                p: 2,
                bgcolor: 'rgba(76, 175, 80, 0.04)', 
                borderColor: 'success.light',
                overflow: 'visible'
              }}
            >
              <Typography variant="subtitle2" fontWeight="600" color="success.main" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Box component="span" sx={{ 
                  width: 24, 
                  height: 24, 
                  borderRadius: '50%', 
                  bgcolor: 'success.main', 
                  color: 'white',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1,
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}>2</Box>
                Define Output Columns for Transformation
              </Typography>
            
              {outputColumns.map((column, index) => (
                <Box 
                  key={index} 
                  mb={2} 
                  p={2} 
                  border="1px solid #e0e0e0" 
                  borderRadius="4px"
                  position="relative"
                  bgcolor="white"
                  boxShadow="0 1px 3px rgba(0,0,0,0.05)"
                  style={{ overflow: 'visible' }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl 
                        fullWidth 
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: theme => theme.shape?.borderRadius || 10,
                            backgroundColor: 'transparent',
                            color: 'white',
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                              borderWidth: '1px',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                              borderWidth: '2px',
                            },
                            '& .MuiSelect-icon': {
                              color: 'primary.main',
                            },
                            '& fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.3)',
                            }
                          },
                          '& .MuiInputLabel-root': {
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&.Mui-focused': {
                              color: 'primary.main',
                            }
                          },
                          '& .MuiInputBase-input': {
                            color: 'white',
                          },
                          '& .MuiSelect-select': {
                            color: 'white',
                          }
                        }}
                      >
                        <InputLabel>Column Definition</InputLabel>
                        <Select
                          value={column.isNew ? "create_new" : "use_existing"}
                          onChange={(e) => handleColumnDefinitionChange(index, e.target.value)}
                          label="Column Definition"
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                bgcolor: 'background.default',
                                color: 'white',
                                borderRadius: theme => theme.shape?.borderRadius || 10,
                                boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                                border: '1px solid',
                                borderColor: 'rgba(255, 255, 255, 0.15)',
                                '& .MuiMenuItem-root': {
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: 'action.hover',
                                  },
                                  '&.Mui-selected': {
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    '&:hover': {
                                      bgcolor: 'primary.dark',
                                    }
                                  },
                                  '&.Mui-disabled': {
                                    color: 'rgba(255, 255, 255, 0.38)',
                                  }
                                },
                                '& .MuiListSubheader-root': {
                                  color: 'rgba(255, 255, 255, 0.7)',
                                }
                              }
                            }
                          }}
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
                          InputLabelProps={{
                            style: { color: 'rgba(255, 255, 255, 0.7)' }
                          }}
                          InputProps={{
                            style: { color: 'white' }
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: theme => theme.shape?.borderRadius || 10,
                              backgroundColor: 'transparent',
                              color: 'white',
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main',
                                borderWidth: '1px',
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main',
                                borderWidth: '2px',
                              },
                              '& fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                              }
                            },
                            '& .MuiInputLabel-root': {
                              color: 'rgba(255, 255, 255, 0.7)',
                              '&.Mui-focused': {
                                color: 'primary.main',
                              }
                            },
                            '& .MuiInputBase-input': {
                              color: 'white',
                            }
                          }}
                        />
                      ) : (
                        <FormControl 
                          fullWidth 
                          variant="outlined"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: theme => theme.shape?.borderRadius || 10,
                              backgroundColor: 'transparent',
                              color: 'white',
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main',
                                borderWidth: '1px',
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main',
                                borderWidth: '2px',
                              },
                              '& .MuiSelect-icon': {
                                color: 'primary.main',
                              },
                              '& fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                              }
                            },
                            '& .MuiInputLabel-root': {
                              color: 'rgba(255, 255, 255, 0.7)',
                              '&.Mui-focused': {
                                color: 'primary.main',
                              }
                            },
                            '& .MuiInputBase-input': {
                              color: 'white',
                            }
                          }}
                        >
                          <InputLabel>Existing Column</InputLabel>
                          <Select
                            value={column.name}
                            onChange={(e) => handleOutputColumnChange(index, 'name', e.target.value)}
                            label="Existing Column"
                            displayEmpty
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  bgcolor: 'background.default',
                                  color: 'white',
                                  borderRadius: theme => theme.shape?.borderRadius || 10,
                                  boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                                  border: '1px solid',
                                  borderColor: 'rgba(255, 255, 255, 0.15)',
                                  '& .MuiMenuItem-root': {
                                    color: 'white',
                                    '&:hover': {
                                      bgcolor: 'action.hover',
                                    },
                                    '&.Mui-selected': {
                                      bgcolor: 'primary.main',
                                      color: 'white',
                                      '&:hover': {
                                        bgcolor: 'primary.dark',
                                      }
                                    },
                                    '&.Mui-disabled': {
                                      color: 'rgba(255, 255, 255, 0.38)',
                                    }
                                  },
                                  '& .MuiListSubheader-root': {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                  }
                                }
                              }
                            }}
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
                      <FormControl 
                        fullWidth 
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: theme => theme.shape?.borderRadius || 10,
                            backgroundColor: 'transparent',
                            color: 'white',
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                              borderWidth: '1px',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                              borderWidth: '2px',
                            },
                            '& .MuiSelect-icon': {
                              color: 'primary.main',
                            },
                            '& fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.3)',
                            }
                          },
                          '& .MuiInputLabel-root': {
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&.Mui-focused': {
                              color: 'primary.main',
                            }
                          },
                          '& .MuiInputBase-input': {
                            color: 'white',
                          },
                          '& .MuiSelect-select': {
                            color: 'white',
                          }
                        }}
                      >
                        <InputLabel>Output Type</InputLabel>
                        <Select
                          value={column.outputType}
                          onChange={(e) => handleOutputColumnChange(index, 'outputType', e.target.value)}
                          label="Output Type"
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                bgcolor: 'background.default',
                                color: 'white',
                                borderRadius: theme => theme.shape?.borderRadius || 10,
                                boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                                border: '1px solid',
                                borderColor: 'rgba(255, 255, 255, 0.15)',
                                '& .MuiMenuItem-root': {
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: 'action.hover',
                                  },
                                  '&.Mui-selected': {
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    '&:hover': {
                                      bgcolor: 'primary.dark',
                                    }
                                  },
                                  '&.Mui-disabled': {
                                    color: 'rgba(255, 255, 255, 0.38)',
                                  }
                                },
                                '& .MuiListSubheader-root': {
                                  color: 'rgba(255, 255, 255, 0.7)',
                                }
                              }
                            }
                          }}
                        >
                          <MenuItem value="text">Free Text</MenuItem>
                          <MenuItem value="boolean">Boolean or Polar Categories (Yes/No)</MenuItem>
                          <MenuItem value="list">List of Options</MenuItem>
                          <MenuItem value="number">Number</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Describe in plain language what you want MAGE to do in this column."
                        variant="outlined"
                        multiline
                        rows={3}
                        value={column.description}
                        onChange={(e) => handleOutputColumnChange(index, 'description', e.target.value)}
                        placeholder="Instructions for how to transform the input columns into this output column"
                        required
                        helperText="Be specific about the format, calculations, or transformations to apply"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: theme => theme.shape?.borderRadius || 10,
                            backgroundColor: 'transparent',
                            color: 'white',
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                              borderWidth: '1px',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                              borderWidth: '2px',
                            },
                            '& fieldset': {
                              borderColor: 'rgba(255, 255, 255, 0.3)',
                            }
                          },
                          '& .MuiInputLabel-root': {
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&.Mui-focused': {
                              color: 'primary.main',
                            }
                          },
                          '& .MuiInputBase-input': {
                            color: 'white',
                          },
                          '& .MuiFormHelperText-root': {
                            color: 'text.secondary',
                            marginLeft: 0
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                  
                  {outputColumns.length > 1 && (
                    <DeleteButton
                      onClick={() => handleRemoveOutputColumn(index)}
                      tooltip="Remove output column"
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    />
                  )}
                </Box>
              ))}
              
              <AddButton
                onClick={handleAddOutputColumn}
                tooltip="Add Output Column"
                sx={{ marginTop: '8px' }}
              />
            </SubtleGlowPaper>
          </Box>
        );

      case 2: // Advanced options (replacing Transformation Instructions)
        return (
          <Box mt={2}>
            <SubtleGlowPaper 
              elevation={2} 
              sx={{ 
                p: 2,
                bgcolor: 'rgba(255, 152, 0, 0.04)', 
                borderColor: 'warning.light'
              }}
            >
              <Typography variant="subtitle2" fontWeight="600" color="warning.main" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Box component="span" sx={{ 
                  width: 24, 
                  height: 24, 
                  borderRadius: '50%', 
                  bgcolor: 'warning.main', 
                  color: 'white',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1,
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}>3</Box>
                Configure Processing Options
              </Typography>
            
              <Box sx={{ 
                bgcolor: 'white', 
                p: 3, 
                border: '1px solid', 
                borderColor: 'grey.200',
                borderRadius: '8px'
              }}>
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
                    <FormControl 
                      fullWidth 
                      variant="outlined"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: theme => theme.shape?.borderRadius || 10,
                          backgroundColor: 'background.paper',
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                            borderWidth: '1px',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                            borderWidth: '2px',
                          },
                          '& .MuiSelect-icon': {
                            color: 'primary.main',
                          },
                          '& fieldset': {
                            borderColor: 'divider',
                          }
                        },
                        '& .MuiInputLabel-root': {
                          color: 'text.secondary',
                          '&.Mui-focused': {
                            color: 'primary.main',
                          }
                        },
                        '& .MuiFormHelperText-root': {
                          color: 'text.secondary',
                          marginLeft: 0
                        }
                      }}
                    >
                      <InputLabel>Error Handling</InputLabel>
                      <Select
                        value={advancedOptions.errorHandling}
                        onChange={(e) => handleAdvancedOptionChange('errorHandling', e.target.value)}
                        label="Error Handling"
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              bgcolor: 'background.paper',
                              borderRadius: theme => theme.shape?.borderRadius || 10,
                              boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                              '& .MuiMenuItem-root': {
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                },
                                '&.Mui-selected': {
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: 'primary.dark',
                                  }
                                }
                              }
                            }
                          }
                        }}
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
              </Box>
            </SubtleGlowPaper>
          </Box>
        );

      case 3: // Review and execute
        return (
          <Box mt={2}>
            <Typography variant="subtitle1" gutterBottom fontWeight="600" color="primary.main">
              Transformation Summary
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <SubtleGlowPaper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'rgba(33, 150, 243, 0.04)', 
                    border: '1px solid',
                    borderColor: 'primary.light', 
                    borderRadius: 2,
                    height: '100%'
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="600" color="primary.main" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <Box component="span" sx={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: '50%', 
                      bgcolor: 'primary.main', 
                      color: 'white',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                      fontSize: '0.875rem',
                      fontWeight: 'bold'
                    }}>1</Box>
                    Input Columns
                  </Typography>
                  <List dense sx={{ 
                    bgcolor: 'white', 
                    borderRadius: '4px', 
                    border: '1px solid', 
                    borderColor: 'grey.200',
                    overflow: 'hidden',
                    '& .MuiListItem-root': {
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                      '&:last-child': {
                        borderBottom: 'none'
                      }
                    }
                  }}>
                    {selectedInputColumns.map((column) => {
                      const columnInfo = columns.find(col => col.name === column);
                      return (
                        <ListItem key={column}>
                          <ListItemText 
                            primary={
                              <Box display="flex" alignItems="center">
                                <Typography variant="body2" fontWeight="500">{column}</Typography>
                                <Chip 
                                  label={getColumnTypeInfo(columnInfo?.dtype || 'object').label}
                                  size="small"
                                  sx={{ 
                                    ml: 1, 
                                    height: 20, 
                                    backgroundColor: getColumnTypeInfo(columnInfo?.dtype || 'object').color + '20',
                                    color: getColumnTypeInfo(columnInfo?.dtype || 'object').color
                                  }}
                                />
                              </Box>
                            }
                            secondary={
                              <Box mt={0.5}>
                                <Typography variant="caption" display="block">
                                  {columnInfo?.unique_count} unique values
                                  {columnInfo?.null_count > 0 && ` • ${columnInfo.null_count} missing values`}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ 
                                  display: 'block', 
                                  mt: 0.5,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '100%'
                                }}>
                                  Sample: {formatSampleValues(columnInfo?.sample_values)}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </SubtleGlowPaper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <SubtleGlowPaper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'rgba(76, 175, 80, 0.04)', 
                    border: '1px solid',
                    borderColor: 'success.light',
                    borderRadius: 2,
                    height: '100%'
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="600" color="success.main" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <Box component="span" sx={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: '50%', 
                      bgcolor: 'success.main', 
                      color: 'white',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                      fontSize: '0.875rem',
                      fontWeight: 'bold'
                    }}>2</Box>
                    Output Columns
                  </Typography>
                  <List dense sx={{ 
                    bgcolor: 'white', 
                    borderRadius: '4px', 
                    border: '1px solid', 
                    borderColor: 'grey.200',
                    overflow: 'hidden',
                    '& .MuiListItem-root': {
                      borderBottom: '1px solid',
                      borderColor: 'grey.100',
                      '&:last-child': {
                        borderBottom: 'none'
                      }
                    }
                  }}>
                    {outputColumns.map((column, index) => (
                      <ListItem key={index} alignItems="flex-start">
                        <ListItemText 
                          primary={
                            <Box display="flex" alignItems="center" flexWrap="wrap" gap={0.5}>
                              <Typography variant="body2" fontWeight="500" color={column.isNew ? "success.main" : "primary.main"}>
                                {column.name}
                              </Typography>
                              <Chip 
                                label={column.isNew ? "New" : "Existing"} 
                                size="small"
                                color={column.isNew ? "success" : "primary"}
                                sx={{ height: 20 }}
                              />
                              <Chip 
                                label={column.outputType} 
                                size="small"
                                variant="outlined"
                                sx={{ height: 20 }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box mt={0.5}>
                              {column.outputType === 'boolean' && (
                                <Typography variant="caption" display="block">
                                  True: "{column.typeOptions.trueValue}" • False: "{column.typeOptions.falseValue}"
                                </Typography>
                              )}
                              
                              {column.outputType === 'list' && column.typeOptions.options && (
                                <Typography variant="caption" display="block">
                                  Options: {column.typeOptions.options}
                                </Typography>
                              )}
                              
                              {column.outputType === 'number' && (
                                <Typography variant="caption" display="block">
                                  Format: {column.typeOptions.format || 'decimal'}
                                </Typography>
                              )}
                              
                              <Typography variant="caption" color="textSecondary" sx={{ 
                                display: 'block', 
                                mt: 0.5,
                                fontSize: '0.7rem',
                                maxHeight: '3em',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                              }}>
                                Instructions: {column.description}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </SubtleGlowPaper>
              </Grid>
              
              <Grid item xs={12}>
                <SubtleGlowPaper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'rgba(255, 152, 0, 0.04)', 
                    border: '1px solid',
                    borderColor: 'warning.light',
                    borderRadius: 2,
                    height: '100%'
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="600" color="warning.main" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <Box component="span" sx={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: '50%', 
                      bgcolor: 'warning.main', 
                      color: 'white',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 1,
                      fontSize: '0.875rem',
                      fontWeight: 'bold'
                    }}>3</Box>
                    Processing Options
                  </Typography>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                    gap: 2,
                    bgcolor: 'white', 
                    borderRadius: '4px', 
                    border: '1px solid', 
                    borderColor: 'grey.200',
                    p: 2
                  }}>
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Data Protection</Typography>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Box 
                          component="span" 
                          sx={{ 
                            width: 20, 
                            height: 20, 
                            borderRadius: '50%', 
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 1,
                            border: '1px solid',
                            borderColor: createDuplicate ? 'success.main' : 'error.main',
                            bgcolor: createDuplicate ? 'success.main' : 'white',
                            color: createDuplicate ? 'white' : 'error.main',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {createDuplicate ? '✓' : '×'}
                        </Box>
                        <Typography variant="body2">
                          {createDuplicate ? "Create copy (preserves original)" : "Modify original spreadsheet"}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Context Options</Typography>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Box 
                          component="span" 
                          sx={{ 
                            width: 20, 
                            height: 20, 
                            borderRadius: '50%', 
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 1,
                            border: '1px solid',
                            borderColor: advancedOptions.includeHeaders ? 'success.main' : 'error.main',
                            bgcolor: advancedOptions.includeHeaders ? 'success.main' : 'white',
                            color: advancedOptions.includeHeaders ? 'white' : 'error.main',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {advancedOptions.includeHeaders ? '✓' : '×'}
                        </Box>
                        <Typography variant="body2">
                          Include column headers in context
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Error Handling</Typography>
                      <Box display="flex" alignItems="center">
                        <Chip 
                          label={
                            advancedOptions.errorHandling === 'continue' 
                              ? 'Continue on Error' 
                              : advancedOptions.errorHandling === 'stop' 
                                ? 'Stop on Error'
                                : 'Retry on Error (max 3)'
                          }
                          size="small"
                          color={
                            advancedOptions.errorHandling === 'continue'
                              ? 'warning'
                              : advancedOptions.errorHandling === 'stop'
                                ? 'error'
                                : 'info'
                          }
                          sx={{ height: 24 }}
                        />
                      </Box>
                    </Box>
                  </Box>
                </SubtleGlowPaper>
              </Grid>
              
              <Grid item xs={12}>
                {transformationResults?.status === 'preview_success' ? (
                  <Box mt={2} textAlign="center">
                    <Alert 
                      severity="success" 
                      variant="filled"
                      icon={<PlayArrowIcon />}
                      sx={{ 
                        marginBottom: '16px',
                        borderRadius: theme => theme.shape?.borderRadius || 10,
                        boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      Preview successful! Processed {transformationResults.previewRows} rows.
                    </Alert>
                    <Box display="flex" justifyContent="center" gap={2}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleContinueProcessing}
                        disabled={isTransforming}
                        sx={{ 
                          px: 3,
                          py: 1,
                          boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.3)',
                          transition: theme => theme.custom?.transition || 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                            transform: 'translateY(-2px)'
                          }
                        }}
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
                      onClick={() => generateOutputPreview('preview')}
                      disabled={isTransforming}
                      sx={{ 
                        px: 3,
                        py: 1,
                        boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.3)',
                        transition: theme => theme.custom?.transition || 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                          transform: 'translateY(-2px)'
                        }
                      }}
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
                    <Alert 
                      severity="error" 
                      variant="filled" 
                      sx={{
                        borderRadius: theme => theme.shape?.borderRadius || 10,
                        boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.3)'
                      }}
                      onClose={() => setTransformationError(null)}
                    >
                      {transformationError}
                    </Alert>
                  </Box>
                )}
              </Grid>
            </Grid>
            
            {outputPreview.length > 0 && (
              <Box mt={4}>
                <Typography variant="subtitle1" fontWeight="600" color="primary.main" gutterBottom>
                  Output Preview
                </Typography>
                
                <TableContainer 
                  component={GradientBorderPaper} 
                  style={{ maxHeight: '400px', overflow: 'auto' }}
                  sx={{
                    borderRadius: theme => theme.shape?.borderRadius || 10,
                    '& .MuiTableHead-root': {
                      background: theme => theme.custom?.gradients?.horizontal || 'linear-gradient(to right, #4285f4, #63a4ff)',
                      '& .MuiTableCell-root': {
                        fontWeight: 'bold',
                        color: 'white'
                      }
                    },
                    '& .MuiTableRow-root:nth-of-type(even)': {
                      bgcolor: 'rgba(33, 150, 243, 0.04)'
                    },
                    '& .MuiTableRow-root:hover': {
                      bgcolor: 'rgba(33, 150, 243, 0.08)',
                      transition: theme => theme.custom?.transition || 'all 0.3s ease'
                    }
                  }}
                >
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
                    sx={{ 
                      boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.1)',
                      transition: theme => theme.custom?.transition || 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.2)',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    Save Transformation
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleReset}
                    disabled={isTransforming}
                    sx={{ 
                      boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.1)',
                      transition: theme => theme.custom?.transition || 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.2)',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    Reset
                  </Button>
                </Box>
              </Box>
            )}
            
            {/* Add JobMonitor for tracking transformation jobs */}
            {transformationResults?.job_id && transformationResults?.status !== 'preview_success' && (
              <Box mt={4}>
                <HighContrastGradientPaper sx={{
                  p: 3,
                  mb: 2,
                  border: '1px solid',
                  borderColor: 'info.light'
                }}>
                  <Typography variant="h6" align="center" gutterBottom color="info.dark">
                    MAGE is working to transform your spreadsheet
                  </Typography>
                  <Typography variant="body1" align="center">
                    When MAGE has finished, you can view/download your spreadsheet on the{' '}
                    <Button 
                      color="primary" 
                      onClick={handleGoToSpreadsheetLibrary}
                      sx={{ textTransform: 'none', fontWeight: 'bold', padding: '0 4px' }}
                    >
                      Upload/Manage Spreadsheets
                    </Button>{' '}
                    page.
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: 2, 
                    mt: 3 
                  }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleStartNewWorkflow}
                      sx={{
                        px: 2,
                        py: 1,
                        boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.3)',
                        transition: theme => theme.custom?.transition || 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      Begin a New Transformation Workflow
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={handleAnotherTransformation}
                      sx={{
                        px: 2,
                        py: 1,
                        boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.1)',
                        transition: theme => theme.custom?.transition || 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.2)',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      Execute Another Transformation on the Current Spreadsheet
                    </Button>
                  </Box>
                </HighContrastGradientPaper>
                
                <Typography variant="subtitle1" gutterBottom>Job Status</Typography>
                <JobMonitor 
                  onViewResults={(job) => {
                    // Refresh the spreadsheet list when job completes
                    if (job.status === 'completed') {
                      fetchSpreadsheets();
                      // If there's a result with spreadsheet_id, offer to open it
                      if (job.result && job.result.spreadsheet_id) {
                        const shouldOpen = window.confirm('Transformation complete! Would you like to view the results?');
                        if (shouldOpen) {
                          // Build download URL from spreadsheet_id
                          const baseUrl = apiBaseUrl.endsWith('/') 
                            ? `${apiBaseUrl}api/workbench/spreadsheets` 
                            : `${apiBaseUrl}/api/workbench/spreadsheets`;
                          window.open(`${baseUrl}/${job.result.spreadsheet_id}/download`, '_blank');
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
          <LinearProgress variant="determinate" value={value} />
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
      <GradientText variant="h5" component="h1" gutterBottom className="section-title">
        Column Transformation Tool
      </GradientText>
      
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
        <Alert 
          severity="error" 
          variant="filled"
          sx={{
            marginBottom: '16px',
            borderRadius: theme => theme.shape?.borderRadius || 10,
            boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.3)',
          }}
          onClose={() => setUploadError(null)}
        >
          {uploadError}
        </Alert>
      )}
      
      <AnimatedGradientPaper elevation={3} style={{ marginTop: '24px', width: '100%' }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl 
              fullWidth 
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: theme => theme.shape?.borderRadius || 10,
                  backgroundColor: 'transparent',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderWidth: '1px',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                    borderWidth: '2px',
                  },
                  '& .MuiSelect-icon': {
                    color: 'white',
                  },
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  color: 'white'
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: 'primary.main',
                  }
                }
              }}
            >
              <InputLabel>Select Spreadsheet</InputLabel>
              <Select
                value={activeSpreadsheetId}
                onChange={(e) => handleSpreadsheetChange(e.target.value)}
                label="Select Spreadsheet"
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: theme => theme.palette.background.paper, // Use theme's paper background
                      color: 'white',
                      borderRadius: theme => theme.shape?.borderRadius || 10,
                      boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                      border: '1px solid', // Add explicit border
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      '& .MuiMenuItem-root': {
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.08)',
                        },
                        '&.Mui-selected': {
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'primary.dark',
                          }
                        }
                      }
                    }
                  }
                }}
              >
                <MenuItem value="" disabled>
                  <em>Select a spreadsheet</em>
                </MenuItem>
                <MenuItem 
                  value="upload_new" 
                  sx={{ 
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <CloudUploadIcon />
                  Upload new spreadsheet...
                </MenuItem>
                <Divider sx={{ my: 1, borderColor: 'divider' }} />
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: theme => theme.shape?.borderRadius || 10,
                  backgroundColor: 'transparent',
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderWidth: '1px',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                    borderWidth: '2px',
                  },
                  '&.Mui-disabled': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.23)',
                    },
                    '& .MuiSelect-icon': {
                      color: 'rgba(255, 255, 255, 0.3)',
                    }
                  },
                  '& .MuiSelect-icon': {
                    color: 'white',
                  },
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  color: 'white'
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: 'primary.main',
                  },
                  '&.Mui-disabled': {
                    color: 'rgba(255, 255, 255, 0.3)',
                  }
                }
              }}
            >
              <InputLabel>Select Sheet</InputLabel>
              <Select
                value={selectedSheet}
                onChange={(e) => handleSheetChange(e.target.value)}
                label="Select Sheet"
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: 'background.default',
                      color: 'white',
                      borderRadius: theme => theme.shape?.borderRadius || 10,
                      boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      '& .MuiMenuItem-root': {
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.08)',
                        },
                        '&.Mui-selected': {
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'primary.dark',
                          }
                        }
                      }
                    }
                  }
                }}
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
            <Divider 
              style={{ 
                margin: '24px 0',
                backgroundImage: theme => theme.custom?.gradients?.horizontal || 'linear-gradient(to right, #4285f4,rgb(126, 139, 255),rgb(209, 234, 255))',
                height: '2px',
                opacity: 0.7
              }}
            >
              <Chip 
                label="Transformation Configuration" 
                color="primary"
                sx={{
                  background: theme => theme.custom?.gradients?.gradient1 || 'linear-gradient(to right,rgb(129, 177, 255),rgb(95, 127, 255),rgb(165, 165, 165))',
                  color: 'white',
                  fontWeight: 600,
                  '& .MuiChip-label': {
                    color: 'white'
                  }
                }}
              />
            </Divider>
            
            <Stepper 
              activeStep={activeStep} 
              orientation="vertical" 
              style={{ overflow: 'visible' }}
              sx={{
                '& .MuiStepLabel-root': {
                  padding: '8px 12px',
                  borderRadius: '4px',
                  transition: theme => theme.custom?.transition || 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.03)'
                  }
                },
                '& .MuiStepLabel-label.Mui-active': {
                  fontWeight: 'bold',
                  color: 'primary.main'
                }
              }}
            >
              <Step>
                <StepLabel>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Typography variant="subtitle1" fontWeight="600" color={activeStep >= 0 ? 'primary.main' : 'inherit'}>
                      Select Input Columns
                    </Typography>
                    {activeStep > 0 && selectedInputColumns.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, maxWidth: '60%' }}>
                        <Typography variant="caption" fontWeight="500" color="text.secondary" sx={{ mr: 1 }}>
                          Selected Input Columns:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selectedInputColumns.slice(0, 3).map(col => (
                            <Chip
                              key={col}
                              label={col}
                              size="large"
                              sx={{
                                fontSize: '1rem',
                                height: '20px',
                                backgroundColor: columns.find(c => c.name === col)
                                  ? getColumnTypeInfo(columns.find(c => c.name === col).dtype).color + '20'
                                  : undefined
                              }}
                            />
                          ))}
                          {selectedInputColumns.length > 3 && (
                            <Chip
                              label={`+${selectedInputColumns.length - 3} more`}
                              size="large"
                              sx={{ fontSize: '1rem', height: '20px' }}
                            />
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </StepLabel>
                <StepContent>
                  {getStepContent(0)}
                  <Box sx={{ mb: 2, mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleNext}
                      sx={{ 
                        mt: 1, 
                        mr: 1,
                        px: 3,
                        boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.3)',
                        transition: theme => theme.custom?.transition || 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                          transform: 'translateY(-2px)'
                        }
                      }}
                      disabled={selectedInputColumns.length === 0}
                    >
                      Continue
                    </Button>
                  </Box>
                </StepContent>
              </Step>
              
              <Step>
                <StepLabel>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Typography variant="subtitle1" fontWeight="600" color={activeStep >= 1 ? 'primary.main' : 'inherit'}>
                      Define Output Columns
                    </Typography>
                    {activeStep > 1 && outputColumns.some(c => c.name) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, maxWidth: '60%' }}>
                        <Typography variant="caption" fontWeight="500" color="text.secondary" sx={{ mr: 1 }}>
                          Output Columns:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {outputColumns.slice(0, 3).filter(c => c.name).map((col, idx) => (
                            <Chip
                              key={idx}
                              label={`${col.name} (${col.outputType})`}
                              size="large"
                              sx={{ fontSize: '1rem', height: '20px' }}
                            />
                          ))}
                          {outputColumns.filter(c => c.name).length > 3 && (
                            <Chip
                              label={`+${outputColumns.filter(c => c.name).length - 3} more`}
                              size="large"
                              sx={{ fontSize: '1rem', height: '20px' }}
                            />
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </StepLabel>
                <StepContent>
                  {getStepContent(1)}
                  <Box sx={{ mb: 2, mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleNext}
                      sx={{ 
                        mt: 1, 
                        mr: 1,
                        px: 3,
                        boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.3)',
                        transition: theme => theme.custom?.transition || 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                          transform: 'translateY(-2px)'
                        }
                      }}
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
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Typography variant="subtitle1" fontWeight="600" color={activeStep >= 2 ? 'primary.main' : 'inherit'}>
                      Advanced Options
                    </Typography>
                    {activeStep > 2 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, maxWidth: '60%' }}>
                        <Typography variant="caption" fontWeight="500" color="text.secondary" sx={{ mr: 1 }}>
                          Settings:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          <Chip
                            label={createDuplicate ? "Create Copy" : "Modify Original"}
                            size="large"
                            sx={{ fontSize: '1rem', height: '20px' }}
                            color={createDuplicate ? "success" : "warning"}
                          />
                          <Chip
                            label={`Headers in Context: ${advancedOptions.includeHeaders ? 'Yes' : 'No'}`}
                            size="large"
                            sx={{ fontSize: '1rem', height: '20px' }}
                          />
                        </Box>
                      </Box>
                    )}
                  </Box>
                </StepLabel>
                <StepContent>
                  {getStepContent(2)}
                  <Box sx={{ mb: 2, mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleNext}
                      sx={{ 
                        mt: 1, 
                        mr: 1,
                        px: 3,
                        boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.3)',
                        transition: theme => theme.custom?.transition || 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                          transform: 'translateY(-2px)'
                        }
                      }}
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
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Typography variant="subtitle1" fontWeight="600" color={activeStep >= 3 ? 'primary.main' : 'inherit'}>
                      Review and Execute
                    </Typography>
                  </Box>
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
      </AnimatedGradientPaper>
    </div>
  );
};

export default SpreadsheetTools; 