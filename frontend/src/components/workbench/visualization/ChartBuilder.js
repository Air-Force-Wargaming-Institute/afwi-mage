import React, { useState, useContext, useEffect } from 'react';
import { WorkbenchContext } from '../../../contexts/WorkbenchContext';
import { 
  Box, 
  Typography, 
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Card,
  CardContent,
  Divider,
  Tab,
  Tabs,
  Switch,
  FormControlLabel,
  Alert,
  AlertTitle,
  Tooltip,
  CircularProgress,
  Chip
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import CodeIcon from '@mui/icons-material/Code';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import '../../../App.css'; // Import App.css for styling

// Import styled components
import {
  GradientBorderPaper,
  AnimatedGradientPaper,
  SubtleGlowPaper,
  GradientBorderCard,
  GradientText,
  HighContrastGradientPaper,
  useContainerStyles
} from '../../../styles/StyledComponents';

// Import action buttons
import {
  ViewButton,
  AddButton,
  EditButton,
  DownloadButton,
  CopyButton
} from '../../../styles/ActionButtons';

// Code editor component - can be replaced with a more robust solution
const CodeEditor = ({ code, setCode, readOnly }) => {
  return (
    <TextField
      fullWidth
      multiline
      rows={15}
      value={code}
      onChange={(e) => setCode(e.target.value)}
      InputProps={{
        readOnly: readOnly,
        style: { 
          fontFamily: 'monospace', 
          fontSize: '0.9rem',
          backgroundColor: '#1A1A1A',
          color: '#f0f0f0',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }
      }}
      variant="outlined"
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: theme => theme.shape?.borderRadius || 10,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
            borderWidth: '1px',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
            borderWidth: '2px',
          },
          '& fieldset': {
            borderColor: 'transparent',
          }
        }
      }}
    />
  );
};

