from fastapi import FastAPI, HTTPException, Request, Query, File, UploadFile, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal, Union, BinaryIO
import uuid
import json
from pathlib import Path
import httpx
import os
import shutil
import logging
from datetime import datetime
import tempfile
import subprocess
from init_templates import init_templates
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("report_builder_service")

# --- LLM Integration Constants ---
REPORT_SECTION_SYSTEM_PROMPT = (
    "You are an AI assistant tasked with generating a specific section of a report. "
    "Use the provided user instructions and any accompanying context to create accurate and relevant content. "
    "Ensure your output is formatted in plain Markdown."
)
# --- End LLM Integration Constants ---

app = FastAPI()

# Define Pydantic models first
class ReportElement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: Optional[str] = None
    type: Literal['explicit', 'generative']
    format: Optional[str] = None
    content: Optional[str] = None
    instructions: Optional[str] = None
    ai_generated_content: Optional[str] = None

class ReportContent(BaseModel):
    elements: List[ReportElement] = Field(default_factory=list)
    # Potentially add layout, styling info here

class ReportBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "Custom" # Custom, Template-based
    templateId: Optional[str] = None
    vectorStoreId: Optional[str] = None

class ReportCreate(ReportBase):
    content: ReportContent = Field(default_factory=ReportContent)

