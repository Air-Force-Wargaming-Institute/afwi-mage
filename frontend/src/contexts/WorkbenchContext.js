import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { getApiUrl } from '../config';
import FakePlotImage from '../assets/FakePlot.png'; // Import the fake plot image

export const WorkbenchContext = createContext();

// Add more diverse and realistic mock data for spreadsheets
const MOCK_SPREADSHEETS = [
  { 
    id: 'mock-1', 
    filename: 'Sales_Data_2023.xlsx', 
    upload_date: '2023-12-15T14:30:00Z', 
    sheet_count: 3, 
    size_bytes: 45600,
    description: 'Annual sales data by region and product category'
  },
  { 
    id: 'mock-2', 
    filename: 'Financial_Projections.xlsx', 
    upload_date: '2023-12-20T10:15:00Z', 
    sheet_count: 4, 
    size_bytes: 78400,
    description: 'Q1-Q4 financial projections for 2024 fiscal year'
  },
  { 
    id: 'mock-3', 
    filename: 'Inventory_2023.csv', 
    upload_date: '2024-01-05T09:45:00Z', 
    sheet_count: 1, 
    size_bytes: 35200,
    description: 'Current inventory levels across all warehouses'
  },
  { 
    id: 'mock-4', 
    filename: 'Marketing_Campaign_Results.xlsx', 
    upload_date: '2024-02-18T16:20:00Z', 
    sheet_count: 2, 
    size_bytes: 52800,
    description: 'Performance metrics from Q4 marketing campaigns'
  },
  { 
    id: 'mock-5', 
    filename: 'Employee_Survey_Data.csv', 
    upload_date: '2024-03-10T11:05:00Z', 
    sheet_count: 1, 
    size_bytes: 28700,
    description: 'Results from annual employee satisfaction survey'
  }
];

const MOCK_VISUALIZATION = {
  id: 'mock-viz-1',
  title: 'Sales Across Different Products',
  description: 'A line chart showing sales trends for three product lines over time',
  code: `import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np

# Create sample data
months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
product_a = [1000, 1500, 1200, 2000, 1800, 2200, 1500, 1800, 2000, 2300, 1900, 2100]
product_b = [800, 1200, 1500, 1800, 2000, 2300, 1600, 1900, 2200, 2500, 1800, 2000]
product_c = [1200, 1300, 1100, 1400, 1600, 1900, 1300, 1500, 1700, 1900, 1500, 1700]

# Create the visualization
plt.figure(figsize=(12, 8))

# Create line plots for each product
plt.plot(months, product_a, marker='o', linewidth=2, color='#223b8f', label='Product A')
plt.plot(months, product_b, marker='s', linewidth=2, color='#1a8693', label='Product B')
plt.plot(months, product_c, marker='^', linewidth=2, color='#ff9d9d', label='Product C')

# Add title and labels
plt.title('Sales Across Different Products', fontsize=16)
plt.xlabel('Months', fontsize=12)
plt.ylabel('Sales ($100k)', fontsize=12)
plt.grid(True)
plt.legend()
plt.tight_layout()`,
  image_url: FakePlotImage // Use the actual image
};

// Add more realistic mock data for spreadsheet sheets
const getMockSheets = (spreadsheetId) => {
  const mockSheetsMap = {
    'mock-1': ['Revenue', 'Expenses', 'Summary'],
    'mock-2': ['Q1', 'Q2', 'Q3', 'Q4'],
    'mock-3': ['Inventory'],
    'mock-4': ['Campaign_Data', 'Analysis'],
    'mock-5': ['Survey_Results']
  };
  
  return mockSheetsMap[spreadsheetId] || ['Sheet1', 'Sheet2', 'Sheet3'];
};

