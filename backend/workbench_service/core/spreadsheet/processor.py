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
                
                # Get total row count for the sheet (minus header)
                total_row_count = sum(1 for _ in open(file_path)) - 1
                
            else:
                # For Excel files
                # Get the sheet name if not specified
                if sheet_name is None:
                    excel_file = pd.ExcelFile(file_path)
                    sheet_name = excel_file.sheet_names[0]
                
                # Get the full sheet once to determine total row count
                full_sheet_df = None
                try:
                    # This is faster than reading the entire sheet for large files
                    full_sheet_df = pd.read_excel(file_path, sheet_name=sheet_name, header=0, nrows=0)
                    # Use the Excel sheet dimensions directly
                    if hasattr(full_sheet_df, 'shape'):
                        # This will get the number of rows if shape attribute exists
                        total_row_count = pd.read_excel(file_path, sheet_name=sheet_name).shape[0]
                    else:
                        # Fallback
                        total_row_count = len(pd.read_excel(file_path, sheet_name=sheet_name))
                except Exception as e:
                    logger.warning(f"Error getting row count for sheet {sheet_name}: {str(e)}")
                    # Fallback to a default value
                    total_row_count = 1000
                
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
            
            # Add header row if it exists
            header = df.columns.tolist()
            if header:
                values.insert(0, header)
            
            # Create result structure
            result = {
                "success": True,
                "data": {
                    "values": values,
                    "row_count": total_row_count,
                    "column_count": len(df.columns),
                    "sheet_name": sheet_name
                }
            }
            
            return result
        
        except HTTPException as e:
            # Re-raise HTTP exceptions
            raise e
        except Exception as e:
            logger.error(f"Error reading spreadsheet: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to read spreadsheet: {str(e)}"
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
            
    async def transform_spreadsheet(
        self,
        file_path: Path,
        sheet_name: str,
        input_columns: List[str],
        output_columns: List[Dict[str, Any]],
        include_headers: bool = True,
        processing_mode: str = "all",
        error_handling: str = "continue",
        create_duplicate: bool = True
    ) -> Dict[str, Any]:
        """
        Transform spreadsheet columns using LLM processing.
        
        Args:
            file_path: Path to the spreadsheet file
            sheet_name: Name of the sheet to process
            input_columns: List of input column names
            output_columns: List of output column definitions with per-column instructions
            include_headers: Whether to include column headers in context
            processing_mode: "all" or "preview"
            error_handling: "continue", "stop", or "retry"
            create_duplicate: Whether to create a duplicate spreadsheet before transformation
            
        Returns:
            Dict with transformation results or error
        """
        try:
            from ..llm.transformer import RowTransformer, BatchProcessor
            from ..spreadsheet.manager import SpreadsheetManager
            
            logger.info(f"Starting spreadsheet transformation with LLM for {file_path}, sheet: {sheet_name}")
            logger.info(f"Input columns: {input_columns}")
            logger.info(f"Output columns: {[col['name'] for col in output_columns]}")
            logger.info(f"Processing mode: {processing_mode}, Create duplicate: {create_duplicate}")
            
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
            
            # Prepare the LLM transformer with the updated constructor - no more global instructions
            transformer = RowTransformer(
                input_columns=input_columns,
                output_columns=output_columns,
                include_headers=include_headers,
                error_handling=error_handling
            )
            
            # Process only a sample for preview
            if processing_mode == "preview":
                # Get sample rows (limited to first 10)
                sample_size = min(10, len(df))
                sample_df = df.head(sample_size)
                
                logger.info(f"Processing preview with {sample_size} rows")
                
                # Create processor for preview
                processor = BatchProcessor(transformer=transformer, max_concurrent=5)
                
                # Process the sample asynchronously - now properly awaited without run_until_complete
                try:
                    # Since we're in an async function, we can directly await the processor
                    result_df = await processor.process_dataframe(sample_df)
                    
                    # Convert the result to a list of lists for the API response
                    header = result_df.columns.tolist()
                    values = result_df.values.tolist()
                    preview_data = [header] + values
                    
                    return {
                        "success": True,
                        "preview": preview_data,
                        "sample_size": sample_size
                    }
                except Exception as async_error:
                    logger.error(f"Error in async preview processing: {str(async_error)}")
                    return {"error": f"Error in preview processing: {str(async_error)}"}
                
            # For full processing in a background task, just return confirmation
            # The actual processing will happen in transform_spreadsheet_background
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
        output_columns: List[Dict[str, Any]],
        include_headers: bool = True,
        error_handling: str = "continue",
        create_duplicate: bool = True,
        spreadsheet_id: Optional[str] = None
    ) -> None:
        """
        Background task for spreadsheet transformation.
        
        Args:
            job_id: Unique job identifier
            file_path: Path to the spreadsheet file
            sheet_name: Name of the sheet to process
            input_columns: List of input column names
            output_columns: List of output column definitions with per-column instructions
            include_headers: Whether to include column headers in context
            error_handling: "continue", "stop", or "retry"
            create_duplicate: Whether to create a duplicate spreadsheet before transformation
            spreadsheet_id: ID of the spreadsheet to duplicate (if create_duplicate is True)
        """
        from ..llm.transformer import RowTransformer, BatchProcessor
        from ..spreadsheet.manager import get_spreadsheet_manager
        import uuid
        from pathlib import Path
        
        # Convert file_path to Path object if it's not already
        if not isinstance(file_path, Path):
            file_path = Path(file_path)
            
        # Ensure we're working with absolute paths
        file_path = file_path.absolute()
        
        # Update job status from api.jobs
        try:
            from api.jobs import update_job_in_store
            update_job_status = update_job_in_store
        except ImportError:
            # Fallback to local placeholder if API module not accessible
            update_job_status = self._update_job_status
        
        logger.info(f"Starting background transformation job {job_id}")
        logger.info(f"Processing file: {file_path}")
        logger.info(f"Input columns: {input_columns}")
        logger.info(f"Output columns: {[col['name'] for col in output_columns]}")
        logger.info(f"Create duplicate: {create_duplicate}")
        
        try:
            # Update job status
            update_job_status(job_id, {
                "status": "running",
                "progress": 0,
                "message": "Starting transformation"
            })
            
            # Handle file path - first determine which spreadsheet this belongs to
            # We need to find the spreadsheet ID to create a duplicate if requested
            target_file_path = file_path
            spreadsheet_manager = get_spreadsheet_manager()
            duplicate_id = None  # Initialize for later use
            
            # If create_duplicate is True, create a duplicate of the spreadsheet
            if create_duplicate:
                try:
                    # Use provided spreadsheet_id if available
                    if spreadsheet_id:
                        update_job_status(job_id, {
                            "status": "running",
                            "progress": 5,
                            "message": f"Creating duplicate of spreadsheet {spreadsheet_id}"
                        })
                        
                        # Create duplicate
                        # Log before calling
                        logger.info(f"Attempting to create duplicate for spreadsheet ID {spreadsheet_id}")
                        duplicate_info = spreadsheet_manager.create_duplicate_spreadsheet(spreadsheet_id)
                        
                        # Check if duplication was successful
                        if duplicate_info and duplicate_info.get("storage_path"):
                            target_file_path = Path(duplicate_info["storage_path"])
                            duplicate_id = duplicate_info["id"]
                            
                            update_job_status(job_id, {
                                "status": "running",
                                "progress": 10,
                                "message": f"Created duplicate spreadsheet {duplicate_info['id']}"
                            })
                            
                            logger.info(f"Successfully created duplicate spreadsheet: {duplicate_info['id']} at {target_file_path}")
                        else:
                            # Handle case where create_duplicate_spreadsheet returns None or invalid info
                            error_msg = "Failed to create duplicate: Function returned invalid data."
                            logger.error(error_msg)
                            update_job_status(job_id, {
                                "status": "failed",
                                "progress": 5,
                                "message": error_msg
                            })
                            return # Stop execution if duplication failed

                    else:
                        # No spreadsheet_id provided, cannot perform duplication
                        error_msg = "Cannot create duplicate: No spreadsheet_id provided for duplication."
                        logger.error(error_msg)
                        update_job_status(job_id, {
                            "status": "failed", # Mark as failed
                            "progress": 5,
                            "message": error_msg
                        })
                        return # Stop execution

                except Exception as dup_error:
                    error_msg = f"Failed to create duplicate spreadsheet: {str(dup_error)}"
                    logger.error(error_msg, exc_info=True) # Log with traceback
                    update_job_status(job_id, {
                        "status": "failed", # Mark as failed
                        "progress": 5,
                        "message": error_msg
                    })
                    return # Stop execution if duplication fails
            
            # Read the spreadsheet data (only runs if duplication succeeded or wasn't requested)
            update_job_status(job_id, {
                "status": "running",
                "progress": 15,
                "message": "Reading spreadsheet data"
            })
            
            if target_file_path.suffix.lower() == '.csv':
                df = pd.read_csv(target_file_path)
            else:
                df = pd.read_excel(target_file_path, sheet_name=sheet_name)
            
            # Store a copy of the original DataFrame
            original_df = df.copy()
            
            logger.info(f"Read spreadsheet data: {len(df)} rows, {list(df.columns)} columns")
            
            # Validate input columns
            missing_columns = [col for col in input_columns if col not in df.columns]
            if missing_columns:
                error_msg = f"Missing input columns: {', '.join(missing_columns)}"
                logger.error(error_msg)
                update_job_status(job_id, {
                    "status": "failed", 
                    "progress": 0, 
                    "message": error_msg
                })
                return
            
            # Prepare the LLM transformer (using the updated transformer)
            transformer = RowTransformer(
                input_columns=input_columns,
                output_columns=output_columns,
                include_headers=include_headers,
                error_handling=error_handling
            )
            
            # Progress callback
            def on_progress(percent):
                # Scale the progress from 20% to 90%
                scaled_percent = 20 + (percent * 0.7)
                logger.info(f"Transformation progress: {percent}% (scaled: {scaled_percent}%)")
                update_job_status(job_id, {
                    "status": "running", 
                    "progress": scaled_percent, 
                    "message": f"Processing rows: {percent:.1f}% complete"
                })
            
            # Process the dataframe
            update_job_status(job_id, {
                "status": "running",
                "progress": 20,
                "message": "Starting row-by-row processing"
            })
            
            processor = BatchProcessor(transformer=transformer, max_concurrent=5)
            result_df = await processor.process_dataframe(df, on_progress=on_progress)
            
            # Get final structure for metadata update
            final_columns = result_df.columns.tolist()
            final_row_count = len(result_df)
            logger.info(f"Transformation complete. Final structure: {final_row_count} rows, {len(final_columns)} columns.")
            logger.info(f"Final columns: {final_columns}")

            # Save the results
            update_job_status(job_id, {
                "status": "running",
                "progress": 90,
                "message": "Saving transformed spreadsheet"
            })
            
            # Track if any errors occurred during transformation
            had_transformation_errors = transformer.had_errors if hasattr(transformer, 'had_errors') else False
            
            # Save the transformed data back to the target file
            try:
                logger.info(f"Saving transformed data back to {target_file_path}")
                
                # Save based on file type
                if target_file_path.suffix.lower() == '.csv':
                    result_df.to_csv(target_file_path, index=False)
                else:
                    # For Excel, we need to handle possible multiple sheets
                    try:
                        # First read all existing sheets
                        other_sheets = {}
                        if target_file_path.exists():
                            try:
                                excel_file = pd.ExcelFile(target_file_path, engine='openpyxl')
                                for other_sheet in excel_file.sheet_names:
                                    if other_sheet != sheet_name:
                                        other_sheets[other_sheet] = pd.read_excel(target_file_path, sheet_name=other_sheet, engine='openpyxl')
                            except Exception as e:
                                logger.warning(f"Error reading existing sheets: {e}. Only the transformed sheet will be saved.")
                        
                        # Ensure the target file has a proper Excel extension
                        if not target_file_path.suffix.lower() in ['.xlsx', '.xls']:
                            logger.warning(f"Target file {target_file_path} doesn't have Excel extension, appending .xlsx")
                            target_file_path = Path(str(target_file_path) + '.xlsx')
                        
                        # Then write all sheets at once with specified engine
                        with pd.ExcelWriter(target_file_path, engine='openpyxl', mode='w') as writer:
                            # Write the transformed sheet
                            result_df.to_excel(writer, sheet_name=sheet_name, index=False)
                            
                            # Write all other sheets
                            for other_sheet_name, other_df in other_sheets.items():
                                try:
                                    other_df.to_excel(writer, sheet_name=other_sheet_name, index=False)
                                except Exception as e:
                                    logger.warning(f"Error writing sheet {other_sheet_name}: {e}")
                    except Exception as excel_error:
                        logger.error(f"Error handling Excel file: {excel_error}", exc_info=True)
                        # Fallback: at least save the transformed sheet
                        try:
                            fallback_path = target_file_path
                            if not fallback_path.suffix.lower() == '.xlsx':
                                fallback_path = Path(str(fallback_path).rsplit('.', 1)[0] + '.xlsx')
                            
                            result_df.to_excel(fallback_path, sheet_name=sheet_name, index=False, engine='openpyxl')
                            logger.warning(f"Used fallback method to save only the transformed sheet to {fallback_path}")
                            target_file_path = fallback_path
                        except Exception as fallback_error:
                            logger.error(f"Even fallback save failed: {fallback_error}", exc_info=True)
                            raise fallback_error
                
                logger.info(f"Successfully saved transformed data to {target_file_path}")
                
                # Update metadata for the transformed file (use duplicate ID if we created one)
                spreadsheet_to_update = duplicate_id or spreadsheet_id
                if spreadsheet_to_update:
                    try:
                        spreadsheet_manager.update_metadata_after_transform(
                            spreadsheet_id=spreadsheet_to_update,
                            new_columns=final_columns,
                            new_row_count=final_row_count,
                            sheet_name=sheet_name
                        )
                        logger.info(f"Updated metadata for spreadsheet ID: {spreadsheet_to_update}")
                    except Exception as meta_error:
                        logger.error(f"Failed to update metadata: {meta_error}", exc_info=True)
                        update_job_status(job_id, {
                            "status": "running",
                            "progress": 95,
                            "message": f"Warning: Saved transformed data but failed to update metadata: {meta_error}"
                        })
                
                # Set job status based on whether there were errors during transformation
                if had_transformation_errors:
                    status_message = "Transformation completed with some errors. Some cells may contain default values."
                    job_status = "completed_with_errors"
                else:
                    status_message = "Transformation completed successfully!"
                    job_status = "completed"
                
                # Add the spreadsheet ID to the success message
                if duplicate_id:
                    status_message += f" Data saved to duplicate spreadsheet ID: {duplicate_id}."
                elif spreadsheet_id:
                    status_message += f" Data saved to original spreadsheet ID: {spreadsheet_id}."
                
                update_job_status(job_id, {
                    "status": job_status,
                    "progress": 100,
                    "message": status_message,
                    "result": {
                        "output_file_path": str(target_file_path) if target_file_path else None,
                        "spreadsheet_id": duplicate_id or spreadsheet_id,
                        "message": None
                    }
                })
                
            except Exception as save_error:
                logger.error(f"Error saving transformed data: {str(save_error)}", exc_info=True)
                update_job_status(job_id, {
                    "status": "failed", 
                    "progress": 90, 
                    "message": f"Error saving transformation results: {str(save_error)}"
                })
            
        except Exception as e:
            logger.error(f"Error in background transformation job {job_id}: {str(e)}", exc_info=True)
            update_job_status(job_id, {
                "status": "failed", 
                "progress": 0, 
                "message": f"Error during transformation: {str(e)}"
            })
    
    def _update_job_status(self, job_id: str, updates: Dict[str, Any]) -> None:
        """
        Update the status of a background job. This is a placeholder that should be replaced
        with integration to the job tracking system (api.jobs module).
        
        Args:
            job_id: Unique job identifier
            updates: Dictionary with updates like status, progress, message, result_url, etc.
        """
        # This would typically update a database or cache with job status
        logger.info(f"Job {job_id} status update: {updates}")
        
        # Try to import and use the actual job update function
        try:
            from api.jobs import update_job_in_store
            update_job_in_store(job_id, updates)
        except ImportError:
            logger.warning("Could not import api.jobs.update_job_in_store, job status updates won't be persisted.")
        except Exception as e:
            logger.error(f"Error updating job status via api.jobs: {str(e)}") 