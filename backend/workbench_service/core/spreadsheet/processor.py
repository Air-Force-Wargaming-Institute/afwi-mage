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
        import os
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
                        duplicate_info = spreadsheet_manager.create_duplicate_spreadsheet(spreadsheet_id)
                        target_file_path = Path(duplicate_info["storage_path"])
                        duplicate_id = duplicate_info["id"]
                        
                        update_job_status(job_id, {
                            "status": "running",
                            "progress": 10,
                            "message": f"Created duplicate spreadsheet {duplicate_info['id']}"
                        })
                        
                        logger.info(f"Created duplicate spreadsheet: {duplicate_info['id']} at {target_file_path}")
                    else:
                        # No spreadsheet_id provided, cannot perform duplication
                        error_msg = "Cannot create duplicate: No spreadsheet_id provided"
                        logger.error(error_msg)
                        update_job_status(job_id, {
                            "status": "running",
                            "progress": 5,
                            "message": f"Warning: {error_msg}. Proceeding with original file."
                        })
                except Exception as dup_error:
                    logger.error(f"Error creating duplicate spreadsheet: {str(dup_error)}")
                    update_job_status(job_id, {
                        "status": "running",
                        "progress": 5,
                        "message": f"Failed to create duplicate, proceeding with original: {str(dup_error)}"
                    })
            
            # Read the spreadsheet data
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

            # Log the transformation results
            # result_columns = [col for col in result_df.columns if col not in original_df.columns]
            # logger.info(f"Transformation complete. New columns added: {result_columns}")
            # logger.info(f"Result dataframe shape: {result_df.shape}")

            # Save the results
            update_job_status(job_id, {
                "status": "running",
                "progress": 90,
                "message": "Saving transformed spreadsheet"
            })
            
            # Track if any errors occurred during transformation
            had_transformation_errors = False
            if 'had_errors' in transformer.__dict__ and transformer.had_errors:
                had_transformation_errors = True
            
            # Save the results using our reliable save method
            try:
                output_path = self._save_transformed_spreadsheet(target_file_path, sheet_name, result_df)
                logger.info(f"Successfully saved transformed spreadsheet to {output_path}")

                # --- Create new metadata entry for the transformed file ---
                new_metadata_id = None
                try:
                    new_metadata_id = spreadsheet_manager.create_metadata_for_transformed_file(
                        original_spreadsheet_id=spreadsheet_id, # Link to the original
                        new_columns=final_columns,
                        new_row_count=final_row_count,
                        new_storage_path=output_path,
                        sheet_name=sheet_name
                    )
                    logger.info(f"Created new metadata entry {new_metadata_id} for transformed file.")
                except Exception as meta_error:
                    logger.error(f"Failed to create metadata for transformed file: {meta_error}", exc_info=True)
                    # Decide if this should fail the job or just log a warning
                    # For now, log warning and continue with job completion, but without updated metadata link
                    update_job_status(job_id, {
                        "status": "running",
                        "progress": 98,
                        "message": f"Warning: Saved transformed file but failed to create metadata entry: {meta_error}"
                    })
                # --- End metadata creation ---

                # Create a relative URL for the result
                try:
                    from config import WORKBENCH_OUTPUTS_DIR
                    # Ensure both paths are Path objects
                    outputs_dir = Path(WORKBENCH_OUTPUTS_DIR)
                    output_path_obj = Path(output_path)
                    
                    # Extract just the filename for a download endpoint
                    output_filename = output_path_obj.name
                    result_url = f"/api/workbench/spreadsheets/download/{output_filename}"
                    logger.info(f"Generated result URL: {result_url}")
                except Exception as url_error:
                    logger.error(f"Error creating result URL: {str(url_error)}")
                    result_url = str(output_path)
                
                # Set job status based on whether there were errors during transformation
                if had_transformation_errors:
                    status_message = "Transformation completed with some errors. Some cells may contain default values."
                    job_status = "completed_with_errors"
                else:
                    status_message = "Transformation completed successfully!"
                    job_status = "completed"

                # Include the new metadata ID in the success message if created
                if new_metadata_id:
                    status_message += f" New data saved with spreadsheet ID: {new_metadata_id}."

                update_job_status(job_id, {
                    "status": job_status,
                    "progress": 100,
                    "message": status_message,
                    "result": { # Add result section to job info
                        "output_file_path": str(output_path),
                        "new_spreadsheet_id": new_metadata_id # Include the new ID if created
                    }
                    # "result_url": result_url # Keep or remove based on whether download endpoint is preferred
                })
                
            except Exception as save_error:
                logger.error(f"Error saving transformed spreadsheet: {str(save_error)}", exc_info=True)
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
        
        # Ensure original_path is a Path object
        if not isinstance(original_path, Path):
            original_path = Path(original_path)
            
        # Ensure WORKBENCH_OUTPUTS_DIR is a Path object
        outputs_dir = Path(WORKBENCH_OUTPUTS_DIR)
        
        # Create output directory if it doesn't exist
        logger.info(f"Saving transformed spreadsheet. Output directory: {outputs_dir}")
        outputs_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate output filename
        timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
        original_name = original_path.stem
        output_filename = f"{original_name}_transformed_{timestamp}"
        logger.info(f"Generated output filename: {output_filename}")
        
        # Determine output format based on original file
        if original_path.suffix.lower() == '.csv':
            output_path = outputs_dir / f"{output_filename}.csv"
            logger.info(f"Saving CSV to: {output_path}")
            df.to_csv(output_path, index=False)
        else:
            output_path = outputs_dir / f"{output_filename}.xlsx"
            logger.info(f"Saving Excel to: {output_path}")
            # Log DataFrame info for debugging
            logger.info(f"DataFrame info: {len(df)} rows, {len(df.columns)} columns")
            logger.info(f"Column names: {list(df.columns)}")
            df.to_excel(output_path, sheet_name=sheet_name, index=False)
        
        # Verify file was created
        if not output_path.exists():
            error_msg = f"Failed to save file! Path does not exist: {output_path}"
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)
        else:
            logger.info(f"Successfully saved transformed spreadsheet to {output_path}")
            try:
                file_size = output_path.stat().st_size
                logger.info(f"File size: {file_size} bytes")
            except Exception as e:
                logger.error(f"Could not get file size: {str(e)}")
            
        return output_path 