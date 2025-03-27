"""
Spreadsheet Processor

Handles reading, writing, and transformation of spreadsheet data.
"""

import os
import logging
from typing import List, Dict, Any, Optional, Union, Tuple
from pathlib import Path
import pandas as pd
import numpy as np
from fastapi import HTTPException

logger = logging.getLogger("workbench_service")

class SpreadsheetProcessor:
    """
    Processes spreadsheet data.
    
    Responsibilities:
    - Read data from spreadsheets
    - Write data to spreadsheets
    - Transform data with LLM guidance
    """
    
    def __init__(self):
        """Initialize the spreadsheet processor."""
        pass
    
    def read_spreadsheet(
        self, 
        file_path: Path, 
        sheet_name: Optional[str] = None,
        cell_range: Optional[str] = None,
        start_row: Optional[int] = None,
        end_row: Optional[int] = None,
        columns: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Read data from a spreadsheet file.
        
        Args:
            file_path: Path to the spreadsheet file
            sheet_name: Name of the sheet to read (first sheet if None)
            cell_range: Range of cells to read in Excel notation (e.g., 'A1:C10')
            start_row: First row to read (0-indexed, inclusive)
            end_row: Last row to read (0-indexed, inclusive)
            columns: List of column names to include
            
        Returns:
            Dictionary with the read data and metadata
            
        Raises:
            HTTPException: If the file cannot be read
        """
        try:
            # Determine file type
            is_csv = file_path.suffix.lower() == '.csv'
            
            if is_csv:
                # For CSV, we don't have sheets
                if sheet_name is not None and sheet_name != "Sheet1":
                    raise HTTPException(
                        status_code=400, 
                        detail=f"CSV files do not have multiple sheets"
                    )
                
                # Skip rows and read specified range
                skiprows = start_row if start_row is not None else 0
                nrows = (end_row - skiprows + 1) if end_row is not None else None
                
                df = pd.read_csv(file_path, skiprows=skiprows, nrows=nrows)
                
                # Filter columns if specified
                if columns:
                    df = df[columns]
                
                # Handle cell range for CSV (convert to row/col indices)
                if cell_range:
                    start_col, start_row, end_col, end_row = self._parse_cell_range(cell_range)
                    # Adjust for header row
                    if start_row > 0:
                        start_row -= 1
                    if end_row > 0:
                        end_row -= 1
                    
                    # Get column names by position
                    if start_col < len(df.columns) and end_col < len(df.columns):
                        df = df.iloc[start_row:end_row+1, start_col:end_col+1]
                    else:
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Cell range {cell_range} is invalid for this file"
                        )
            else:
                # For Excel files
                # Get the sheet name if not specified
                if sheet_name is None:
                    excel_file = pd.ExcelFile(file_path)
                    sheet_name = excel_file.sheet_names[0]
                
                # Handle cell range for Excel
                if cell_range:
                    df = pd.read_excel(file_path, sheet_name=sheet_name, usecols=None)
                    start_col, start_row, end_col, end_row = self._parse_cell_range(cell_range)
                    
                    # Adjust for header row
                    if start_row > 0:
                        start_row -= 1
                    if end_row > 0:
                        end_row -= 1
                    
                    if start_row < len(df) and start_col < len(df.columns):
                        df = df.iloc[start_row:end_row+1, start_col:end_col+1]
                    else:
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Cell range {cell_range} is invalid for this file"
                        )
                else:
                    # Use regular row filtering
                    skiprows = start_row if start_row is not None else None
                    nrows = (end_row - skiprows + 1) if end_row is not None and skiprows is not None else None
                    
                    # Read the Excel file
                    df = pd.read_excel(
                        file_path, 
                        sheet_name=sheet_name, 
                        skiprows=skiprows,
                        nrows=nrows
                    )
                    
                    # Filter columns if specified
                    if columns:
                        df = df[columns]
            
            # Convert to list of lists for consistent output
            values = df.values.tolist()
            header = df.columns.tolist()
            
            # Insert header as first row
            values.insert(0, header)
            
            return {
                "success": True,
                "data": {
                    "values": values,
                    "sheet_name": sheet_name,
                    "range": cell_range,
                    "row_count": len(df),
                    "column_count": len(df.columns)
                }
            }
        
        except Exception as e:
            logger.error(f"Error reading spreadsheet: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _parse_cell_range(self, cell_range: str) -> Tuple[int, int, int, int]:
        """
        Parse Excel cell range notation (e.g., 'A1:C10') into row and column indices.
        
        Args:
            cell_range: Excel cell range notation
            
        Returns:
            Tuple of (start_col, start_row, end_col, end_row)
        """
        try:
            # Split the range
            if ':' in cell_range:
                start_cell, end_cell = cell_range.split(':')
            else:
                start_cell = end_cell = cell_range
            
            # Parse start cell
            start_col_str = ''.join(filter(str.isalpha, start_cell))
            start_row = int(''.join(filter(str.isdigit, start_cell)))
            
            # Parse end cell
            end_col_str = ''.join(filter(str.isalpha, end_cell))
            end_row = int(''.join(filter(str.isdigit, end_cell)))
            
            # Convert column letters to indices (0-based)
            start_col = self._column_str_to_index(start_col_str)
            end_col = self._column_str_to_index(end_col_str)
            
            return start_col, start_row, end_col, end_row
        
        except Exception as e:
            logger.error(f"Error parsing cell range '{cell_range}': {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid cell range format: {cell_range}. Expected format like 'A1:C10'."
            )
    
    def _column_str_to_index(self, column_str: str) -> int:
        """
        Convert Excel column string to zero-based column index.
        
        Example: 'A' -> 0, 'Z' -> 25, 'AA' -> 26
        
        Args:
            column_str: Excel column string
            
        Returns:
            Zero-based column index
        """
        result = 0
        for char in column_str:
            result = result * 26 + (ord(char.upper()) - ord('A') + 1)
        return result - 1  # Convert to 0-based index
    
    def get_column_summary(self, file_path: Path, sheet_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get statistical summary of columns in a spreadsheet.
        
        Args:
            file_path: Path to the spreadsheet file
            sheet_name: Name of the sheet to analyze
            
        Returns:
            List of column summaries
        """
        try:
            # Determine file type and read the data
            is_csv = file_path.suffix.lower() == '.csv'
            
            if is_csv:
                df = pd.read_csv(file_path)
            else:
                if sheet_name is None:
                    excel_file = pd.ExcelFile(file_path)
                    sheet_name = excel_file.sheet_names[0]
                df = pd.read_excel(file_path, sheet_name=sheet_name)
            
            # Generate summary for each column
            summaries = []
            
            for col_name in df.columns:
                col_data = df[col_name]
                
                # Get data type
                dtype = str(col_data.dtype)
                
                # Basic info for all columns
                summary = {
                    "name": col_name,
                    "dtype": dtype,
                    "count": len(col_data),
                    "null_count": col_data.isna().sum(),
                    "unique_count": col_data.nunique()
                }
                
                # Add statistical info for numeric columns
                if np.issubdtype(col_data.dtype, np.number):
                    summary.update({
                        "min": float(col_data.min()) if not pd.isna(col_data.min()) else None,
                        "max": float(col_data.max()) if not pd.isna(col_data.max()) else None,
                        "mean": float(col_data.mean()) if not pd.isna(col_data.mean()) else None,
                        "median": float(col_data.median()) if not pd.isna(col_data.median()) else None,
                        "std": float(col_data.std()) if not pd.isna(col_data.std()) else None
                    })
                
                # Add sample values
                non_null_values = col_data.dropna()
                summary["sample_values"] = non_null_values.sample(min(5, len(non_null_values))).tolist() if len(non_null_values) > 0 else []
                
                summaries.append(summary)
            
            return summaries
        
        except Exception as e:
            logger.error(f"Error generating column summary: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error analyzing spreadsheet: {str(e)}"
            ) 