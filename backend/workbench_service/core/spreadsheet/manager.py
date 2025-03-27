"""
Spreadsheet Manager

Handles the storage, retrieval, and metadata management of spreadsheet files.
"""

import os
import json
import uuid
import shutil
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime
import pandas as pd
from fastapi import UploadFile, HTTPException

# Import configuration
from config import WORKBENCH_UPLOADS_DIR

logger = logging.getLogger("workbench_service")

class SpreadsheetManager:
    """
    Manages spreadsheet files for the workbench service.
    
    Responsibilities:
    - Store uploaded spreadsheet files
    - Retrieve spreadsheet files
    - Track spreadsheet metadata
    - List available spreadsheets
    """
    
    def __init__(self, upload_dir: Optional[Path] = None):
        """
        Initialize the spreadsheet manager.
        
        Args:
            upload_dir: Directory to store uploaded files
        """
        self.upload_dir = upload_dir or WORKBENCH_UPLOADS_DIR
        self.metadata_file = self.upload_dir / "metadata.json"
        
        # Create directory if it doesn't exist
        os.makedirs(self.upload_dir, exist_ok=True)
        
        # Load metadata if exists, otherwise initialize empty
        self.metadata = self._load_metadata()
    
    def _load_metadata(self) -> Dict[str, Dict[str, Any]]:
        """Load metadata from file or initialize if not exists."""
        if not os.path.exists(self.metadata_file):
            return {}
        
        try:
            with open(self.metadata_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            logger.warning(f"Could not load metadata file, initializing empty")
            return {}
    
    def _save_metadata(self) -> None:
        """Save metadata to file."""
        with open(self.metadata_file, 'w') as f:
            json.dump(self.metadata, f, indent=2)
    
    async def save_spreadsheet(self, file: UploadFile, description: Optional[str] = None) -> Dict[str, Any]:
        """
        Save an uploaded spreadsheet file.
        
        Args:
            file: The uploaded file
            description: Optional description of the file
            
        Returns:
            Metadata about the saved file
        """
        # Validate file type
        if not self._is_valid_spreadsheet(file.filename):
            raise HTTPException(
                status_code=400, 
                detail="Invalid file type. Only .xlsx, .xls, and .csv files are supported."
            )
        
        # Generate a unique ID
        file_id = str(uuid.uuid4())
        
        # Get file extension and create new filename
        filename = file.filename
        extension = os.path.splitext(filename)[1].lower()
        new_filename = f"{file_id}{extension}"
        
        # Create full path to save the file
        file_path = self.upload_dir / new_filename
        
        # Save the file
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            logger.error(f"Error saving file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
        finally:
            await file.close()
        
        # Get info about the file
        file_info = await self._extract_file_info(file_path, filename)
        
        # Add additional metadata
        file_info["id"] = file_id
        file_info["description"] = description
        file_info["upload_date"] = datetime.now().isoformat()
        file_info["storage_path"] = str(file_path)
        
        # Save to metadata
        self.metadata[file_id] = file_info
        self._save_metadata()
        
        return file_info
    
    async def _extract_file_info(self, file_path: Path, original_filename: str) -> Dict[str, Any]:
        """
        Extract information about a spreadsheet file.
        
        Args:
            file_path: Path to the saved file
            original_filename: Original name of the file
            
        Returns:
            Dictionary with file information
        """
        file_info = {
            "filename": original_filename,
            "size_bytes": os.path.getsize(file_path)
        }
        
        try:
            if file_path.suffix.lower() == '.csv':
                # For CSV, we just have one sheet
                file_info["sheet_count"] = 1
                file_info["sheets"] = ["Sheet1"]
                
                # Get sample data
                df = pd.read_csv(file_path, nrows=5)
                file_info["columns"] = df.columns.tolist()
                file_info["row_count"] = sum(1 for _ in open(file_path)) - 1  # Subtract header
                
            else:  # Excel files
                # For Excel, get sheet names
                excel_file = pd.ExcelFile(file_path)
                sheets = excel_file.sheet_names
                
                file_info["sheet_count"] = len(sheets)
                file_info["sheets"] = sheets
                
                # Get sample data from first sheet
                if sheets:
                    df = pd.read_excel(file_path, sheet_name=sheets[0], nrows=5)
                    file_info["columns"] = df.columns.tolist()
                    
                    # Count rows (a bit expensive for large files, might want to optimize)
                    full_df = pd.read_excel(file_path, sheet_name=sheets[0])
                    file_info["row_count"] = len(full_df)
        except Exception as e:
            logger.error(f"Error extracting file info: {str(e)}")
            file_info["error"] = str(e)
            file_info["sheet_count"] = 0
            file_info["sheets"] = []
            file_info["columns"] = []
            file_info["row_count"] = 0
        
        return file_info
    
    def _is_valid_spreadsheet(self, filename: str) -> bool:
        """Check if the file has a valid spreadsheet extension."""
        if not filename:
            return False
        
        valid_extensions = ['.xlsx', '.xls', '.csv']
        file_ext = os.path.splitext(filename)[1].lower()
        return file_ext in valid_extensions
    
    def list_spreadsheets(self) -> List[Dict[str, Any]]:
        """
        List all available spreadsheets.
        
        Returns:
            List of spreadsheet metadata
        """
        return [
            {
                "id": file_id,
                "filename": info["filename"],
                "upload_date": info["upload_date"],
                "sheet_count": info.get("sheet_count", 0),
                "size_bytes": info.get("size_bytes", 0)
            }
            for file_id, info in self.metadata.items()
        ]
    
    def get_spreadsheet_info(self, spreadsheet_id: str) -> Dict[str, Any]:
        """
        Get information about a specific spreadsheet.
        
        Args:
            spreadsheet_id: ID of the spreadsheet
            
        Returns:
            Spreadsheet metadata
            
        Raises:
            HTTPException: If the spreadsheet is not found
        """
        if spreadsheet_id not in self.metadata:
            raise HTTPException(status_code=404, detail=f"Spreadsheet with ID {spreadsheet_id} not found")
        
        return self.metadata[spreadsheet_id]
    
    def get_spreadsheet_path(self, spreadsheet_id: str) -> Path:
        """
        Get the file path for a spreadsheet.
        
        Args:
            spreadsheet_id: ID of the spreadsheet
            
        Returns:
            Path to the spreadsheet file
            
        Raises:
            HTTPException: If the spreadsheet is not found
        """
        if spreadsheet_id not in self.metadata:
            raise HTTPException(status_code=404, detail=f"Spreadsheet with ID {spreadsheet_id} not found")
        
        path = Path(self.metadata[spreadsheet_id]["storage_path"])
        if not path.exists():
            raise HTTPException(status_code=404, detail=f"Spreadsheet file not found on disk")
        
        return path 