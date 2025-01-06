from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Body, BackgroundTasks
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from typing import List, Optional, Dict, Any
from pathlib import Path
import shutil
import json
from datetime import datetime
import logging
import asyncio
from pydantic import BaseModel, Field, validator
import os
import zipfile
from io import BytesIO

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Constants - Use absolute path for container
UPLOAD_DIR = Path("/app/data/uploads")
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.txt', '.md', '.json'}

logger.info(f"Upload directory set to: {UPLOAD_DIR}")
logger.info(f"Current working directory: {os.getcwd()}")

# Ensure upload directory exists
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

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

    @validator('name')
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

    class Config:
        schema_extra = {
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
        }

# Progress tracking
operation_progress = {}

class BulkOperationStatus(BaseModel):
    operation_id: str
    total_items: int
    processed_items: int
    status: str
    errors: List[str] = []
    completed: bool = False

class BulkDeleteRequest(BaseModel):
    documentIds: List[str]
    
    @validator('documentIds')
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
    
    @validator('documentIds')
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

@router.get("/documents")
async def list_documents(path: Optional[str] = "") -> List[DocumentResponse]:
    """List all documents and folders in the specified path"""
    try:
        current_path = UPLOAD_DIR / path if path else UPLOAD_DIR
        logger.info(f"Scanning directory: {current_path}")
        
        if not current_path.exists():
            raise HTTPException(status_code=404, detail="Path not found")
        
        items = []
        for item_path in current_path.iterdir():
            try:
                stats = item_path.stat()
                relative_path = str(item_path.relative_to(UPLOAD_DIR))
                parent_path = str(item_path.parent.relative_to(UPLOAD_DIR)) if item_path.parent != UPLOAD_DIR else ""
                
                if item_path.is_file():
                    if item_path.suffix.lower() in ALLOWED_EXTENSIONS and not item_path.name.startswith('.'):
                        # Read metadata file if it exists
                        metadata_path = item_path.with_suffix('.metadata')
                        security_classification = "Unclassified"
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

@router.post("/documents/folders")
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

@router.post("/documents/move")
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

@router.post("/documents/upload")
async def upload_documents(files: List[UploadFile] = File(...), folder_path: str = Form("")):
    try:
        target_dir = UPLOAD_DIR
        if folder_path:
            target_dir = target_dir / folder_path
            if not target_dir.exists():
                target_dir.mkdir(parents=True, exist_ok=True)
        
        uploaded_files = []
        for file in files:
            if not any(file.filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
                continue
            
            safe_filename = os.path.basename(file.filename)
            file_path = target_dir / safe_filename
            
            # Ensure unique filename
            counter = 1
            while file_path.exists():
                name = f"{file_path.stem}_{counter}{file_path.suffix}"
                file_path = file_path.with_name(name)
                counter += 1
            
            # Write the file
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            # Create metadata file with enhanced information
            metadata_path = file_path.with_suffix('.metadata')
            metadata = {
                "security_classification": "SELECT A CLASSIFICATION",
                "upload_date": datetime.now().isoformat(),
                "original_filename": file.filename,
                "file_size": len(content),
                "mime_type": file.content_type,
                "last_modified": datetime.now().isoformat(),
                "version": "1.0"
            }
            
            # Write metadata file
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"Created metadata file at {metadata_path}")
            uploaded_files.append(str(file_path.relative_to(UPLOAD_DIR)))

        return JSONResponse(
            content={
                "message": "Files uploaded successfully",
                "files": uploaded_files
            },
            status_code=200
        )
    except Exception as e:
        logger.error(f"Error uploading files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/{document_id}/download")
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

@router.delete("/documents/{document_id}")
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

@router.get("/documents/{document_id}/preview")
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

@router.post("/documents/bulk-delete")
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

@router.post("/documents/bulk-download")
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

@router.get("/documents/bulk-operations/{operation_id}/status")
async def get_operation_status(operation_id: str) -> BulkOperationStatus:
    """Get the status of a bulk operation."""
    if operation_id not in operation_progress:
        raise HTTPException(status_code=404, detail="Operation not found")
    
    status = operation_progress[operation_id]
    
    # Clean up completed operations after 1 hour
    if status.completed and (datetime.now() - datetime.strptime(operation_id.split('_')[1], '%Y%m%d_%H%M%S')).total_seconds() > 3600:
        del operation_progress[operation_id]
    
    return status

@router.get("/documents/{document_id:path}/download")
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

    @validator('new_name')
    def validate_new_name(cls, v):
        if not v or v.isspace():
            raise ValueError("New name cannot be empty")
        if any(c in v for c in '\\/:*?"<>|'):
            raise ValueError("Name contains invalid characters")
        return v

@router.post("/documents/rename")
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