import sys
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse, HTMLResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from pathlib import Path
from utils.validators import validate_file_extension
from config import UPLOAD_DIR, ALLOWED_EXTENSIONS
import zipfile
from io import BytesIO
import logging
import shutil
from datetime import datetime
import json
import io
from docx import Document
from PyPDF2 import PdfReader, PdfWriter
from docx_converter import DocxConverter
import uuid  # Add import for UUID generation

# Add imports for Excel and CSV parsing
import pandas as pd
import csv
from typing import Tuple, List, Dict, Any, Optional

# Get logger for this module
logger = logging.getLogger("upload_service")

router = APIRouter()
docx_converter = DocxConverter()

class FolderCreate(BaseModel):
    name: str
    parent_folder: Optional[str] = None

class FolderRename(BaseModel):
    old_name: str
    new_name: str
    parent_folder: Optional[str] = None

class FileRename(BaseModel):
    old_name: str
    new_name: str
    folder: str = ""

class SecurityUpdateRequest(BaseModel):
    filename: str
    security_classification: str

class BulkDeleteRequest(BaseModel):
    filenames: List[str]

class BulkDownloadRequest(BaseModel):
    filenames: List[str]
    current_folder: str = ""

class FileMoveRequest(BaseModel):
    source_paths: List[str]
    target_folder: str

class TabularPreviewResponse(BaseModel):
    """Response for tabular data preview (Excel, CSV)"""
    headers: List[str]
    rows: List[List[Any]]
    total_rows: int
    file_info: Dict[str, Any]

