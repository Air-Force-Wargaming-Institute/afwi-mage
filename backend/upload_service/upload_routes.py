import sys
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse, HTMLResponse
from pydantic import BaseModel
from typing import List, Optional
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

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

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
    file_path: str
    target_folder: str

@router.post("/create_folder/")
async def create_folder(folder_data: FolderCreate):
    folder_path = Path(UPLOAD_DIR) / (folder_data.parent_folder or "") / folder_data.name
    if folder_path.exists():
        raise HTTPException(status_code=400, detail="Folder already exists")
    folder_path.mkdir(parents=True, exist_ok=True)
    return {"message": f"Folder '{folder_data.name}' created successfully"}

@router.post("/rename_folder/")
async def rename_folder(folder_data: FolderRename):
    old_path = Path(UPLOAD_DIR) / (folder_data.parent_folder or "") / folder_data.old_name
    new_path = Path(UPLOAD_DIR) / (folder_data.parent_folder or "") / folder_data.new_name
    if not old_path.exists():
        raise HTTPException(status_code=404, detail="Folder not found")
    if new_path.exists():
        raise HTTPException(status_code=400, detail="New folder name already exists")
    old_path.rename(new_path)
    return {"message": f"Folder renamed from '{folder_data.old_name}' to '{folder_data.new_name}' successfully"}

@router.post("/rename_file/")
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
            logger.info(f"Attempting to rename file from {old_path} to {new_path}")
            old_path.rename(new_path)
            logger.info(f"File renamed successfully")
            
            # Rename metadata file if it exists
            old_metadata_path = old_path.with_suffix('.metadata')
            logger.info(f"Checking for metadata file: {old_metadata_path}")
            if old_metadata_path.exists():
                new_metadata_path = new_path.with_suffix('.metadata')
                logger.info(f"Renaming metadata file from {old_metadata_path} to {new_metadata_path}")
                old_metadata_path.rename(new_metadata_path)
                logger.info(f"Metadata file renamed successfully")
        else:
            logger.info(f"Old and new paths are the same, no renaming needed")
        
        return {"message": f"File renamed from '{file_rename.old_name}' to '{file_rename.new_name}' successfully"}
    except Exception as e:
        logger.error(f"Error renaming file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred while renaming the file: {str(e)}")

@router.delete("/delete_folder/{folder_path:path}")
async def delete_folder(folder_path: str):
    full_path = Path(UPLOAD_DIR) / folder_path
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Folder not found")
    shutil.rmtree(full_path)
    return {"message": f"Folder '{folder_path}' deleted successfully"}

