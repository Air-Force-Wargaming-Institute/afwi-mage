from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Body, BackgroundTasks
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from typing import List, Optional, Dict, Any
from pathlib import Path
import shutil
import json
from datetime import datetime
import logging
import asyncio
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
import os
import zipfile
from io import BytesIO
import subprocess
from uuid import uuid4  # Add import for UUID generation

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Constants - Use absolute path for container
UPLOAD_DIR = Path("/app/data/uploads")
TEMP_DIR = Path("/app/data/temp_conversions")
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.txt', '.md', '.json'}

logger.info(f"Upload directory set to: {UPLOAD_DIR}")
logger.info(f"Current working directory: {os.getcwd()}")

# Ensure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Log directory permissions
try:
    st = os.stat(UPLOAD_DIR)
    logger.info(f"Upload directory permissions: {oct(st.st_mode)}")
    logger.info(f"Upload directory owner: {st.st_uid}")
    logger.info(f"Upload directory group: {st.st_gid}")
except Exception as e:
    logger.error(f"Error checking directory permissions: {e}")

class FolderRequest(BaseModel):
    name: str
    parent_path: Optional[str] = ""
    
    model_config = ConfigDict(populate_by_name=True)

    @field_validator('name', mode='before')
    def validate_folder_name(cls, v):
        if not v or v.isspace():
            raise ValueError("Folder name cannot be empty")
        if any(c in v for c in '\\/:*?"<>|'):
            raise ValueError("Folder name contains invalid characters")
        return v

class DocumentResponse(BaseModel):
    id: str = Field(..., description="Document identifier")
    name: str = Field(..., description="Document name")
    type: str = Field(..., description="Document type or 'folder' for directories")
    size: int = Field(..., description="Document size in bytes")
    uploadDate: str = Field(..., description="Document upload date")
    path: str = Field(..., description="Document path relative to upload directory")
    isFolder: bool = Field(False, description="Whether this item is a folder")
    parentPath: str = Field("", description="Parent folder path")
    securityClassification: str = Field("Unclassified", description="Security classification of the document")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "documents/report.pdf",
                "name": "report.pdf",
                "type": "PDF",
                "size": 1024,
                "uploadDate": "2024-01-19T12:00:00",
                "path": "documents/report.pdf",
                "isFolder": False,
                "parentPath": "documents",
                "securityClassification": "Unclassified"
            }
        },
        populate_by_name=True
    )

# Progress tracking
operation_progress = {}

class BulkOperationStatus(BaseModel):
    operation_id: str
    total_items: int
    processed_items: int
    status: str
    errors: List[str] = []
    completed: bool = False
    
    model_config = ConfigDict(populate_by_name=True)

class BulkDeleteRequest(BaseModel):
    documentIds: List[str]
    
    model_config = ConfigDict(populate_by_name=True)
    
    @field_validator('documentIds', mode='before')
    def validate_document_ids(cls, v):
        if not v:
            raise ValueError("Document IDs list cannot be empty")
        if len(v) > 100:  # Limit batch size
            raise ValueError("Maximum 100 documents can be processed in one batch")
        return v

class BulkDownloadRequest(BaseModel):
    documentIds: List[str]
    include_folders: bool = False
    preserve_structure: bool = True
    
    model_config = ConfigDict(populate_by_name=True)
    
    @field_validator('documentIds', mode='before')
    def validate_document_ids(cls, v):
        if not v:
            raise ValueError("Document IDs list cannot be empty")
        if len(v) > 100:  # Limit batch size
            raise ValueError("Maximum 100 documents can be processed in one batch")
        return v

def generate_operation_id() -> str:
    return f"op_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.urandom(4).hex()}"

async def process_bulk_delete(operation_id: str, document_ids: List[str]):
    """Background task for bulk delete operation"""
    progress = operation_progress[operation_id]
    total = len(document_ids)
    
    for idx, doc_id in enumerate(document_ids, 1):
        try:
            file_path = UPLOAD_DIR / doc_id
            if file_path.exists():
                if file_path.is_file():
                    file_path.unlink()
                    progress.processed_items += 1
                elif file_path.is_dir() and not any(file_path.iterdir()):
                    file_path.rmdir()
                    progress.processed_items += 1
                else:
                    progress.errors.append(f"Cannot delete non-empty directory: {doc_id}")
            else:
                progress.errors.append(f"File not found: {doc_id}")
        except Exception as e:
            progress.errors.append(f"Error deleting {doc_id}: {str(e)}")
        
        progress.status = f"Processed {idx}/{total} items"
        await asyncio.sleep(0.1)  # Prevent blocking
    
    progress.completed = True
    progress.status = "Completed" if not progress.errors else "Completed with errors"