const ChartBuilder = () => {
  const {
    spreadsheets,
    fetchSpreadsheets,
    connectionError,
    isLoading,
    error,
    apiBaseUrl,
    visualizations,
    extractDataContext,
    generateVisualization,
    executeVisualizationCode
  } = useContext(WorkbenchContext);
  
  const containerClasses = useContainerStyles();
  const [selectedFile, setSelectedFile] = useState('');
  const [selectedChartType, setSelectedChartType] = useState('line');
  const [dataContext, setDataContext] = useState(null);
  const [vizRequest, setVizRequest] = useState('');
  const [visualizationCode, setVisualizationCode] = useState('# Python code will appear here after generation...');
  const [codeResult, setCodeResult] = useState({ status: 'idle', data: null, error: null });
  const [localError, setLocalError] = useState(null);
  const [useSeaborn, setUseSeaborn] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState('default');
  const [selectedPalette, setSelectedPalette] = useState('Set1');
  const [isExecutingCode, setIsExecutingCode] = useState(false);
  
  // Fetch data on component mount
  useEffect(() => {
    // Fetch spreadsheets only once when component mounts
    fetchSpreadsheets();
    // Empty dependency array means this only runs once on mount
    // DO NOT add fetchSpreadsheets to dependencies or it will cause infinite loops
  }, []);
  
  // Extract data context when selected file changes
  useEffect(() => {
    if (selectedFile) {
      extractDataContext(selectedFile)
        .then(context => setDataContext(context))
        .catch(err => {
          console.error('Error extracting data context:', err);
          setLocalError('Failed to extract data context: ' + err.message);
        });
    }
  }, [selectedFile, extractDataContext]);
  
  // Handle file selection
  const handleFileSelected = async (fileId) => {
    setSelectedFile(fileId);
    setCodeResult({status: 'idle', data: null, error: null});
    // Data context will be extracted by the useEffect that depends on selectedFile
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    // setTabValue(newValue); // Removed tabs, so this function might be unnecessary
  };
  
  // Handle visualization generation
  const handleGenerateVisualization = async () => {
    setLocalError(null);
    setCodeResult({status: 'loading', data: null, error: null});
    setIsExecutingCode(false);
    
    const request = {
      spreadsheet_id: selectedFile,
      visualization_type: selectedChartType,
      prompt: vizRequest,
      use_seaborn: useSeaborn,
      style: selectedStyle,
      color_palette: selectedPalette,
      data_context: dataContext
    };
    
    try {
      const result = await generateVisualization(request);
      setVisualizationCode(result.code);
      setCodeResult({
        status: 'success',
        data: result,
        error: null
      });
    } catch (err) {
      console.error('Error generating visualization:', err);
      const errorMsg = 'Failed to generate visualization: ' + (err.response?.data?.detail || err.message);
      setLocalError(errorMsg);
      setCodeResult({status: 'error', data: null, error: errorMsg});
    }
  };
  
  // Handle code execution after manual edits
  const handleRunCode = async () => {
    if (!codeResult.data?.id || !visualizationCode) {
        setLocalError("Cannot run code: Missing visualization context or code. Please generate first.");
        return;
    }
    
    setLocalError(null);
    setIsExecutingCode(true);
    
    try {
      const result = await executeVisualizationCode(
        codeResult.data.id, 
        visualizationCode
      );
      
      setCodeResult(prevResult => ({
        ...prevResult,
        status: 'success',
        error: null,
        data: {
          ...prevResult.data,
          image_url: result.image_url,
          data_url: result.data_url,
          code: visualizationCode
        }
      }));
    } catch (err) {
      console.error('Error executing code:', err);
      const errorMsg = 'Failed to execute code: ' + (err.response?.data?.detail || err.response?.data?.error || err.message);
      setLocalError(errorMsg);
      setCodeResult(prevResult => ({ ...prevResult, status: 'error', error: errorMsg }));
    } finally {
      setIsExecutingCode(false);
    }
  };
  
  // Handle exporting the visualization
  const handleExportVisualization = () => {
    if (!codeResult.data?.data_url) {
      alert("No visualization available to export.");
      return;
    }
    
    const link = document.createElement('a');
    link.href = codeResult.data.data_url;
    // Suggest a filename - you could make this more dynamic using the title or prompt
    link.download = codeResult.data.title ? `${codeResult.data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png` : 'visualization.png';
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link);
  };
  
  // Render data context information
  const renderDataContext = () => {
    if (!dataContext) return null;
    // Add a check for column_schema before accessing its length
    if (dataContext.loading) return <CircularProgress size={20} />;
    if (dataContext.error) return <Alert severity="error">{dataContext.error}</Alert>;
    
    // Ensure dataContext.column_schema exists and is an array before rendering details
    if (!dataContext.column_schema || !Array.isArray(dataContext.column_schema)) {
        // Optionally return null or a loading/error indicator if schema is not ready
        // console.warn("DataContext received without column_schema array.");
        return (
            <SubtleGlowPaper sx={{ mt: 2, mb: 2, p: 2 }}>
                <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                  File Analysis Summary
                </Typography>
                 <Typography variant="body2" color="text.secondary">
                     {dataContext.file_info?.name || 'Loading...'}: Analyzing columns...
                 </Typography>
            </SubtleGlowPaper>
        );
    }

    return (
      <SubtleGlowPaper sx={{ mt: 2, mb: 2, p: 2 }}>
        <Typography variant="subtitle2" fontWeight="600" gutterBottom>
          File Analysis Summary
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {dataContext.file_info.name}: {dataContext.row_count} rows, {dataContext.column_schema.length} columns
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Columns: {dataContext.column_schema.map(col => col.name).join(', ')}
        </Typography>
      </SubtleGlowPaper>
    );
  };

  // Render connection error message
  const renderConnectionError = () => {
    if (!connectionError) return null;
    
    return (
      <HighContrastGradientPaper sx={{ mb: 3 }}>
        <Alert 
          severity="warning" 
          variant="outlined"
          icon={<ErrorOutlineIcon />}
        >
          <AlertTitle>Backend Connection Error</AlertTitle>
          <Typography variant="body2" paragraph>
            Unable to connect to backend services. The visualization features require the backend to be running.
          </Typography>
          <Typography variant="body2">
            You can still explore the interface, but visualization generation will not work until the backend is available.
          </Typography>
        </Alert>
      </HighContrastGradientPaper>
    );
  };

  return (
    <div style={{ marginTop: '-10px' }}>
      <GradientText variant="h3" component="h1" gutterBottom className="section-title" sx={{ fontSize: '2.2rem', fontWeight: 600, mb: 1 }}>
        Data Visualization
      </GradientText>
      
      <Typography variant="body1" sx={{ mt: -1, mb: 2 }}>
        Create visualizations from Excel data using natural language requests.
      </Typography>
      
      {renderConnectionError()}
      
      <Grid container spacing={3}>
        {/* Left panel - Input */}
        <Grid item xs={12} md={5}>
          <GradientBorderPaper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom className="section-subtitle" fontWeight="600" color="primary.main">
              Visualization Request
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth sx={{
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    whiteSpace: 'normal',
                    '&.Mui-focused': {
                      color: 'primary.main',
                    }
                  }
                }}>
                  <InputLabel>Data Source</InputLabel>
                  <Select
                    value={selectedFile}
                    label="Data Source"
                    onChange={(e) => handleFileSelected(e.target.value)}
                    disabled={connectionError}
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.23)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      },
                      bgcolor: '#121212',
                      color: 'white',
                      '& .MuiSelect-icon': {
                        color: 'white',
                      }
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: '#121212',
                          color: 'white',
                          borderRadius: '0 0 20px 20px',
                          boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          '& .MuiMenuItem-root': {
                            color: 'white',
                            backgroundColor: '#121212',
                            '&:hover': {
                              bgcolor: 'rgba(66, 133, 244, 0.1)',
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
                    <MenuItem value="">
                      <em>Select a file</em>
                    </MenuItem>
                    {/* Actual spreadsheets would be populated here */}
                    {/* <MenuItem value="sample_data">Sample Sales Data (2023)</MenuItem> */}
                    {spreadsheets && spreadsheets.length > 0 ? (
                      spreadsheets.map((sheet) => (
                        <MenuItem key={sheet.id} value={sheet.id}>
                          {sheet.filename || sheet.original_filename || sheet.id} {/* Display name, fallback to ID */}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>
                        {isLoading ? 'Loading spreadsheets...' : (connectionError ? 'Backend unavailable' : 'No spreadsheets uploaded')}
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
                {renderDataContext()}
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Simply describe the visualization you want. Consider the following elements in your prompt: [CHART TYPE] / [COLUMNS OF INTEREST] / [POSSIBLE FILTERS]"
                  placeholder={connectionError ? 
                    "Backend connection required for visualization generation" : 
                    "E.g., Create a [CHART TYPE] showing [DATA] by [CATEGORY] across [TIME PERIOD]. "}
                  multiline
                  rows={4}
                  value={vizRequest}
                  onChange={(e) => setVizRequest(e.target.value)}
                  disabled={connectionError}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: theme => theme.shape?.borderRadius || 10,
                      backgroundColor: '#121212',
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
                      whiteSpace: 'normal',
                      '&.Mui-focused': {
                        color: 'primary.main',
                      }
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                      whiteSpace: 'pre-wrap',
                    },
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth style={{ marginBottom: '16px' }} sx={{
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    whiteSpace: 'normal',
                    '&.Mui-focused': {
                      color: 'primary.main',
                    }
                  }
                }}>
                  <InputLabel>Chart Type</InputLabel>
                  <Select
                    value={selectedChartType}
                    label="Chart Type"
                    onChange={(e) => setSelectedChartType(e.target.value)}
                    disabled={connectionError}
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.23)'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main'
                      },
                      bgcolor: '#121212',
                      color: 'white',
                      '& .MuiSelect-icon': {
                        color: 'white',
                      }
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: '#121212',
                          color: 'white',
                          borderRadius: '0 0 20px 20px',
                          boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          '& .MuiMenuItem-root': {
                            color: 'white',
                            backgroundColor: '#121212',
                            '&:hover': {
                              bgcolor: 'rgba(66, 133, 244, 0.1)',
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
                    <MenuItem value="line">Line Chart</MenuItem>
                    <MenuItem value="bar">Bar Chart</MenuItem>
                    <MenuItem value="scatter">Scatter Plot</MenuItem>
                    <MenuItem value="pie">Pie Chart</MenuItem>
                    <MenuItem value="heatmap">Heatmap</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useSeaborn}
                      onChange={(e) => setUseSeaborn(e.target.checked)}
                      disabled={connectionError}
                      color="primary"
                    />
                  }
                  label="Use Seaborn (enhanced styling)"
                />
              </Grid>
              
              {useSeaborn && (
                <>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth sx={{
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                        whiteSpace: 'normal',
                        '&.Mui-focused': {
                          color: 'primary.main',
                        }
                      }
                    }}>
                      <InputLabel>Style</InputLabel>
                      <Select
                        value={selectedStyle}
                        label="Style"
                        onChange={(e) => setSelectedStyle(e.target.value)}
                        disabled={connectionError}
                        sx={{
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.23)'
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main'
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main'
                          },
                          bgcolor: '#121212',
                          color: 'white',
                          '& .MuiSelect-icon': {
                            color: 'white',
                          }
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              bgcolor: '#121212',
                              color: 'white',
                              borderRadius: '0 0 20px 20px',
                              boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              '& .MuiMenuItem-root': {
                                color: 'white',
                                backgroundColor: '#121212',
                                '&:hover': {
                                  bgcolor: 'rgba(66, 133, 244, 0.1)',
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
                        <MenuItem value="default">Default</MenuItem>
                        <MenuItem value="whitegrid">White Grid</MenuItem>
                        <MenuItem value="darkgrid">Dark Grid</MenuItem>
                        <MenuItem value="ticks">Ticks</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth sx={{
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                        whiteSpace: 'normal',
                        '&.Mui-focused': {
                          color: 'primary.main',
                        }
                      }
                    }}>
                      <InputLabel>Color Palette</InputLabel>
                      <Select
                        value={selectedPalette}
                        label="Color Palette"
                        onChange={(e) => setSelectedPalette(e.target.value)}
                        disabled={connectionError}
                        sx={{
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.23)'
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main'
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main'
                          },
                          bgcolor: '#121212',
                          color: 'white',
                          '& .MuiSelect-icon': {
                            color: 'white',
                          }
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              bgcolor: '#121212',
                              color: 'white',
                              borderRadius: '0 0 20px 20px',
                              boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              '& .MuiMenuItem-root': {
                                color: 'white',
                                backgroundColor: '#121212',
                                '&:hover': {
                                  bgcolor: 'rgba(66, 133, 244, 0.1)',
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
                        <MenuItem value="Set1">Set1</MenuItem>
                        <MenuItem value="Set2">Set2</MenuItem>
                        <MenuItem value="viridis">Viridis</MenuItem>
                        <MenuItem value="plasma">Plasma</MenuItem>
                        <MenuItem value="coolwarm">Coolwarm</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  fullWidth
                  color="primary"
                  disabled={!selectedFile || !vizRequest || isLoading || codeResult.status === 'loading'}
                  onClick={handleGenerateVisualization}
                  sx={{ 
                    mt: 1, 
                    mb: 1,
                    py: 1.5,
                    boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.3)',
                    transition: theme => theme.custom?.transition || 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  {isLoading || codeResult.status === 'loading' ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Generate Visualization'
                  )}
                </Button>
              </Grid>
            </Grid>
          </GradientBorderPaper>
        </Grid>
        
        {/* Right panel - Output */}
        <Grid item xs={12} md={7}>
          <GradientBorderPaper elevation={3} sx={{ 
            p: 3, 
            height: '100%',
            borderWidth: theme => `${theme.custom?.borderWidth?.thin}px`,
            borderRadius: 2,
            background: theme => theme.custom?.gradients?.horizontal || 'linear-gradient(to right, #4285f4,rgb(126, 139, 255),rgb(209, 234, 255))',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
            '&::before': {
              background: '#121212',
              borderRadius: theme => theme.shape.borderRadius - theme.custom?.borderWidth?.thin/2 || 1.5,
            }
          }}>
            {localError && (
              <Alert 
                severity="error" 
                style={{ marginBottom: '16px' }} 
                onClose={() => setLocalError(null)}
                variant="filled"
                sx={{
                  borderRadius: theme => theme.shape?.borderRadius || 10,
                  boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.3)'
                }}
              >
                {localError}
              </Alert>
            )}
            
            {codeResult && codeResult.error && (
              <Alert 
                severity="error" 
                style={{ marginBottom: '16px' }}
                variant="filled"
                sx={{
                  borderRadius: theme => theme.shape?.borderRadius || 10,
                  boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.3)'
                }}
              >
                {codeResult.error}
              </Alert>
            )}
            
            <Box mb={3}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="600" color="primary.light">
                  Visualization Preview
                </Typography>
                <DownloadButton
                  onClick={handleExportVisualization}
                  tooltip="Export Visualization as PNG"
                  disabled={!codeResult.data?.data_url || connectionError}
                />
              </Box>
              
              <SubtleGlowPaper sx={{ 
                mt: 1,
                p: 0, 
                overflow: 'hidden',
                backgroundColor: '#1A1A1A',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                minHeight: '300px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {codeResult.status === 'loading' ? (
                  <CircularProgress size={40} />
                ) : codeResult.status === 'error' ? (
                  <Alert severity="error" sx={{ width: '100%', justifyContent: 'center' }}>
                    {localError || "Failed to generate or execute visualization."}
                  </Alert>
                ) : codeResult.data?.data_url ? (
                  <Box sx={{ width: '100%' }}>
                    <img
                      src={codeResult.data.data_url} 
                      alt={codeResult.data.title || "Generated Visualization"}
                      style={{ 
                        display: 'block',
                        width: '100%', 
                        height: 'auto', 
                        maxHeight: '500px', 
                        objectFit: 'contain' 
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        setLocalError("Failed to load visualization image from the server.");
                      }}
                    />
                    <Box sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {vizRequest || "Generated visualization based on your request."} 
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {connectionError ? "Backend connection needed." : "Generate a visualization to see the preview."}
                  </Typography>
                )}
              </SubtleGlowPaper>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
              <Button 
                variant="contained" 
                size="small"
                startIcon={isExecutingCode ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                onClick={handleRunCode}
                disabled={!visualizationCode || codeResult.status === 'loading' || isExecutingCode}
                sx={{ 
                  boxShadow: theme => theme.custom?.boxShadow || '0 4px 10px rgba(0, 0, 0, 0.3)',
                  transition: theme => theme.custom?.transition || 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: theme => theme.custom?.boxShadowLarge || '0 8px 16px rgba(0, 0, 0, 0.4)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                {isExecutingCode ? 'Running...' : 'Run Code'}
              </Button>
            </Box>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="600" color="primary.light">
                  Python Visualization Code
                </Typography>
              </Box>
              <CodeEditor 
                code={visualizationCode || (connectionError ? 
                  "# Backend connection required to generate visualization code\\n# Please start the backend services and reload this page" : 
                  "")} 
                setCode={setVisualizationCode}
                readOnly={connectionError}
              />
            </Box>
          </GradientBorderPaper>
        </Grid>
      </Grid>
    </div>
  );
};

export default ChartBuilder; 