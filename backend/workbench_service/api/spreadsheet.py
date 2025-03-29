"""
Spreadsheet API endpoints for the Analysis Workbench Service.

This module provides endpoints for:
- Uploading spreadsheets
- Reading spreadsheet data
- Writing to spreadsheets
- Analyzing spreadsheet data with LLMs
- Transforming spreadsheet columns with LLM
"""

import os
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse

# Import Pydantic models
from pydantic import BaseModel, Field

# Import core functionality
from core.spreadsheet import SpreadsheetManager, SpreadsheetProcessor

logger = logging.getLogger("workbench_service")

router = APIRouter()

# Create instances of the manager and processor
spreadsheet_manager = SpreadsheetManager()
spreadsheet_processor = SpreadsheetProcessor()

# Define models
class SpreadsheetInfo(BaseModel):
    """Basic spreadsheet information."""
    id: str
    filename: str
    original_filename: str
    upload_date: str
    modified_date: str
    sheet_count: int
    size_bytes: int
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "abc123",
                "filename": "renamed_data_analysis.xlsx",
                "original_filename": "data_analysis.xlsx",
                "upload_date": "2023-07-15T14:30:00Z",
                "modified_date": "2023-07-16T09:15:00Z",
                "sheet_count": 3,
                "size_bytes": 45678
            }
        }
    }

class CellOperation(BaseModel):
    """Operation to perform on a cell or range."""
    operation: str = Field(..., description="Type of operation to perform (read, write, analyze)")
    sheet_name: str = Field(..., description="Name of the sheet to operate on")
    cell_range: str = Field(..., description="Cell range in Excel notation (e.g., 'A1:B10')")
    value: Optional[str] = Field(None, description="Value to write (for write operations)")
    instruction: Optional[str] = Field(None, description="LLM instruction (for analyze operations)")

class OperationResult(BaseModel):
    """Result of a cell operation."""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None

class OutputColumnDefinition(BaseModel):
    """Definition of an output column for transformation."""
    name: str = Field(..., description="Name of the output column")
    description: Optional[str] = Field(None, description="Description of the output column")

class TransformationRequest(BaseModel):
    """Request to perform a column transformation."""
    sheet_name: str = Field(..., description="Name of the sheet to operate on")
    input_columns: List[str] = Field(..., description="List of input column names")
    output_columns: List[OutputColumnDefinition] = Field(..., description="List of output column definitions")
    instructions: str = Field(..., description="Transformation instructions for LLM")
    include_headers: bool = Field(True, description="Whether to include column headers in context")
    processing_mode: str = Field("all", description="Processing mode: 'all' or 'sample'")
    error_handling: str = Field("continue", description="Error handling strategy: 'continue', 'stop', or 'retry'")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "sheet_name": "Sheet1",
                "input_columns": ["SchoolName", "City", "State"],
                "output_columns": [
                    {"name": "NamedAfterPerson", "description": "Boolean indicating if school is named after a person"}
                ],
                "instructions": "Read the name of the school and give me a true or false value if the school is named after a person.",
                "include_headers": True,
                "processing_mode": "all",
                "error_handling": "continue"
            }
        }
    }

class TransformationResult(BaseModel):
    """Result of a column transformation operation."""
    success: bool
    job_id: Optional[str] = None
    preview: Optional[List[List[Any]]] = None
    error: Optional[str] = None

class SpreadsheetUpdateRequest(BaseModel):
    """Request to update spreadsheet metadata."""
    filename: Optional[str] = None
    description: Optional[str] = None
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "filename": "renamed_file.xlsx"
            }
        }
    }

@router.get("/list", response_model=List[SpreadsheetInfo])
async def list_spreadsheets():
    """
    List all available spreadsheets.
    
    Returns:
        List of spreadsheet information
    """
    logger.info("List spreadsheets endpoint called")
    
    # Get all spreadsheets from the manager
    return spreadsheet_manager.list_spreadsheets()

@router.post("/upload")
async def upload_spreadsheet(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None)
):
    """
    Upload a new spreadsheet.
    
    Args:
        file: The spreadsheet file to upload
        description: Optional description
        
    Returns:
        Information about the uploaded spreadsheet
    """
    logger.info(f"Upload spreadsheet endpoint called with file: {file.filename}")
    
    # Validate file extension
    filename = file.filename
    if not filename:
        raise HTTPException(
            status_code=400, 
            detail="No filename provided"
        )
    
    # Save the spreadsheet using the manager
    file_info = await spreadsheet_manager.save_spreadsheet(file, description)
    
    return {
        "id": file_info["id"],
        "filename": file_info["filename"],
        "upload_date": file_info["upload_date"],
        "sheet_count": file_info.get("sheet_count", 0),
        "size_bytes": file_info.get("size_bytes", 0),
        "message": "File uploaded successfully",
        "description": description
    }