async def create_zip_with_progress(operation_id: str, document_ids: List[str], include_folders: bool, preserve_structure: bool) -> BytesIO:
    """Create ZIP file with progress tracking"""
    progress = operation_progress[operation_id]
    total = len(document_ids)
    zip_buffer = BytesIO()
    
    try:
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for idx, doc_id in enumerate(document_ids, 1):
                try:
                    file_path = UPLOAD_DIR / doc_id
                    if not file_path.exists():
                        progress.errors.append(f"File not found: {doc_id}")
                        continue

                    if file_path.is_file():
                        # Determine the path within the ZIP file
                        if preserve_structure:
                            zip_path = doc_id  # Preserve full path structure
                        else:
                            zip_path = file_path.name  # Just the filename
                        
                        zip_file.write(file_path, zip_path)
                        progress.processed_items += 1
                    
                    elif include_folders and file_path.is_dir():
                        for sub_file in file_path.rglob("*"):
                            if sub_file.is_file():
                                rel_path = sub_file.relative_to(UPLOAD_DIR)
                                if preserve_structure:
                                    zip_path = str(rel_path)
                                else:
                                    zip_path = sub_file.name
                                zip_file.write(sub_file, zip_path)
                                progress.processed_items += 1
                
                except Exception as e:
                    progress.errors.append(f"Error processing {doc_id}: {str(e)}")
                
                progress.status = f"Processed {idx}/{total} items"
                await asyncio.sleep(0.1)  # Prevent blocking
        
        zip_buffer.seek(0)
        return zip_buffer
    except Exception as e:
        progress.errors.append(f"Error creating ZIP: {str(e)}")
        raise
    finally:
        progress.completed = True
        progress.status = "Completed" if not progress.errors else "Completed with errors"

async def convert_docx_to_pdf(docx_path: Path) -> Optional[Path]:
    """
    Convert a DOCX file to PDF using LibreOffice.
    Returns the path to the converted PDF file, or None if conversion fails.
    """
    try:
        logger.info(f"Starting conversion of {docx_path}")
        
        # LibreOffice will create the PDF with the same name as the input file
        expected_pdf_name = docx_path.stem + '.pdf'
        temp_pdf_path = TEMP_DIR / expected_pdf_name
        final_pdf_path = docx_path.with_suffix('.pdf')
        
        # Construct the conversion command
        cmd = [
            "soffice",
            "--headless",
            "--convert-to", "pdf",
            "--outdir", str(TEMP_DIR),
            str(docx_path)
        ]
        
        logger.info(f"Running command: {' '.join(cmd)}")
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            logger.error(f"Conversion failed with return code {process.returncode}")
            logger.error(f"stderr: {stderr.decode()}")
            logger.error(f"stdout: {stdout.decode()}")
            return None
            
        # Check if the converted file exists
        if temp_pdf_path.exists():
            # Move the converted file to its final location
            shutil.move(str(temp_pdf_path), str(final_pdf_path))
            logger.info(f"Successfully converted {docx_path} to {final_pdf_path}")
            return final_pdf_path
        else:
            logger.error(f"Conversion completed but output file not found at {temp_pdf_path}")
            # List files in temp directory for debugging
            logger.error(f"Files in temp directory: {list(TEMP_DIR.glob('*'))}")
            return None
            
    except Exception as e:
        logger.error(f"Error during conversion: {str(e)}")
        return None

