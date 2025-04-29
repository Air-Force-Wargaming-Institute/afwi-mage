"""
Visualization API endpoints for the Analysis Workbench Service.

This module provides endpoints for:
- Generating visualization code from natural language prompts
- Executing Python visualization code
- Storing and retrieving visualizations
"""

import os
import uuid
import base64
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Union
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend

# Core visualization functionality
from core.visualization.generation import generate_visualization_code
from core.visualization.execution import execute_visualization_code
from config import WORKBENCH_SPREADSHEETS_DIR

logger = logging.getLogger("workbench_service")

router = APIRouter()

class ColumnSchema(BaseModel):
    """Schema information for a spreadsheet column."""
    name: str
    type: str
    missing: bool

class Statistics(BaseModel):
    """Statistical information for numeric columns."""
    min: Optional[float] = None
    max: Optional[float] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    std: Optional[float] = None

class FileInfo(BaseModel):
    """Information about the Excel file."""
    name: str
    sheets: List[str]

class DataContext(BaseModel):
    """Comprehensive data context from a spreadsheet."""
    column_schema: List[ColumnSchema]
    statistics: Dict[str, Statistics] = {}
    sample_rows: List[List[Any]] = []
    row_count: int
    file_info: FileInfo

class VisualizationRequest(BaseModel):
    """Request to generate a visualization from natural language."""
    spreadsheet_id: str = Field(..., description="ID of the spreadsheet to visualize")
    prompt: str = Field(..., description="Natural language description of the desired visualization")
    visualization_type: str = Field(..., description="Type of visualization to generate; can be 'bar', 'line', 'pie', 'scatter', 'heatmap'")
    use_seaborn: bool = Field(True, description="Whether to use seaborn for visualization")
    style: str = Field(..., description="Style of the visualization")
    color_palette: str = Field(..., description="Color palette of the visualization")
    data_context: Optional[DataContext] = Field(None, description="Comprehensive data context")

class CodeExecutionRequest(BaseModel):
    """Request to execute visualization code."""
    code: str = Field(..., description="Python code to execute")

class Visualization(BaseModel):
    """Visualization information."""
    id: str
    spreadsheet_id: str
    title: str
    prompt: str
    code: str
    created_at: str
    image_url: str
    image_data: Optional[str] = None  # Base64 encoded image
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "vis123",
                "spreadsheet_id": "spread123",
                "title": "Sales by Region",
                "prompt": "Show me a bar chart of sales by region",
                "code": "import matplotlib.pyplot as plt...",
                "created_at": "2023-07-15T14:30:00Z",
                "image_url": "/api/workbench/visualizations/vis123/image"
            }
        }
    }

@router.post("/api/workbench/visualizations/generate", response_model=Visualization)
async def generate_visualization(request: VisualizationRequest, background_tasks: BackgroundTasks):
    """
    Generate visualization code from natural language.
    
    Args:
        request: Details of the visualization to generate
        
    Returns:
        Information about the generated visualization
    """
    logger.info(f"Generate visualization endpoint called for spreadsheet: {request.spreadsheet_id}")
    
    try:
        # Generate a unique ID for the visualization
        visualization_id = f"vis_{uuid.uuid4().hex[:8]}"
        
        # Extract a title from the prompt
        title = request.prompt.split('.')[0].strip()
        if len(title) > 50:
            title = title[:47] + "..."

        # Convert Pydantic model to dict if it exists
        data_context_dict = request.data_context.model_dump() if request.data_context else None
        
        # Generate the visualization code using the LLM
        print(f"$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$Generating visualization code for spreadsheet: {request.spreadsheet_id}")
        code = await generate_visualization_code(
            request.prompt,
            request.spreadsheet_id,
            request.use_seaborn,
            data_context_dict
        )
        
        print(f"Generated code: {code}")

        # Execute the generated code
        # Execute the provided code
        result= await execute_visualization_code(
            visualization_id,
            code,
            data_context_dict
        )

        if result.get('success'):
            image_data = result.get('image_data')
            file_path = result.get('file_path')
            output_filename = result.get('output_filename')
            data_url = result.get('data_url')
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to execute code: {result.get('error')}"
            )
        
        # Create the visualization object
        visualization = {
            "id": visualization_id,
            "spreadsheet_id": request.spreadsheet_id,
            "title": title,
            "prompt": request.prompt,
            "code": code,
            "created_at": datetime.utcnow().isoformat(),
            #image_url": f"/api/workbench/visualizations/{visualization_id}/image",
            "image_url": file_path + output_filename,
            "image_data": image_data,
            "data_url": data_url
        }
        
        return visualization
    except Exception as e:
        logger.error(f"Error generating visualization: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate visualization: {str(e)}"
        )

@router.post("/api/workbench/visualizations/{visualization_id}/execute", response_model=Visualization)
async def execute_code(visualization_id: str, request: CodeExecutionRequest):
    """
    Execute modified visualization code.
    
    Args:
        visualization_id: ID of the visualization
        request: Python code to execute
        
    Returns:
        Updated visualization information with new image
    """
    logger.info(f"Execute code endpoint called for visualization: {visualization_id}")
    
    try:
        # Execute the provided code
        result= await execute_visualization_code(
            visualization_id,
            request.code
        )

        if result.get('success'):
            image_data = result.get('image_data')
            file_path = result.get('file_path')
            output_filename = result.get('output_filename')
            data_url = result.get('data_url')
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to execute code: {result.get('error')}"
            )
        
        # In a real implementation, this would update the visualization in storage
        return {
            "id": visualization_id,
            "spreadsheet_id": "spreadsheet_id",  # This would be retrieved from storage
            "title": "Updated Visualization",
            "prompt": "Original prompt",  # This would be retrieved from storage
            "code": request.code,
            "created_at": datetime.utcnow().isoformat(),
            #"image_url": f"/api/workbench/visualizations/{visualization_id}/image",
            "image_url": file_path + output_filename,
            "image_data": image_data,
            "data_url": data_url
        }
    except Exception as e:
        logger.error(f"Error executing visualization code: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute code: {str(e)}"
        )

@router.get("/api/workbench/visualizations/list", response_model=List[Visualization])
async def list_visualizations():
    """
    List all available visualizations.
    
    Returns:
        List of visualization information
    """
    logger.info("List visualizations endpoint called")
    
    # This would retrieve visualizations from storage in a real implementation
    return [
        {
            "id": "vis123",
            "spreadsheet_id": "spread123",
            "title": "Sales by Region",
            "prompt": "Show me a bar chart of sales by region",
            "code": "import matplotlib.pyplot as plt...",
            "created_at": "2023-08-01T12:00:00Z",
            "image_url": "/api/workbench/visualizations/vis123/image"
        }
    ]

@router.get("/api/workbench/visualizations/{visualization_id}", response_model=Visualization)
async def get_visualization(visualization_id: str):
    """
    Get information about a specific visualization.
    
    Args:
        visualization_id: ID of the visualization
        
    Returns:
        Visualization information
    """
    logger.info(f"Get visualization endpoint called for ID: {visualization_id}")
    
    # This would retrieve the visualization from storage in a real implementation
    return {
        "id": visualization_id,
        "spreadsheet_id": "spread123",
        "title": "Sales by Region",
        "prompt": "Show me a bar chart of sales by region",
        "code": "import matplotlib.pyplot as plt...",
        "created_at": "2023-08-01T12:00:00Z",
        "image_url": f"/api/workbench/visualizations/{visualization_id}/"
    } 