def create_metadata(
    file_path: Path,
    folder: str,
    document_id: str,
    security_classification: str = "SELECT A CLASSIFICATION",
    file_size: Optional[int] = None,
    converted_pdf: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a standardized metadata structure for a file.
    
    Args:
        file_path: Path object of the file
        folder: The folder path relative to UPLOAD_DIR
        document_id: Unique identifier for the document
        security_classification: Security classification level
        file_size: Size of the file in bytes
        converted_pdf: Name of converted PDF file if applicable
    
    Returns:
        Dict containing the metadata structure
    """
    relative_path = str(Path(folder) / file_path.name)
    file_type = get_file_type(file_path.name)
    
    # If file_size wasn't provided, try to get it from the file
    if file_size is None and file_path.exists():
        file_size = file_path.stat().st_size

    metadata = {
        # Original fields for backward compatibility
        "document_id": document_id,
        "security_classification": security_classification,
        "upload_date": datetime.now().isoformat(),
        "original_file": file_path.name,
        "converted_pdf": converted_pdf,
        
        # Enhanced file information
        "file_info": {
            "name": file_path.name,
            "type": file_type,
            "size": file_size,
            "path": relative_path,
            "extension": file_path.suffix.lower()
        },
        
        # Content information
        "content_info": {
            "total_pages": None,
            "has_conversion": bool(converted_pdf),
            "conversion_info": None,
            "content_type": file_type,
            "encoding": "utf-8" if file_type == "TXT" else None
        }
    }

    # Update conversion info if there's a converted PDF
    if converted_pdf:
        metadata["content_info"]["conversion_info"] = {
            "source_format": file_path.suffix.lower().lstrip('.'),
            "target_format": "pdf",
            "converted_file": converted_pdf,
            "conversion_date": datetime.now().isoformat()
        }

    # Try to extract PDF information
    pdf_path_to_check = None
    if file_path.suffix.lower() == '.pdf':
        pdf_path_to_check = file_path
    elif converted_pdf:
        pdf_path_to_check = file_path.parent / converted_pdf

    if pdf_path_to_check and pdf_path_to_check.exists():
        try:
            with open(pdf_path_to_check, 'rb') as pdf_file:
                pdf_reader = PdfReader(pdf_file)
                metadata["content_info"].update({
                    "total_pages": len(pdf_reader.pages),
                    "pdf_info": {
                        "version": pdf_reader.pdf_header,
                        "is_encrypted": pdf_reader.is_encrypted,
                        "metadata": pdf_reader.metadata if pdf_reader.metadata else None
                    }
                })
        except Exception as e:
            logger.error(f"Error reading PDF information: {str(e)}")

    return metadata

@router.post("/api/upload/create_folder/")
async def create_folder(folder_data: FolderCreate):
    folder_path = Path(UPLOAD_DIR) / (folder_data.parent_folder or "") / folder_data.name
    if folder_path.exists():
        raise HTTPException(status_code=400, detail="Folder already exists")
    folder_path.mkdir(parents=True, exist_ok=True)
    return {"message": f"Folder '{folder_data.name}' created successfully"}

@router.post("/api/upload/rename_folder/")
async def rename_folder(folder_data: FolderRename):
    old_path = Path(UPLOAD_DIR) / (folder_data.parent_folder or "") / folder_data.old_name
    new_path = Path(UPLOAD_DIR) / (folder_data.parent_folder or "") / folder_data.new_name
    if not old_path.exists():
        raise HTTPException(status_code=404, detail="Folder not found")
    if new_path.exists():
        raise HTTPException(status_code=400, detail="New folder name already exists")
    old_path.rename(new_path)
    return {"message": f"Folder renamed from '{folder_data.old_name}' to '{folder_data.new_name}' successfully"}

@router.post("/api/upload/rename_file/")
async def rename_file(file_rename: FileRename):
    logger.info(f"Received rename request: {file_rename}")
    logger.info(f"UPLOAD_DIR: {UPLOAD_DIR}")
    
    old_path = Path(UPLOAD_DIR) / file_rename.folder / file_rename.old_name
    new_path = Path(UPLOAD_DIR) / file_rename.folder / file_rename.new_name
    
    logger.info(f"Constructed old_path: {old_path}")
    logger.info(f"Constructed new_path: {new_path}")
    
    logger.info(f"Checking if old_path exists: {old_path.exists()}")
    logger.info(f"Checking if new_path exists: {new_path.exists()}")
    
    if not old_path.exists():
        logger.error(f"File not found: {old_path}")
        raise HTTPException(status_code=404, detail=f"File not found: {old_path}")
    if new_path.exists() and old_path != new_path:
        logger.error(f"New file name already exists: {new_path}")
        raise HTTPException(status_code=400, detail=f"New file name already exists: {new_path}")
    try:
        if old_path != new_path:
            # First, read the existing metadata if it exists
            old_metadata_path = old_path.with_suffix('.metadata')
            metadata = None
            if old_metadata_path.exists():
                try:
                    with open(old_metadata_path, 'r') as f:
                        metadata = json.load(f)
                except Exception as e:
                    logger.error(f"Error reading metadata file: {str(e)}")
            
            # Rename the actual file
            logger.info(f"Attempting to rename file from {old_path} to {new_path}")
            old_path.rename(new_path)
            logger.info(f"File renamed successfully")
            
            # Update and write metadata
            if metadata:
                # Update only current file references, preserve original_file
                # Do NOT update metadata["original_file"] as it should remain the original name
                metadata["file_info"]["name"] = file_rename.new_name
                metadata["file_info"]["path"] = str(Path(file_rename.folder) / file_rename.new_name)
                
                # If there's a converted PDF, update its reference
                if metadata.get("converted_pdf"):
                    old_pdf_name = metadata["converted_pdf"]
                    new_pdf_name = f"{Path(file_rename.new_name).stem}.pdf"
                    metadata["converted_pdf"] = new_pdf_name
                    
                    # Also rename the actual PDF file if it exists
                    old_pdf_path = old_path.parent / old_pdf_name
                    new_pdf_path = new_path.parent / new_pdf_name
                    if old_pdf_path.exists():
                        old_pdf_path.rename(new_pdf_path)
                        logger.info(f"Renamed converted PDF from {old_pdf_path} to {new_pdf_path}")
                
                # Write updated metadata to new location
                new_metadata_path = new_path.with_suffix('.metadata')
                with open(new_metadata_path, 'w') as f:
                    json.dump(metadata, f, indent=2)
                logger.info(f"Updated metadata written to {new_metadata_path}")
                logger.debug(f"Updated metadata content: {json.dumps(metadata, indent=2)}")
                
                # Delete old metadata file if it still exists
                if old_metadata_path.exists():
                    old_metadata_path.unlink()
                    logger.info("Old metadata file deleted")
            
        else:
            logger.info(f"Old and new paths are the same, no renaming needed")
        
        return {"message": f"File renamed from '{file_rename.old_name}' to '{file_rename.new_name}' successfully"}
    except Exception as e:
        logger.error(f"Error renaming file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred while renaming the file: {str(e)}")

@router.delete("/api/upload/delete_folder/{folder_path:path}")
async def delete_folder(folder_path: str):
    full_path = Path(UPLOAD_DIR) / folder_path
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Folder not found")
    shutil.rmtree(full_path)
    return {"message": f"Folder '{folder_path}' deleted successfully"}

@router.get("/api/upload/files/")
async def list_files(folder: Optional[str] = "", recursive: bool = False):
    base_folder = Path(UPLOAD_DIR) / folder if folder else Path(UPLOAD_DIR)
    if not base_folder.exists():
        raise HTTPException(status_code=404, detail="Folder not found")
    
    files_and_folders = []

    def scan_directory(path, relative_to=UPLOAD_DIR):
        items = []
        for item in path.iterdir():
            relative_path = item.relative_to(relative_to)
            if item.is_file():
                if item.suffix.lower() in ALLOWED_EXTENSIONS and not item.name.startswith('.'):
                    stats = item.stat()
                    # Read metadata file if it exists
                    metadata_path = item.with_suffix('.metadata')
                    security_classification = "SELECT A CLASSIFICATION"  # Default value
                    if metadata_path.exists():
                        try:
                            with open(metadata_path, 'r') as f:
                                metadata = json.load(f)
                                security_classification = metadata.get("security_classification", "SELECT A CLASSIFICATION")
                        except Exception as e:
                            logger.error(f"Error reading metadata file {metadata_path}: {str(e)}")

                    items.append({
                        "name": item.name,
                        "type": get_file_type(item.name),
                        "size": stats.st_size,
                        "uploadDate": datetime.fromtimestamp(stats.st_mtime).isoformat(),
                        "path": str(relative_path),
                        "securityClassification": security_classification,
                        "isFolder": False,
                        "id": str(relative_path)  # Add unique ID
                    })
            elif item.is_dir():
                items.append({
                    "name": item.name,
                    "type": "folder",
                    "path": str(relative_path),
                    "securityClassification": "N/A",
                    "isFolder": True,
                    "id": str(relative_path),  # Add unique ID
                    "size": 0,  # Add size (0 for folders)
                    "uploadDate": datetime.fromtimestamp(item.stat().st_mtime).isoformat()  # Add upload date for folders
                })
                if recursive:
                    items.extend(scan_directory(item, relative_to))
        return items

    return scan_directory(base_folder)

def get_file_type(file_name: str) -> str:
    extension = Path(file_name).suffix.lower()
    if extension == '.pdf':
        return 'PDF'
    elif extension == '.docx':
        return 'DOCX'
    elif extension == '.txt':
        return 'TXT'
    else:
        return 'Unknown'

@router.post("/api/upload/upload")
async def upload_files(files: List[UploadFile] = File(...), folder: Optional[str] = ""):
    uploaded_files = []
    errors = []
    
    for file in files:
        try:
            logger.info(f"Starting upload process for file: {file.filename} in folder: {folder}")
            folder_path = Path(UPLOAD_DIR) / folder
            folder_path.mkdir(parents=True, exist_ok=True)
            
            file_path = folder_path / file.filename
            content = await file.read()
            file_size = len(content)
            
            logger.info(f"File size: {file_size} bytes")
            
            # Write the file
            with file_path.open("wb") as buffer:
                buffer.write(content)
            logger.info(f"File written successfully to: {file_path}")

            # Generate a unique document ID
            document_id = str(uuid.uuid4())
            logger.info(f"Generated document ID: {document_id}")
            converted_pdf = None

            # Handle DOCX conversion if needed
            if file_path.suffix.lower() == '.docx':
                logger.info("DOCX file detected, attempting conversion to PDF")
                try:
                    pdf_path, error = docx_converter.convert_to_pdf(str(file_path))
                    if pdf_path:
                        final_pdf_path = folder_path / f"{file_path.stem}.pdf"
                        shutil.move(pdf_path, final_pdf_path)
                        converted_pdf = final_pdf_path.name
                        logger.info(f"Successfully converted {file.filename} to PDF: {final_pdf_path}")
                    else:
                        logger.error(f"Failed to convert {file.filename} to PDF: {error}")
                except Exception as e:
                    logger.error(f"Error during PDF conversion: {str(e)}")

            # Create metadata using helper function
            logger.info("Creating metadata structure")
            metadata = create_metadata(
                file_path=file_path,
                folder=folder,
                document_id=document_id,
                file_size=file_size,
                converted_pdf=converted_pdf
            )
            
            # Save the metadata
            metadata_file = file_path.with_suffix('.metadata')
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
            logger.info(f"Metadata saved to {metadata_file}")
            
            # Add to successful uploads
            uploaded_files.append({
                "filename": file.filename,
                "path": str(Path(folder) / file.filename),
                "document_id": document_id,
                "file_type": get_file_type(file.filename),
                "security_classification": "SELECT A CLASSIFICATION"
            })

        except Exception as e:
            logger.error(f"Error processing file {file.filename}: {str(e)}")
            errors.append({
                "filename": file.filename,
                "error": str(e)
            })
    
    # Return response with info about all uploaded files
    if uploaded_files:
        return {
            "status": "success" if not errors else "partial",
            "uploaded_files": uploaded_files,
            "errors": errors,
            "total_uploaded": len(uploaded_files),
            "total_failed": len(errors)
        }
    else:
        return JSONResponse(
            status_code=400,
            content={
                "status": "error",
                "message": "No files were uploaded successfully",
                "errors": errors
            }
        )

@router.delete("/api/upload/files/{filename:path}")
async def delete_file(filename: str):
    try:
        file_path = Path(UPLOAD_DIR) / filename
        metadata_path = file_path.with_suffix('.metadata')
        
        logger.debug(f"Attempting to delete file: {file_path}")
        
        # Read metadata to check for converted PDF
        converted_pdf = None
        if metadata_path.exists():
            try:
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                    converted_pdf = metadata.get("converted_pdf")
            except Exception as e:
                logger.error(f"Error reading metadata file: {str(e)}")

        # Delete the original file
        if file_path.exists():
            os.remove(file_path)
            logger.info(f"File {filename} deleted successfully")
            
            # Delete the converted PDF if it exists
            if converted_pdf:
                pdf_path = file_path.parent / converted_pdf
                if pdf_path.exists():
                    os.remove(pdf_path)
                    logger.info(f"Converted PDF {converted_pdf} deleted successfully")
            
            # Delete metadata file
            if metadata_path.exists():
                os.remove(metadata_path)
                logger.info(f"Metadata file for {filename} deleted successfully")
            
            return JSONResponse(content={"status": f"File {filename} and associated files deleted successfully"}, status_code=200)
        else:
            logger.warning(f"File {filename} not found")
            raise HTTPException(status_code=404, detail=f"File {filename} not found")
    except Exception as e:
        logger.error(f"Error deleting file {filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred while deleting the file: {str(e)}")

@router.post("/api/upload/bulk-delete/")
async def bulk_delete(request: BulkDeleteRequest):
    logger.info(f"Received request to delete files: {request.filenames}")
    deleted_items = []
    errors = []
    
    # Sort paths to ensure parent folders are deleted last
    sorted_paths = sorted(request.filenames, key=lambda x: len(Path(x).parts), reverse=True)
    
    for path in sorted_paths:
        try:
            file_path = Path(UPLOAD_DIR) / path
            logger.info(f"Processing path for deletion: {file_path}")
            
            if not file_path.exists():
                logger.warning(f"Path not found: {file_path}")
                continue
                
            if file_path.is_dir():
                logger.info(f"Deleting directory: {file_path}")
                shutil.rmtree(file_path)
                deleted_items.append(path)
            else:
                logger.info(f"Deleting file: {file_path}")
                file_path.unlink()
                # Delete metadata if exists
                metadata_path = file_path.with_suffix('.metadata')
                if metadata_path.exists():
                    metadata_path.unlink()
                deleted_items.append(path)
                
            logger.info(f"Successfully deleted: {path}")
            
        except Exception as e:
            error_msg = f"Error deleting {path}: {str(e)}"
            logger.error(error_msg)
            errors.append(error_msg)
    
    response_data = {
        "deleted_items": deleted_items,
        "errors": errors,
        "success_count": len(deleted_items),
        "error_count": len(errors)
    }
    
    if errors:
        logger.warning(f"Completed with {len(errors)} errors")
        return JSONResponse(
            content=response_data,
            status_code=207  # Multi-Status
        )
    
    logger.info(f"Successfully deleted {len(deleted_items)} items")
    return response_data

@router.post("/api/upload/bulk-download/")
async def bulk_download(request: BulkDownloadRequest):
    logger.info(f"Received request to download files: {request.filenames}")
    logger.info(f"Current folder: {request.current_folder}")
    zip_filename = "downloaded_files.zip"
    s = BytesIO()
    
    try:
        with zipfile.ZipFile(s, "w") as zf:
            for filename in request.filenames:
                file_path = Path(UPLOAD_DIR) / request.current_folder / filename
                if file_path.is_file():
                    # Skip metadata files
                    if not file_path.name.endswith('.metadata'):
                        arcname = str(file_path.relative_to(UPLOAD_DIR))
                        zf.write(file_path, arcname=arcname)
                        logger.info(f"Added file to zip: {arcname}")
                elif file_path.is_dir():
                    # If it's a directory, add all its contents recursively, excluding metadata files
                    for root, _, files in os.walk(file_path):
                        for file in files:
                            if not file.endswith('.metadata'):
                                file_full_path = Path(root) / file
                                arcname = str(file_full_path.relative_to(UPLOAD_DIR))
                                zf.write(file_full_path, arcname=arcname)
                                logger.info(f"Added file to zip: {arcname}")
                else:
                    logger.warning(f"Item not found: {filename}")
        
        s.seek(0)
        return StreamingResponse(
            iter([s.getvalue()]), 
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment;filename={zip_filename}"}
        )
    except Exception as e:
        logger.error(f"Error creating zip file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating zip file: {str(e)}")

@router.post("/api/upload/move-file/")
async def move_file(request: FileMoveRequest):
    target_path = Path(UPLOAD_DIR) / request.target_folder.lstrip('/')
    
    logger.info(f"Moving files to {target_path}")
    logger.info(f"UPLOAD_DIR: {UPLOAD_DIR}")
    logger.info(f"Request source_paths: {request.source_paths}")
    logger.info(f"Request target_folder: {request.target_folder}")
    
    # Create target folder if it doesn't exist
    if not target_path.exists():
        logger.info(f"Target folder does not exist, creating: {target_path}")
        target_path.mkdir(parents=True, exist_ok=True)
    
    # Track results for response
    results = {
        "successful": [],
        "failed": []
    }
    
    # Process each source path
    for file_path in request.source_paths:
        source_path = Path(UPLOAD_DIR) / file_path.lstrip('/')
        
        try:
            if not source_path.exists():
                logger.error(f"Source file not found: {source_path}")
                results["failed"].append({
                    "path": file_path,
                    "reason": f"Source file not found: {source_path}"
                })
                continue
            
            new_file_path = target_path / source_path.name
            if new_file_path.exists():
                logger.error(f"File already exists in target folder: {new_file_path}")
                results["failed"].append({
                    "path": file_path,
                    "reason": "A file with the same name already exists in the target folder"
                })
                continue
            
            # Move the main file
            shutil.move(str(source_path), str(new_file_path))
            logger.info(f"File moved successfully to {new_file_path}")
            
            # Handle metadata file if it exists
            metadata_path = source_path.with_suffix('.metadata')
            if metadata_path.exists():
                new_metadata_path = new_file_path.with_suffix('.metadata')
                
                # Read existing metadata
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                
                # Update file path in metadata
                if 'file_info' in metadata:
                    metadata['file_info']['path'] = str(Path(request.target_folder) / source_path.name)
                
                # Write updated metadata to new location
                with open(new_metadata_path, 'w') as f:
                    json.dump(metadata, f, indent=2)
                
                # Remove old metadata file
                metadata_path.unlink()
                logger.info(f"Metadata file moved and updated successfully")
                
                # Handle converted PDF if it exists
                if metadata.get('converted_pdf'):
                    pdf_path = source_path.parent / metadata['converted_pdf']
                    if pdf_path.exists():
                        new_pdf_path = target_path / metadata['converted_pdf']
                        shutil.move(str(pdf_path), str(new_pdf_path))
                        logger.info(f"Converted PDF moved successfully to {new_pdf_path}")
            
            results["successful"].append(file_path)
        
        except Exception as e:
            logger.error(f"Error moving file {file_path}: {str(e)}")
            results["failed"].append({
                "path": file_path,
                "reason": str(e)
            })
    
    # Return success if at least one file was moved successfully
    if results["successful"]:
        return {
            "message": f"Files moved successfully to {request.target_folder}",
            "results": results
        }
    else:
        raise HTTPException(status_code=500, detail={
            "message": "Failed to move any files",
            "results": results
        })

@router.post("/api/upload/update-security/")
async def update_security_classification(request: SecurityUpdateRequest):
    file_path = Path(UPLOAD_DIR) / request.filename
    metadata_path = file_path.with_suffix('.metadata')
    
    logger.info(f"Updating security classification for file: {file_path}")
    logger.info(f"New classification: {request.security_classification}")
    
    if not file_path.exists():
        logger.error(f"File not found: {file_path}")
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
    
    try:
        # Read existing metadata
        metadata = {}
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
        
        # If metadata exists but is in old format, convert it
        if metadata and "file_info" not in metadata:
            # Get the folder path relative to UPLOAD_DIR
            folder = str(file_path.parent.relative_to(UPLOAD_DIR))
            
            # Create new metadata structure while preserving existing document_id
            metadata = create_metadata(
                file_path=file_path,
                folder=folder,
                document_id=metadata.get("document_id", str(uuid.uuid4())),
                security_classification=request.security_classification,
                converted_pdf=metadata.get("converted_pdf")
            )
        else:
            # Just update the security classification
            metadata["security_classification"] = request.security_classification
        
        # Save updated metadata
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Security classification updated successfully for {request.filename}")
        return {"message": f"Security classification for {request.filename} updated to {request.security_classification}"}
    except Exception as e:
        logger.error(f"Error updating security classification: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating security classification: {str(e)}")

@router.get("/api/upload/files/{file_path:path}")
async def get_file(file_path: str):
    full_path = Path(UPLOAD_DIR) / file_path
    if not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(full_path)

@router.post("/api/upload/delete-pdf-page/")
async def delete_pdf_page(request: dict):
    file_path = request.get("file_path")
    page_number = request.get("page_number")
    
    if not file_path or page_number is None:
        raise HTTPException(status_code=400, detail="Both file_path and page_number are required")
    
    full_path = Path(UPLOAD_DIR) / file_path
    if not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Create a temporary file for the output
        temp_path = full_path.with_suffix('.tmp.pdf')
        
        # Open and process the PDF
        with open(full_path, 'rb') as file:
            reader = PdfReader(file)
            writer = PdfWriter()
            
            # Add all pages except the one to delete
            for i in range(len(reader.pages)):
                if i != page_number - 1:  # Page numbers start from 1, but index starts from 0
                    writer.add_page(reader.pages[i])
            
            # Write to temporary file first
            with open(temp_path, 'wb') as output_file:
                writer.write(output_file)
        
        # Replace original with new file
        temp_path.replace(full_path)
        
        return {"success": True, "message": f"Page {page_number} deleted successfully"}
    except Exception as e:
        # Clean up temp file if it exists
        if temp_path.exists():
            temp_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to delete page: {str(e)}")

@router.get("/api/upload/preview-docx/{file_path:path}")
async def preview_docx(file_path: str):
    try:
        full_path = Path(UPLOAD_DIR) / file_path
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="File not found")

        # Check metadata for converted PDF
        metadata_path = full_path.with_suffix('.metadata')
        converted_pdf = None
        
        if metadata_path.exists():
            try:
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                    converted_pdf = metadata.get("converted_pdf")
                    if converted_pdf:
                        pdf_path = full_path.parent / converted_pdf
                        if pdf_path.exists():
                            return FileResponse(pdf_path, media_type="application/pdf")
            except Exception as e:
                logger.error(f"Error reading metadata file: {str(e)}")

        # If no converted PDF exists or can't be found, convert on the fly
        pdf_path, error = docx_converter.convert_to_pdf(str(full_path))
        if pdf_path:
            try:
                # Get the folder path relative to UPLOAD_DIR
                folder = str(full_path.parent.relative_to(UPLOAD_DIR))
                
                # Create or update metadata with new conversion
                metadata = create_metadata(
                    file_path=full_path,
                    folder=folder,
                    document_id=metadata.get("document_id", str(uuid.uuid4())) if metadata else str(uuid.uuid4()),
                    converted_pdf=Path(pdf_path).name
                )
                
                with open(metadata_path, 'w') as f:
                    json.dump(metadata, f, indent=2)

                return FileResponse(pdf_path, media_type="application/pdf")
            finally:
                # Clean up temporary file after sending
                docx_converter.cleanup_temp_file(pdf_path)
        else:
            raise HTTPException(status_code=500, detail=f"Failed to convert DOCX to PDF: {error}")

    except Exception as e:
        logger.error(f"Error previewing DOCX file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/upload/preview-txt/{file_path:path}")
async def preview_txt(file_path: str):
    full_path = Path(UPLOAD_DIR) / file_path
    if not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        with open(full_path, 'r', encoding='utf-8') as file:
            content = file.read()
        html_content = f"<html><body><pre>{content}</pre></body></html>"
        return HTMLResponse(content=html_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error previewing TXT: {str(e)}")

@router.get("/api/upload/pdf-info/{file_path:path}")
async def get_pdf_info(file_path: str):
    full_path = Path(UPLOAD_DIR) / file_path
    if not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        with open(full_path, 'rb') as file:
            pdf = PdfReader(file)
            num_pages = len(pdf.pages)
            return {"num_pages": num_pages}
    except Exception as e:
        logger.error(f"Error getting PDF info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting PDF info: {str(e)}")

@router.get("/api/upload/preview-tabular/{file_path:path}", response_model=TabularPreviewResponse)
async def preview_tabular_file(file_path: str, max_rows: int = 5):
    """Preview Excel (.xlsx, .xls) or CSV files"""
    try:
        # Construct the full file path
        full_path = Path(UPLOAD_DIR) / file_path
        if not full_path.exists():
            raise HTTPException(status_code=404, detail=f"File {file_path} not found")
        
        file_size = full_path.stat().st_size
        last_modified = full_path.stat().st_mtime
        file_extension = full_path.suffix.lower()
        
        # Check if the file is a supported format
        if file_extension not in ['.xlsx', '.xls', '.csv']:
            raise HTTPException(status_code=400, 
                                detail=f"Unsupported file format. Only Excel (.xlsx, .xls) and CSV files are supported.")
        
        # Create file info dictionary
        file_info = {
            "name": full_path.name,
            "path": str(full_path.relative_to(UPLOAD_DIR)),
            "size": file_size,
            "size_formatted": format_file_size(file_size),
            "last_modified": last_modified,
            "last_modified_formatted": datetime.fromtimestamp(last_modified).strftime('%m/%d/%Y, %H:%M:%S'),
            "extension": file_extension
        }
        
        # Read the file based on its format
        if file_extension in ['.xlsx', '.xls']:
            # Excel file
            df = pd.read_excel(full_path, nrows=max_rows+1)  # +1 to check if there are more rows
            headers = df.columns.tolist()
            total_rows = len(pd.read_excel(full_path, usecols=[0]))  # Count rows efficiently
            rows = df.head(max_rows).values.tolist()
            
        elif file_extension == '.csv':
            # CSV file
            df = pd.read_csv(full_path, nrows=max_rows+1)
            headers = df.columns.tolist()
            
            # Count total rows efficiently without loading the entire file
            with open(full_path, 'r') as f:
                total_rows = sum(1 for _ in f) - 1  # -1 for header
            
            rows = df.head(max_rows).values.tolist()
        
        logger.info(f"Successfully previewed tabular file: {file_path}")
        return TabularPreviewResponse(
            headers=headers,
            rows=rows,
            total_rows=total_rows,
            file_info=file_info
        )
        
    except Exception as e:
        logger.error(f"Error previewing tabular file {file_path}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error previewing file: {str(e)}")

def format_file_size(size_bytes):
    """Format file size in bytes to human-readable format"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.2f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"