@router.get("/api/core/documents")
async def list_documents(path: Optional[str] = "") -> List[DocumentResponse]:
    """List all documents and folders in the specified path"""
    try:
        current_path = UPLOAD_DIR / path if path else UPLOAD_DIR
        logger.info(f"Scanning directory: {current_path}")
        
        if not current_path.exists():
            raise HTTPException(status_code=404, detail="Path not found")
        
        items = []
        # Keep track of files to exclude (original DOCX files that have been converted)
        files_to_exclude = set()
        
        # First pass: identify files to exclude by checking metadata
        for item_path in current_path.iterdir():
            if item_path.is_file() and item_path.suffix.lower() == '.metadata':
                try:
                    with open(item_path, 'r') as f:
                        metadata = json.load(f)
                        if metadata.get("converted_pdf"):
                            # If this is a converted file, exclude the original DOCX
                            original_file = metadata.get("original_file")
                            if original_file:
                                files_to_exclude.add(current_path / original_file)
                except Exception as e:
                    logger.error(f"Error reading metadata file {item_path}: {str(e)}")
        
        # Second pass: list files and folders
        for item_path in current_path.iterdir():
            try:
                # Skip if this file should be excluded
                if item_path in files_to_exclude:
                    continue
                    
                # Skip metadata files
                if item_path.suffix.lower() == '.metadata':
                    continue
                
                stats = item_path.stat()
                relative_path = str(item_path.relative_to(UPLOAD_DIR))
                parent_path = str(item_path.parent.relative_to(UPLOAD_DIR)) if item_path.parent != UPLOAD_DIR else ""
                
                if item_path.is_file():
                    if item_path.suffix.lower() in ALLOWED_EXTENSIONS and not item_path.name.startswith('.'):
                        # Read metadata file if it exists
                        metadata_path = item_path.with_suffix('.metadata')
                        security_classification = "Unclassified"
                        upload_date = None
                        
                        if metadata_path.exists():
                            try:
                                with open(metadata_path, 'r') as f:
                                    metadata = json.load(f)
                                    security_classification = metadata.get("security_classification", "Unclassified")
                                    upload_date = metadata.get("upload_date")
                            except Exception as e:
                                logger.error(f"Error reading metadata file {metadata_path}: {str(e)}")
                        
                        items.append(DocumentResponse(
                            id=relative_path,
                            name=item_path.name,
                            type=item_path.suffix[1:].upper(),
                            size=stats.st_size,
                            uploadDate=upload_date or datetime.fromtimestamp(stats.st_mtime).isoformat(),
                            path=relative_path,
                            isFolder=False,
                            parentPath=parent_path,
                            securityClassification=security_classification
                        ))
                elif item_path.is_dir():
                    items.append(DocumentResponse(
                        id=relative_path,
                        name=item_path.name,
                        type="folder",
                        size=0,
                        uploadDate=datetime.fromtimestamp(stats.st_mtime).isoformat(),
                        path=relative_path,
                        isFolder=True,
                        parentPath=parent_path,
                        securityClassification="Unclassified"
                    ))
            except Exception as e:
                logger.error(f"Error processing item {item_path}: {str(e)}")
                continue
                
        return sorted(items, key=lambda x: (not x.isFolder, x.name.lower()))
    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/core/documents/folders")
async def create_folder(folder: FolderRequest) -> JSONResponse:
    """Create a new folder"""
    try:
        # Combine parent path with new folder name
        folder_path = UPLOAD_DIR
        if folder.parent_path:
            folder_path = folder_path / folder.parent_path
        folder_path = folder_path / folder.name
        
        # Check if folder already exists
        if folder_path.exists():
            raise HTTPException(status_code=400, detail="Folder already exists")
        
        # Create the folder
        folder_path.mkdir(parents=True, exist_ok=False)
        
        return JSONResponse(
            content={
                "message": "Folder created successfully",
                "path": str(folder_path.relative_to(UPLOAD_DIR))
            },
            status_code=200
        )
    except Exception as e:
        logger.error(f"Error creating folder: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/core/documents/move")
async def move_items(
    source_paths: List[str] = Body(...),
    target_folder: str = Body(...),
) -> JSONResponse:
    """Move documents or folders to a different folder"""
    try:
        target_path = UPLOAD_DIR / target_folder if target_folder else UPLOAD_DIR
        if not target_path.exists():
            raise HTTPException(status_code=404, detail="Target folder not found")
        
        moved_items = []
        for source in source_paths:
            source_path = UPLOAD_DIR / source
            if not source_path.exists():
                continue
                
            # Calculate new path
            new_path = target_path / source_path.name
            
            # Handle metadata file if it exists
            metadata_path = source_path.with_suffix('.metadata')
            new_metadata_path = new_path.with_suffix('.metadata')
            
            # Ensure we don't overwrite existing files
            counter = 1
            while new_path.exists():
                stem = source_path.stem
                suffix = source_path.suffix
                new_path = target_path / f"{stem}_{counter}{suffix}"
                new_metadata_path = new_path.with_suffix('.metadata')
                counter += 1
            
            # Move the file or folder
            shutil.move(str(source_path), str(new_path))
            
            # Move metadata file if it exists
            if metadata_path.exists():
                shutil.move(str(metadata_path), str(new_metadata_path))
                logger.info(f"Moved metadata file from {metadata_path} to {new_metadata_path}")
            
            moved_items.append(str(new_path.relative_to(UPLOAD_DIR)))
        
        return JSONResponse(
            content={
                "message": "Items moved successfully",
                "moved_items": moved_items
            },
            status_code=200
        )
    except Exception as e:
        logger.error(f"Error moving items: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/core/documents/upload")
