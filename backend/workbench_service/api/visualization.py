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
import threading # Added for lock
import json      # Added for JSON handling
from datetime import datetime
from typing import List, Dict, Any, Optional, Union
from pathlib import Path # Added for path handling
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend

# Core visualization functionality
from core.visualization.generation import generate_visualization_code
from core.visualization.execution import execute_visualization_code
# Use get_config to find WORKBENCH_DIR
from config import WORKBENCH_SPREADSHEETS_DIR, get_config 

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
    data_url: Optional[str] = None # Added data URL for direct embedding
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "vis123",
                "spreadsheet_id": "spread123",
                "title": "Sales by Region",
                "prompt": "Show me a bar chart of sales by region",
                "code": "import matplotlib.pyplot as plt...",
                "created_at": "2023-07-15T14:30:00Z",
                "image_url": "/api/workbench/visualizations/vis123/image",
                "data_url": "data:image/png;base64,..."
            }
        }
    }

# --- Persistence Layer (Similar to jobs.py) ---

_vis_store_lock = threading.Lock()

def get_visualization_store_path() -> Path:
    """Gets the path to the visualization store JSON file."""
    config = get_config()
    workbench_dir = Path(config.get('WORKBENCH_DIR')) # Use WORKBENCH_DIR
    return workbench_dir / "visualizations_store.json"

def load_visualizations_from_store() -> Dict[str, Dict]:
    """Loads visualization data from the JSON file store."""
    vis_store_path = get_visualization_store_path()
    with _vis_store_lock:
        if not vis_store_path.exists():
            logger.info(f"Visualization store file not found at {vis_store_path}, creating empty store.")
            vis_store_path.parent.mkdir(parents=True, exist_ok=True)
            with open(vis_store_path, 'w') as f:
                json.dump({}, f)
            return {}
        try:
            with open(vis_store_path, 'r') as f:
                content = f.read()
                if not content.strip():
                    logger.warning(f"Visualization store file {vis_store_path} is empty.")
                    return {}
                f.seek(0)
                vis_data = json.load(f)
                if not isinstance(vis_data, dict):
                    logger.error(f"Visualization store file {vis_store_path} is not a valid JSON object.")
                    return {}
                return vis_data
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding JSON from visualization store {vis_store_path}: {e}", exc_info=True)
            return {}
        except Exception as e:
            logger.error(f"Error loading visualizations from store {vis_store_path}: {e}", exc_info=True)
            return {}