@router.post("/{spreadsheet_id}/operate", response_model=OperationResult)
async def operate_on_cells(
    spreadsheet_id: str,
    operation: CellOperation,
    background_tasks: BackgroundTasks
):
    """
    Perform an operation on cells in a spreadsheet.
    
    Args:
        spreadsheet_id: ID of the spreadsheet
        operation: Details of the operation to perform
        
    Returns:
        Result of the operation
    """
    logger.info(f"Cell operation requested on spreadsheet {spreadsheet_id}: {operation.operation}")
    
    # Get the file path
    try:
        file_path = spreadsheet_manager.get_spreadsheet_path(spreadsheet_id)
    except HTTPException as e:
        return {"success": False, "error": str(e.detail)}
    
    # Perform the operation
    if operation.operation == "read":
        result = spreadsheet_processor.read_spreadsheet(
            file_path=file_path,
            sheet_name=operation.sheet_name,
            cell_range=operation.cell_range
        )
        return result
    elif operation.operation == "write":
        # Writing functionality will be implemented later
        return {
            "success": False,
            "error": "Write operation not yet implemented"
        }
    elif operation.operation == "analyze":
        # Analysis functionality will be implemented later
        return {
            "success": False,
            "error": "Analyze operation not yet implemented"
        }
    else:
        return {
            "success": False,
            "error": f"Unsupported operation: {operation.operation}"
        }

@router.get("/{spreadsheet_id}/info", response_model=SpreadsheetInfo)
async def get_spreadsheet_info(spreadsheet_id: str):
    """
    Get information about a specific spreadsheet.
    
    Args:
        spreadsheet_id: ID of the spreadsheet
        
    Returns:
        Spreadsheet information
    """
    logger.info(f"Get spreadsheet info endpoint called for ID: {spreadsheet_id}")
    
    # Get the spreadsheet info from the manager
    try:
        info = spreadsheet_manager.get_spreadsheet_info(spreadsheet_id)
        return {
            "id": info["id"],
            "filename": info["filename"],
            "original_filename": info["original_filename"],
            "upload_date": info["upload_date"],
            "modified_date": info["modified_date"],
            "sheet_count": info.get("sheet_count", 0),
            "size_bytes": info.get("size_bytes", 0)
        }
    except HTTPException as e:
        raise e

@router.get("/{spreadsheet_id}/sheets")
async def get_spreadsheet_sheets(spreadsheet_id: str):
    """
    Get the list of sheets in a spreadsheet.
    
    Args:
        spreadsheet_id: ID of the spreadsheet
        
    Returns:
        List of sheet names with their metadata
    """
    logger.info(f"Get spreadsheet sheets endpoint called for ID: {spreadsheet_id}")
    
    try:
        info = spreadsheet_manager.get_spreadsheet_info(spreadsheet_id)
        
        # Create a response with sheets array and their metadata
        sheet_details = []
        sheets = info.get("sheets", [])
        sheets_metadata = info.get("sheets_metadata", {})
        
        for sheet in sheets:
            sheet_info = {
                "name": sheet,
                "row_count": 0,
                "columns": []
            }
            
            # Add metadata if available
            if sheets_metadata and sheet in sheets_metadata:
                sheet_info["row_count"] = sheets_metadata[sheet].get("row_count", 0)
                sheet_info["columns"] = sheets_metadata[sheet].get("columns", [])
            
            sheet_details.append(sheet_info)
        
        return {
            "sheets": sheets,
            "sheet_details": sheet_details,
            "spreadsheet_id": spreadsheet_id
        }
    except HTTPException as e:
        raise e