class Report(ReportBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    createdAt: str # ISO format string
    updatedAt: str # ISO format string
    status: str = "draft"
    content: ReportContent

# Template models
class TemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None

class TemplateCreate(TemplateBase):
    content: ReportContent = Field(default_factory=ReportContent)

class Template(TemplateBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    createdAt: str # ISO format string
    updatedAt: str # ISO format string
    content: ReportContent

# New Pydantic model for our endpoint's response structure
class ReportBuilderVectorStoreInfo(BaseModel):
    id: str
    name: str

class GeneratedReportMarkdown(BaseModel):
    report_id: str
    markdown_content: str
    has_errors: bool = False
    generation_errors: Optional[List[Dict[str, Any]]] = None

# Add new error response models for structured error handling
class ErrorDetail(BaseModel):
    code: str
    message: str
    
class ErrorResponse(BaseModel):
    error: bool = True
    detail: ErrorDetail
    timestamp: str

# Constants for error codes
class ErrorCodes:
    REPORT_NOT_FOUND = "REPORT_NOT_FOUND"
    VECTOR_STORE_ERROR = "VECTOR_STORE_ERROR"
    MAGE_SERVICE_ERROR = "MAGE_SERVICE_ERROR"
    GENERATION_FAILED = "GENERATION_FAILED"
    INVALID_REPORT_STRUCTURE = "INVALID_REPORT_STRUCTURE"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"

# Define directory structure
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
REPORTS_DIR = DATA_DIR / "reports"
TEMPLATES_DIR = DATA_DIR / "templates"
LEGACY_REPORTS_DATA_FILE = BASE_DIR / "reports_data.json"

# Ensure directories exist
def ensure_directories():
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

# Create directories if they don't exist
ensure_directories()

# Function to load a single report from a file
def load_report_from_file(file_path: Path) -> Optional[Report]:
    try:
        with open(file_path, "r") as f:
            report_data = json.load(f)
            return Report(**report_data)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        print(f"Error loading report from {file_path}: {e}")
        return None

# Function to save a single report to a file
def save_report_to_file(report: Report):
    file_path = REPORTS_DIR / f"{report.id}.json"
    with open(file_path, "w") as f:
        json.dump(report.dict(), f, indent=4)

# Function to load all reports from the reports directory
def load_all_reports() -> List[Report]:
    reports = []
    for file_path in REPORTS_DIR.glob("*.json"):
        report = load_report_from_file(file_path)
        if report:
            reports.append(report)
    return reports

# Template functions
def load_template_from_file(file_path: Path) -> Optional[Template]:
    try:
        with open(file_path, "r") as f:
            template_data = json.load(f)
            return Template(**template_data)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        print(f"Error loading template from {file_path}: {e}")
        return None

def save_template_to_file(template: Template):
    file_path = TEMPLATES_DIR / f"{template.id}.json"
    with open(file_path, "w") as f:
        json.dump(template.dict(), f, indent=4)

def load_all_templates() -> List[Template]:
    templates = []
    for file_path in TEMPLATES_DIR.glob("*.json"):
        template = load_template_from_file(file_path)
        if template:
            templates.append(template)
    return templates

# Function to migrate legacy data if it exists
def migrate_legacy_data():
    if LEGACY_REPORTS_DATA_FILE.exists():
        try:
            with open(LEGACY_REPORTS_DATA_FILE, "r") as f:
                legacy_data = json.load(f)
                
            # Save each report as an individual file
            for report_data in legacy_data:
                report = Report(**report_data)
                save_report_to_file(report)
                
            # Backup and remove the legacy file
            backup_path = LEGACY_REPORTS_DATA_FILE.with_suffix('.json.bak')
            shutil.copy2(LEGACY_REPORTS_DATA_FILE, backup_path)
            LEGACY_REPORTS_DATA_FILE.unlink()
            
            print(f"Successfully migrated legacy data to individual files. Backup created at {backup_path}")
        except Exception as e:
            print(f"Error migrating legacy data: {e}")

# Migrate legacy data on startup
migrate_legacy_data()

# Initialize templates
init_templates()

# Ensure this matches your docker-compose service name and port for embedding_service
EMBEDDING_SERVICE_BASE_URL = os.getenv("EMBEDDING_SERVICE_URL", "http://embedding_service:8006")

# Configuration for vLLM
VLLM_CHAT_COMPLETIONS_URL = os.getenv("VLLM_CHAT_COMPLETIONS_URL", "http://vllm:8000/v1/chat/completions")
VLLM_MODEL_NAME = os.getenv("VLLM_MODEL_NAME", "/models/DeepHermes-3-Llama-3-8B-Preview-abliterated") # Default from direct_chat_service
VLLM_MAX_TOKENS = int(os.getenv("VLLM_MAX_TOKENS", "2048")) # Max tokens for the generated response
VLLM_TEMPERATURE = float(os.getenv("VLLM_TEMPERATURE", "0.7"))
VLLM_REQUEST_TIMEOUT = int(os.getenv("VLLM_REQUEST_TIMEOUT", "300")) # Seconds

# Add WebSocket connection manager for real-time updates
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = []
        self.active_connections[client_id].append(websocket)

    def disconnect(self, websocket: WebSocket, client_id: str):
        if client_id in self.active_connections:
            self.active_connections[client_id].remove(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]

    async def send_json(self, message: dict, client_id: str):
        if client_id in self.active_connections:
            for connection in self.active_connections[client_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to WebSocket: {e}")

# Initialize the connection manager
ws_manager = ConnectionManager()

@app.get("/api/report_builder/vector_stores", response_model=List[ReportBuilderVectorStoreInfo])
async def get_vector_stores_for_report_builder():
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{EMBEDDING_SERVICE_BASE_URL}/api/embedding/vectorstores")
            response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
            
            vector_stores_data = response.json() # This will be List of dicts from embedding_service
            
            # Transform to the desired response model
            # Assuming vector_stores_data is a list of dictionaries, each with 'id' and 'name'
            return [
                ReportBuilderVectorStoreInfo(id=vs.get("id"), name=vs.get("name")) 
                for vs in vector_stores_data
            ]

    except httpx.RequestError as exc:
        # Log the error appropriately - using print for now, consider proper logging
        print(f"An error occurred while requesting vector stores from embedding service: {exc}")
        raise HTTPException(status_code=503, detail=f"Could not connect to embedding service: {str(exc)}")
    except httpx.HTTPStatusError as exc:
        # Log the error appropriately
        print(f"Embedding service returned an error: {exc.response.status_code} - {exc.response.text}")
        raise HTTPException(status_code=exc.response.status_code, detail=f"Embedding service error: {exc.response.text}")
    except Exception as exc:
        # Catch any other unexpected errors
        print(f"An unexpected error occurred: {exc}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while fetching vector stores.")

# Report endpoints
@app.post("/api/report_builder/reports", response_model=Report)
async def create_report(report_in: ReportCreate):
    from datetime import datetime
    now = datetime.utcnow().isoformat() + "Z"
    report_id = str(uuid.uuid4())
    
    # Process the report content to ensure separation between explicit and generative content
    if report_in.content and report_in.content.elements:
        processed_elements = []
        for element in report_in.content.elements:
            # Make a copy of the element
            element_dict = element.dict(exclude_unset=True)
            
            # Process based on element type
            if element.type == 'explicit':
                # For explicit elements, ensure ai_generated_content is explicitly set to None
                element_dict['ai_generated_content'] = None
                processed_elements.append(ReportElement(**element_dict))
            elif element.type == 'generative':
                # For generative elements, ensure ai_generated_content is present (either with value or None)
                if 'ai_generated_content' not in element_dict:
                    element_dict['ai_generated_content'] = None
                processed_elements.append(ReportElement(**element_dict))
            else:
                # Unknown type, ensure ai_generated_content is at least null
                element_dict['ai_generated_content'] = None
                processed_elements.append(ReportElement(**element_dict))
        
        # Create a new content object with processed elements
        content = ReportContent(elements=processed_elements)
    else:
        content = report_in.content
    
    new_report = Report(
        id=report_id,
        name=report_in.name,
        description=report_in.description,
        type=report_in.type,
        templateId=report_in.templateId,
        vectorStoreId=report_in.vectorStoreId,
        createdAt=now,
        updatedAt=now,
        status="draft",
        content=content
    )
    
    # Save the report to its own file
    save_report_to_file(new_report)
    
    return new_report

@app.get("/api/report_builder/reports", response_model=List[Report])
async def get_reports():
    # Load all reports from individual files
    return load_all_reports()

@app.get("/api/report_builder/reports/{report_id}", response_model=Report)
async def get_report(report_id: str):
    report_path = REPORTS_DIR / f"{report_id}.json"
    report = load_report_from_file(report_path)
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return report

@app.put("/api/report_builder/reports/{report_id}", response_model=Report)
async def update_report(report_id: str, report_update: ReportCreate):
    from datetime import datetime
    now = datetime.utcnow().isoformat() + "Z"
    
    report_path = REPORTS_DIR / f"{report_id}.json"
    existing_report = load_report_from_file(report_path)
    
    if not existing_report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    updated_data = report_update.dict(exclude_unset=True)
    current_report_data = existing_report.dict()
    
    # Handle content separately to ensure proper element type handling
    if 'content' in updated_data and isinstance(updated_data['content'], dict):
        if 'elements' in updated_data['content']:
            # Create a new elements list
            new_elements = []
            
            # Process each element from the update
            for updated_element in updated_data['content']['elements']:
                # If this is an update to an existing element, find the original
                original_element = None
                if 'id' in updated_element:
                    for existing_element in current_report_data['content']['elements']:
                        if existing_element['id'] == updated_element['id']:
                            original_element = existing_element
                            break
                
                # Handle the element based on its type
                if updated_element.get('type') == 'explicit':
                    # For explicit elements, only update content and other properties
                    # Always ensure ai_generated_content is null for explicit elements
                    if original_element:
                        # Start with original and update with new values
                        element_copy = original_element.copy()
                        for key, value in updated_element.items():
                            element_copy[key] = value
                        # Ensure ai_generated_content is explicitly set to None
                        element_copy['ai_generated_content'] = None
                        new_elements.append(element_copy)
                    else:
                        # New element, just add it
                        # Ensure ai_generated_content is explicitly set to None
                        element_copy = updated_element.copy()
                        element_copy['ai_generated_content'] = None
                        new_elements.append(element_copy)
                        
                elif updated_element.get('type') == 'generative':
                    # For generative elements, carefully handle instructions and ai_generated_content
                    if original_element:
                        # Start with original and update with new values
                        element_copy = original_element.copy()
                        
                        # Update each field from the updated element
                        for key, value in updated_element.items():
                            # Always update ai_generated_content if explicitly provided, even if null
                            # This allows the frontend to clear the content if needed
                            if key == 'ai_generated_content':
                                # Only update if the value is provided (could be null/None to clear it)
                                if key in updated_element:
                                    element_copy[key] = value
                            else:
                                # Always update other fields
                                element_copy[key] = value
                        
                        # Ensure ai_generated_content is present (even if null)
                        if 'ai_generated_content' not in element_copy:
                            element_copy['ai_generated_content'] = None
                        
                        new_elements.append(element_copy)
                    else:
                        # New generative element
                        element_copy = updated_element.copy()
                        # Ensure ai_generated_content is present (even if null)
                        if 'ai_generated_content' not in element_copy:
                            element_copy['ai_generated_content'] = None
                        new_elements.append(element_copy)
                else:
                    # Unknown type, ensure ai_generated_content is at least null
                    element_copy = updated_element.copy()
                    element_copy['ai_generated_content'] = None
                    new_elements.append(element_copy)
            
            # Replace elements list
            current_report_data['content']['elements'] = new_elements
            
        # Update any other content fields
        for key, value in updated_data['content'].items():
            if key != 'elements':
                current_report_data['content'][key] = value
    else:
        # Update other fields normally
        for key, value in updated_data.items():
            if key != 'content':
                current_report_data[key] = value
    
    current_report_data['updatedAt'] = now
    
    updated_instance = Report(**current_report_data)
    save_report_to_file(updated_instance)
    
    return updated_instance

@app.delete("/api/report_builder/reports/{report_id}", status_code=204)
async def delete_report(report_id: str):
    report_path = REPORTS_DIR / f"{report_id}.json"
    
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Delete the report file
    report_path.unlink()
    
    return

@app.post("/api/report_builder/reports/{report_id}/generate", response_model=Union[GeneratedReportMarkdown, ErrorResponse])
async def generate_report(report_id: str, force_regenerate: bool = False, client_id: Optional[str] = Query(None)):
    logger.info(f"Received request to generate report: {report_id}, Force regenerate: {force_regenerate}, Client ID: {client_id}")
    report = load_report_from_file(REPORTS_DIR / f"{report_id}.json")
    if not report:
        logger.error(f"Report not found: {report_id}")
        return ErrorResponse(
            detail=ErrorDetail(code=ErrorCodes.REPORT_NOT_FOUND, message="Report not found"),
            timestamp=datetime.utcnow().isoformat() + "Z"
        )

    # Commenting out or removing the health check for now
    # service_healthy, health_message = await get_mage_service_health(VLLM_CHAT_COMPLETIONS_URL) # This needs a proper vLLM health endpoint if used
    # if not service_healthy:
    #     logger.error(f"Generation service is not healthy: {health_message}")
    #     # Return a 503 Service Unavailable error or similar
    #     return ErrorResponse(
    #         detail=ErrorDetail(code=ErrorCodes.MAGE_SERVICE_ERROR, message=f"LLM service unavailable: {health_message}"),
    #         timestamp=datetime.utcnow().isoformat() + "Z"
    #     )
    # logger.info(f"Generation service health check passed: {health_message}")

    if not report.content or not report.content.elements:
        logger.warning(f"Report {report_id} has no elements to generate.")
        return ErrorResponse(
            detail=ErrorDetail(code=ErrorCodes.GENERATION_FAILED, message="Report content has not been generated yet. Please use the 'Generate Report' button to generate content before exporting to Word."),
            timestamp=datetime.utcnow().isoformat() + "Z"
        )

    now = datetime.utcnow().isoformat() + "Z"  # For error timestamps
    
    try:
        # Check if the report has a vector store ID but the vector store doesn't exist
        if report.vectorStoreId:
            try:
                # Verify that the vector store exists by making a call to the embedding service
                async with httpx.AsyncClient() as client:
                    response = await client.get(f"{EMBEDDING_SERVICE_BASE_URL}/api/embedding/vectorstores/{report.vectorStoreId}")
                    if response.status_code == 404:
                        logger.warning(f"Report {report_id} references non-existent vector store ID: {report.vectorStoreId}")
                        return ErrorResponse(
                            detail=ErrorDetail(
                                code=ErrorCodes.VECTOR_STORE_ERROR,
                                message=f"Vector store with ID {report.vectorStoreId} not found"
                            ),
                            timestamp=now
                        )
                    response.raise_for_status()
            except httpx.RequestError as e:
                logger.error(f"Error connecting to embedding service: {str(e)}")
                return ErrorResponse(
                    detail=ErrorDetail(
                        code=ErrorCodes.VECTOR_STORE_ERROR,
                        message=f"Could not connect to embedding service to verify vector store: {str(e)}"
                    ),
                    timestamp=now
                )
            except httpx.HTTPStatusError as e:
                # Only return an error if it's not a 404 (already handled above)
                if e.response.status_code != 404:
                    logger.error(f"Embedding service error: {str(e)}")
                    return ErrorResponse(
                        detail=ErrorDetail(
                            code=ErrorCodes.VECTOR_STORE_ERROR,
                            message=f"Embedding service returned an error: {str(e)}"
                        ),
                        timestamp=now
                    )

        logger.info(f"Generating report for ID: {report_id}")
        markdown_parts = []  # Initialize a list to hold parts of the markdown
        markdown_parts.append(f"# {report.name}\n")

        if report.description:
            markdown_parts.append(f"{report.description}\n\n")  # Add extra newline for spacing after description

        # Track any errors encountered during generation
        generation_errors = []
        
        # --- NEW: Keep track of preceding content for context ---
        preceding_contents = []  # List to keep track of previous content
        TOKEN_LIMIT = 1000  # Maximum token limit for preceding context (adjust based on your model)
        
        # Track the length of each section's content in estimated tokens
        # Rough estimate: 1 token ≈ 4 characters in English 
        def estimate_tokens(text):
            return len(text) // 4
        
        # Function to get preceding content within token limit
        def get_preceding_content(tokens_limit=TOKEN_LIMIT):
            """
            Retrieves and formats previous report section content to serve as context for the current section generation.
            
            This function:
            1. Collects content from previously processed sections (explicit or AI-generated)
            2. Prioritizes most recent sections first (reversed order)
            3. Enforces a token limit to prevent context overflow
            4. When needed, truncates content to fit within token limits
            
            Args:
                tokens_limit (int): Maximum number of tokens to include in context

            Returns:
                str: Formatted context string containing previous section content within token limits
            """
            combined = ""
            total_tokens = 0
            
            # Iterate through previous content in reverse order (most recent first)
            for content in reversed(preceding_contents):
                content_tokens = estimate_tokens(content)
                
                # If adding this content would exceed the limit, stop
                if total_tokens + content_tokens > tokens_limit:
                    # If we haven't added anything yet, take a portion of this section
                    if total_tokens == 0:
                        # Take what we can fit within the limit
                        # Very rough calculation - just truncate based on estimated character count
                        chars_to_take = tokens_limit * 4
                        partial_content = content[:chars_to_take] + "... [truncated]"
                        combined = partial_content
                    break
                
                # Add this content to the total
                if combined:
                    combined = content + "\n\n" + combined
                else:
                    combined = content
                    
                total_tokens += content_tokens
                
                # If we've reached the limit, stop
                if total_tokens >= tokens_limit:
                    break
                    
            return combined
        
        # Process each element in the report
        logger.info(f"Processing {len(report.content.elements)} elements")
        for i, element in enumerate(report.content.elements):
            # Send progress update via WebSocket if client_id is provided
            if client_id:
                try:
                    await ws_manager.send_json({
                        "type": "generation_progress",
                        "data": {
                            "report_id": report_id,
                            "total_elements": len(report.content.elements),
                            "current_element": i + 1,
                            "element_id": element.id,
                            "element_title": element.title or "Untitled Element",
                            "status": "processing"
                        }
                    }, client_id)
                except Exception as e:
                    logger.error(f"Failed to send WebSocket progress update: {e}")
            
            element_markdown = ""
            
            # Add element title to the markdown if it exists
            if element.title:
                element_markdown += f"## {element.title}\n"
            
            if element.type == 'explicit':
                # For explicit elements, directly use the content
                if element.content:
                    element_markdown += f"{element.content}\n"
                    
                    # Add this content to our preceding context if not empty
                    if element.content.strip():
                        section_content = f"## {element.title or 'Untitled Section'}\n{element.content}"
                        preceding_contents.append(section_content)
                        logger.debug(f"Added explicit content to preceding context. Total sections: {len(preceding_contents)}")
                    
            elif element.type == 'generative':
                # Get preceding content for context
                previous_content = get_preceding_content()
                logger.info(f"Using {estimate_tokens(previous_content)} tokens of preceding content for element {i+1} ({element.id})")
                
                # Log how many sections are being used as context
                if preceding_contents:
                    logger.info(f"Using content from {len(preceding_contents)} previous section(s) as context")
                    
                # Generate content for this element
                logger.info(f"Generating content for element ID: {element.id}, Title: {element.title or 'Untitled'}")
                
                try:
                    # Send update that generation is starting for this element
                    if client_id:
                        try:
                            await ws_manager.send_json({
                                "type": "generation_status",
                                "data": {
                                    "report_id": report_id,
                                    "element_id": element.id,
                                    "status": "generating",
                                    "message": f"Generating content for {element.title or 'Untitled Element'}..."
                                }
                            }, client_id)
                        except Exception as e:
                            logger.error(f"Failed to send WebSocket status update: {e}")
                    
                    # Use our enhanced generate_element_content function
                    generated_content = await generate_element_content(
                        element=element,
                        vector_store_id=report.vectorStoreId,
                        previous_content=previous_content
                    )
                    
                    if generated_content:
                        # Store the generated content
                        element.ai_generated_content = generated_content
                        element_markdown += f"{generated_content}\n"
                        
                        # Add this content to our preceding context
                        section_content = f"## {element.title or 'Untitled Section'}\n{generated_content}"
                        preceding_contents.append(section_content)
                        logger.debug(f"Added generated content to preceding context. Total sections: {len(preceding_contents)}")
                        
                        # Save the report after each successfully generated section to persist changes
                        save_report_to_file(report)
                        logger.debug(f"Saved report to file after generating content for element {element.id}")
                        
                        # Send update that generation completed successfully for this element
                        if client_id:
                            try:
                                await ws_manager.send_json({
                                    "type": "generation_status",
                                    "data": {
                                        "report_id": report_id,
                                        "element_id": element.id,
                                        "status": "completed",
                                        "content": generated_content
                                    }
                                }, client_id)
                            except Exception as e:
                                logger.error(f"Failed to send WebSocket completion update: {e}")
                    else:
                        error_message = "Generation returned empty content"
                        logger.warning(f"Empty content generated for element {element.id}")
                        element_markdown += f"*[Error: {error_message}]*\n"
                        generation_errors.append({
                            "element_id": element.id,
                            "element_title": element.title or "Untitled Element",
                            "error_code": ErrorCodes.GENERATION_FAILED,
                            "error_message": error_message
                        })
                        
                        # Send error update
                        if client_id:
                            try:
                                await ws_manager.send_json({
                                    "type": "generation_status",
                                    "data": {
                                        "report_id": report_id,
                                        "element_id": element.id,
                                        "status": "error",
                                        "error": error_message
                                    }
                                }, client_id)
                            except Exception as e:
                                logger.error(f"Failed to send WebSocket error update: {e}")
                        
                except Exception as e:
                    error_message = f"Error generating content: {str(e)}"
                    logger.error(error_message, exc_info=True)
                    element_markdown += f"*[Error: {error_message}]*\n"
                    generation_errors.append({
                        "element_id": element.id,
                        "element_title": element.title or "Untitled Element",
                        "error_code": ErrorCodes.GENERATION_FAILED,
                        "error_message": error_message
                    })
                    
                    # Send error update
                    if client_id:
                        try:
                            await ws_manager.send_json({
                                "type": "generation_status",
                                "data": {
                                    "report_id": report_id,
                                    "element_id": element.id,
                                    "status": "error",
                                    "error": error_message
                                }
                            }, client_id)
                        except Exception as e:
                            logger.error(f"Failed to send WebSocket error update: {e}")

            # Add spacing and append this element's markdown to the full report
            element_markdown += "\n"
            markdown_parts.append(element_markdown)

        full_markdown = "".join(markdown_parts)  # Join without double newlines if parts already end with one
        
        # Final save of the updated report (although each section was saved incrementally)
        save_report_to_file(report)
        logger.debug("Final save of the complete report")

        # If we had generation errors, log them but still return the partial report
        if generation_errors:
            error_summary = ", ".join([f"{e['element_title']}" for e in generation_errors])
            logger.warning(f"Report generation completed with {len(generation_errors)} errors in elements: {error_summary}")
            
            # Return a successful response but include error information
            response = GeneratedReportMarkdown(
                report_id=report_id, 
                markdown_content=full_markdown,
                generation_errors=generation_errors,
                has_errors=True
            )
            
            return response
        else:
            logger.info(f"Successfully generated report for ID: {report_id}")
            return GeneratedReportMarkdown(report_id=report_id, markdown_content=full_markdown)
    
    except Exception as e:
        logger.error(f"Unexpected error generating report {report_id}: {str(e)}", exc_info=True)
        
        # Determine the most appropriate error code based on the exception
        error_code = ErrorCodes.UNKNOWN_ERROR
        error_message = f"An unexpected error occurred while generating the report: {str(e)}"
        
        if "MAGE service" in str(e):
            error_code = ErrorCodes.MAGE_SERVICE_ERROR
            error_message = f"Error with MAGE service: {str(e)}"
        elif "Vector store" in str(e):
            error_code = ErrorCodes.VECTOR_STORE_ERROR
            error_message = f"Error with vector store: {str(e)}"
        elif "not found" in str(e).lower():
            error_code = ErrorCodes.REPORT_NOT_FOUND
            error_message = f"Report not found: {str(e)}"
        
        return ErrorResponse(
            detail=ErrorDetail(
                code=error_code,
                message=error_message
            ),
            timestamp=now
        )

async def generate_element_content(element: ReportElement, vector_store_id: Optional[str], previous_content: str = "") -> str:
    logger.info(f"Generating content for element: {element.title} (ID: {element.id})")
    user_instructions = element.instructions or ""
    full_user_prompt = user_instructions

    # Initialize context_text
    context_text = ""

    # Step 1: Retrieve context from vector store if vectorStoreId is provided
    if vector_store_id:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Use a more specific query if possible, for now using element instructions
                # Ensure the embedding service endpoint is correct and expects 'query' and 'vectorstore_id'
                response = await client.post(
                    f"{EMBEDDING_SERVICE_BASE_URL}/api/embedding/query", 
                    json={"query": user_instructions, "vectorstore_id": vector_store_id, "top_k": 3}
                )
                response.raise_for_status()
                retrieved_docs = response.json().get("results", [])
                if retrieved_docs:
                    context_text = "\n\nRelevant Information from Knowledge Store:\n"
                    for doc_info in retrieved_docs:
                        # Assuming doc_info is a dict and has a 'text' field or similar
                        context_text += f"- {doc_info.get('text', '')}\n"
                    logger.info(f"Retrieved context from vector store for element {element.id}")
        except httpx.RequestError as e:
            logger.error(f"Could not connect to embedding service for vector store context: {e}")
            # Optionally, append a notice about the error to the prompt or handle as a generation failure
            full_user_prompt += "\n\n[Note: Error retrieving contextual information from knowledge store due to connection issue.]"
        except httpx.HTTPStatusError as e:
            logger.error(f"Embedding service error for vector store context: {e.response.status_code} - {e.response.text}")
            full_user_prompt += f"\n\n[Note: Error retrieving contextual information from knowledge store: {e.response.status_code}]"
        except Exception as e:
            logger.error(f"Unexpected error retrieving vector store context: {e}")
            full_user_prompt += "\n\n[Note: Unexpected error retrieving contextual information from knowledge store.]"
    
    if context_text:
        full_user_prompt += context_text

    if previous_content:
        full_user_prompt = f"Consider the following previously generated report content:\n{previous_content}\n\nBased on that, and the following instructions, generate the current section:\n{full_user_prompt}"

    messages = [
        {"role": "system", "content": REPORT_SECTION_SYSTEM_PROMPT},
        {"role": "user", "content": full_user_prompt}
    ]

    vllm_payload = {
        "model": VLLM_MODEL_NAME,
        "messages": messages,
        "max_tokens": VLLM_MAX_TOKENS,
        "temperature": VLLM_TEMPERATURE,
        # Add other OpenAI compatible parameters if needed e.g. top_p, stop sequences
    }

    logger.info(f"Calling vLLM for element ID: {element.id}. Prompt: {full_user_prompt[:200]}...") # Log part of the prompt

    try:
        async with httpx.AsyncClient(timeout=VLLM_REQUEST_TIMEOUT) as client:
            response = await client.post(VLLM_CHAT_COMPLETIONS_URL, json=vllm_payload)
            response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
            
            response_data = response.json()
            generated_text = response_data.get('choices', [{}])[0].get('message', {}).get('content', '')
            
            if not generated_text:
                logger.error(f"vLLM response for {element.id} was empty or not in expected format: {response_data}")
                raise Exception("Received empty response from vLLM")
            
            logger.info(f"Successfully received response from vLLM for element ID: {element.id}")
            return generated_text

    except httpx.RequestError as e:
        logger.error(f"Could not connect to vLLM service at {VLLM_CHAT_COMPLETIONS_URL}: {e}")
        raise Exception(f"Connection to vLLM service failed: {str(e)}")
    except httpx.HTTPStatusError as e:
        logger.error(f"vLLM service returned an error: {e.response.status_code} - {e.response.text}")
        raise Exception(f"vLLM service error: {e.response.status_code} - {e.response.text}")
    except Exception as e:
        logger.error(f"Unexpected error during vLLM call for element {element.id}: {str(e)}")
        # Check if it's a KeyError from accessing response_data, indicating unexpected format
        if isinstance(e, (KeyError, IndexError)):
             raise Exception(f"Error parsing vLLM response: {str(e)}. Response format might be unexpected.")
        raise Exception(f"Unexpected error during content generation: {str(e)}")

# Template endpoints
@app.post("/api/report_builder/templates", response_model=Template)
async def create_template(template_in: TemplateCreate):
    from datetime import datetime
    now = datetime.utcnow().isoformat() + "Z"
    template_id = str(uuid.uuid4())
    
    # Process the template content to ensure consistent element structure
    if template_in.content and template_in.content.elements:
        processed_elements = []
        for element in template_in.content.elements:
            # Make a copy of the element
            element_dict = element.dict(exclude_unset=True)
            
            # Process based on element type
            if element.type == 'explicit':
                # For explicit elements, ensure ai_generated_content is explicitly set to None
                element_dict['ai_generated_content'] = None
                processed_elements.append(ReportElement(**element_dict))
            elif element.type == 'generative':
                # For generative elements, ensure ai_generated_content is present (either with value or None)
                if 'ai_generated_content' not in element_dict:
                    element_dict['ai_generated_content'] = None
                processed_elements.append(ReportElement(**element_dict))
            else:
                # Unknown type, ensure ai_generated_content is at least null
                element_dict['ai_generated_content'] = None
                processed_elements.append(ReportElement(**element_dict))
        
        # Create a new content object with processed elements
        content = ReportContent(elements=processed_elements)
    else:
        content = template_in.content
    
    new_template = Template(
        id=template_id,
        name=template_in.name,
        description=template_in.description,
        category=template_in.category,
        createdAt=now,
        updatedAt=now,
        content=content
    )
    
    # Save the template to its own file
    save_template_to_file(new_template)
    
    return new_template

@app.get("/api/report_builder/templates", response_model=List[Template])
async def get_templates():
    # Load all templates from individual files
    return load_all_templates()

@app.get("/api/report_builder/templates/{template_id}", response_model=Template)
async def get_template(template_id: str):
    template_path = TEMPLATES_DIR / f"{template_id}.json"
    template = load_template_from_file(template_path)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return template

@app.put("/api/report_builder/templates/{template_id}", response_model=Template)
async def update_template(template_id: str, template_update: TemplateCreate):
    from datetime import datetime
    now = datetime.utcnow().isoformat() + "Z"
    
    template_path = TEMPLATES_DIR / f"{template_id}.json"
    existing_template = load_template_from_file(template_path)
    
    if not existing_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    updated_data = template_update.dict(exclude_unset=True)
    current_template_data = existing_template.dict()
    
    for key, value in updated_data.items():
        if key == 'content' and isinstance(value, dict):
            # Process content separately to ensure proper element handling
            if 'elements' in value:
                new_elements = []
                for element in value['elements']:
                    element_copy = element.copy()
                    
                    # Ensure ai_generated_content field consistency based on element type
                    if element_copy.get('type') == 'explicit':
                        element_copy['ai_generated_content'] = None
                    elif element_copy.get('type') == 'generative':
                        if 'ai_generated_content' not in element_copy:
                            element_copy['ai_generated_content'] = None
                    else:
                        element_copy['ai_generated_content'] = None
                        
                    new_elements.append(element_copy)
                
                # Update the elements list
                current_template_data['content']['elements'] = new_elements
                
                # Update any other content fields
                for content_key, content_value in value.items():
                    if content_key != 'elements':
                        current_template_data['content'][content_key] = content_value
            else:
                current_template_data[key] = ReportContent(**value)
        else:
            current_template_data[key] = value
    
    current_template_data['updatedAt'] = now
    
    updated_instance = Template(**current_template_data)
    save_template_to_file(updated_instance)
    
    return updated_instance

@app.delete("/api/report_builder/templates/{template_id}", status_code=204)
async def delete_template(template_id: str):
    template_path = TEMPLATES_DIR / f"{template_id}.json"
    
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Delete the template file
    template_path.unlink()
    
    return

@app.get("/api/report_builder/health")
async def health_check():
    return {"status": "healthy"}

# Add global exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Global HTTP exception handler for FastAPI exceptions"""
    now = datetime.utcnow().isoformat() + "Z"
    
    # Map HTTP status codes to our error codes
    error_code = ErrorCodes.UNKNOWN_ERROR
    if exc.status_code == 404:
        error_code = ErrorCodes.REPORT_NOT_FOUND
    
    logger.warning(f"HTTP Exception {exc.status_code}: {str(exc.detail)}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            detail=ErrorDetail(
                code=error_code,
                message=str(exc.detail)
            ),
            timestamp=now
        ).dict()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Global exception handler for all uncaught exceptions"""
    now = datetime.utcnow().isoformat() + "Z"
    
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            detail=ErrorDetail(
                code=ErrorCodes.UNKNOWN_ERROR,
                message=f"Internal server error: {str(exc)}"
            ),
            timestamp=now
        ).dict()
    )

@app.get("")
async def root():
    return {"message": "Report Builder Service is running"}

# New model for Word export options
class WordExportOptions(BaseModel):
    force_regenerate: bool = False
    include_title_page: bool = True
    
@app.get("/api/report_builder/reports/{report_id}/export/word")
async def export_report_to_word(report_id: str, options: WordExportOptions = None):
    """
    Export a report to Microsoft Word (.docx) format
    
    Args:
        report_id: The ID of the report to export
        options: Optional export options
        
    Returns:
        FileResponse: The generated Word document as a downloadable file
        
    Raises:
        HTTPException: If report not found or export fails
    """
    now = datetime.utcnow().isoformat() + "Z"  # For error timestamps
    
    # Use default options if none provided
    if options is None:
        options = WordExportOptions()
    
    try:
        # Step 1: Load the report definition
        report_path = REPORTS_DIR / f"{report_id}.json"
        report = load_report_from_file(report_path)
        
        if not report:
            logger.warning(f"Report with ID {report_id} not found")
            return ErrorResponse(
                detail=ErrorDetail(
                    code=ErrorCodes.REPORT_NOT_FOUND,
                    message=f"Report with ID {report_id} not found"
                ),
                timestamp=now
            )
        
        markdown_content = None
        
        # Step 2: Generate the report if needed or forced
        if options.force_regenerate:
            logger.info(f"Forced regeneration of report {report_id} for Word export")
            # Call the existing generate_report function to get fresh content
            generation_result = await generate_report(report_id)
            
            # Check if we got an error response
            if hasattr(generation_result, 'error') and generation_result.error:
                return generation_result  # Return the error response
            
            markdown_content = generation_result.markdown_content
        else:
            # Try to find the existing generated report content
            # First check if we already have a cached/stored version of the generated report
            report_content_path = REPORTS_DIR / f"{report_id}_generated.md"
            
            if report_content_path.exists():
                logger.info(f"Using existing generated content for report {report_id}")
                with open(report_content_path, "r", encoding="utf-8") as f:
                    markdown_content = f.read()
            else:
                # No existing content - return an error instead of auto-generating
                logger.warning(f"No generated content found for report {report_id}. Generation needed before export.")
                return ErrorResponse(
                    detail=ErrorDetail(
                        code=ErrorCodes.GENERATION_FAILED,
                        message="Report content has not been generated yet. Please use the 'Generate Report' button to generate content before exporting to Word."
                    ),
                    timestamp=now
                )
        
        # Step 3: Convert the markdown to DOCX using pandoc
        try:
            # Import pypandoc here to handle import errors gracefully
            import pypandoc
        except ImportError:
            logger.error("pypandoc is not installed. Please install it to use Word export functionality.")
            return ErrorResponse(
                detail=ErrorDetail(
                    code=ErrorCodes.UNKNOWN_ERROR,
                    message="Word export is currently unavailable. The server is missing required dependencies."
                ),
                timestamp=now
            )
            
        try:
            # Create a persistent temporary directory that won't be auto-deleted
            # NOTE: We don't use a context manager here to prevent premature deletion
            temp_dir = tempfile.mkdtemp()
            
            # Create temp file paths
            temp_md_path = Path(temp_dir) / f"{report_id}.md"
            temp_docx_path = Path(temp_dir) / f"{report_id}.docx"
            
            # Write markdown to temp file
            with open(temp_md_path, "w", encoding="utf-8") as f:
                f.write(markdown_content)
            
            # Use pypandoc to convert from markdown to docx
            # Setup additional options for pandoc
            pandoc_args = []
            
            # Add a title page if requested
            if options.include_title_page:
                # Extract report details for title page
                pandoc_args.extend([
                    "--metadata", f"title={report.name}",
                ])
                
                if report.description:
                    pandoc_args.extend([
                        "--metadata", f"subtitle={report.description}",
                    ])
                
                # Add current date to title page
                today = datetime.now().strftime("%B %d, %Y")
                pandoc_args.extend([
                    "--metadata", f"date={today}",
                ])
            
            # Convert the markdown to docx
            logger.info(f"Converting report {report_id} to DOCX using pypandoc")
            pypandoc.convert_file(
                str(temp_md_path),
                "docx",
                outputfile=str(temp_docx_path),
                extra_args=pandoc_args
            )
            
            # Check if the conversion was successful
            if not temp_docx_path.exists():
                raise Exception("Word document generation failed")
            
            # Step 4: Return the file as a downloadable response
            safe_filename = f"{report.name.replace(' ', '_')}.docx"
            
            logger.info(f"Successfully exported report {report_id} to Word document")
            
            # Create the response
            response = FileResponse(
                path=str(temp_docx_path),
                filename=safe_filename,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
            
            # Schedule cleanup function to run in background after response is sent
            # Wait a few seconds before cleaning up to ensure the file is fully served
            async def delayed_cleanup():
                await asyncio.sleep(10)  # Wait 10 seconds before cleanup
                try:
                    import shutil
                    shutil.rmtree(temp_dir, ignore_errors=True)
                    logger.info(f"Cleaned up temporary directory: {temp_dir}")
                except Exception as e:
                    logger.warning(f"Failed to clean up temporary directory: {temp_dir}, error: {str(e)}")
                    
            # Replace the original cleanup task with our delayed version
            asyncio.create_task(delayed_cleanup())
            
            return response
                
        except subprocess.CalledProcessError as e:
            logger.error(f"Pandoc conversion error: {str(e)}", exc_info=True)
            return ErrorResponse(
                detail=ErrorDetail(
                    code=ErrorCodes.UNKNOWN_ERROR,
                    message=f"Word document conversion failed: {str(e)}"
                ),
                timestamp=now
            )
        except Exception as e:
            logger.error(f"Error in Word export conversion: {str(e)}", exc_info=True)
            return ErrorResponse(
                detail=ErrorDetail(
                    code=ErrorCodes.UNKNOWN_ERROR,
                    message=f"Word document generation failed: {str(e)}"
                ),
                timestamp=now
            )
            
    except Exception as e:
        logger.error(f"Unexpected error exporting report {report_id} to Word: {str(e)}", exc_info=True)
        return ErrorResponse(
            detail=ErrorDetail(
                code=ErrorCodes.UNKNOWN_ERROR,
                message=f"An unexpected error occurred during Word export: {str(e)}"
            ),
            timestamp=now
        )

async def generate_export_markdown(report: Report) -> str:
    """
    Generate clean markdown content for export purposes.
    This version only includes AI-generated content for generative sections, not instructions.
    
    Args:
        report: The report definition to use
        
    Returns:
        str: Clean markdown content for export
    """
    logger.info(f"Generating export-ready markdown for report: {report.id}")
    markdown_parts = []  # Initialize a list to hold parts of the markdown
    
    # Add report title and description
    markdown_parts.append(f"# {report.name}\n")
    
    if report.description:
        markdown_parts.append(f"{report.description}\n\n")  # Add extra newline for spacing after description

    # Process each element in the report
    logger.info(f"Processing {len(report.content.elements)} elements for export")
    has_missing_content = False
    
    for element in report.content.elements:
        if element.title:
            markdown_parts.append(f"## {element.title}\n")
        
        if element.type == 'explicit':
            # For explicit elements, directly use the content
            if element.content:
                markdown_parts.append(f"{element.content}\n")
        elif element.type == 'generative':
            # For generative elements, use the generated content if available
            if element.ai_generated_content:
                # Use the AI-generated content directly (no instructions)
                markdown_parts.append(f"{element.ai_generated_content}\n")
            else:
                # If no generated content exists, log a warning - this content should be generated first
                has_missing_content = True
                logger.warning(f"Missing AI-generated content for section '{element.title or 'Untitled'}' - generation required")
                # Skip this section in the output

        markdown_parts.append("\n")  # Add spacing
    
    if has_missing_content:
        logger.warning(f"Report {report.id} has sections with missing AI-generated content")
        
    return "".join(markdown_parts)  # Join all parts together

# Add other report builder related endpoints here 

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await ws_manager.connect(websocket, client_id)
    try:
        while True:
            # Wait for messages from the client
            data = await websocket.receive_text()
            # Echo back for testing/debugging 
            await websocket.send_json({
                "type": "echo",
                "data": f"Message received: {data}"
            })
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, client_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket, client_id) 

# Add a new endpoint for regenerating a specific section
@app.post("/api/report_builder/reports/{report_id}/sections/{element_id}/regenerate", response_model=Union[Dict[str, Any], ErrorResponse])
async def regenerate_section(report_id: str, element_id: str, request: Request, client_id: Optional[str] = Query(None)):
    """
    Regenerate a specific section of a report.
    
    This endpoint regenerates just one section of a report rather than the entire report.
    It maintains context from both preceding and following sections to ensure consistency
    and coherence throughout the entire report. This comprehensive context awareness
    helps the AI generate content that fits seamlessly with existing sections.
    
    Args:
        report_id: The ID of the report containing the section
        element_id: The ID of the specific element/section to regenerate
        request: The request object containing instructions in the body
        client_id: Optional client ID for WebSocket updates
        
    Returns:
        The regenerated content for the section
    """
    logger.info(f"Received request to regenerate section {element_id} in report {report_id}")
    
    # Parse request body to get instructions
    try:
        body = await request.json()
        instructions = body.get("instructions", "")
        logger.info(f"Received instructions for regeneration: {instructions}")
    except Exception as e:
        logger.error(f"Error parsing request body: {str(e)}")
        instructions = ""
    
    # Load the report
    report = load_report_from_file(REPORTS_DIR / f"{report_id}.json")
    if not report:
        logger.error(f"Report not found: {report_id}")
        return ErrorResponse(
            detail=ErrorDetail(code=ErrorCodes.REPORT_NOT_FOUND, message="Report not found"),
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
    
    # Find the specific element to regenerate
    target_element = None
    element_index = -1
    for i, element in enumerate(report.content.elements):
        if element.id == element_id:
            target_element = element
            element_index = i
            break
    
    if not target_element:
        logger.error(f"Element {element_id} not found in report {report_id}")
        return ErrorResponse(
            detail=ErrorDetail(
                code=ErrorCodes.GENERATION_FAILED, 
                message=f"Section with ID {element_id} not found in report"
            ),
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
    
    # Verify this is a generative element
    if target_element.type != 'generative':
        logger.error(f"Element {element_id} is not a generative section")
        return ErrorResponse(
            detail=ErrorDetail(
                code=ErrorCodes.GENERATION_FAILED, 
                message="Only generative sections can be regenerated"
            ),
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
    
    # Update instructions if provided in request body
    if instructions:
        target_element.instructions = instructions
    elif not target_element.instructions:
        logger.warning(f"No instructions provided for element {element_id} regeneration")
        return ErrorResponse(
            detail=ErrorDetail(
                code=ErrorCodes.GENERATION_FAILED,
                message="No instructions provided for generation"
            ),
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
    
    # Check if report has a vector store and it exists
    if report.vectorStoreId:
        try:
            # Verify that the vector store exists
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{EMBEDDING_SERVICE_BASE_URL}/api/embedding/vectorstores/{report.vectorStoreId}")
                if response.status_code == 404:
                    logger.warning(f"Report {report_id} references non-existent vector store ID: {report.vectorStoreId}")
                    return ErrorResponse(
                        detail=ErrorDetail(
                            code=ErrorCodes.VECTOR_STORE_ERROR,
                            message=f"Vector store with ID {report.vectorStoreId} not found"
                        ),
                        timestamp=datetime.utcnow().isoformat() + "Z"
                    )
                response.raise_for_status()
        except (httpx.RequestError, httpx.HTTPStatusError) as e:
            logger.error(f"Error verifying vector store: {str(e)}")
            return ErrorResponse(
                detail=ErrorDetail(
                    code=ErrorCodes.VECTOR_STORE_ERROR,
                    message=f"Error accessing vector store: {str(e)}"
                ),
                timestamp=datetime.utcnow().isoformat() + "Z"
            )
    
    # Send WebSocket update that generation is starting
    if client_id:
        try:
            await ws_manager.send_json({
                "type": "generation_status",
                "data": {
                    "report_id": report_id,
                    "element_id": element_id,
                    "status": "generating",
                    "message": f"Regenerating section: {target_element.title or 'Untitled'} with full report context"
                }
            }, client_id)
        except Exception as e:
            logger.error(f"Failed to send WebSocket status update: {e}")
    
    try:
        # Build context from all preceding sections and following sections
        preceding_contents = []
        
        # First add content from all preceding sections
        for i in range(element_index):
            element = report.content.elements[i]
            if element.type == 'explicit' and element.content:
                section_content = f"## {element.title or 'Untitled Section'}\n{element.content}"
                preceding_contents.append(section_content)
            elif element.type == 'generative' and element.ai_generated_content:
                section_content = f"## {element.title or 'Untitled Section'}\n{element.ai_generated_content}"
                preceding_contents.append(section_content)
        
        # Add content from following sections too, but mark them clearly
        following_contents = []
        for i in range(element_index + 1, len(report.content.elements)):
            element = report.content.elements[i]
            if element.type == 'explicit' and element.content:
                section_content = f"## {element.title or 'Untitled Section'}\n{element.content}"
                following_contents.append(section_content)
            elif element.type == 'generative' and element.ai_generated_content:
                section_content = f"## {element.title or 'Untitled Section'}\n{element.ai_generated_content}"
                following_contents.append(section_content)
        
        # Get the preceding content within token limits - allocate more tokens for better context awareness
        TOKEN_LIMIT = 1500  # Increased from 1000 to allow for more comprehensive context
        
        # Function to estimate tokens (same as in generate_report)
        def estimate_tokens(text):
            return len(text) // 4
            
        def get_context_within_limit(contents, token_limit):
            combined = ""
            total_tokens = 0
            
            for content in reversed(contents):  # Most recent first
                content_tokens = estimate_tokens(content)
                
                if total_tokens + content_tokens > token_limit:
                    if total_tokens == 0:  # Take partial if nothing added yet
                        chars_to_take = token_limit * 4
                        partial_content = content[:chars_to_take] + "... [truncated]"
                        combined = partial_content
                    break
                
                if combined:
                    combined = content + "\n\n" + combined
                else:
                    combined = content
                    
                total_tokens += content_tokens
                
                if total_tokens >= token_limit:
                    break
                    
            return combined
        
        # Balance token allocation based on available context
        # If we have both preceding and following content, divide tokens equally
        # Otherwise, use most of the tokens for whichever context we do have
        preceding_token_limit = TOKEN_LIMIT // 2
        following_token_limit = TOKEN_LIMIT // 2
        
        if not preceding_contents and following_contents:
            following_token_limit = int(TOKEN_LIMIT * 0.8)  # Use 80% for following if no preceding
        elif preceding_contents and not following_contents:
            preceding_token_limit = int(TOKEN_LIMIT * 0.8)  # Use 80% for preceding if no following
        
        # Get preceding and following context with balanced token allocation
        preceding_context = get_context_within_limit(preceding_contents, preceding_token_limit)
        following_context = get_context_within_limit(following_contents, following_token_limit)
        
        # Combine contexts with clear separation and guidance for the LLM
        combined_context = ""
        if preceding_context:
            combined_context += "PRECEDING SECTIONS (maintain consistency with these):\n" + preceding_context + "\n\n"
        if following_context:
            combined_context += "FOLLOWING SECTIONS (ensure your generated content leads coherently into these):\n" + following_context
        
        # Add report metadata for better context
        if report.description:
            report_meta = f"REPORT OVERVIEW: {report.name} - {report.description}\n\n"
            combined_context = report_meta + combined_context
        
        # Generate content with all available context
        logger.info(f"Regenerating content for element {target_element.id} with comprehensive report context")
        
        # Use the existing generate_element_content function but with our enhanced context
        generated_content = await generate_element_content(
            element=target_element,
            vector_store_id=report.vectorStoreId,
            previous_content=combined_context
        )
        
        if not generated_content:
            logger.error(f"Generated content is empty for element {target_element.id}")
            
            # Send error via WebSocket
            if client_id:
                await ws_manager.send_json({
                    "type": "generation_status",
                    "data": {
                        "report_id": report_id,
                        "element_id": element_id,
                        "status": "error",
                        "error": "Generated content was empty"
                    }
                }, client_id)
                
            return ErrorResponse(
                detail=ErrorDetail(
                    code=ErrorCodes.GENERATION_FAILED,
                    message="Generated content was empty"
                ),
                timestamp=datetime.utcnow().isoformat() + "Z"
            )
        
        # Update the element with new content
        target_element.ai_generated_content = generated_content
        
        # Save the updated report
        save_report_to_file(report)
        
        # Send WebSocket update with the new content
        if client_id:
            await ws_manager.send_json({
                "type": "generation_status",
                "data": {
                    "report_id": report_id,
                    "element_id": element_id,
                    "status": "completed",
                    "content": generated_content
                }
            }, client_id)
            
        logger.info(f"Successfully regenerated content for element {target_element.id}")
        
        # Return the regenerated content
        return {
            "element_id": element_id,
            "content": generated_content,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error regenerating content for element {element_id}: {str(e)}", exc_info=True)
        
        # Send error via WebSocket
        if client_id:
            try:
                await ws_manager.send_json({
                    "type": "generation_status",
                    "data": {
                        "report_id": report_id,
                        "element_id": element_id,
                        "status": "error",
                        "error": str(e)
                    }
                }, client_id)
            except Exception as ws_err:
                logger.error(f"Failed to send error via WebSocket: {ws_err}")
                
        return ErrorResponse(
            detail=ErrorDetail(
                code=ErrorCodes.GENERATION_FAILED,
                message=f"Error regenerating section: {str(e)}"
            ),
            timestamp=datetime.utcnow().isoformat() + "Z"
        ) 