// Add more realistic column summaries
const getMockColumnSummaries = (spreadsheetId, sheetName) => {
  // Default column summaries if no specific match
  const defaultSummaries = [
    {
      name: 'Date',
      dtype: 'datetime64[ns]',
      count: 1250,
      null_count: 0,
      unique_count: 180,
      sample_values: ['2023-01-15', '2023-02-05', '2023-03-10', '2023-04-22', '2023-05-30']
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
      null_count: 0,
      unique_count: 15,
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
      sample_values: [12500, 18200, 9800, 22300, 15700]
    }
  ];
  
  // Specific column summaries based on spreadsheet ID and sheet name
  const specificSummaries = {
    'mock-1': {
      'Revenue': [
        {
          name: 'Month',
          dtype: 'datetime64[ns]',
          count: 12,
          null_count: 0,
          unique_count: 12,
          sample_values: ['2023-01-01', '2023-02-01', '2023-03-01']
        },
        {
          name: 'Region',
          dtype: 'object',
          count: 12,
          null_count: 0,
          unique_count: 4,
          sample_values: ['North America', 'Europe', 'Asia', 'Latin America']
        },
        {
          name: 'Product_Line',
          dtype: 'object',
          count: 12,
          null_count: 0,
          unique_count: 3,
          sample_values: ['Hardware', 'Software', 'Services']
        },
        {
          name: 'Revenue',
          dtype: 'float64',
          count: 12,
          null_count: 0,
          unique_count: 12,
          min: 450000,
          max: 1250000,
          mean: 780000,
          median: 750000,
          std: 225000,
          sample_values: [520000, 780000, 950000]
        },
        {
          name: 'Target',
          dtype: 'float64',
          count: 12,
          null_count: 0,
          unique_count: 3,
          min: 500000,
          max: 1000000,
          mean: 750000,
          median: 750000,
          std: 204124,
          sample_values: [500000, 750000, 1000000]
        }
      ],
      'Expenses': [
        {
          name: 'Month',
          dtype: 'datetime64[ns]',
          count: 12,
          null_count: 0,
          unique_count: 12,
          sample_values: ['2023-01-01', '2023-02-01', '2023-03-01']
        },
        {
          name: 'Category',
          dtype: 'object',
          count: 12,
          null_count: 0,
          unique_count: 5,
          sample_values: ['Marketing', 'R&D', 'Operations', 'Admin', 'Sales']
        },
        {
          name: 'Amount',
          dtype: 'float64',
          count: 12,
          null_count: 0,
          unique_count: 12,
          min: 120000,
          max: 450000,
          mean: 275000,
          median: 280000,
          std: 95000,
          sample_values: [145000, 280000, 420000]
        },
        {
          name: 'Budget',
          dtype: 'float64',
          count: 12,
          null_count: 0,
          unique_count: 5,
          min: 150000,
          max: 500000,
          mean: 310000,
          median: 300000,
          std: 135000,
          sample_values: [150000, 300000, 500000]
        }
      ]
    },
    'mock-3': {
      'Inventory': [
        {
          name: 'SKU',
          dtype: 'object',
          count: 450,
          null_count: 0,
          unique_count: 450,
          sample_values: ['WDG-A001', 'SFT-B205', 'HWR-C103']
        },
        {
          name: 'Product_Name',
          dtype: 'object',
          count: 450,
          null_count: 0,
          unique_count: 450,
          sample_values: ['Premium Widget', 'Enterprise Software License', 'Hardware Kit']
        },
        {
          name: 'Category',
          dtype: 'object',
          count: 450,
          null_count: 0,
          unique_count: 5,
          sample_values: ['Hardware', 'Software', 'Accessories', 'Components', 'Supplies']
        },
        {
          name: 'Warehouse',
          dtype: 'object',
          count: 450,
          null_count: 0,
          unique_count: 3,
          sample_values: ['East', 'Central', 'West']
        },
        {
          name: 'Quantity_On_Hand',
          dtype: 'int64',
          count: 450,
          null_count: 0,
          unique_count: 380,
          min: 0,
          max: 5000,
          mean: 450,
          median: 275,
          std: 620,
          sample_values: [25, 350, 1200]
        },
        {
          name: 'Reorder_Level',
          dtype: 'int64',
          count: 450,
          null_count: 0,
          unique_count: 15,
          min: 5,
          max: 500,
          mean: 120,
          median: 100,
          std: 85,
          sample_values: [20, 100, 250]
        },
        {
          name: 'Unit_Cost',
          dtype: 'float64',
          count: 450,
          null_count: 0,
          unique_count: 380,
          min: 1.99,
          max: 2500,
          mean: 175.5,
          median: 75.99,
          std: 320.75,
          sample_values: [12.99, 75.50, 1250.00]
        },
        {
          name: 'Last_Received',
          dtype: 'datetime64[ns]',
          count: 450,
          null_count: 12,
          unique_count: 120,
          sample_values: ['2023-12-15', '2024-01-05', '2024-02-28']
        }
      ]
    },
    'mock-5': {
      'Survey_Results': [
        {
          name: 'Employee_ID',
          dtype: 'object',
          count: 325,
          null_count: 0,
          unique_count: 325,
          sample_values: ['EMP-1001', 'EMP-1243', 'EMP-0852']
        },
        {
          name: 'Department',
          dtype: 'object',
          count: 325,
          null_count: 0,
          unique_count: 8,
          sample_values: ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance']
        },
        {
          name: 'Years_Employed',
          dtype: 'float64',
          count: 325,
          null_count: 0,
          unique_count: 15,
          min: 0.5,
          max: 25,
          mean: 4.7,
          median: 3.5,
          std: 4.2,
          sample_values: [1.5, 3.0, 8.5]
        },
        {
          name: 'Job_Satisfaction',
          dtype: 'int64',
          count: 325,
          null_count: 5,
          unique_count: 5,
          min: 1,
          max: 5,
          mean: 3.8,
          median: 4,
          std: 1.1,
          sample_values: [3, 4, 5]
        },
        {
          name: 'Work_Life_Balance',
          dtype: 'int64',
          count: 325,
          null_count: 8,
          unique_count: 5,
          min: 1,
          max: 5,
          mean: 3.5,
          median: 4,
          std: 1.3,
          sample_values: [2, 4, 5]
        },
        {
          name: 'Management_Support',
          dtype: 'int64',
          count: 325,
          null_count: 3,
          unique_count: 5,
          min: 1,
          max: 5,
          mean: 3.9,
          median: 4,
          std: 1.0,
          sample_values: [3, 4, 5]
        },
        {
          name: 'Comments',
          dtype: 'object',
          count: 325,
          null_count: 125,
          unique_count: 200,
          sample_values: ['Great team culture', 'Need better communication', 'Love the work environment']
        }
      ]
    }
  };
  
  // Try to get the specific summaries, or fall back to default
  if (specificSummaries[spreadsheetId] && specificSummaries[spreadsheetId][sheetName]) {
    return specificSummaries[spreadsheetId][sheetName];
  }
  
  return defaultSummaries;
};

