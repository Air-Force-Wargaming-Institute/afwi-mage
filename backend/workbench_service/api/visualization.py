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
from config import WORKBENCH_OUTPUTS_DIR

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
    use_seaborn: bool = Field(True, description="Whether to use seaborn for visualization")
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

@router.post("/generate", response_model=Visualization)
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
        
        # Generate the visualization code using the LLM
        code = await generate_visualization_code(
            request.prompt,
            request.spreadsheet_id,
            request.use_seaborn,
            request.data_context
        )
        
        # Execute the generated code
        image_path, image_data = await execute_visualization_code(
            code, 
            visualization_id
        )
        
        # Create the visualization object
        visualization = {
            "id": visualization_id,
            "spreadsheet_id": request.spreadsheet_id,
            "title": title,
            "prompt": request.prompt,
            "code": code,
            "created_at": datetime.utcnow().isoformat(),
            "image_url": f"/api/workbench/visualizations/{visualization_id}/image",
            "image_data": image_data  # Include base64 data in the response
        }
        
        return visualization
    except Exception as e:
        logger.error(f"Error generating visualization: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate visualization: {str(e)}"
        )

@router.post("/{visualization_id}/execute", response_model=Visualization)
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
        image_path, image_data = await execute_visualization_code(
            request.code, 
            visualization_id
        )
        
        # In a real implementation, this would update the visualization in storage
        return {
            "id": visualization_id,
            "spreadsheet_id": "spreadsheet_id",  # This would be retrieved from storage
            "title": "Updated Visualization",
            "prompt": "Original prompt",  # This would be retrieved from storage
            "code": request.code,
            "created_at": datetime.utcnow().isoformat(),
            "image_url": f"/api/workbench/visualizations/{visualization_id}/image",
            "image_data": image_data
        }
    except Exception as e:
        logger.error(f"Error executing visualization code: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute code: {str(e)}"
        )

@router.get("/list", response_model=List[Visualization])
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

@router.get("/{visualization_id}", response_model=Visualization)
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
        "image_url": f"/api/workbench/visualizations/{visualization_id}/image"
    } 