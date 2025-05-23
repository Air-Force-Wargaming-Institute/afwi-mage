import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  IconButton, 
  Typography, 
  Box, 
  Tab, 
  Tabs, 
  Divider,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
  TextField,
  InputAdornment,
  Collapse,
  Chip,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Popover
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import InfoIcon from '@mui/icons-material/Info';
import ClearIcon from '@mui/icons-material/Clear';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import EditIcon from '@mui/icons-material/Edit';
import { WorkbenchContext } from '../../../contexts/WorkbenchContext';
import '../../../App.css';
import { 
  GradientBorderPaper, 
  SubtleGlowPaper,
  AnimatedGradientPaper
} from '../../../styles/StyledComponents';

/**
 * SpreadsheetModal Component
 * 
 * A modal dialog for viewing and interacting with spreadsheet data.
 * Supports multiple sheets, virtualized rendering, and various data operations.
 * 
 * @param {Object} props Component props
 * @param {boolean} props.open Whether the modal is open
 * @param {function} props.onClose Function to call when modal is closed
 * @param {string} props.spreadsheetId ID of the spreadsheet to display
 * @param {string} props.filename Filename of the spreadsheet
 */
const SpreadsheetModal = ({ open, onClose, spreadsheetId, filename }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const searchInputRef = useRef(null);
  const zoomButtonRef = useRef(null);
  
  const { 
    getSpreadsheetSheets, 
    performCellOperation,
    isLoading,
    apiBaseUrl,
    updateSpreadsheet
  } = useContext(WorkbenchContext);
  
  // State for renaming
  const [isRenaming, setIsRenaming] = useState(false);
  const [newFilename, setNewFilename] = useState('');
  const [displayFilename, setDisplayFilename] = useState(filename);
  const [filenameError, setFilenameError] = useState('');
  
  // State for spreadsheet data
  const [sheets, setSheets] = useState([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [sheetData, setSheetData] = useState({});
  const [sheetMetadata, setSheetMetadata] = useState({});
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Search functionality
  const [searchText, setSearchText] = useState('');
  const [filteredRows, setFilteredRows] = useState([]);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  
  // Pagination functionality
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Scroll position tracking
  const [scrollPositions, setScrollPositions] = useState({});
  const tableContainerRef = useRef(null);
  
  // Sorting functionality
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });
  
  // Column resizing functionality
  const [columnWidths, setColumnWidths] = useState({});
  const [resizingColumn, setResizingColumn] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  
  // Text wrapping functionality
  const [textWrapEnabled, setTextWrapEnabled] = useState(false);
  
  // Zoom functionality
  const [zoomLevel, setZoomLevel] = useState(100); // 100% is default zoom
  const [zoomPopoverOpen, setZoomPopoverOpen] = useState(false);
  const [zoomAnchorEl, setZoomAnchorEl] = useState(null);
  
  // Default font sizes for different table elements (in px)
  const DEFAULT_FONT_SIZES = {
    headerText: 14,
    cellText: 13,
    rowNumber: 12
  };
  
  // Calculate font sizes based on zoom level
  const getFontSize = (baseSize) => {
    return Math.round((baseSize * zoomLevel) / 100);
  };
  
  // Get cell padding based on zoom level
  const getCellPadding = () => {
    const basePadding = 16;
    const paddingFactor = zoomLevel / 100;
    
    // Ensure padding doesn't go below a minimum value
    return Math.max(4, Math.round(basePadding * paddingFactor));
  };
  
  // Handle zoom controls
  const handleZoomChange = (event, newValue) => {
    setZoomLevel(newValue);
  };
  
  // Handle zoom in/out buttons
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 10, 200));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 10, 50));
  };
  
  // Handle zoom menu
  const handleZoomClick = (event) => {
    setZoomAnchorEl(event.currentTarget);
    setZoomPopoverOpen(true);
  };
  
  const handleZoomClose = () => {
    setZoomPopoverOpen(false);
  };
  
  // Handle zoom reset
  const handleZoomReset = () => {
    setZoomLevel(100);
  };
  
  // Update display filename when filename prop changes
  useEffect(() => {
    setDisplayFilename(filename);
  }, [filename]);
  
  // Load sheet names when spreadsheet ID changes
  useEffect(() => {
    if (open && spreadsheetId) {
      loadSheetNames();
    }
  }, [open, spreadsheetId]);
  
  // Load sheet data when active sheet changes or pagination changes
  useEffect(() => {
    if (sheets.length > 0 && activeSheetIndex >= 0) {
      const currentSheet = sheets[activeSheetIndex];
      
      // Always reload when rowsPerPage changes to ensure we have the correct number of rows
      const needsReload = 
        !sheetData[currentSheet] || 
        !sheetData[currentSheet][currentPage] || 
        Object.keys(sheetData[currentSheet]).length === 0;
      
      if (needsReload) {
        loadSheetData(currentSheet, currentPage, rowsPerPage);
      }
      
      // Reset search when changing sheets
      setSearchText('');
      setFilteredRows([]);
      setCurrentMatchIndex(-1);
      setMatchCount(0);
    }
  }, [sheets, activeSheetIndex, currentPage, rowsPerPage]);
  
  // Restore scroll position when changing sheet or after data loads - optimized version
  // This effect runs less frequently than the previous implementation
  useEffect(() => {
    // Only run this effect when we have both data and a scroll position to restore
    if (sheets.length > 0 && 
        activeSheetIndex >= 0 && 
        tableContainerRef.current) {
      
      const currentSheet = sheets[activeSheetIndex];
      
      // Only restore if we have a saved position and the data is loaded
      if (scrollPositions[currentSheet] && 
          sheetData[currentSheet] && 
          sheetData[currentSheet][currentPage]) {
        
        // Use requestAnimationFrame for better performance than setTimeout
        requestAnimationFrame(() => {
          if (tableContainerRef.current) {
            tableContainerRef.current.scrollTop = scrollPositions[currentSheet].top || 0;
            tableContainerRef.current.scrollLeft = scrollPositions[currentSheet].left || 0;
          }
        });
      }
    }
  }, [activeSheetIndex, currentPage]); // Reduced dependency array - only run when sheet or page changes
  
  // Calculate search matches using useMemo instead of useEffect to prevent infinite loops
  const searchResults = useMemo(() => {
    // Default empty results
    const defaultResults = {
      matches: [],
      count: 0
    };
    
    // Skip processing if search is empty
    if (!searchText.trim()) {
      return defaultResults;
    }
    
    // Skip if we don't have sheets or active sheet index
    if (!sheets.length || activeSheetIndex < 0) {
      return defaultResults;
    }
    
    const currentSheet = sheets[activeSheetIndex];
    
    // Skip if we don't have data for this sheet and page
    if (!sheetData[currentSheet] || 
        !sheetData[currentSheet][currentPage] || 
        !sheetData[currentSheet][currentPage].length || 
        sheetData[currentSheet][currentPage].length <= 1) {
      return defaultResults;
    }
    
    try {
      const data = sheetData[currentSheet][currentPage];
      const searchLower = searchText.toLowerCase();
      const matches = [];
      
      // Skip header row (index 0)
      for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
        const row = data[rowIndex];
        if (!Array.isArray(row)) continue;
        
        const rowMatches = row.some(cell => 
          cell !== null && 
          cell !== undefined && 
          String(cell).toLowerCase().includes(searchLower)
        );
        
        if (rowMatches) {
          matches.push(rowIndex);
        }
      }
      
      return {
        matches,
        count: matches.length
      };
    } catch (error) {
      console.error('Error in search:', error);
      return defaultResults;
    }
  }, [searchText, sheets, activeSheetIndex, sheetData, currentPage]);
  
  // Update filteredRows and matchCount when search results change
  useEffect(() => {
    setFilteredRows(searchResults.matches);
    setMatchCount(searchResults.count);
    
    // Update currentMatchIndex without depending on previous value
    if (searchResults.count > 0 && currentMatchIndex === -1) {
      setCurrentMatchIndex(0);
    } else if (searchResults.count === 0) {
      setCurrentMatchIndex(-1);
    } else if (currentMatchIndex >= searchResults.count) {
      setCurrentMatchIndex(Math.max(0, searchResults.count - 1));
    }
    // Note: we don't include currentMatchIndex in the dependency array 
    // to prevent infinite updates
  }, [searchResults]); // Removed currentMatchIndex from dependencies
  
  // Focus search input when search is opened
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape key to close modal
      if (e.key === 'Escape' && open) {
        if (currentMatchIndex !== -1) {
          setCurrentMatchIndex(-1);
        } else {
          onClose();
        }
      }
      
      // Ctrl+F to open search
      if (e.key === 'f' && e.ctrlKey && open) {
        e.preventDefault();
      }
      
      // F3 or Enter to navigate to next search result
      if ((e.key === 'F3' || (e.key === 'Enter' && currentMatchIndex !== -1)) && matchCount > 0) {
        e.preventDefault();
        navigateToNextMatch();
      }
      
      // Shift+F3 or Shift+Enter to navigate to previous search result
      if ((e.key === 'F3' && e.shiftKey) || (e.key === 'Enter' && e.shiftKey)) {
        e.preventDefault();
        navigateToPreviousMatch();
      }
      
      // Page navigation with keyboard
      if (e.key === 'PageDown' && !e.ctrlKey) {
        e.preventDefault();
        handleNextPage();
      }
      
      if (e.key === 'PageUp' && !e.ctrlKey) {
        e.preventDefault();
        handlePreviousPage();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, currentMatchIndex, matchCount, currentPage]);
  
  // Load sheet names
  const loadSheetNames = async () => {
    setLocalLoading(true);
    setError(null);
    
    try {
      const result = await getSpreadsheetSheets(spreadsheetId);
      if (result && result.sheets && result.sheets.length > 0) {
        setSheets(result.sheets);
        setActiveSheetIndex(0);
        
        // Initialize sheet metadata with sheet-specific data from the response
        const metadata = {};
        
        // Check if we have detailed sheet information
        if (result.sheet_details && Array.isArray(result.sheet_details)) {
          // Use the detailed metadata received from the backend
          result.sheet_details.forEach(sheetDetail => {
            metadata[sheetDetail.name] = {
              totalRows: sheetDetail.row_count || 1000, // Use sheet-specific row count
              loadedPages: [],
              headers: sheetDetail.columns || [], // Use sheet-specific columns
              columnWidths: {}
            };
          });
        } else {
          // Fallback: use simple initialization if sheet_details isn't available (for backward compatibility)
          result.sheets.forEach(sheet => {
            metadata[sheet] = {
              totalRows: 1000, // Assumed initially, will be updated
              loadedPages: [],
              headers: [],
              columnWidths: {}
            };
          });
        }
        
        setSheetMetadata(metadata);
        
        // Set initial total rows from the first sheet
        if (result.sheet_details && result.sheet_details.length > 0) {
          setTotalRows(result.sheet_details[0].row_count || 1000);
        }
      } else {
        setError('No sheets found in spreadsheet');
      }
    } catch (err) {
      console.error('Error loading sheet names:', err);
      setError('Failed to load sheet names: ' + (err.message || 'Unknown error'));
    } finally {
      setLocalLoading(false);
    }
  };
  
  // Calculate cell range for a page
  const getPageCellRange = (page, pageSize) => {
    const startRow = (page - 1) * pageSize + 1; // 1-indexed
    const endRow = startRow + pageSize - 1;
    
    // Use dynamic column range (A-Z) - we'll use more columns (A-ZZ) to ensure we get all data
    // This is a more reliable approach than just A-Z which might miss columns
    const columnRange = 'A-ZZ';
    
    // We need to include the header row (A1) in the first page
    if (page === 1) {
      return `A1:${columnRange}${endRow}`;
    } else {
      // For subsequent pages, we need to start from A{startRow}
      return `A${startRow}:${columnRange}${endRow}`;
    }
  };
  
  // Load sheet data
  const loadSheetData = async (sheetName, page = 1, pageSize = 100) => {
    // Add validation: Only proceed if sheetName is a valid string
    if (typeof sheetName !== 'string' || !sheetName.trim()) {
      console.log('Skipping loadSheetData: Invalid sheetName', sheetName);
      return;
    }

    setLocalLoading(true);
    
    try {
      // Check if the file is likely a CSV based on filename extension
      const isCsv = filename && filename.toLowerCase().endsWith('.csv');
      
      // Prepare operation parameters
      const operationParams = {
        operation: 'read',
        sheet_name: sheetName,
      };
      
      if (isCsv) {
        // For CSV, send start_row and end_row instead of cell_range
        // Add 1 because backend skiprows is 0-based, but our page logic is 1-based for rows
        operationParams.start_row = (page - 1) * pageSize;
        operationParams.end_row = operationParams.start_row + pageSize - 1;
        console.log(`Loading CSV data for ${sheetName}, page ${page}, rows ${operationParams.start_row + 1}-${operationParams.end_row + 1}`);
      } else {
        // For Excel, use cell_range
        operationParams.cell_range = getPageCellRange(page, pageSize);
        console.log(`Loading Excel data for ${sheetName}, page ${page}, with ${pageSize} rows per page. Range: ${operationParams.cell_range}`);
      }
      
      const result = await performCellOperation(spreadsheetId, operationParams);
      
      if (result && result.success) {
        // Update sheet data
        setSheetData(prev => {
          // Initialize sheet if it doesn't exist
          const sheetPages = prev[sheetName] || {};
          
          // If it's the first page, we need to extract the headers
          let headers = [];
          if (page === 1 && result.data.values.length > 0) {
            headers = result.data.values[0];
            
            // Update metadata with headers and row count specifically for this sheet
            setSheetMetadata(prevMetadata => ({
              ...prevMetadata,
              [sheetName]: {
                ...prevMetadata[sheetName],
                headers,
                totalRows: result.data.row_count || prevMetadata[sheetName]?.totalRows || 1000,
                loadedPages: [...(prevMetadata[sheetName]?.loadedPages || []), page],
                columnWidths: columnWidths
              }
            }));
          }
          
          // For page 1, we include the headers. For other pages, we need to add the headers
          let pageData = result.data.values;
          if (page > 1 && headers.length > 0) {
            // Get headers from metadata or first page
            const existingHeaders = sheetMetadata[sheetName]?.headers || 
                                   (prev[sheetName] && prev[sheetName][1] ? prev[sheetName][1][0] : []);
            
            if (existingHeaders.length > 0) {
              pageData = [existingHeaders, ...result.data.values.slice(1)]; 
            }
          }
          
          // Initialize column widths if needed
          if (page === 1) {
            setTimeout(() => {
              initializeColumnWidths(sheetName, pageData);
            }, 0);
          }
          
          return {
            ...prev,
            [sheetName]: {
              ...sheetPages,
              [page]: pageData
            }
          };
        });
        
        // Update total rows if available - but only for the current sheet
        if (result.data.row_count) {
          // Update the main totalRows state (for this specific sheet)
          setTotalRows(result.data.row_count);
          
          // Also ensure it's saved in the sheet metadata
          setSheetMetadata(prevMetadata => ({
            ...prevMetadata,
            [sheetName]: {
              ...prevMetadata[sheetName],
              totalRows: result.data.row_count
            }
          }));
        }
      } else {
        throw new Error(result?.error || 'Failed to load sheet data');
      }
    } catch (err) {
      console.error(`Error loading data for sheet ${sheetName}:`, err);
      setError(`Failed to load data for sheet ${sheetName}: ${err.message || 'Unknown error'}`);
    } finally {
      setLocalLoading(false);
    }
  };
  
  // Load more data (next page)
  const loadMoreData = async () => {
    if (sheets.length === 0 || activeSheetIndex < 0) return;
    
    const currentSheet = sheets[activeSheetIndex];
    const nextPage = currentPage + 1;
    
    setLoadingMore(true);
    
    try {
      await loadSheetData(currentSheet, nextPage, rowsPerPage);
      setCurrentPage(nextPage);
    } catch (err) {
      console.error('Error loading more data:', err);
    } finally {
      setLoadingMore(false);
    }
  };
  
  // Handle page change
  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };
  
  // Handle next page
  const handleNextPage = () => {
    const maxPage = Math.ceil(totalRows / rowsPerPage);
    if (currentPage < maxPage) {
      setCurrentPage(prev => prev + 1);
    }
  };
  
  // Handle previous page
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };
  
  // Handle rows per page change
  const handleRowsPerPageChange = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    
    // Calculate the first row index of the current page
    const currentFirstRow = (currentPage - 1) * rowsPerPage + 1;
    
    // Calculate which page this row would be on with the new page size
    const newPage = Math.floor((currentFirstRow - 1) / newRowsPerPage) + 1;
    
    // Update state
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(newPage);
    
    // Force reload data with new page size
    if (sheets.length > 0 && activeSheetIndex >= 0) {
      const sheet = sheets[activeSheetIndex];
      // Clear existing data for this sheet to force reload
      setSheetData(prev => ({
        ...prev,
        [sheet]: {}
      }));
    }
  };
  
  // Handle sheet tab change
  const handleSheetChange = (event, newIndex) => {
    // Save current scroll position before changing sheet
    if (tableContainerRef.current && sheets.length > 0 && activeSheetIndex >= 0) {
      const currentSheet = sheets[activeSheetIndex];
      
      setScrollPositions(prev => ({
        ...prev,
        [currentSheet]: {
          top: tableContainerRef.current.scrollTop,
          left: tableContainerRef.current.scrollLeft
        }
      }));
    }
    
    // Get the sheet we're switching to
    const newSheet = sheets[newIndex];
    
    // Update row count using the sheet-specific metadata
    if (newSheet && sheetMetadata[newSheet]) {
      const newTotalRows = sheetMetadata[newSheet].totalRows || 1000;
      
      // Only update if different to avoid unnecessary re-renders
      if (totalRows !== newTotalRows) {
        setTotalRows(newTotalRows);
      }
    }
    
    setActiveSheetIndex(newIndex);
    setCurrentPage(1); // Reset to first page when changing sheets
  };
  
  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  // Handle download
  const handleDownload = async () => {
    if (!spreadsheetId) return;
    
    try {
      // Construct the download URL
      let baseUrl = 'http://localhost:8020/api/workbench/spreadsheets'; //TODO: Implement the proper authentication for a download
      // If we have a context with apiBaseUrl, use it
      // if (apiBaseUrl) {
      //   baseUrl = apiBaseUrl.endsWith('/') 
      //     ? `${apiBaseUrl}api/workbench/spreadsheets` 
      //     : `${apiBaseUrl}/api/workbench/spreadsheets`;
      // }
      
      const downloadUrl = `${baseUrl}/${spreadsheetId}/download`;
      
      // Create a temporary anchor element
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename || `spreadsheet-${spreadsheetId}.xlsx`);
      document.body.appendChild(link);
      
      // Trigger the download
      link.click();
      
      // Clean up
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading spreadsheet:', error);
      // You could add error handling here, such as displaying a toast notification
    }
  };
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
  };
  
  // Clear search
  const clearSearch = () => {
    setSearchText('');
    setFilteredRows([]);
  };
  
  // Navigate to next search match
  const navigateToNextMatch = () => {
    if (matchCount === 0) return;
    
    const newIndex = (currentMatchIndex + 1) % matchCount;
    setCurrentMatchIndex(newIndex);
    scrollToMatchedRow(filteredRows[newIndex]);
  };
  
  // Navigate to previous search match
  const navigateToPreviousMatch = () => {
    if (matchCount === 0) return;
    
    const newIndex = (currentMatchIndex - 1 + matchCount) % matchCount;
    setCurrentMatchIndex(newIndex);
    scrollToMatchedRow(filteredRows[newIndex]);
  };
  
  // Scroll to matched row
  const scrollToMatchedRow = (rowIndex) => {
    const tableElement = document.getElementById('spreadsheet-table-container');
    if (!tableElement) return;
    
    const rowElement = document.getElementById(`spreadsheet-row-${rowIndex}`);
    if (rowElement) {
      rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  
  // Request sort on a column
  const requestSort = (columnIndex) => {
    // If clicking on the same column, toggle direction
    if (sortConfig.key === columnIndex.toString()) {
      setSortConfig({
        key: columnIndex.toString(),
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      // New column, start with ascending
      setSortConfig({
        key: columnIndex.toString(),
        direction: 'asc'
      });
    }
  };
  
  // Optimize sorting with useMemo to prevent unnecessary recalculations
  const sortedData = useMemo(() => {
    if (sortConfig.key === null || !sheets.length || activeSheetIndex < 0) {
      return null; // Return null to use unsorted data
    }
    
    const currentSheet = sheets[activeSheetIndex];
    
    // Make sure we have data for this sheet and page
    if (!sheetData[currentSheet] || 
        !sheetData[currentSheet][currentPage] || 
        !Array.isArray(sheetData[currentSheet][currentPage]) ||
        sheetData[currentSheet][currentPage].length <= 1) {
      return null;
    }
    
    try {
      const data = [...sheetData[currentSheet][currentPage]];
      const headerRow = data[0];
      const columnIndex = parseInt(sortConfig.key, 10);
      
      // Extract header row and data rows
      const dataRows = data.slice(1);
      
      // Sort the data rows
      const sortedRows = [...dataRows].sort((a, b) => {
        // Check if rows exist and have the column index
        if (!a || !b || !Array.isArray(a) || !Array.isArray(b)) {
          return 0;
        }
        
        const valueA = a[columnIndex];
        const valueB = b[columnIndex];
        
        // Handle cases where values might be undefined or null
        if (valueA === undefined || valueA === null) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valueB === undefined || valueB === null) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        
        // Handle different data types
        // Numbers
        if (!isNaN(valueA) && !isNaN(valueB)) {
          return sortConfig.direction === 'asc' 
            ? Number(valueA) - Number(valueB)
            : Number(valueB) - Number(valueA);
        }
        
        // Dates - try to parse as dates
        const dateA = new Date(valueA);
        const dateB = new Date(valueB);
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return sortConfig.direction === 'asc'
            ? dateA - dateB
            : dateB - dateA;
        }
        
        // Strings and other types
        const strA = String(valueA).toLowerCase();
        const strB = String(valueB).toLowerCase();
        
        if (strA < strB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (strA > strB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
      
      // Combine header row with sorted data rows
      return [headerRow, ...sortedRows];
    } catch (error) {
      console.error('Error sorting data:', error);
      return sheetData[currentSheet][currentPage]; // Return unsorted data in case of error
    }
  }, [sortConfig, sheets, activeSheetIndex, sheetData, currentPage]);
  
  // Use memoized data for rendering
  const getDataToRender = useCallback(() => {
    if (!sheets.length || activeSheetIndex < 0) {
      return [];
    }
    
    const currentSheet = sheets[activeSheetIndex];
    
    if (!sheetData[currentSheet] || !sheetData[currentSheet][currentPage]) {
      return [];
    }
    
    // Use sorted data if available, otherwise use original data
    return sortedData || sheetData[currentSheet][currentPage] || [];
  }, [sheets, activeSheetIndex, sheetData, currentPage, sortedData]);
  
  // Save column widths to state when component unmounts
  useEffect(() => {
    // Save column widths in sheet metadata when unmounting
    return () => {
      if (sheets.length > 0 && activeSheetIndex >= 0) {
        const currentSheet = sheets[activeSheetIndex];
        setSheetMetadata(prev => ({
          ...prev,
          [currentSheet]: {
            ...prev[currentSheet],
            columnWidths: columnWidths
          }
        }));
      }
    };
  }, [sheets, activeSheetIndex, columnWidths]);
  
  // Handle toggle text wrapping
  const toggleTextWrap = () => {
    setTextWrapEnabled(prev => {
      const newValue = !prev;
      
      // If enabling text wrap, we need to ensure the table layout is updated
      if (newValue) {
        // Use setTimeout to let React render the UI change first
        setTimeout(() => {
          // Force a small scroll to trigger layout recalculation
          if (tableContainerRef.current) {
            const currentScroll = tableContainerRef.current.scrollTop;
            tableContainerRef.current.scrollTop = currentScroll + 1;
            tableContainerRef.current.scrollTop = currentScroll;
          }
        }, 50);
      }
      
      return newValue;
    });
  };
  
  // Initialize column widths for a sheet
  const initializeColumnWidths = (sheet, data) => {
    if (!data || data.length === 0 || !data[0] || data[0].length === 0) return;
    
    // If we already have column widths for this sheet, use them
    if (sheetMetadata[sheet]?.columnWidths && Object.keys(sheetMetadata[sheet].columnWidths).length > 0) {
      setColumnWidths(sheetMetadata[sheet].columnWidths);
      return;
    }
    
    // Otherwise, calculate initial widths based on content
    const headerRow = data[0];
    const defaultWidths = {};
    
    // Also analyze a few data rows to get better width estimates
    const dataRowsToAnalyze = Math.min(10, data.length - 1);
    const contentLengths = {};
    
    // First get the header lengths
    headerRow.forEach((cell, index) => {
      contentLengths[index] = cell ? String(cell).length : 0;
    });
    
    // Then check data row content lengths
    for (let i = 1; i <= dataRowsToAnalyze; i++) {
      if (data[i] && Array.isArray(data[i])) {
        data[i].forEach((cell, index) => {
          if (cell) {
            const cellLength = String(cell).length;
            if (cellLength > (contentLengths[index] || 0)) {
              contentLengths[index] = cellLength;
            }
          }
        });
      }
    }
    
    // Set widths based on content length, with reasonable bounds
    Object.keys(contentLengths).forEach(index => {
      const minWidth = 60; // Minimum column width in pixels
      const maxWidth = 500; // Increased maximum column width from 300px to 500px
      const charWidth = 8; // Estimated width per character in pixels
      
      // Calculate width based on content length
      let width = Math.max(minWidth, Math.min(contentLengths[index] * charWidth, maxWidth));
      
      defaultWidths[index] = width;
    });
    
    setColumnWidths(defaultWidths);
    
    // Save in sheet metadata
    setSheetMetadata(prev => ({
      ...prev,
      [sheet]: {
        ...prev[sheet],
        columnWidths: defaultWidths
      }
    }));
  };
  
  // Handle auto-fit column width on double-click of resize handle
  const handleDoubleClickResize = (e, columnIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!sheets.length || activeSheetIndex < 0) return;
    const currentSheet = sheets[activeSheetIndex];
    
    if (!sheetData[currentSheet] || !sheetData[currentSheet][currentPage]) return;
    
    const data = sheetData[currentSheet][currentPage];
    if (!data || data.length <= 1) return;
    
    // Analyze all visible rows for this column to find the maximum content length
    let maxLength = 0;
    const headerText = data[0][columnIndex] ? String(data[0][columnIndex]).length : 0;
    maxLength = Math.max(maxLength, headerText);
    
    // Check content length in all visible rows
    for (let i = 1; i < data.length; i++) {
      if (data[i] && Array.isArray(data[i]) && data[i][columnIndex]) {
        const cellLength = String(data[i][columnIndex]).length;
        maxLength = Math.max(maxLength, cellLength);
      }
    }
    
    // Calculate optimal width with some padding
    const charWidth = 9; // Slightly wider for better readability
    const padding = 24; // Extra padding to ensure full visibility
    const optimalWidth = Math.max(80, (maxLength * charWidth) + padding);
    
    // Update column width
    setColumnWidths(prev => ({
      ...prev,
      [columnIndex]: optimalWidth
    }));
    
    // Save in sheet metadata
    if (sheets.length > 0 && activeSheetIndex >= 0) {
      const currentSheet = sheets[activeSheetIndex];
      setSheetMetadata(prev => ({
        ...prev,
        [currentSheet]: {
          ...prev[currentSheet],
          columnWidths: {
            ...prev[currentSheet]?.columnWidths,
            [columnIndex]: optimalWidth
          }
        }
      }));
    }
  };
  
  // Handle start of column resize
  const handleResizeStart = (e, columnIndex) => {
    e.preventDefault(); // Prevent default behavior
    e.stopPropagation(); // Prevent sorting when resizing
    setResizingColumn(columnIndex);
    setStartX(e.clientX);
    setStartWidth(columnWidths[columnIndex] || 150);
    
    // Add document-level event listeners for mouse move and up
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };
  
  // Handle column resize movement
  const handleResizeMove = useCallback((e) => {
    if (resizingColumn === null) return;
    
    const diff = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + diff); // Minimum 50px width, no maximum limit
    
    console.log(`Resizing column ${resizingColumn}: startWidth=${startWidth}, diff=${diff}, newWidth=${newWidth}`);
    
    // Update column width in state
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth
    }));
    
    // Apply width directly to column for immediate visual feedback during drag
    try {
      const headerCells = document.querySelectorAll('#spreadsheet-table-container .MuiTableHead-root .MuiTableCell-root');
      const columnCells = document.querySelectorAll(`#spreadsheet-table-container .MuiTableBody-root .MuiTableRow-root td:nth-child(${Number(resizingColumn) + 2})`);
      
      if (headerCells[Number(resizingColumn) + 1]) {
        headerCells[Number(resizingColumn) + 1].style.width = `${newWidth}px`;
        headerCells[Number(resizingColumn) + 1].style.minWidth = `${newWidth}px`;
      }
      
      // Update all cells in this column
      columnCells.forEach(cell => {
        cell.style.width = `${newWidth}px`;
        cell.style.minWidth = `${newWidth}px`;
      });
    } catch (err) {
      console.error('Error updating cell width during resize:', err);
    }
  }, [resizingColumn, startX, startWidth]);
  
  // Handle end of column resize
  const handleResizeEnd = useCallback(() => {
    console.log(`Finished resizing column ${resizingColumn}`);
    
    setResizingColumn(null);
    
    // Remove document-level event listeners
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    
    // Save column widths in sheet metadata
    if (sheets.length > 0 && activeSheetIndex >= 0) {
      const currentSheet = sheets[activeSheetIndex];
      setSheetMetadata(prev => ({
        ...prev,
        [currentSheet]: {
          ...prev[currentSheet],
          columnWidths: columnWidths
        }
      }));
    }
  }, [columnWidths, sheets, activeSheetIndex, handleResizeMove]);
  
  // Clean up event listeners when component unmounts
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);
  
  // Render data table - update to use optimized data access and remove scroll event
  const renderDataTable = () => {
    if (localLoading || isLoading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="300px">
          <CircularProgress />
        </Box>
      );
    }
    
    if (error) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="300px">
          <Typography color="error">{error}</Typography>
        </Box>
      );
    }
    
    if (!sheets.length || activeSheetIndex < 0 || activeSheetIndex >= sheets.length) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="300px">
          <Typography>No data available</Typography>
        </Box>
      );
    }
    
    const currentSheet = sheets[activeSheetIndex];
    
    // Get data to render using memoized function
    const data = getDataToRender();
    
    // Check if data exists and has content before rendering
    if (!data || !data.length || !data[0]) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="300px">
          <CircularProgress />
          <Typography ml={2}>Loading data...</Typography>
        </Box>
      );
    }
    
    // Calculate cell padding based on zoom level
    const cellPadding = getCellPadding();
    
    // Render the data table - update the styling here
    return (
      <GradientBorderPaper elevation={2} sx={{ 
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'rgba(18, 18, 18, 0.95)'
      }}>
        <TableContainer 
          id="spreadsheet-table-container" 
          ref={tableContainerRef}
          style={{ 
            maxHeight: `calc(100vh - 375px)`, 
            overflow: 'auto',
            minHeight: '300px',
            position: 'relative',
            zIndex: 0,
            backgroundColor: 'rgba(30, 30, 30, 0.9)'
          }}
        >
          <Table 
            stickyHeader 
            size="small" 
            style={{ 
              fontSize: `${getFontSize(DEFAULT_FONT_SIZES.cellText)}px`,
              tableLayout: 'fixed',
              width: '100%'
            }}
          >
            <TableHead>
              <TableRow
                sx={{
                  '& th': {
                    borderBottom: `1px solid rgba(255, 255, 255, 0.1)`,
                    boxShadow: `0 2px 2px -1px rgba(0,0,0,0.4)`,
                    backgroundColor: '#0d47a1', // Rich dark blue header background
                    color: 'white',
                    fontWeight: 'bold'
                  }
                }}
              >
                {/* Row number header cell */}
                <TableCell 
                  style={{ 
                    backgroundColor: '#0d47a1', // Match header blue
                    color: 'white',
                    width: '50px',
                    maxWidth: '50px',
                    position: 'sticky',
                    top: 0,
                    left: 0,
                    zIndex: 3,
                    fontSize: `${getFontSize(DEFAULT_FONT_SIZES.headerText)}px`,
                    padding: `${cellPadding}px`,
                    fontWeight: 'bold'
                  }}
                >
                  #
                </TableCell>
                
                {/* Column headers with sort functionality */}
                {data[0].map((cell, index) => (
                  <TableCell 
                    key={index}
                    style={{ 
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      userSelect: 'none',
                      backgroundColor: sortConfig.key === index.toString() ? 
                        '#1565c0' : // Slightly lighter blue for sorted columns
                        '#0d47a1', // Rich dark blue
                      color: 'white',
                      width: columnWidths[index] ? `${columnWidths[index]}px` : undefined,
                      minWidth: columnWidths[index] ? `${columnWidths[index]}px` : '80px',
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      padding: `${cellPadding}px ${cellPadding + 8}px ${cellPadding}px ${cellPadding}px`,
                      fontSize: `${getFontSize(DEFAULT_FONT_SIZES.headerText)}px`,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    onClick={() => requestSort(index)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {cell}
                      {sortConfig.key === index.toString() && (
                        <Box sx={{ ml: 1 }}>
                          {sortConfig.direction === 'asc' ? 
                            <ArrowUpwardIcon fontSize="small" sx={{ color: 'white', opacity: 0.9 }} /> : 
                            <ArrowDownwardIcon fontSize="small" sx={{ color: 'white', opacity: 0.9 }} />}
                        </Box>
                      )}
                    </Box>
                    
                    {/* Column resize handle */}
                    <Box
                      sx={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '8px',
                        cursor: 'col-resize',
                        zIndex: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '&:hover': {
                          backgroundColor: '#64b5f6',
                          opacity: 0.8,
                          '&::after': {
                            backgroundColor: '#bbdefb',
                            opacity: 1
                          }
                        },
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          top: '10%',
                          bottom: '10%',
                          width: '2px',
                          backgroundColor: 'rgba(255,255,255,0.5)',
                          opacity: 0.5
                        },
                        ...(resizingColumn === index && {
                          backgroundColor: '#64b5f6',
                          opacity: 0.9,
                          width: '8px',
                          '&::after': {
                            backgroundColor: '#ffffff',
                            opacity: 1
                          }
                        })
                      }}
                      onMouseDown={(e) => handleResizeStart(e, index)}
                      onDoubleClick={(e) => handleDoubleClickResize(e, index)}
                      onClick={(e) => e.stopPropagation()}
                      data-column-index={index}
                    />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length > 1 && data.slice(1).map((row, rowIndex) => {
                const actualRowIndex = rowIndex + 1; // Add 1 because we're skipping header
                const displayRowNumber = (currentPage - 1) * rowsPerPage + rowIndex + 1;
                const isHighlighted = filteredRows.includes(actualRowIndex);
                const isCurrentMatch = filteredRows[currentMatchIndex] === actualRowIndex;
                
                return (
                  <TableRow 
                    key={rowIndex}
                    id={`spreadsheet-row-${actualRowIndex}`}
                    sx={{ 
                      '&:nth-of-type(odd)': { 
                        backgroundColor: isHighlighted 
                          ? (isCurrentMatch ? theme.palette.warning.light : theme.palette.warning.lighter)
                          : 'rgba(40, 40, 40, 0.9)' 
                      },
                      '&:nth-of-type(even)': { 
                        backgroundColor: isHighlighted 
                          ? (isCurrentMatch ? theme.palette.warning.light : theme.palette.warning.lighter)
                          : 'rgba(48, 48, 48, 0.9)' 
                      },
                      '&:hover': {
                        backgroundColor: isHighlighted 
                          ? (isCurrentMatch ? theme.palette.warning.light : 'rgba(255, 152, 0, 0.2)')
                          : 'rgba(60, 60, 60, 0.95)'
                      },
                      ...(isCurrentMatch && { 
                        borderLeft: `4px solid ${theme.palette.warning.main}`,
                      }),
                      ...(textWrapEnabled && {
                        height: 'auto',
                        '& td': { 
                          verticalAlign: 'top'
                        }
                      })
                    }}
                  >
                    {/* Row number cell */}
                    <TableCell 
                      style={{ 
                        backgroundColor: isHighlighted
                          ? (isCurrentMatch ? theme.palette.warning.main : theme.palette.warning.light)
                          : '#1a237e', // Dark blue background for row numbers
                        color: 'white',
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                        width: '50px',
                        maxWidth: '50px',
                        fontWeight: isHighlighted ? 'bold' : 'normal',
                        fontSize: `${getFontSize(DEFAULT_FONT_SIZES.rowNumber)}px`,
                        padding: `${cellPadding}px`,
                        borderRight: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      {displayRowNumber}
                    </TableCell>
                    
                    {/* Data cells */}
                    {row.map((cell, cellIndex) => {
                      // Check if cell has long content that's being truncated
                      const isLongContent = cell !== null && cell !== undefined && 
                        String(cell).length > 30;
                      
                      return (
                        <TableCell 
                          key={cellIndex}
                          style={{
                            fontSize: `${getFontSize(DEFAULT_FONT_SIZES.cellText)}px`,
                            padding: `${cellPadding}px`,
                            width: columnWidths[cellIndex] ? `${columnWidths[cellIndex]}px` : undefined,
                            minWidth: columnWidths[cellIndex] ? `${columnWidths[cellIndex]}px` : '80px',
                            whiteSpace: textWrapEnabled ? 'normal' : 'nowrap',
                            wordWrap: textWrapEnabled ? 'break-word' : 'normal',
                            wordBreak: textWrapEnabled ? 'break-word' : 'normal',
                            overflow: textWrapEnabled ? 'visible' : 'hidden',
                            textOverflow: textWrapEnabled ? 'clip' : 'ellipsis',
                            height: textWrapEnabled ? 'auto' : undefined,
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            ...(textWrapEnabled && {
                              maxHeight: '200px',
                              overflow: 'auto'
                            }),
                            ...(isLongContent && !textWrapEnabled && {
                              borderLeft: `2px solid ${theme.palette.info.light}`,
                            })
                          }}
                          title={isLongContent && !textWrapEnabled ? String(cell) : undefined}
                        >
                          {searchText && cell !== null && cell !== undefined && 
                            typeof String(cell).toLowerCase === 'function' && 
                            String(cell).toLowerCase().includes(searchText.toLowerCase())
                              ? highlightSearchMatch(String(cell), searchText)
                              : cell
                          }
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination Controls */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center', 
            p: 1, 
            borderTop: `1px solid ${theme.palette.divider}` 
          }}
        >
          {/* Rows per page selector - update to blue */}
          <FormControl variant="standard" size="small" sx={{ minWidth: 120, mr: 2 }}>
            <InputLabel id="rows-per-page-label" sx={{ color: '#4285f4' }}>Rows per page</InputLabel>
            <Select
              labelId="rows-per-page-label"
              id="rows-per-page"
              value={rowsPerPage}
              onChange={handleRowsPerPageChange}
              label="Rows per page"
              sx={{ 
                color: '#4285f4',
                '& .MuiSelect-icon': {
                  color: '#4285f4'
                }
              }}
            >
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={250}>250</MenuItem>
              <MenuItem value={500}>500</MenuItem>
            </Select>
          </FormControl>
          
          {/* Action buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* If sorted, show clear sort button */}
            {sortConfig.key !== null && (
              <Button 
                size="small" 
                onClick={() => setSortConfig({ key: null, direction: 'asc' })}
                sx={{ mx: 1 }}
                color="secondary"
                variant="outlined"
              >
                Clear Sort
              </Button>
            )}
            
            {/* Reset column widths button */}
            <Button 
              size="small" 
              onClick={() => {
                setColumnWidths({});
                if (sheets.length > 0 && activeSheetIndex >= 0) {
                  const currentSheet = sheets[activeSheetIndex];
                  const data = sheetData[currentSheet] && sheetData[currentSheet][currentPage];
                  if (data) {
                    initializeColumnWidths(currentSheet, data);
                  }
                }
              }}
              sx={{ mx: 1 }}
              color="secondary"
              variant="outlined"
            >
              Reset Columns
            </Button>
            
            {/* Text wrapping toggle button */}
            <Button
              size="small"
              onClick={toggleTextWrap}
              sx={{ mx: 1 }}
              color={textWrapEnabled ? "primary" : "secondary"}
              variant={textWrapEnabled ? "contained" : "outlined"}
            >
              {textWrapEnabled ? "Wrap: On" : "Wrap: Off"}
            </Button>
            
            {/* Zoom controls - global zoom applied to all sheets - update to blue */}
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
              <Tooltip title="Zoom Out">
                <IconButton 
                  size="small" 
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 50}
                  sx={{ color: '#4285f4' }}
                >
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
              <Button
                size="small"
                onClick={handleZoomClick}
                ref={zoomButtonRef}
                sx={{ mx: 0.5, color: '#4285f4' }}
              >
                {zoomLevel}%
              </Button>
              
              <Tooltip title="Zoom In">
                <IconButton 
                  size="small" 
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 200}
                  sx={{ color: '#4285f4' }}
                >
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {/* Page navigation - update to blue */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" color="#4285f4" sx={{ mr: 2 }}>
              Page {currentPage} of {Math.max(1, Math.ceil(totalRows / rowsPerPage))}
            </Typography>
            
            {/* Previous button with more explicit styling */}
            <Box 
              component="button"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              sx={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: currentPage === 1 ? 'default' : 'pointer',
                padding: '4px 8px',
                marginRight: 1,
                color: '#4285f4',
                fontSize: '0.875rem',
                fontFamily: theme.typography.fontFamily,
                textTransform: 'uppercase',
                fontWeight: 500,
                opacity: currentPage === 1 ? 0.5 : 1,
                '&:focus': {
                  outline: 'none'
                },
                '&:hover': {
                  backgroundColor: currentPage === 1 ? 'transparent' : 'rgba(66, 133, 244, 0.08)'
                }
              }}
            >
              <NavigateBeforeIcon style={{ color: '#4285f4', marginRight: '4px', fontSize: '1rem' }} />
              <span style={{ color: '#4285f4' }}>PREVIOUS</span>
            </Box>
            
            {/* Next button with more explicit styling */}
            <Box 
              component="button"
              onClick={handleNextPage}
              disabled={currentPage >= Math.ceil(totalRows / rowsPerPage)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: currentPage >= Math.ceil(totalRows / rowsPerPage) ? 'default' : 'pointer',
                padding: '4px 8px',
                color: '#4285f4',
                fontSize: '0.875rem',
                fontFamily: theme.typography.fontFamily,
                textTransform: 'uppercase',
                fontWeight: 500,
                opacity: currentPage >= Math.ceil(totalRows / rowsPerPage) ? 0.5 : 1,
                '&:focus': {
                  outline: 'none'
                },
                '&:hover': {
                  backgroundColor: currentPage >= Math.ceil(totalRows / rowsPerPage) ? 'transparent' : 'rgba(66, 133, 244, 0.08)'
                }
              }}
            >
              <span style={{ color: '#4285f4' }}>NEXT</span>
              <NavigateNextIcon style={{ color: '#4285f4', marginLeft: '4px', fontSize: '1rem' }} />
            </Box>
          </Box>
        </Box>
      </GradientBorderPaper>
    );
  };
  
  // Highlight search matches in cell text
  const highlightSearchMatch = (text, query) => {
    if (!text || !query) return text;
    
    try {
      const safeText = String(text);
      const parts = safeText.split(new RegExp(`(${query})`, 'gi'));
      return (
        <>
          {parts.map((part, index) => 
            part.toLowerCase() === query.toLowerCase() 
              ? <span key={index} style={{ backgroundColor: theme.palette.warning.main, fontWeight: 'bold' }}>{part}</span>
              : part
          )}
        </>
      );
    } catch (error) {
      console.error('Error highlighting search match:', error);
      return text; // Return original text if highlight fails
    }
  };
  
  // Handle rename initiation
  const handleRenameClick = () => {
    // Get filename without extension
    const fileExt = displayFilename.lastIndexOf('.');
    const filenameWithoutExt = fileExt > 0 ? displayFilename.substring(0, fileExt) : displayFilename;
    
    setNewFilename(filenameWithoutExt);
    setFilenameError('');
    setIsRenaming(true);
  };
  
  // Handle rename cancellation
  const handleCancelRename = () => {
    setIsRenaming(false);
    setNewFilename('');
    setFilenameError('');
  };
  
  // Validate filename (no special characters except for underscore and hyphen)
  const validateFilename = (filename) => {
    if (!filename.trim()) {
      return 'Filename cannot be empty';
    }
    
    // Check for invalid characters (allow letters, numbers, spaces, underscores, hyphens)
    const invalidCharsRegex = /[^a-zA-Z0-9\s_\-\.]/;
    if (invalidCharsRegex.test(filename)) {
      return 'Filename contains invalid characters';
    }
    
    return '';
  };
  
  // Handle rename submission
  const handleConfirmRename = async () => {
    // Validate filename
    const error = validateFilename(newFilename);
    if (error) {
      setFilenameError(error);
      return;
    }
    
    try {
      // Get the file extension from the original filename
      const originalExt = displayFilename.split('.').pop();
      
      // Only append the extension if it's not already there
      let finalFilename = newFilename;
      if (!finalFilename.toLowerCase().endsWith(`.${originalExt.toLowerCase()}`)) {
        finalFilename = `${newFilename}.${originalExt}`;
      }
      
      // Call API to update filename
      const result = await updateSpreadsheet(spreadsheetId, { 
        filename: finalFilename 
      });
      
      // Update displayed filename
      setDisplayFilename(result.filename || finalFilename);
      
      // Exit rename mode
      setIsRenaming(false);
      setNewFilename('');
    } catch (error) {
      console.error('Error renaming spreadsheet:', error);
      setFilenameError('Failed to rename: ' + error.message);
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isFullscreen || fullScreen}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: 'rgba(18, 18, 18, 0.98)',
          backgroundImage: 'linear-gradient(rgba(30, 30, 30, 0.8), rgba(20, 20, 20, 0.9))',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }
      }}
    >
      {/* Custom dialog title with controls */}
      <AppBar position="static" sx={{ 
        backgroundColor: 'rgba(13, 71, 161, 0.9)', // Rich dark blue app bar
        color: 'white',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
      }}>
        <Toolbar>
          {isRenaming ? (
            <Box sx={{ display: 'flex', flexGrow: 1, alignItems: 'center' }}>
              <TextField
                autoFocus
                variant="standard"
                value={newFilename}
                onChange={(e) => setNewFilename(e.target.value)}
                error={!!filenameError}
                helperText={filenameError}
                sx={{ flexGrow: 1, mr: 1 }}
                placeholder="Enter new filename"
                InputProps={{
                  endAdornment: (
                    <Typography variant="caption" color="textSecondary">
                      .{displayFilename.split('.').pop()}
                    </Typography>
                  ),
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmRename();
                  } else if (e.key === 'Escape') {
                    handleCancelRename();
                  }
                }}
              />
              <Button 
                onClick={handleConfirmRename} 
                color="primary" 
                variant="contained" 
                size="small"
                sx={{ mr: 1 }}
              >
                Save
              </Button>
              <Button 
                onClick={handleCancelRename} 
                color="inherit" 
                size="small"
              >
                Cancel
              </Button>
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  {displayFilename}
                </Typography>
                <Tooltip title="Rename">
                  <IconButton 
                    edge="end" 
                    color="inherit" 
                    aria-label="rename" 
                    onClick={handleRenameClick}
                    size="small"
                    sx={{ ml: 1, mr: 2 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </>
          )}
          
          <Tooltip title="Download">
            <IconButton edge="end" color="inherit" aria-label="download" sx={{ mr: 2 }} onClick={handleDownload}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconButton 
              edge="end" 
              color="inherit" 
              aria-label="fullscreen"
              onClick={toggleFullscreen}
              sx={{ mr: 2 }}
            >
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Close">
            <IconButton edge="end" color="inherit" aria-label="close" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
        
        {/* Search Bar - always visible */}
        <Box sx={{ p: 1, backgroundColor: 'rgba(25, 25, 30, 0.9)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Search match count - displayed on the left */}
            {searchText && (
              matchCount > 0 ? (
                <Chip 
                  size="small" 
                  label={`${currentMatchIndex + 1} of ${matchCount}`} 
                  color="primary"
                  sx={{ mr: 1 }}
                />
              ) : (
                <Chip 
                  size="small" 
                  label="No matches" 
                  color="default"
                  sx={{ mr: 1 }}
                />
              )
            )}
            
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search spreadsheet..."
              size="small"
              value={searchText}
              onChange={handleSearchChange}
              inputRef={searchInputRef}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    {searchText && (
                      <IconButton size="small" onClick={clearSearch}>
                        <ClearIcon />
                      </IconButton>
                    )}
                  </InputAdornment>
                )
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  navigateToNextMatch();
                } else if (e.key === 'Enter' && e.shiftKey) {
                  e.preventDefault();
                  navigateToPreviousMatch();
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(40, 40, 45, 0.8)',
                '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main
                    }
                  },
                  '& input': {
                    color: 'white'  // Make search text white
                  }
                }
              }}
            />
          </Box>
          
          {/* Navigation buttons - moved to left side below search field */}
          {matchCount > 0 && (
            <Box sx={{ display: 'flex', mt: 1 }}>
              <Button 
                size="small" 
                onClick={navigateToPreviousMatch}
                sx={{ minWidth: '40px', mr: 1 }}
                startIcon={<NavigateBeforeIcon />}
              >
                Previous
              </Button>
              <Button 
                size="small" 
                onClick={navigateToNextMatch}
                sx={{ minWidth: '40px' }}
                endIcon={<NavigateNextIcon />}
              >
                Next
              </Button>
            </Box>
          )}
        </Box>
      </AppBar>
      
      {/* Sheet tabs */}
      {sheets.length > 0 && (
        <Box sx={{ 
          borderBottom: 1, 
          borderColor: 'rgba(255, 255, 255, 0.12)',
          backgroundColor: 'rgba(30, 30, 35, 0.9)'
        }}>
          <Tabs 
            value={activeSheetIndex}
            onChange={handleSheetChange}
            variant="scrollable"
            scrollButtons="auto"
              sx={{
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-selected': {
                  color: 'white',
                  fontWeight: 'bold'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: theme.palette.primary.main
              }
            }}
          >
            {sheets.map((sheet, index) => (
              <Tab key={index} label={sheet} />
            ))}
          </Tabs>
            </Box>
      )}
      
      {/* Dialog content */}
      <DialogContent 
        dividers 
        sx={{ 
          p: 2, 
          backgroundColor: 'rgba(18, 18, 18, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.12)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        {/* Sheet count indicator */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="caption" color="textSecondary">
            {sheets.length > 0 ? `Sheet ${activeSheetIndex + 1} of ${sheets.length}` : ''}
          </Typography>
          
          <Box display="flex" alignItems="center">
            <Tooltip title="Spreadsheet Information">
              <IconButton size="small">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" color="textSecondary">
              {currentPage > 0 
                ? `Rows ${(currentPage - 1) * rowsPerPage + 1}-${Math.min(currentPage * rowsPerPage, totalRows)} of ${totalRows}`
                : ''}
            </Typography>
          </Box>
        </Box>
        
        {/* Spreadsheet data */}
        {renderDataTable()}
      </DialogContent>
    </Dialog>
  );
};

export default SpreadsheetModal; 