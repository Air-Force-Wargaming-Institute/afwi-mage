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
                
                # Basic info for all columns - Convert numpy types to Python native types
                summary = {
                    "name": str(col_name),
                    "dtype": dtype,
                    "count": int(len(col_data)),
                    "null_count": int(col_data.isna().sum()),
                    "unique_count": int(col_data.nunique())
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
                
                # Add sample values - Convert each sample value to appropriate Python native type
                non_null_values = col_data.dropna()
                if len(non_null_values) > 0:
                    sample_data = non_null_values.sample(min(5, len(non_null_values)))
                    sample_values = []
                    for val in sample_data:
                        if isinstance(val, (np.integer, np.int64)):
                            sample_values.append(int(val))
                        elif isinstance(val, (np.floating, np.float64)):
                            sample_values.append(float(val))
                        else:
                            sample_values.append(str(val) if val is not None else None)
                    summary["sample_values"] = sample_values
                else:
                    summary["sample_values"] = []
                
                summaries.append(summary)
            
            return summaries
        
        except Exception as e:
            logger.error(f"Error generating column summary: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error analyzing spreadsheet: {str(e)}"
            )
            
    def transform_spreadsheet(
        self,
        file_path: Path,
        sheet_name: str,
        input_columns: List[str],
        output_columns: List[Dict[str, str]],
        instructions: str,
        include_headers: bool = True,
        processing_mode: str = "all",
        error_handling: str = "continue"
    ) -> Dict[str, Any]:
        """
        Transform spreadsheet columns using LLM processing.
        
        Args:
            file_path: Path to the spreadsheet file
            sheet_name: Name of the sheet to process
            input_columns: List of input column names
            output_columns: List of output column definitions
            instructions: Transformation instructions for LLM
            include_headers: Whether to include column headers in context
            processing_mode: "all" or "sample"
            error_handling: "continue", "stop", or "retry"
            
        Returns:
            Dict with transformation results or error
        """
        try:
            import asyncio
            from ..llm import RowTransformer, BatchProcessor
            
            logger.info(f"Starting spreadsheet transformation with LLM for {file_path}, sheet: {sheet_name}")
            
            # Read the spreadsheet data
            if file_path.suffix.lower() == '.csv':
                df = pd.read_csv(file_path)
            else:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
            
            # Validate input columns
            missing_columns = [col for col in input_columns if col not in df.columns]
            if missing_columns:
                return {
                    "error": f"Missing input columns: {', '.join(missing_columns)}"
                }
            
            # Prepare the LLM transformer
            transformer = RowTransformer(
                instructions=instructions,
                input_columns=input_columns,
                output_columns=output_columns,
                include_headers=include_headers,
                error_handling=error_handling
            )
            
            # Process only a sample for preview
            if processing_mode == "sample":
                # Get sample rows (limited to first 10)
                sample_size = min(10, len(df))
                sample_df = df.head(sample_size)
                
                # Create processor but don't run it yet - delegate to the caller
                processor = BatchProcessor(transformer=transformer, max_concurrent=5)
                
                # Don't use asyncio.run() since we're already in an event loop
                # Return a special response that the API route handler will handle
                return {
                    "requires_async": True,
                    "sample_df": sample_df,
                    "processor": processor,
                    "input_columns": input_columns,
                    "output_columns": output_columns,
                    "sample_size": sample_size
                }
                
            # For full processing in a background task, just return confirmation
            return {
                "success": True,
                "message": "Transformation task initialized"
            }
        
        except Exception as e:
            logger.error(f"Error in transform_spreadsheet: {str(e)}", exc_info=True)
            return {
                "error": f"Error transforming spreadsheet: {str(e)}"
            }
    
    async def transform_spreadsheet_background(
        self,
        job_id: str,
        file_path: Path,
        sheet_name: str,
        input_columns: List[str],
        output_columns: List[Dict[str, str]],
        instructions: str,
        include_headers: bool = True,
        error_handling: str = "continue"
    ) -> None:
        """
        Background task for spreadsheet transformation.
        
        Args:
            job_id: Unique job identifier
            file_path: Path to the spreadsheet file
            sheet_name: Name of the sheet to process
            input_columns: List of input column names
            output_columns: List of output column definitions
            instructions: Transformation instructions for LLM
            include_headers: Whether to include column headers in context
            error_handling: "continue", "stop", or "retry"
        """
        from ..llm import RowTransformer, BatchProcessor
        
        logger.info(f"Starting background transformation job {job_id}")
        logger.info(f"Processing file: {file_path} (absolute: {os.path.abspath(file_path)})")
        logger.info(f"Input columns: {input_columns}")
        logger.info(f"Output columns: {[col['name'] for col in output_columns]}")
        
        try:
            # Update job status
            self._update_job_status(job_id, status="running", progress=0, message="Starting transformation")
            
            # Read the spreadsheet data
            if file_path.suffix.lower() == '.csv':
                df = pd.read_csv(file_path)
            else:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
            
            # Store a copy of the original DataFrame
            original_df = df.copy()
            
            logger.info(f"Read spreadsheet data: {len(df)} rows, {list(df.columns)} columns")
            
            # Validate input columns
            missing_columns = [col for col in input_columns if col not in df.columns]
            if missing_columns:
                error_msg = f"Missing input columns: {', '.join(missing_columns)}"
                logger.error(error_msg)
                self._update_job_status(
                    job_id, 
                    status="failed", 
                    progress=0, 
                    message=error_msg
                )
                return
            
            # Prepare the LLM transformer
            transformer = RowTransformer(
                instructions=instructions,
                input_columns=input_columns,
                output_columns=output_columns,
                include_headers=include_headers,
                error_handling=error_handling
            )
            
            # Progress callback
            def on_progress(percent):
                logger.info(f"Transformation progress: {percent}%")
                self._update_job_status(job_id, status="running", progress=percent, message="Processing rows")
            
            # Process the dataframe
            processor = BatchProcessor(transformer=transformer, max_concurrent=5)
            result_df = await processor.process_dataframe(df, on_progress=on_progress)
            
            # Log the transformation results
            result_columns = [col for col in result_df.columns if col not in original_df.columns]
            logger.info(f"Transformation complete. New columns added: {result_columns}")
            logger.info(f"Result dataframe shape: {result_df.shape}")
            
            # Save the results using multiple approaches to ensure it works
            output_paths = []
            
            # 1. Standard save path
            try:
                output_path = self._save_transformed_spreadsheet(file_path, sheet_name, result_df)
                output_paths.append(output_path)
            except Exception as e:
                logger.error(f"Error saving using standard method: {str(e)}")
                
            # 2. Save directly to data directory using absolute path
            try:
                from config import BASE_DIR
                # Generate a more distinctive filename 
                timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
                alt_filename = f"{file_path.stem}_transformed_{timestamp}_ALT{file_path.suffix}"
                
                # Try both relative and absolute paths
                alt_path1 = Path(BASE_DIR) / "workbench" / "outputs" / alt_filename
                alt_path2 = Path(os.path.join(os.getcwd(), "data", "workbench", "outputs", alt_filename))
                
                logger.info(f"Attempting to save to alternate path 1: {alt_path1}")
                if file_path.suffix.lower() == '.csv':
                    result_df.to_csv(alt_path1, index=False)
                else:
                    result_df.to_excel(alt_path1, sheet_name=sheet_name, index=False)
                    
                if os.path.exists(alt_path1):
                    logger.info(f"Successfully saved to alternate path: {alt_path1}")
                    output_paths.append(alt_path1)
                
                logger.info(f"Attempting to save to alternate path 2: {alt_path2}")
                if file_path.suffix.lower() == '.csv':
                    result_df.to_csv(alt_path2, index=False)
                else:
                    result_df.to_excel(alt_path2, sheet_name=sheet_name, index=False)
                    
                if os.path.exists(alt_path2):
                    logger.info(f"Successfully saved to alternate path: {alt_path2}")
                    output_paths.append(alt_path2)
                    
            except Exception as e:
                logger.error(f"Error saving using alternate methods: {str(e)}")
                
            # 3. Also save to the same directory as the original file
            try:
                same_dir_path = file_path.parent / f"{file_path.stem}_transformed_{timestamp}{file_path.suffix}"
                logger.info(f"Attempting to save to same directory as original: {same_dir_path}")
                
                if file_path.suffix.lower() == '.csv':
                    result_df.to_csv(same_dir_path, index=False)
                else:
                    result_df.to_excel(same_dir_path, sheet_name=sheet_name, index=False)
                    
                if os.path.exists(same_dir_path):
                    logger.info(f"Successfully saved to same directory: {same_dir_path}")
                    output_paths.append(same_dir_path)
            except Exception as e:
                logger.error(f"Error saving to same directory: {str(e)}")
            
            # Update job status to completed - list all successful paths
            success_msg = "Transformation completed successfully!"
            if output_paths:
                success_msg += f" Files saved to: {', '.join([str(p) for p in output_paths])}"
                
            self._update_job_status(
                job_id, 
                status="completed", 
                progress=100, 
                message=success_msg,
                result_url=str(output_paths[0]) if output_paths else None
            )
            
        except Exception as e:
            logger.error(f"Error in background transformation job {job_id}: {str(e)}", exc_info=True)
            self._update_job_status(job_id, status="failed", progress=0, message=f"Error: {str(e)}")
    
    def _update_job_status(self, job_id: str, status: str, progress: float, message: str, result_url: Optional[str] = None) -> None:
        """
        Update the status of a background job. This is a placeholder that should be replaced
        with a proper job tracking system in a production environment.
        
        Args:
            job_id: Unique job identifier
            status: Job status ("running", "completed", "failed")
            progress: Progress percentage (0-100)
            message: Status message
            result_url: Optional URL to results
        """
        # This would typically update a database or cache with job status
        logger.info(f"Job {job_id} status update: {status}, {progress}%, {message}")
    
    def _save_transformed_spreadsheet(self, original_path: Path, sheet_name: str, df: pd.DataFrame) -> Path:
        """
        Save the transformed spreadsheet data.
        
        Args:
            original_path: Path to the original spreadsheet
            sheet_name: Name of the sheet that was processed
            df: Transformed DataFrame
            
        Returns:
            Path to the saved output file
        """
        from pathlib import Path
        import os
        from config import WORKBENCH_OUTPUTS_DIR
        
        # Create output directory if it doesn't exist
        logger.info(f"Saving transformed spreadsheet. Output directory: {WORKBENCH_OUTPUTS_DIR} (absolute: {os.path.abspath(WORKBENCH_OUTPUTS_DIR)})")
        os.makedirs(WORKBENCH_OUTPUTS_DIR, exist_ok=True)
        
        # Generate output filename
        timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
        original_name = original_path.stem
        output_filename = f"{original_name}_transformed_{timestamp}"
        logger.info(f"Generated output filename: {output_filename}")
        
        # Determine output format based on original file
        if original_path.suffix.lower() == '.csv':
            output_path = Path(WORKBENCH_OUTPUTS_DIR) / f"{output_filename}.csv"
            logger.info(f"Saving CSV to: {output_path} (absolute: {os.path.abspath(output_path)})")
            df.to_csv(output_path, index=False)
        else:
            output_path = Path(WORKBENCH_OUTPUTS_DIR) / f"{output_filename}.xlsx"
            logger.info(f"Saving Excel to: {output_path} (absolute: {os.path.abspath(output_path)})")
            # Log DataFrame info for debugging
            logger.info(f"DataFrame info: {len(df)} rows, {len(df.columns)} columns")
            logger.info(f"Column names: {list(df.columns)}")
            df.to_excel(output_path, sheet_name=sheet_name, index=False)
        
        # Verify file was created
        if os.path.exists(output_path):
            logger.info(f"Successfully saved transformed spreadsheet to {output_path}")
            try:
                file_size = os.path.getsize(output_path)
                logger.info(f"File size: {file_size} bytes")
            except Exception as e:
                logger.error(f"Could not get file size: {str(e)}")
        else:
            logger.error(f"Failed to save file! Path does not exist: {output_path}")
            
            # Try saving to an alternate location
            alt_path = Path(os.getcwd()) / f"{output_filename}{original_path.suffix}"
            logger.info(f"Attempting to save to alternate location: {alt_path}")
            if original_path.suffix.lower() == '.csv':
                df.to_csv(alt_path, index=False)
            else:
                df.to_excel(alt_path, sheet_name=sheet_name, index=False)
            
            if os.path.exists(alt_path):
                logger.info(f"Successfully saved to alternate location: {alt_path}")
                return alt_path
            
        return output_path 