@router.get("/files/")
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
                        "securityClassification": security_classification
                    })
            elif item.is_dir():
                items.append({
                    "name": item.name,
                    "type": "folder",
                    "path": str(relative_path),
                    "securityClassification": "N/A"
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

@router.post("/upload/")
async def upload_files(file: UploadFile = File(...), folder: Optional[str] = ""):
    try:
        folder_path = Path(UPLOAD_DIR) / folder
        folder_path.mkdir(parents=True, exist_ok=True)
        
        file_path = folder_path / file.filename
        content = await file.read()
        
        # Write the file
        with file_path.open("wb") as buffer:
            buffer.write(content)

        # Generate a unique document ID
        document_id = str(uuid.uuid4())
        
        metadata = {
            "document_id": document_id,
            "security_classification": "SELECT A CLASSIFICATION",
            "upload_date": datetime.now().isoformat(),
            "original_file": file.filename,
            "converted_pdf": None
        }

        # If file is DOCX, convert to PDF
        if file_path.suffix.lower() == '.docx':
            try:
                pdf_path, error = docx_converter.convert_to_pdf(str(file_path))
                if pdf_path:
                    # Move the converted PDF to the same folder as the DOCX
                    final_pdf_path = folder_path / f"{file_path.stem}.pdf"
                    shutil.move(pdf_path, final_pdf_path)
                    metadata["converted_pdf"] = final_pdf_path.name
                    logger.info(f"Successfully converted {file.filename} to PDF: {final_pdf_path}")
                else:
                    logger.error(f"Failed to convert {file.filename} to PDF: {error}")
            except Exception as e:
                logger.error(f"Error during PDF conversion: {str(e)}")
                # Continue with upload even if conversion fails
        
        # Create metadata file
        metadata_path = file_path.with_suffix('.metadata')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
            
        logger.info(f"Created metadata file at {metadata_path}")

        return JSONResponse(
            content={
                "filename": file.filename, 
                "document_id": document_id,
                "status": "File uploaded successfully",
                "security_classification": "SELECT A CLASSIFICATION",
                "converted_pdf": metadata["converted_pdf"]
            }, 
            status_code=200
        )
    except Exception as e:
        logger.error(f"Unexpected error during file upload: {str(e)}")
        return JSONResponse(
            content={"detail": f"An unexpected error occurred: {str(e)}"}, 
            status_code=500
        )

@router.delete("/files/{filename:path}")
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

@router.post("/bulk-delete/")
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

@router.post("/bulk-download/")
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

@router.post("/move-file/")
async def move_file(request: FileMoveRequest):
    source_path = Path(UPLOAD_DIR) / request.file_path
    target_path = Path(UPLOAD_DIR) / request.target_folder.lstrip('/')  # Remove leading slash
    
    logger.info(f"Moving file from {source_path} to {target_path}")
    logger.info(f"UPLOAD_DIR: {UPLOAD_DIR}")
    logger.info(f"Request file_path: {request.file_path}")
    logger.info(f"Request target_folder: {request.target_folder}")
    
    if not source_path.exists():
        logger.error(f"Source file not found: {source_path}")
        raise HTTPException(status_code=404, detail=f"Source file not found: {source_path}")
    
    if not target_path.exists():
        logger.error(f"Target folder not found: {target_path}")
        # Create the target folder if it doesn't exist
        target_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Created target folder: {target_path}")
    
    new_file_path = target_path / source_path.name
    if new_file_path.exists():
        logger.error(f"File already exists in target folder: {new_file_path}")
        raise HTTPException(status_code=400, detail="A file with the same name already exists in the target folder")
    
    try:
        shutil.move(str(source_path), str(new_file_path))
        logger.info(f"File moved successfully to {new_file_path}")
        return {"message": f"File moved successfully to {request.target_folder}"}
    except Exception as e:
        logger.error(f"Error moving file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred while moving the file: {str(e)}")

@router.post("/update-security/")
async def update_security_classification(request: SecurityUpdateRequest):
    file_path = Path(UPLOAD_DIR) / request.filename
    metadata_path = file_path.with_suffix('.metadata')
    
    logger.info(f"Updating security classification for file: {file_path}")
    logger.info(f"New classification: {request.security_classification}")
    
    if not file_path.exists():
        logger.error(f"File not found: {file_path}")
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
    
    try:
        metadata = {}
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
        
        metadata['security_classification'] = request.security_classification
        
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f)
        
        logger.info(f"Security classification updated successfully for {request.filename}")
        return {"message": f"Security classification for {request.filename} updated to {request.security_classification}"}
    except Exception as e:
        logger.error(f"Error updating security classification: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating security classification: {str(e)}")

@router.get("/files/{file_path:path}")
async def get_file(file_path: str):
    full_path = Path(UPLOAD_DIR) / file_path
    if not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(full_path)

@router.post("/delete-pdf-page/")
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

@router.get("/preview-docx/{file_path:path}")
async def preview_docx(file_path: str):
    try:
        full_path = Path(UPLOAD_DIR) / file_path
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="File not found")

        # Check metadata for converted PDF
        metadata_path = full_path.with_suffix('.metadata')
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
                # Update metadata with new conversion
                metadata = {
                    "security_classification": "SELECT A CLASSIFICATION",
                    "upload_date": datetime.now().isoformat(),
                    "original_file": full_path.name,
                    "converted_pdf": Path(pdf_path).name
                }
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

@router.get("/preview-txt/{file_path:path}")
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

@router.get("/pdf-info/{file_path:path}")
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