@router.get("/{spreadsheet_id}/summary")
async def get_spreadsheet_summary(
    spreadsheet_id: str,
    sheet_name: Optional[str] = None
):
    """
    Get a statistical summary of the data in a spreadsheet.
    
    Args:
        spreadsheet_id: ID of the spreadsheet
        sheet_name: Name of the sheet to analyze
        
    Returns:
        Statistical summary of columns
    """
    logger.info(f"Get spreadsheet summary endpoint called for ID: {spreadsheet_id}")
    
    try:
        # Get the file path
        file_path = spreadsheet_manager.get_spreadsheet_path(spreadsheet_id)
        
        # If sheet name is not provided, use the first sheet
        if not sheet_name:
            info = spreadsheet_manager.get_spreadsheet_info(spreadsheet_id)
            if "sheets" in info and info["sheets"]:
                sheet_name = info["sheets"][0]
        
        # Get the column summary
        column_summaries = spreadsheet_processor.get_column_summary(file_path, sheet_name)
        
        return {
            "spreadsheet_id": spreadsheet_id,
            "sheet_name": sheet_name,
            "column_summaries": column_summaries
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting spreadsheet summary: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing spreadsheet: {str(e)}"
        )

@router.delete("/{spreadsheet_id}")
async def delete_spreadsheet(spreadsheet_id: str):
    """
    Delete a spreadsheet and its metadata.
    
    Args:
        spreadsheet_id: ID of the spreadsheet to delete
        
    Returns:
        Status message
    """
    logger.info(f"Delete spreadsheet endpoint called for ID: {spreadsheet_id}")
    
    try:
        # Delete the spreadsheet using the manager
        result = spreadsheet_manager.delete_spreadsheet(spreadsheet_id)
        return {
            "success": True,
            "id": result["id"],
            "filename": result["filename"],
            "message": result["message"]
        }
    except HTTPException as e:
        logger.error(f"HTTP error deleting spreadsheet: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Error deleting spreadsheet: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting spreadsheet: {str(e)}"
        )

@router.get("/{spreadsheet_id}/download")
async def download_spreadsheet(spreadsheet_id: str):
    """
    Download a spreadsheet file.
    
    Args:
        spreadsheet_id: ID of the spreadsheet to download
        
    Returns:
        The spreadsheet file for download
    """
    logger.info(f"Download spreadsheet endpoint called for ID: {spreadsheet_id}")
    
    try:
        # Get the file info
        info = spreadsheet_manager.get_spreadsheet_info(spreadsheet_id)
        
        # Get the file path
        file_path = spreadsheet_manager.get_spreadsheet_path(spreadsheet_id)
        
        # Determine the content type based on file extension
        original_filename = info["original_filename"]
        display_filename = info.get("modified_filename", original_filename)
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"  # Default for .xlsx
        
        if original_filename.lower().endswith(".csv"):
            content_type = "text/csv"
        elif original_filename.lower().endswith(".xls"):
            content_type = "application/vnd.ms-excel"
        
        # Return the file as a streaming response
        return FileResponse(
            path=file_path,
            filename=display_filename,
            media_type=content_type
        )
        
    except HTTPException as e:
        logger.error(f"HTTP error downloading spreadsheet: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Error downloading spreadsheet: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error downloading spreadsheet: {str(e)}"
        )

@router.patch("/{spreadsheet_id}")
async def update_spreadsheet(spreadsheet_id: str, request: SpreadsheetUpdateRequest):
    """
    Update spreadsheet metadata.
    
    Args:
        spreadsheet_id: ID of the spreadsheet to update
        request: Update request containing the new metadata
        
    Returns:
        Updated spreadsheet information
    """
    logger.info(f"Update spreadsheet endpoint called for ID: {spreadsheet_id}")
    
    try:
        # Get current info to check file extension
        current_info = spreadsheet_manager.get_spreadsheet_info(spreadsheet_id)
        
        # Prepare updates
        updates = {}
        
        # Handle filename update - preserve the original extension
        if request.filename is not None:
            original_filename = current_info.get("original_filename", current_info.get("filename", ""))
            _, original_ext = os.path.splitext(original_filename)
            
            # Make sure the new filename has the same extension
            new_filename, new_ext = os.path.splitext(request.filename)
            if not new_ext:
                # User didn't provide extension, add the original
                updates["modified_filename"] = f"{request.filename}{original_ext}"
            elif new_ext.lower() != original_ext.lower():
                # User provided wrong extension, replace with original
                updates["modified_filename"] = f"{new_filename}{original_ext}"
            else:
                # User provided correct extension
                updates["modified_filename"] = request.filename
        
        # Handle description update
        if request.description is not None:
            updates["description"] = request.description
        
        # Update the metadata
        updated_info = spreadsheet_manager.update_spreadsheet_metadata(spreadsheet_id, updates)
        
        return {
            "success": True,
            "id": updated_info["id"],
            "filename": updated_info.get("modified_filename", updated_info.get("filename", "")),
            "original_filename": updated_info.get("original_filename", ""),
            "upload_date": updated_info.get("upload_date", ""),
            "modified_date": updated_info.get("modified_date", ""),
            "message": "Spreadsheet updated successfully"
        }
    except HTTPException as e:
        logger.error(f"HTTP error updating spreadsheet: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Error updating spreadsheet: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error updating spreadsheet: {str(e)}"
        )

