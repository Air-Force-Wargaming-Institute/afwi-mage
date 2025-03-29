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
        
        # Log detailed path information
        logger.info(f"SpreadsheetManager initialized with uploads directory: {self.upload_dir} (absolute: {os.path.abspath(self.upload_dir)})")
        logger.info(f"Looking for metadata file at: {self.metadata_file} (absolute: {os.path.abspath(self.metadata_file)})")
        
        # Load metadata if exists, otherwise initialize empty
        self.metadata = self._load_metadata()
        logger.info(f"Loaded {len(self.metadata)} spreadsheet records from metadata")
        
        # Validate metadata against actual files
        self._validate_metadata_against_files()
    
    def _validate_metadata_against_files(self):
        """Validate metadata against actual files in the directory."""
        logger.info("Validating metadata against actual files in the upload directory")
        
        # Get all valid spreadsheet files in the upload directory
        actual_files = []
        for filename in os.listdir(self.upload_dir):
            file_path = os.path.join(self.upload_dir, filename)
            if os.path.isfile(file_path):
                # Check if it's a valid spreadsheet file
                ext = os.path.splitext(filename)[1].lower()
                if ext in ['.xlsx', '.xls', '.csv']:
                    actual_files.append(filename)
        
        logger.info(f"Found {len(actual_files)} valid spreadsheet files in upload directory")
        
        # Check for files in directory but not in metadata
        files_not_in_metadata = []
        for filename in actual_files:
            # Skip metadata.json itself
            if filename == "metadata.json":
                continue
                
            # Check if file exists in metadata
            file_id = None
            for id, info in self.metadata.items():
                if os.path.basename(info.get("storage_path", "")) == filename:
                    file_id = id
                    break
            
            if not file_id:
                files_not_in_metadata.append(filename)
        
        logger.info(f"Found {len(files_not_in_metadata)} files not in metadata: {', '.join(files_not_in_metadata) if files_not_in_metadata else 'none'}")
        
        # Check for metadata entries without files
        missing_files = []
        for id, info in self.metadata.items():
            storage_path = info.get("storage_path")
            if storage_path:
                if not os.path.exists(storage_path):
                    missing_files.append((id, storage_path))
        
        logger.info(f"Found {len(missing_files)} metadata entries without files: {', '.join([id for id, _ in missing_files]) if missing_files else 'none'}")
    
    def _load_metadata(self) -> Dict[str, Dict[str, Any]]:
        """Load metadata from file or initialize if not exists."""
        if not os.path.exists(self.metadata_file):
            logger.warning(f"Metadata file does not exist at {self.metadata_file}, looking in alternative locations")
            
            # Try looking for metadata.json in common alternative locations
            alt_locations = [
                # Docker default path
                Path("/app/data/workbench/uploads/metadata.json"),
                # Local development paths
                Path("./data/workbench/uploads/metadata.json"),
                Path("../data/workbench/uploads/metadata.json"),
                # Absolute paths from environment
                Path(os.environ.get("WORKBENCH_UPLOADS_DIR", "")).joinpath("metadata.json") if os.environ.get("WORKBENCH_UPLOADS_DIR") else None
            ]
            
            # Filter out None values
            alt_locations = [loc for loc in alt_locations if loc is not None]
            
            logger.info(f"Checking alternative locations: {[str(loc) for loc in alt_locations]}")
            
            metadata_found = False
            for alt_path in alt_locations:
                if os.path.exists(alt_path):
                    logger.info(f"Found metadata at alternative location: {alt_path}")
                    try:
                        with open(alt_path, 'r') as f:
                            metadata = json.load(f)
                            # Copy the metadata file to the current location
                            self._save_metadata_to_path(metadata, self.metadata_file)
                            logger.info(f"Copied metadata from {alt_path} to {self.metadata_file}")
                            metadata_found = True
                            return metadata
                    except Exception as e:
                        logger.warning(f"Error reading alternative metadata file: {str(e)}")
            
            # Last attempt: check if uploads directory has any spreadsheet files we can scan
            if not metadata_found:
                try:
                    logger.info(f"No metadata file found, scanning uploads directory for spreadsheet files")
                    metadata = self._scan_directory_for_metadata()
                    if metadata:
                        logger.info(f"Created metadata from directory scan with {len(metadata)} entries")
                        self._save_metadata_to_path(metadata, self.metadata_file)
                        return metadata
                except Exception as e:
                    logger.warning(f"Error scanning directory for metadata: {str(e)}")
            
            # If we still didn't find any metadata, create an empty metadata file
            if not metadata_found:
                logger.warning("No metadata file found in any location, initializing empty file")
                empty_metadata = {}
                self._save_metadata_to_path(empty_metadata, self.metadata_file)
                return empty_metadata
        
        try:
            with open(self.metadata_file, 'r') as f:
                metadata = json.load(f)
                logger.info(f"Successfully loaded metadata with {len(metadata)} records")
                return metadata
        except json.JSONDecodeError as e:
            logger.warning(f"Invalid JSON in metadata file: {str(e)}, initializing empty")
            empty_metadata = {}
            self._save_metadata_to_path(empty_metadata, self.metadata_file)
            return empty_metadata
        except FileNotFoundError as e:
            # This shouldn't happen since we checked above, but just in case
            logger.warning(f"Metadata file suddenly disappeared: {str(e)}, initializing empty")
            empty_metadata = {}
            self._save_metadata_to_path(empty_metadata, self.metadata_file)
            return empty_metadata
    
    def _scan_directory_for_metadata(self) -> Dict[str, Dict[str, Any]]:
        """Scan the uploads directory for spreadsheet files and create metadata."""
        metadata = {}
        
        try:
            # Get all files in the directory
            files = os.listdir(self.upload_dir)
            
            # Filter for valid spreadsheet files
            for filename in files:
                file_path = os.path.join(self.upload_dir, filename)
                if os.path.isfile(file_path) and self._is_valid_spreadsheet(filename):
                    # Generate a unique ID
                    file_id = str(uuid.uuid4())
                    
                    # Get file info
                    file_info = {
                        "id": file_id,
                        "filename": filename,
                        "size_bytes": os.path.getsize(file_path),
                        "upload_date": datetime.fromtimestamp(os.path.getctime(file_path)).isoformat(),
                        "storage_path": str(file_path)
                    }
                    
                    # Try to extract additional info
                    try:
                        if filename.lower().endswith('.csv'):
                            # For CSV, we just have one sheet
                            file_info["sheet_count"] = 1
                            file_info["sheets"] = ["Sheet1"]
                        else:  # Excel files
                            # For Excel, get sheet names
                            excel_file = pd.ExcelFile(file_path)
                            sheets = excel_file.sheet_names
                            
                            file_info["sheet_count"] = len(sheets)
                            file_info["sheets"] = sheets
                    except Exception as e:
                        logger.warning(f"Error extracting info from {filename}: {str(e)}")
                        file_info["sheet_count"] = 0
                        file_info["sheets"] = []
                    
                    # Add to metadata
                    metadata[file_id] = file_info
            
            logger.info(f"Scanned directory and found {len(metadata)} spreadsheet files")
        except Exception as e:
            logger.error(f"Error scanning directory: {str(e)}")
        
        return metadata
    
    def _save_metadata_to_path(self, metadata: Dict[str, Dict[str, Any]], path: Path) -> None:
        """Save metadata to a specific path."""
        # Ensure directory exists
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        # Log the absolute path
        logger.info(f"Saving metadata to path: {path} (absolute: {os.path.abspath(path)})")
        
        # Save the metadata
        try:
            with open(path, 'w') as f:
                json.dump(metadata, f, indent=2)
            logger.info(f"Successfully saved metadata with {len(metadata)} entries")
        except Exception as e:
            logger.error(f"Error saving metadata to {path}: {str(e)}")
            # Try to save to an alternative location
            try:
                alt_path = os.path.join(os.getcwd(), "metadata.json")
                logger.info(f"Attempting to save metadata to alternative location: {alt_path}")
                with open(alt_path, 'w') as f:
                    json.dump(metadata, f, indent=2)
                logger.info(f"Successfully saved metadata to alternative location: {alt_path}")
            except Exception as alt_e:
                logger.error(f"Failed to save metadata to alternative location: {str(alt_e)}")
    
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
        
        # Get current time for timestamps
        current_time = datetime.now().isoformat()
        
        # Add additional metadata
        file_info["id"] = file_id
        file_info["description"] = description
        file_info["original_filename"] = filename
        file_info["modified_filename"] = filename  # Initially same as original filename
        file_info["upload_date"] = current_time
        file_info["modified_date"] = current_time  # Initially same as upload date
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
                
                # Store sheet-specific data in a sheets_metadata dictionary
                file_info["sheets_metadata"] = {
                    "Sheet1": {
                        "columns": df.columns.tolist(),
                        "row_count": file_info["row_count"]
                    }
                }
                
            else:  # Excel files
                # For Excel, get sheet names
                excel_file = pd.ExcelFile(file_path)
                sheets = excel_file.sheet_names
                
                file_info["sheet_count"] = len(sheets)
                file_info["sheets"] = sheets
                
                # Store sheet-specific metadata
                sheets_metadata = {}
                total_rows = 0
                
                # Process each sheet to get its metadata
                for sheet_name in sheets:
                    try:
                        # Get sample data from sheet
                        df = pd.read_excel(file_path, sheet_name=sheet_name, nrows=5)
                        
                        # Count rows for this sheet
                        full_df = pd.read_excel(file_path, sheet_name=sheet_name)
                        sheet_row_count = len(full_df)
                        
                        # Store sheet-specific metadata
                        sheets_metadata[sheet_name] = {
                            "columns": df.columns.tolist(),
                            "row_count": sheet_row_count
                        }
                        
                        # Add to total row count
                        total_rows += sheet_row_count
                        
                        # For the first sheet, also store in the top-level for backward compatibility
                        if sheet_name == sheets[0]:
                            file_info["columns"] = df.columns.tolist()
                            file_info["row_count"] = sheet_row_count
                    except Exception as e:
                        logger.warning(f"Error extracting data from sheet {sheet_name}: {str(e)}")
                        sheets_metadata[sheet_name] = {
                            "columns": [],
                            "row_count": 0,
                            "error": str(e)
                        }
                
                # Store the full sheets metadata
                file_info["sheets_metadata"] = sheets_metadata
                
        except Exception as e:
            logger.error(f"Error extracting file info: {str(e)}")
            file_info["error"] = str(e)
            file_info["sheet_count"] = 0
            file_info["sheets"] = []
            file_info["columns"] = []
            file_info["row_count"] = 0
            file_info["sheets_metadata"] = {}
        
        return file_info
    
    def _is_valid_spreadsheet(self, filename: str) -> bool:
        """Check if the file has a valid spreadsheet extension."""
        if not filename:
            logger.warning("Empty filename provided for validation")
            return False
        
        valid_extensions = ['.xlsx', '.xls', '.csv']
        file_ext = os.path.splitext(filename)[1].lower()
        
        logger.info(f"Validating file: {filename}")
        logger.info(f"File extension: {file_ext}")
        logger.info(f"Valid extensions: {valid_extensions}")
        
        is_valid = file_ext.lower() in valid_extensions
        logger.info(f"Validation result: {is_valid}")
        
        return is_valid
    
    def list_spreadsheets(self) -> List[Dict[str, Any]]:
        """
        List all available spreadsheets.
        
        Returns:
            List of spreadsheet metadata
        """
        # If metadata is empty, try importing from provided metadata file
        if not self.metadata:
            logger.warning("Metadata is empty, attempting to re-initialize from default locations")
            
            # Try each of these potential locations
            potential_paths = [
                "data/workbench/uploads/metadata.json",
                "/app/data/workbench/uploads/metadata.json",
                "./data/workbench/uploads/metadata.json",
                "../data/workbench/uploads/metadata.json"
            ]
            
            for path in potential_paths:
                if self.import_metadata_from_path(path):
                    break
            
            # If still empty, ensure we have at least an empty metadata file
            if not self.metadata and not os.path.exists(self.metadata_file):
                logger.warning(f"Still no metadata found, creating empty metadata file at {self.metadata_file}")
                self._save_metadata_to_path({}, self.metadata_file)

        return [
            {
                "id": file_id,
                "filename": info.get("modified_filename", info.get("filename", "")),  # Use modified_filename if available
                "original_filename": info.get("original_filename", info.get("filename", "")),  # Include original filename
                "upload_date": info.get("upload_date", ""),
                "modified_date": info.get("modified_date", info.get("upload_date", "")),  # Include modified date
                "sheet_count": info.get("sheet_count", 0),
                "size_bytes": info.get("size_bytes", 0)
            }
            for file_id, info in self.metadata.items()
        ]
    
    def import_metadata_from_path(self, metadata_path: str) -> bool:
        """
        Import metadata from a specific file path.
        
        Args:
            metadata_path: Path to the metadata.json file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info(f"Attempting to import metadata from {metadata_path}")
            
            # Check if the file exists
            if not os.path.exists(metadata_path):
                logger.warning(f"Metadata file not found at {metadata_path}")
                return False
                
            # Load the metadata
            with open(metadata_path, 'r') as f:
                imported_metadata = json.load(f)
                
            if not imported_metadata:
                logger.warning(f"No metadata found in {metadata_path}")
                return False
                
            # Update our metadata
            self.metadata.update(imported_metadata)
            
            # Save to our location
            self._save_metadata()
            
            logger.info(f"Successfully imported {len(imported_metadata)} records from {metadata_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error importing metadata from {metadata_path}: {str(e)}")
            return False
    
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
        
    def delete_spreadsheet(self, spreadsheet_id: str) -> Dict[str, Any]:
        """
        Delete a spreadsheet file and remove its metadata.
        
        Args:
            spreadsheet_id: ID of the spreadsheet to delete
            
        Returns:
            Deleted spreadsheet information
            
        Raises:
            HTTPException: If the spreadsheet is not found
        """
        logger.info(f"Deleting spreadsheet with ID: {spreadsheet_id}")
        
        # Check if spreadsheet exists in metadata
        if spreadsheet_id not in self.metadata:
            raise HTTPException(status_code=404, detail=f"Spreadsheet with ID {spreadsheet_id} not found")
        
        # Get info about spreadsheet before deletion
        spreadsheet_info = self.metadata[spreadsheet_id].copy()
        
        # Get path to file
        file_path = Path(spreadsheet_info["storage_path"])
        
        # Delete the file from disk
        if file_path.exists():
            try:
                os.remove(file_path)
                logger.info(f"Successfully deleted file: {file_path}")
            except Exception as e:
                logger.error(f"Error deleting file {file_path}: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
        else:
            logger.warning(f"File does not exist on disk: {file_path}")
        
        # Remove spreadsheet from metadata
        del self.metadata[spreadsheet_id]
        
        # Save updated metadata
        self._save_metadata()
        logger.info(f"Removed spreadsheet {spreadsheet_id} from metadata")
        
        return {
            "id": spreadsheet_id,
            "filename": spreadsheet_info.get("filename", "unknown"),
            "message": "Spreadsheet deleted successfully"
        }
    
    def update_spreadsheet_metadata(self, spreadsheet_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update metadata for a spreadsheet.
        
        Args:
            spreadsheet_id: ID of the spreadsheet to update
            updates: Dictionary of metadata fields to update
            
        Returns:
            Updated spreadsheet information
        """
        if spreadsheet_id not in self.metadata:
            raise HTTPException(status_code=404, detail=f"Spreadsheet with ID {spreadsheet_id} not found")
        
        # Get the current metadata
        spreadsheet_info = self.metadata[spreadsheet_id]
        
        # Update metadata fields
        for key, value in updates.items():
            # Don't allow changing certain fields
            if key in ["id", "storage_path", "original_filename", "upload_date"]:
                continue
                
            spreadsheet_info[key] = value
        
        # Always update modified_date when metadata is changed
        spreadsheet_info["modified_date"] = datetime.now().isoformat()
        
        # Save the updated metadata
        self.metadata[spreadsheet_id] = spreadsheet_info
        self._save_metadata()
        
        return spreadsheet_info 