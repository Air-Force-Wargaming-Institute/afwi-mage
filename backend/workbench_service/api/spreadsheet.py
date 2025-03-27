"""
Spreadsheet API endpoints for the Analysis Workbench Service.

This module provides endpoints for:
- Uploading spreadsheets
- Reading spreadsheet data
- Writing to spreadsheets
- Analyzing spreadsheet data with LLMs
"""

import os
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends

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
    upload_date: str
    sheet_count: int
    size_bytes: int
    
    class Config:
        schema_extra = {
            "example": {
                "id": "abc123",
                "filename": "data_analysis.xlsx",
                "upload_date": "2023-07-15T14:30:00Z",
                "sheet_count": 3,
                "size_bytes": 45678
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
            "upload_date": info["upload_date"],
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
        List of sheet names
    """
    logger.info(f"Get spreadsheet sheets endpoint called for ID: {spreadsheet_id}")
    
    try:
        info = spreadsheet_manager.get_spreadsheet_info(spreadsheet_id)
        return {
            "sheets": info.get("sheets", []),
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