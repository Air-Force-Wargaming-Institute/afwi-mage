"""
Visualization code execution module.

This module handles the safe execution of Python visualization code and
converts the generated figures to web-friendly formats.
"""

import os
import io
import sys
import base64
import logging
import subprocess
import tempfile
from typing import Tuple, Optional, Dict, Any
from pathlib import Path

import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend

from config import WORKBENCH_OUTPUTS_DIR

logger = logging.getLogger("workbench_service")

async def execute_visualization_code(code: str, visualization_id: str) -> Tuple[str, str]:
    """
    Execute Python visualization code and save the output.
    
    Args:
        code: Python code to execute
        visualization_id: Unique ID for the visualization
        
    Returns:
        Tuple of (file_path, base64_image_data)
    """
    logger.info(f"Executing visualization code for ID: {visualization_id}")
    
    # Create output directory if it doesn't exist
    output_dir = Path(WORKBENCH_OUTPUTS_DIR) / "visualizations"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Full path to save the figure
    output_path = str(output_dir / f"{visualization_id}.png")
    
    try:
        # In a production environment, this would use a secure sandbox
        # For demonstration purposes, we'll use a more direct approach
        return await _execute_code_direct(code, output_path)
    except Exception as e:
        logger.error(f"Error executing visualization code: {str(e)}", exc_info=True)
        # Generate a simple error image
        error_image_path, error_image_data = _generate_error_image(str(e))
        return error_image_path, error_image_data

async def _execute_code_direct(code: str, output_path: str) -> Tuple[str, str]:
    """
    Execute visualization code directly using matplotlib.
    
    For demonstration only - in production, use a secure sandbox.
    """
    # Modify the code to save the figure to our output path
    modified_code = code.replace(
        "plt.show()",
        f"plt.savefig('{output_path}', dpi=300, bbox_inches='tight')"
    )
    
    # In a real implementation, this would use a secure sandbox like RestrictedPython
    # For demonstration, we're using exec() with a global namespace
    # THIS IS NOT SECURE FOR PRODUCTION USE
    
    # Create a temporary file for the code
    with tempfile.NamedTemporaryFile(suffix='.py', mode='w', delete=False) as f:
        temp_file = f.name
        # Save the modified code to a temporary file
        f.write(modified_code)
    
    try:
        # Execute the code in a separate process with a timeout
        process = subprocess.run(
            [sys.executable, temp_file],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if process.returncode != 0:
            error_msg = process.stderr or "Unknown execution error"
            logger.error(f"Code execution failed: {error_msg}")
            raise Exception(f"Code execution failed: {error_msg}")
        
        # Check if the image was created
        if not os.path.exists(output_path):
            raise Exception("Visualization code executed but no image was created")
        
        # Read the image and convert to base64
        with open(output_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')
        
        return output_path, image_data
    finally:
        # Clean up the temporary file
        try:
            os.unlink(temp_file)
        except Exception:
            pass

def _generate_error_image(error_message: str) -> Tuple[str, str]:
    """Generate a simple error image with the error message."""
    try:
        import matplotlib.pyplot as plt
        
        # Create a figure with the error message
        plt.figure(figsize=(10, 6))
        plt.text(0.5, 0.5, f"Error: {error_message}", 
                 ha='center', va='center', fontsize=12, color='red',
                 wrap=True)
        plt.axis('off')
        
        # Save to memory buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        
        # Convert to base64
        image_data = base64.b64encode(buf.read()).decode('utf-8')
        
        return "error.png", image_data
    except Exception as e:
        logger.error(f"Failed to generate error image: {str(e)}", exc_info=True)
        # Return a minimal base64 encoded 1x1 red pixel image
        return "error.png", "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==" 