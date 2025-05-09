"""
Functions for executing visualization code.

This module handles:
- Setting up matplotlib rendering
- Executing user Python/Matplotlib code
- Saving visualization outputs
"""

import os
import logging
import traceback
import uuid
from pathlib import Path
import matplotlib
matplotlib.use('Agg')  # Set headless backend
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import io
import base64
from typing import Dict, Any, Optional, List, Tuple

from config import WORKBENCH_SPREADSHEETS_DIR, get_config

logger = logging.getLogger("workbench_service")

async def execute_visualization_code(visualization_id: str, code: str, data_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Execute the provided Python/Matplotlib visualization code.
    
    Args:
        visualization_id: ID of the visualization
        code: Python code to execute
        data_context: Data context to provide to the execution environment
        
    Returns:
        Dictionary containing execution results (success, image URL, etc.)
    """
    # Set up output directory for visualizations 
    # Use WORKBENCH_DIR from config directly for the parent
    config = get_config()
    workbench_dir = Path(config.get('WORKBENCH_DIR'))
    output_dir = workbench_dir / "visualizations"
    # output_dir = Path(WORKBENCH_SPREADSHEETS_DIR) / "visualizations"
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate a filename for this visualization output
    output_filename = f"{visualization_id}.png"
    output_path = output_dir / output_filename
    
    # Clear any existing plots
    plt.close('all')
    
    # Prepare execution context with available data and libraries
    execution_locals = {
        'plt': plt,
        'pd': pd,
        'np': np,
        'logging': logging,
        'io': io,
        'Path': Path,
        'output_path': output_path,
        'visualization_id': visualization_id
    }
    
    # Add data context if provided
    if data_context:
        execution_locals.update(data_context)
    
    try:
        # Execute the code within our namespace
        exec(code, execution_locals)
        
        # Check if there's an active figure
        if plt.get_fignums():
            # Save the figure to the output file
            logger.info(f"Saving visualization to: {output_path}")
            plt.savefig(output_path, bbox_inches='tight', dpi=300)
            plt.close('all')
            
            # Generate a data URL for returning in the API response
            with open(output_path, 'rb') as img_file:
                img_data = base64.b64encode(img_file.read()).decode('utf-8')
                data_url = f"data:image/png;base64,{img_data}"
            
            # Generate URL for accessing the file
            # Note: In a real application, you'd need to configure the web server
            # to serve files from the output directory
            # Instead of a public URL served by FastAPI, we'll use the filename for reference
            # public_url = f"/api/workbench/visualizations/{visualization_id}/image/{output_filename}"
            file_reference_path = f"/app/data/workbench/visualizations/{output_filename}"

            return {
                "success": True,
                # "image_url": public_url, # Removed direct serving URL
                "data_url": data_url, # Added data URL
                # "image_data": img_data, # Keep base64 data if needed separately, but data_url is more common
                "output_filename": output_filename,
                "file_path": str(output_path.parent), # Return the directory path
                "file_reference_path": file_reference_path # Added reference path
            }
        else:
            return {
                "success": False,
                "error": "No visualization was created. Make sure your code calls plt.figure() or similar."
            }
    except Exception as e:
        # Capture the full traceback
        error_tb = traceback.format_exc()
        logger.error(f"Error executing visualization code: {str(e)}\n{error_tb}")
        
        # Return detailed error information
        return {
            "success": False,
            "error": str(e),
            "traceback": error_tb
        } 