async def upload_documents(files: List[UploadFile] = File(...), folder_path: str = Form("")):
    """Upload one or more documents"""
    try:
        upload_path = UPLOAD_DIR / folder_path
        upload_path.mkdir(parents=True, exist_ok=True)
        
        responses = []
        for file in files:
            if not any(file.filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
                responses.append({
                    "filename": file.filename,
                    "status": "error",
                    "message": f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
                })
                continue
            
            file_path = upload_path / file.filename
            
            # Save the uploaded file
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Generate a unique document ID
            document_id = str(uuid4())
            
            # Create metadata
            metadata = {
                "document_id": document_id,  # Add document ID
                "security_classification": "Unclassified",
                "upload_date": datetime.now().isoformat(),
                "original_file": file.filename,
                "converted_pdf": None
            }
            
            response_file = file_path  # Default to original file
            
            # If file is DOCX, convert to PDF
            if file_path.suffix.lower() == '.docx':
                pdf_path = await convert_docx_to_pdf(file_path)
                if pdf_path:
                    metadata["converted_pdf"] = pdf_path.name
                    logger.info(f"Successfully converted {file.filename} to PDF")
                    # Use the PDF file for the response
                    response_file = pdf_path
                else:
                    logger.error(f"Failed to convert {file.filename} to PDF")
            
            # Save metadata
            metadata_path = file_path.with_suffix('.metadata')
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Get file stats for the response
            stats = response_file.stat()
            relative_path = str(response_file.relative_to(UPLOAD_DIR))
            
            responses.append({
                "filename": response_file.name,
                "original_filename": file.filename,
                "status": "success",
                "message": "File uploaded successfully",
                "document_id": document_id,  # Include document ID in response
                "converted_pdf": metadata["converted_pdf"],
                "file_info": {
                    "id": relative_path,
                    "name": response_file.name,
                    "type": response_file.suffix[1:].upper(),
                    "size": stats.st_size,
                    "uploadDate": metadata["upload_date"],
                    "path": relative_path,
                    "isFolder": False,
                    "parentPath": folder_path,
                    "securityClassification": metadata["security_classification"]
                }
            })
        
        return responses
        
    except Exception as e:
        logger.error(f"Error during file upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/core/documents/{document_id}/download")
async def download_document(document_id: str):
    """Download a specific document"""
    try:
        file_path = UPLOAD_DIR / document_id
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Document not found")
        
        def iterfile():
            with file_path.open("rb") as f:
                yield from f
        
        return StreamingResponse(
            iterfile(),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={file_path.name}"}
        )
    except Exception as e:
        logger.error(f"Error downloading document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/core/documents/{document_id}")
async def delete_document(document_id: str) -> JSONResponse:
    """Delete a specific document"""
    try:
        file_path = UPLOAD_DIR / document_id
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Document not found")
        
        file_path.unlink()
        logger.info(f"Successfully deleted file: {file_path}")
        return JSONResponse(
            content={"message": "Document deleted successfully"},
            status_code=200
        )
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/core/documents/{document_id}/preview")
async def preview_document(document_id: str) -> JSONResponse:
    """Get a preview of a document's content"""
    try:
        file_path = UPLOAD_DIR / document_id
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Read first few KB of the file for preview
        preview_size = 1024 * 10  # 10KB preview
        content = ""
        
        if file_path.suffix.lower() == '.txt':
            with file_path.open('r', encoding='utf-8') as f:
                content = f.read(preview_size)
        elif file_path.suffix.lower() == '.md':
            with file_path.open('r', encoding='utf-8') as f:
                content = f.read(preview_size)
        else:
            content = "Preview not available for this file type"
        
        return JSONResponse(
            content={"preview": content},
            status_code=200
        )
    except Exception as e:
        logger.error(f"Error generating preview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/core/documents/bulk-delete")
async def bulk_delete_documents(
    request: BulkDeleteRequest,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """Delete multiple documents at once with progress tracking."""
    operation_id = generate_operation_id()
    logger.info(f"Starting bulk delete operation {operation_id} for {len(request.documentIds)} documents")
    
    # Initialize progress tracking
    operation_progress[operation_id] = BulkOperationStatus(
        operation_id=operation_id,
        total_items=len(request.documentIds),
        processed_items=0,
        status="Starting"
    )
    
    # Start background task
    background_tasks.add_task(process_bulk_delete, operation_id, request.documentIds)
    
    return {
        "operation_id": operation_id,
        "message": "Bulk delete operation started",
        "status_endpoint": f"/documents/bulk-operations/{operation_id}/status"
    }

@router.post("/api/core/documents/bulk-download")
async def bulk_download_documents(request: BulkDownloadRequest) -> StreamingResponse:
    """Download multiple documents as a ZIP file with progress tracking."""
    operation_id = generate_operation_id()
    logger.info(f"Starting bulk download operation {operation_id} for {len(request.documentIds)} documents")
    
    # Initialize progress tracking
    operation_progress[operation_id] = BulkOperationStatus(
        operation_id=operation_id,
        total_items=len(request.documentIds),
        processed_items=0,
        status="Starting"
    )
    
    try:
        zip_buffer = await create_zip_with_progress(
            operation_id,
            request.documentIds,
            request.include_folders,
            request.preserve_structure
        )
        
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=documents_{operation_id}.zip",
                "X-Operation-ID": operation_id
            }
        )
    except Exception as e:
        logger.error(f"Error in bulk download: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error creating ZIP file: {str(e)}"
        )