// Add more realistic mock data for cell operations
const getMockCellData = (spreadsheetId, sheetName, operation) => {
  if (operation.operation === 'read') {
    // Sales data for mock-1 Revenue sheet
    if (spreadsheetId === 'mock-1' && sheetName === 'Revenue') {
      return {
        values: [
          ['Month', 'Region', 'Product_Line', 'Revenue', 'Target'],
          ['2023-01-01', 'North America', 'Hardware', 520000, 500000],
          ['2023-02-01', 'North America', 'Hardware', 580000, 500000],
          ['2023-03-01', 'North America', 'Software', 620000, 750000],
          ['2023-04-01', 'Europe', 'Software', 780000, 750000],
          ['2023-05-01', 'Europe', 'Services', 850000, 750000],
          ['2023-06-01', 'Asia', 'Hardware', 920000, 1000000],
          ['2023-07-01', 'Asia', 'Software', 980000, 1000000],
          ['2023-08-01', 'Latin America', 'Services', 750000, 750000],
          ['2023-09-01', 'North America', 'Hardware', 680000, 750000],
          ['2023-10-01', 'Europe', 'Software', 950000, 1000000]
        ],
        sheet_name: 'Revenue',
        range: operation.cell_range || 'A1:E11',
        row_count: 10,
        column_count: 5
      };
    }
    
    // Inventory data for mock-3
    else if (spreadsheetId === 'mock-3' && sheetName === 'Inventory') {
      return {
        values: [
          ['SKU', 'Product_Name', 'Category', 'Warehouse', 'Quantity_On_Hand', 'Reorder_Level', 'Unit_Cost', 'Last_Received'],
          ['WDG-A001', 'Premium Widget', 'Hardware', 'East', 350, 100, 75.50, '2023-12-15'],
          ['SFT-B205', 'Enterprise Software License', 'Software', 'Central', 125, 50, 1250.00, '2024-01-05'],
          ['HWR-C103', 'Hardware Kit', 'Components', 'West', 1200, 250, 125.99, '2024-02-28'],
          ['ACC-D412', 'Premium Accessory', 'Accessories', 'East', 520, 100, 45.99, '2023-11-30'],
          ['SUP-E589', 'Office Supplies Bundle', 'Supplies', 'Central', 2500, 500, 12.99, '2024-03-10'],
          ['WDG-A002', 'Economy Widget', 'Hardware', 'West', 780, 200, 35.50, '2024-01-22'],
          ['SFT-B210', 'Developer License', 'Software', 'East', 320, 50, 450.00, '2023-12-01'],
          ['HWR-C105', 'Server Components', 'Components', 'Central', 85, 20, 850.00, '2024-02-15'],
          ['ACC-D420', 'Basic Accessory', 'Accessories', 'West', 1800, 300, 15.99, '2024-01-10'],
          ['SUP-E590', 'Printing Supplies', 'Supplies', 'East', 950, 250, 65.75, '2024-03-05']
        ],
        sheet_name: 'Inventory',
        range: operation.cell_range || 'A1:H11',
        row_count: 10,
        column_count: 8
      };
    }
    
    // Survey data for mock-5
    else if (spreadsheetId === 'mock-5' && sheetName === 'Survey_Results') {
      return {
        values: [
          ['Employee_ID', 'Department', 'Years_Employed', 'Job_Satisfaction', 'Work_Life_Balance', 'Management_Support', 'Comments'],
          ['EMP-1001', 'Engineering', 3.5, 4, 4, 4, 'Great team environment'],
          ['EMP-1243', 'Marketing', 2.0, 5, 3, 5, 'Love the creative freedom'],
          ['EMP-0852', 'Sales', 5.5, 3, 2, 4, 'High pressure but rewarding'],
          ['EMP-1422', 'HR', 1.5, 4, 5, 3, 'Good culture, need better systems'],
          ['EMP-0753', 'Finance', 8.0, 4, 4, 3, 'Stable work environment'],
          ['EMP-1385', 'Engineering', 0.5, 5, 5, 5, 'Excellent onboarding experience'],
          ['EMP-0925', 'Marketing', 3.0, 3, 2, 2, 'Need better communication'],
          ['EMP-1137', 'Sales', 1.0, 4, 3, 4, 'Good training program'],
          ['EMP-0512', 'HR', 4.5, 3, 4, 4, ''],
          ['EMP-1608', 'Finance', 2.5, 4, 3, 5, 'Supportive management team']
        ],
        sheet_name: 'Survey_Results',
        range: operation.cell_range || 'A1:G11',
        row_count: 10,
        column_count: 7
      };
    }
    
    // Default data for other spreadsheets
    else {
      return {
        values: [
          ['Date', 'Region', 'Product', 'Sales', 'Profit'],
          ['2023-01-15', 'North', 'Widget A', '$12,500', '$3,750'],
          ['2023-02-05', 'South', 'Widget B', '$18,200', '$5,460'],
          ['2023-01-27', 'East', 'Widget A', '$9,800', '$2,940'],
          ['2023-02-12', 'West', 'Widget C', '$22,300', '$6,690'],
          ['2023-03-03', 'North', 'Widget B', '$15,700', '$4,710'],
          ['2023-03-18', 'South', 'Widget A', '$11,600', '$3,480'],
          ['2023-04-02', 'East', 'Widget C', '$19,400', '$5,820'],
          ['2023-04-20', 'West', 'Widget B', '$17,800', '$5,340'],
          ['2023-05-01', 'North', 'Widget C', '$14,500', '$4,350'],
          ['2023-05-15', 'South', 'Widget A', '$13,200', '$3,960']
        ],
        sheet_name: sheetName,
        range: operation.cell_range || 'A1:E11',
        row_count: 10,
        column_count: 5
      };
    }
  }
  
  else if (operation.operation === 'analyze') {
    // Revenue analysis
    if (spreadsheetId === 'mock-1' && sheetName === 'Revenue') {
      return {
        analysis: "Analysis of revenue data shows that Q3 (July-September) had the highest total revenue at $2.41M, followed by Q2 at $2.35M. The Asia region showed the strongest performance vs. target (98% achievement), while Latin America underperformed at 88%. Software product line consistently outperformed hardware and services with an average monthly revenue of $832.5K compared to $675K for hardware and $800K for services."
      };
    }
    
    // Inventory analysis
    else if (spreadsheetId === 'mock-3' && sheetName === 'Inventory') {
      return {
        analysis: "Inventory analysis reveals that 12% of SKUs (54 items) are below reorder level and require immediate restocking. The West warehouse has the highest total inventory value at $1.25M, followed by East ($980K) and Central ($720K). Components category has the highest average unit cost at $492.75, while Supplies has the lowest at $32.15. Recent inventory turnover has improved by 22% compared to previous quarter, with Hardware products showing the fastest movement."
      };
    }
    
    // Survey analysis
    else if (spreadsheetId === 'mock-5' && sheetName === 'Survey_Results') {
      return {
        analysis: "The employee survey results show an overall satisfaction score of 3.8/5, which is a 0.3 point improvement from last year. The Engineering department reported the highest job satisfaction (4.2/5), while Sales reported the lowest (3.4/5). Work-life balance scores were lowest among employees with 2-5 years tenure (3.1/5). Common themes in comments include requests for better communication, appreciation for team culture, and desires for more professional development opportunities."
      };
    }
    
    // Default analysis
    else {
      return {
        analysis: "Based on the data, Region 'West' has the highest sales at $22,300 with Widget C, followed by 'South' at $18,200 with Widget B. The average sales across all regions is $15,500. Widget C appears to have the highest profit margin at 30%, followed by Widget B at 29.5% and Widget A at 29%. North region shows consistent performance across multiple months with the most stable sales figures."
      };
    }
  }
};