@router.post("/{spreadsheet_id}/transform", response_model=TransformationResult)
async def transform_spreadsheet(
    spreadsheet_id: str,
    request: TransformationRequest,
    background_tasks: BackgroundTasks
):
    """
    Transform spreadsheet columns using LLM processing.
    
    This endpoint performs row-by-row transformations on the specified spreadsheet
    using LLM processing based on the provided instructions.
    
    Args:
        spreadsheet_id: ID of the spreadsheet
        request: Transformation parameters including input columns, output columns, and instructions
        background_tasks: FastAPI background tasks for async processing
        
    Returns:
        Transformation result with preview data or job information
    """
    logger.info(f"Transform spreadsheet endpoint called for ID: {spreadsheet_id}")
    
    try:
        # Get the file path
        file_path = spreadsheet_manager.get_spreadsheet_path(spreadsheet_id)
        
        # Check if sheet exists
        info = spreadsheet_manager.get_spreadsheet_info(spreadsheet_id)
        if request.sheet_name not in info.get("sheets", []):
            raise HTTPException(
                status_code=400, 
                detail=f"Sheet '{request.sheet_name}' not found in spreadsheet"
            )
        
        # Validate input columns
        sheet_columns = info.get("columns", [])
        for col in request.input_columns:
            if col not in sheet_columns:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Input column '{col}' not found in spreadsheet"
                )
        
        # For sample processing, process synchronously and return preview
        if request.processing_mode == "sample":
            # Process first few rows
            result = spreadsheet_processor.transform_spreadsheet(
                file_path=file_path,
                sheet_name=request.sheet_name,
                input_columns=request.input_columns,
                output_columns=[col.dict() for col in request.output_columns],
                instructions=request.instructions,
                include_headers=request.include_headers,
                processing_mode="sample",
                error_handling=request.error_handling
            )
            
            if "error" in result:
                return {
                    "success": False,
                    "error": result["error"]
                }
            
            # Handle the async case from the processor
            if result.get("requires_async"):
                # Execute the async operation here in the async route handler
                sample_df = result["sample_df"]
                processor = result["processor"]
                input_columns = result["input_columns"]
                output_columns = result["output_columns"]
                
                # Process the dataframe
                result_df = await processor.process_dataframe(sample_df)
                
                # Convert to preview format
                preview = []
                
                # Add header row
                header_row = []
                for col in input_columns:
                    header_row.append(col)
                for col in [c["name"] for c in output_columns]:
                    header_row.append(col)
                preview.append(header_row)
                
                # Add data rows
                for _, row in result_df.iterrows():
                    data_row = []
                    for col in input_columns:
                        data_row.append(str(row[col]))
                    for col in [c["name"] for c in output_columns]:
                        data_row.append(str(row[col]))
                    preview.append(data_row)
                
                return {
                    "success": True,
                    "preview": preview
                }
            
            return {
                "success": True,
                "preview": result.get("preview", [])
            }
        
        # For full processing, start background task and return job ID
        else:
            # Create a unique job ID
            from uuid import uuid4
            job_id = str(uuid4())
            
            # Start background task
            background_tasks.add_task(
                spreadsheet_processor.transform_spreadsheet_background,
                job_id=job_id,
                file_path=file_path,
                sheet_name=request.sheet_name,
                input_columns=request.input_columns,
                output_columns=[col.dict() for col in request.output_columns],
                instructions=request.instructions,
                include_headers=request.include_headers,
                error_handling=request.error_handling
            )
            
            return {
                "success": True,
                "job_id": job_id
            }
        
    except HTTPException as e:
        logger.error(f"HTTP error during transformation: {e.detail}")
        return {
            "success": False,
            "error": str(e.detail)
        }
    except Exception as e:
        logger.error(f"Error transforming spreadsheet: {str(e)}")
        return {
            "success": False,
            "error": f"Error transforming spreadsheet: {str(e)}"
        } 