@router.get("/api/core/documents/bulk-operations/{operation_id}/status")
async def get_operation_status(operation_id: str) -> BulkOperationStatus:
    """Get the status of a bulk operation."""
    if operation_id not in operation_progress:
        raise HTTPException(status_code=404, detail="Operation not found")
    
    status = operation_progress[operation_id]
    
    # Clean up completed operations after 1 hour
    if status.completed and (datetime.now() - datetime.strptime(operation_id.split('_')[1], '%Y%m%d_%H%M%S')).total_seconds() > 3600:
        del operation_progress[operation_id]
    
    return status

@router.get("/api/core/documents/{document_id:path}/download")
async def download_document(document_id: str):
    """Download a single document."""
    try:
        # Handle path properly for nested folders
        file_path = UPLOAD_DIR / document_id
        if not file_path.exists():
            logger.error(f"Document not found: {file_path}")
            raise HTTPException(
                status_code=404,
                detail=f"Document {document_id} not found"
            )
            
        # Get the actual filename for the download
        filename = file_path.name
        
        # Return the file with proper headers for download
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type='application/octet-stream',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        logger.error(f"Error downloading document: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error downloading document: {str(e)}"
        )

class RenameRequest(BaseModel):
    old_path: str
    new_name: str
    
    model_config = ConfigDict(populate_by_name=True)

    @field_validator('new_name', mode='before')
    def validate_new_name(cls, v):
        if not v or v.isspace():
            raise ValueError("New name cannot be empty")
        if any(c in v for c in '\\/:*?"<>|'):
            raise ValueError("Name contains invalid characters")
        return v

@router.post("/api/core/documents/rename")
async def rename_item(old_path: str = Body(...), new_name: str = Body(...)) -> JSONResponse:
    """Rename a document or folder"""
    try:
        old_path = UPLOAD_DIR / old_path
        new_path = old_path.parent / new_name
        
        # Check if old path exists
        if not old_path.exists():
            raise HTTPException(status_code=404, detail="File or folder not found")
        
        # Check if new path already exists
        if new_path.exists():
            raise HTTPException(status_code=409, detail="A file or folder with this name already exists")
        
        # Handle metadata file if it exists
        old_metadata_path = old_path.with_suffix('.metadata')
        new_metadata_path = new_path.with_suffix('.metadata')
        
        # Rename the file or folder
        old_path.rename(new_path)
        
        # Rename metadata file if it exists
        if old_metadata_path.exists():
            old_metadata_path.rename(new_metadata_path)
            logger.info(f"Renamed metadata file from {old_metadata_path} to {new_metadata_path}")
        
        return JSONResponse(
            content={
                "message": "Item renamed successfully",
                "new_path": str(new_path.relative_to(UPLOAD_DIR))
            },
            status_code=200
        )
    except Exception as e:
        logger.error(f"Error renaming item: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 