export const WorkbenchProvider = ({ children }) => {
  const auth = useContext(AuthContext) || { token: null };
  const { token } = auth;
  
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState(null);
  const [selectedTool, setSelectedTool] = useState('spreadsheet'); // 'spreadsheet', 'visualization'
  const [activeView, setActiveView] = useState('list'); // 'list', 'detail', 'analyze'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [visualizations, setVisualizations] = useState([]);
  const [developmentMode, setDevelopmentMode] = useState(true); // Start with dev mode enabled by default
  const [apiBaseUrl, setApiBaseUrl] = useState('');

  // Setup axios headers with authentication token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Auto-check if backend is available when component mounts
  useEffect(() => {
    // Get API base URL
    const baseUrl = getApiUrl('WORKBENCH', '');
    setApiBaseUrl(baseUrl);
    
    // Function to check backend connection
    const checkBackendConnection = async () => {
      try {
        // Try a simple HEAD request to check if backend is available
        await axios.head(`${baseUrl}/health`, { timeout: 2000 });
        // If successful, backend is available
        setConnectionError(false);
        setDevelopmentMode(false);
      } catch (error) {
        // If error, backend is not available
        console.log('Backend connection check failed, enabling development mode');
        setConnectionError(true);
        setDevelopmentMode(true);
        
        // Load mock data
        setSpreadsheets(MOCK_SPREADSHEETS);
        
        // Set default visualization if needed
        if (visualizations.length === 0) {
          setVisualizations([MOCK_VISUALIZATION]);
        }
      }
    };
    
    // Perform the check
    checkBackendConnection();
  }, []); // Empty dependency array means this runs once on mount

  // Fetch spreadsheets from API
  const fetchSpreadsheets = async () => {
    // If in development mode, just return mock data without API call
    if (developmentMode) {
      setSpreadsheets(MOCK_SPREADSHEETS);
      return MOCK_SPREADSHEETS;
    }
    
    setIsLoading(true);
    setError(null);
    setConnectionError(false);
    try {
      const response = await axios.get(`${apiBaseUrl}/api/workbench/spreadsheets/list`);
      setSpreadsheets(response.data);
      setIsLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error fetching spreadsheets:', error);
      // Check if it's a connection error (network error)
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setDevelopmentMode(true);
        setError('Cannot connect to backend services. Please ensure the backend is running.');
        // Use mock data for development mode
        setSpreadsheets(MOCK_SPREADSHEETS);
        return MOCK_SPREADSHEETS;
      } else {
        setError('Failed to load spreadsheets. Please try again later.');
      }
      setIsLoading(false);
      return [];
    }
  };

  // Upload a new spreadsheet
  const uploadSpreadsheet = async (file, description = '') => {
    setIsLoading(true);
    setError(null);
    
    // If in development mode, simulate upload with mock data
    if (developmentMode) {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
      const newSpreadsheet = { 
        id: `mock-${Date.now()}`, 
        filename: file.name, 
        upload_date: new Date().toISOString(), 
        sheet_count: 1, 
        size_bytes: file.size || 45000 
      };
      setSpreadsheets([...spreadsheets, newSpreadsheet]);
      setIsLoading(false);
      return newSpreadsheet;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    
    try {
      const response = await axios.post(`${apiBaseUrl}/api/workbench/spreadsheets/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      await fetchSpreadsheets(); // Refresh the list
      setIsLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error uploading spreadsheet:', error);
      // Check if it's a connection error
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setDevelopmentMode(true);
        setError('Cannot connect to backend services. Development mode enabled.');
        
        // Simulate successful upload with mock data
        const newSpreadsheet = { 
          id: `mock-${Date.now()}`, 
          filename: file.name, 
          upload_date: new Date().toISOString(), 
          sheet_count: 1, 
          size_bytes: file.size || 45000 
        };
        setSpreadsheets([...spreadsheets, newSpreadsheet]);
        return newSpreadsheet;
      } else {
        setError('Failed to upload spreadsheet. Please try again.');
      }
      setIsLoading(false);
      throw error;
    }
  };

  // Get details for a specific spreadsheet
  const getSpreadsheetDetails = async (spreadsheetId) => {
    setIsLoading(true);
    setError(null);
    
    // If in development mode, return mock data
    if (developmentMode) {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
      const mockSpreadsheet = spreadsheets.find(s => s.id === spreadsheetId) || MOCK_SPREADSHEETS[0];
      const mockDetails = {
        ...mockSpreadsheet,
        sheets: ['Sheet1', 'Sheet2', 'Sheet3'],
        columns: ['Date', 'Region', 'Product', 'Sales', 'Profit'],
        row_count: 1250,
        created_at: '2023-12-15T10:30:00Z',
        modified_at: '2023-12-20T14:45:00Z'
      };
      setSelectedSpreadsheet(mockDetails);
      setIsLoading(false);
      return mockDetails;
    }
    
    try {
      const response = await axios.get(`${apiBaseUrl}/api/workbench/spreadsheets/${spreadsheetId}/info`);
      setSelectedSpreadsheet(response.data);
      setIsLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error fetching spreadsheet details:', error);
      
      // Check if it's a connection error
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setDevelopmentMode(true);
        setError('Cannot connect to backend services. Development mode enabled.');
        
        // Return mock data
        const mockSpreadsheet = spreadsheets.find(s => s.id === spreadsheetId) || MOCK_SPREADSHEETS[0];
        const mockDetails = {
          ...mockSpreadsheet,
          sheets: ['Sheet1', 'Sheet2', 'Sheet3'],
          columns: ['Date', 'Region', 'Product', 'Sales', 'Profit'],
          row_count: 1250,
          created_at: '2023-12-15T10:30:00Z',
          modified_at: '2023-12-20T14:45:00Z'
        };
        setSelectedSpreadsheet(mockDetails);
        setIsLoading(false);
        return mockDetails;
      } else {
        setError(`Failed to load spreadsheet details: ${error.message}`);
        setIsLoading(false);
        throw error;
      }
    }
  };

  // Get spreadsheet sheets
  const getSpreadsheetSheets = async (spreadsheetId) => {
    // If in development mode, return mock data
    if (developmentMode) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      return {
        spreadsheet_id: spreadsheetId,
        sheets: getMockSheets(spreadsheetId)
      };
    }
    
    try {
      const response = await axios.get(`${apiBaseUrl}/api/workbench/spreadsheets/${spreadsheetId}/sheets`);
      return response.data;
    } catch (error) {
      console.error('Error fetching spreadsheet sheets:', error);
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setDevelopmentMode(true);
        return {
          spreadsheet_id: spreadsheetId,
          sheets: ['Sheet1', 'Sheet2', 'Sheet3']
        };
      } else {
        throw error;
      }
    }
  };

  // Get column summaries for a spreadsheet
  const getSpreadsheetSummary = async (spreadsheetId, sheetName) => {
    // If in development mode, return mock data
    if (developmentMode) {
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
      return {
        spreadsheet_id: spreadsheetId,
        sheet_name: sheetName || getMockSheets(spreadsheetId)[0],
        column_summaries: getMockColumnSummaries(spreadsheetId, sheetName)
      };
    }
    
    try {
      const url = sheetName 
        ? `${apiBaseUrl}/api/workbench/spreadsheets/${spreadsheetId}/summary?sheet_name=${encodeURIComponent(sheetName)}`
        : `${apiBaseUrl}/api/workbench/spreadsheets/${spreadsheetId}/summary`;
      
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching spreadsheet summary:', error);
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setDevelopmentMode(true);
        // Return mock data
        return {
          spreadsheet_id: spreadsheetId,
          sheet_name: sheetName || getMockSheets(spreadsheetId)[0],
          column_summaries: getMockColumnSummaries(spreadsheetId, sheetName)
        };
      } else {
        throw error;
      }
    }
  };
  
  // Perform operation on cells
  const performCellOperation = async (spreadsheetId, operation) => {
    setIsLoading(true);
    setError(null);
    
    // If in development mode, return mock data
    if (developmentMode) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      let mockResult = {
        success: true,
        data: null
      };
      
      if (operation.operation === 'read') {
        // Use our enhanced mock data function
        mockResult.data = getMockCellData(spreadsheetId, operation.sheet_name, operation).values
          ? getMockCellData(spreadsheetId, operation.sheet_name, operation)
          : {
              values: [
                ['Date', 'Region', 'Product', 'Sales', 'Profit'],
                ['2023-01-15', 'North', 'Widget A', '$12,500', '$3,750'],
                ['2023-02-05', 'South', 'Widget B', '$18,200', '$5,460'],
                ['2023-01-27', 'East', 'Widget A', '$9,800', '$2,940'],
                ['2023-02-12', 'West', 'Widget C', '$22,300', '$6,690']
              ],
              sheet_name: operation.sheet_name,
              range: operation.cell_range,
              row_count: 4,
              column_count: 5
            };
      } else if (operation.operation === 'analyze') {
        // Use our enhanced mock data function
        mockResult.data = getMockCellData(spreadsheetId, operation.sheet_name, operation);
      }
      
      setIsLoading(false);
      return mockResult;
    }
    
    try {
      const response = await axios.post(
        `${apiBaseUrl}/api/workbench/spreadsheets/${spreadsheetId}/operate`, 
        operation
      );
      setIsLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error performing cell operation:', error);
      
      // Check if it's a connection error
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setDevelopmentMode(true);
        setError('Cannot connect to backend services. Development mode enabled.');
        
        // Return mock data
        let mockResult = {
          success: true,
          data: null
        };
        
        if (operation.operation === 'read') {
          // Use our enhanced mock data function
          mockResult.data = getMockCellData(spreadsheetId, operation.sheet_name, operation).values
            ? getMockCellData(spreadsheetId, operation.sheet_name, operation)
            : {
                values: [
                  ['Date', 'Region', 'Product', 'Sales', 'Profit'],
                  ['2023-01-15', 'North', 'Widget A', '$12,500', '$3,750'],
                  ['2023-02-05', 'South', 'Widget B', '$18,200', '$5,460'],
                  ['2023-01-27', 'East', 'Widget A', '$9,800', '$2,940'],
                  ['2023-02-12', 'West', 'Widget C', '$22,300', '$6,690']
                ],
                sheet_name: operation.sheet_name,
                range: operation.cell_range,
                row_count: 4,
                column_count: 5
              };
        } else if (operation.operation === 'analyze') {
          // Use our enhanced mock data function
          mockResult.data = getMockCellData(spreadsheetId, operation.sheet_name, operation);
        }
        
        setIsLoading(false);
        return mockResult;
      } else {
        setError(`Operation failed: ${error.message}`);
        setIsLoading(false);
        return {
          success: false,
          error: error.message
        };
      }
    }
  };

  // Generate visualization from a spreadsheet and prompt
  const generateVisualization = async (request) => {
    setIsLoading(true);
    setError(null);
    
    // If in development mode, return mock results
    if (developmentMode) {
      await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate network delay
      
      setIsLoading(false);
      return MOCK_VISUALIZATION;
    }
    
    try {
      const response = await axios.post(
        `${apiBaseUrl}/api/workbench/visualizations/generate`,
        request
      );
      setIsLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error generating visualization:', error);
      
      // Check if it's a connection error
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setDevelopmentMode(true);
        setError('Cannot connect to backend services. Development mode enabled.');
        
        // Return mock results
        setIsLoading(false);
        return MOCK_VISUALIZATION;
      } else {
        setError('Failed to generate visualization. Please try again later.');
        setIsLoading(false);
        throw error;
      }
    }
  };

  // Execute visualization code after manual edits
  const executeVisualizationCode = async (visualizationId, code) => {
    setIsLoading(true);
    setError(null);
    
    // If in development mode, simulate execution
    if (developmentMode) {
      await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate network delay
      
      const updatedViz = {
        id: visualizationId,
        code: code,
        image_url: FakePlotImage, // Use the actual FakePlot image
        updated_at: new Date().toISOString()
      };
      
      setVisualizations(prev => 
        prev.map(v => v.id === visualizationId ? { ...v, ...updatedViz } : v)
      );
      
      setIsLoading(false);
      return updatedViz;
    }
    
    try {
      const response = await axios.post(
        `${apiBaseUrl}/api/workbench/visualizations/${visualizationId}/execute`,
        { code }
      );
      
      setIsLoading(false);
      
      // Update visualization with new results
      setVisualizations(prev => 
        prev.map(v => v.id === visualizationId ? { ...v, ...response.data } : v)
      );
      
      return response.data;
    } catch (error) {
      console.error('Error executing visualization code:', error);
      
      // Check if it's a connection error
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setDevelopmentMode(true);
        setError('Cannot connect to backend services. Development mode enabled.');
        
        // Return mock updated visualization
        const updatedViz = {
          id: visualizationId,
          code: code,
          image_url: FakePlotImage, // Use the actual FakePlot image
          updated_at: new Date().toISOString()
        };
        
        setVisualizations(prev => 
          prev.map(v => v.id === visualizationId ? { ...v, ...updatedViz } : v)
        );
        
        setIsLoading(false);
        return updatedViz;
      } else {
        setError('Failed to execute code. Please check for syntax errors and try again.');
        setIsLoading(false);
        throw error;
      }
    }
  };

  // Extract comprehensive data context from a spreadsheet
  const extractDataContext = async (spreadsheetId) => {
    setIsLoading(true);
    setError(null);
    
    // If in development mode, return mock data context
    if (developmentMode) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      const mockDataContext = {
        schema: [
          { name: 'Date', type: 'datetime', missing: false },
          { name: 'Region', type: 'categorical', missing: false },
          { name: 'Product', type: 'categorical', missing: false },
          { name: 'Sales', type: 'numeric', missing: false },
          { name: 'Profit', type: 'numeric', missing: true },
        ],
        statistics: {
          'Sales': { min: 1200, max: 45000, mean: 22450, median: 21000 },
          'Profit': { min: 350, max: 12000, mean: 6700, median: 5800 },
        },
        sample: [
          ['2023-01-01', 'North', 'Widget A', 12500, 3700],
          ['2023-01-02', 'South', 'Widget B', 18000, 5400],
          ['2023-01-03', 'East', 'Widget A', 9800, 2200],
          ['2023-01-04', 'West', 'Widget C', 22000, 7800],
        ],
        row_count: 1250,
        file_info: {
          name: 'sales_data_2023.xlsx',
          sheets: ['Q1', 'Q2', 'Q3', 'Q4']
        }
      };
      
      setIsLoading(false);
      return mockDataContext;
    }
    
    try {
      const response = await axios.get(
        `${apiBaseUrl}/api/workbench/spreadsheets/${spreadsheetId}/context`
      );
      setIsLoading(false);
      return response.data;
    } catch (error) {
      console.error('Error extracting data context:', error);
      
      // Check if it's a connection error
      if (error.message === 'Network Error') {
        setConnectionError(true);
        setDevelopmentMode(true);
        setError('Cannot connect to backend services. Development mode enabled.');
        
        // Return mock data context
        const mockDataContext = {
          schema: [
            { name: 'Date', type: 'datetime', missing: false },
            { name: 'Region', type: 'categorical', missing: false },
            { name: 'Product', type: 'categorical', missing: false },
            { name: 'Sales', type: 'numeric', missing: false },
            { name: 'Profit', type: 'numeric', missing: true },
          ],
          statistics: {
            'Sales': { min: 1200, max: 45000, mean: 22450, median: 21000 },
            'Profit': { min: 350, max: 12000, mean: 6700, median: 5800 },
          },
          sample: [
            ['2023-01-01', 'North', 'Widget A', 12500, 3700],
            ['2023-01-02', 'South', 'Widget B', 18000, 5400],
            ['2023-01-03', 'East', 'Widget A', 9800, 2200],
            ['2023-01-04', 'West', 'Widget C', 22000, 7800],
          ],
          row_count: 1250,
          file_info: {
            name: 'sales_data_2023.xlsx',
            sheets: ['Q1', 'Q2', 'Q3', 'Q4']
          }
        };
        
        setIsLoading(false);
        return mockDataContext;
      } else {
        setError('Failed to analyze spreadsheet data. Please try again later.');
        setIsLoading(false);
        throw error;
      }
    }
  };

  // Toggle development mode
  const toggleDevelopmentMode = () => {
    setDevelopmentMode(!developmentMode);
    if (!developmentMode) {
      // When enabling dev mode, load mock data
      setSpreadsheets(MOCK_SPREADSHEETS);
      setVisualizations([MOCK_VISUALIZATION]);
    } else {
      // When disabling dev mode, try to fetch real data
      fetchSpreadsheets();
    }
  };

  // Clear error state
  const clearError = () => {
    setError(null);
  };

  return (
    <WorkbenchContext.Provider value={{
      spreadsheets,
      selectedSpreadsheet,
      selectedTool,
      activeView,
      isLoading,
      error,
      connectionError,
      developmentMode,
      apiBaseUrl,
      analysisResults,
      visualizations,
      setSelectedTool,
      setActiveView,
      fetchSpreadsheets,
      uploadSpreadsheet,
      getSpreadsheetDetails,
      getSpreadsheetSheets,
      getSpreadsheetSummary,
      performCellOperation,
      setSelectedSpreadsheet,
      generateVisualization,
      executeVisualizationCode,
      extractDataContext,
      toggleDevelopmentMode,
      clearError
    }}>
      {children}
    </WorkbenchContext.Provider>
  );
};

export default WorkbenchProvider; 