def save_visualizations_to_store(vis_data: Dict[str, Dict]):
    """Saves visualization data to the JSON file store."""
    vis_store_path = get_visualization_store_path()
    with _vis_store_lock:
        try:
            vis_store_path.parent.mkdir(parents=True, exist_ok=True)
            with open(vis_store_path, 'w') as f:
                # Convert Visualization models back to serializable dicts
                serializable_data = {
                    vis_id: Visualization(**vis_dict).model_dump(mode='json', exclude_none=True)
                    for vis_id, vis_dict in vis_data.items()
                }
                json.dump(serializable_data, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving visualizations to store {vis_store_path}: {e}", exc_info=True)
            raise

def save_visualization(visualization: Visualization):
    """Adds or updates a single visualization in the store."""
    visualizations = load_visualizations_from_store()
    # Use model_dump to ensure it's a dict compatible with storage
    visualizations[visualization.id] = visualization.model_dump(mode='json') 
    save_visualizations_to_store(visualizations)
    logger.info(f"Saved/Updated visualization: ID={visualization.id}")

def delete_visualization_record(visualization_id: str) -> bool:
    """Deletes a visualization record from the store."""
    visualizations = load_visualizations_from_store()
    if visualization_id in visualizations:
        del visualizations[visualization_id]
        save_visualizations_to_store(visualizations)
        logger.info(f"Deleted visualization record: ID={visualization_id}")
        # Optionally delete the image file as well
        # config = get_config()
        # vis_dir = Path(config.get('WORKBENCH_DIR')) / "visualizations"
        # img_path = vis_dir / f"{visualization_id}.png"
        # try:
        #     if img_path.exists():
        #         img_path.unlink()
        #         logger.info(f"Deleted visualization image file: {img_path}")
        # except Exception as e:
        #     logger.error(f"Error deleting image file {img_path}: {e}")
        return True
    logger.warning(f"Attempted to delete non-existent visualization: ID={visualization_id}")
    return False

# --- API Endpoints ---

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
        result = await execute_visualization_code(
            visualization_id,
            code,
            data_context_dict
        )

        if result.get('success'):
            # image_data = result.get('image_data') # Not strictly needed if using data_url
            file_path = result.get('file_path')
            output_filename = result.get('output_filename')
            data_url = result.get('data_url') # Get the data URL
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to execute code: {result.get('error')}"
            )
        
        # Create the visualization object
        # Use Visualization model for validation and structure
        visualization = Visualization(
            id=visualization_id,
            spreadsheet_id=request.spreadsheet_id,
            title=title,
            prompt=request.prompt,
            code=code,
            created_at=datetime.utcnow().isoformat(),
            image_url=result.get("file_reference_path", ""), # Use the reference path
            data_url=data_url # Include the data URL in the response
        )
        
        # Save the visualization metadata
        save_visualization(visualization)
        
        return visualization # Return the validated Pydantic model
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
    
    # Load existing visualization data to get context (spreadsheet_id, prompt, etc.)
    visualizations = load_visualizations_from_store()
    existing_data = visualizations.get(visualization_id)
    if not existing_data:
        raise HTTPException(status_code=404, detail="Visualization not found")
        
    try:
        existing_vis = Visualization(**existing_data) # Parse into model
    except Exception as e:
        logger.error(f"Error parsing existing visualization data {visualization_id}: {e}")
        raise HTTPException(status_code=500, detail="Error loading existing visualization data")
        
    try:
        # Execute the provided code
        result= await execute_visualization_code(
            visualization_id,
            request.code
            # Potentially pass data_context if needed and stored
        )

        if result.get('success'):
            # image_data = result.get('image_data') # Not strictly needed if using data_url
            file_path = result.get('file_path')
            output_filename = result.get('output_filename')
            data_url = result.get('data_url') # Get the data URL
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to execute code: {result.get('error')}"
            )
        
        # Create updated visualization object using existing data and new results
        updated_visualization = Visualization(
            id=visualization_id,
            spreadsheet_id=existing_vis.spreadsheet_id, # Use existing value
            title=existing_vis.title, # Use existing value
            prompt=existing_vis.prompt, # Use existing value
            code=request.code, # Update code
            created_at=existing_vis.created_at, # Keep original creation date
            image_url=result.get("file_reference_path", ""), # Update image ref
            data_url=data_url # Update data URL
        )

        # Save the updated visualization metadata
        save_visualization(updated_visualization)

        return updated_visualization
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
    visualizations_dict = load_visualizations_from_store()
    
    # Convert stored dicts back to Visualization models
    vis_list: List[Visualization] = []
    for vis_id, vis_data in visualizations_dict.items():
        try:
            # Ensure 'id' is present if somehow missing in stored data
            if 'id' not in vis_data:
                vis_data['id'] = vis_id
            vis_list.append(Visualization(**vis_data))
        except Exception as e:
            logger.warning(f"Skipping visualization ID {vis_id} due to parsing error: {e}")
            continue
            
    # Sort by creation date descending (optional, but nice)
    vis_list.sort(key=lambda v: v.created_at, reverse=True)
    
    return vis_list

@router.delete("/api/workbench/visualizations/{visualization_id}")
async def delete_visualization(visualization_id: str):
    """
    Delete a specific visualization record.
    
    Args:
        visualization_id: ID of the visualization to delete
        
    Returns:
        Success message
    """
    logger.info(f"Delete visualization endpoint called for ID: {visualization_id}")
    
    deleted = delete_visualization_record(visualization_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Visualization not found")
        
    return {"success": True, "message": "Visualization deleted"}

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
    visualizations = load_visualizations_from_store()
    vis_data = visualizations.get(visualization_id)
    
    if not vis_data:
        raise HTTPException(status_code=404, detail="Visualization not found")
        
    try:
        # Ensure 'id' field is present
        if 'id' not in vis_data:
            vis_data['id'] = visualization_id
        return Visualization(**vis_data)
    except Exception as e:
        logger.error(f"Error parsing visualization data for ID {visualization_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving visualization details")

# Endpoint to serve image (Optional - if not using data URLs primarily)
# @router.get("/api/workbench/visualizations/{visualization_id}/image")
# async def get_visualization_image(visualization_id: str):
#     logger.info(f"Get visualization image endpoint called for ID: {visualization_id}")
#     config = get_config()
#     vis_dir = Path(config.get('WORKBENCH_DIR')) / "visualizations"
#     # Assuming filename is simply {visualization_id}.png
#     image_path = vis_dir / f"{visualization_id}.png"

#     if not image_path.is_file():
#         raise HTTPException(status_code=404, detail="Visualization image not found")

#     return FileResponse(image_path) 