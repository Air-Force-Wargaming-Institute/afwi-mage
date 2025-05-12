from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
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

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("report_builder_service")

app = FastAPI()

# Define Pydantic models first
class ReportElement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: Optional[str] = None
    type: Literal['explicit', 'generative']
    format: Optional[str] = None
    content: Optional[str] = None
    instructions: Optional[str] = None

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

# It's good practice to get service URLs from environment variables or a config service
# Ensure this matches your docker-compose service name and port for embedding_service
EMBEDDING_SERVICE_BASE_URL = os.getenv("EMBEDDING_SERVICE_URL", "http://embedding_service:8006")

# Define LLM service URL from environment variable with default fallback
MAGE_LLM_SERVICE_URL = os.getenv("MAGE_LLM_SERVICE_URL", "http://generation_service:8003")

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
        content=report_in.content
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
    
    for key, value in updated_data.items():
        if key == 'content' and isinstance(value, dict):
            current_report_data[key] = ReportContent(**value)
        else:
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
async def generate_report(report_id: str):
    """
    Generate a report using MAGE LLM service for the 'generative' elements.
    
    Args:
        report_id (str): The ID of the report to generate
        
    Returns:
        GeneratedReportMarkdown: The generated report markdown content
        
    Raises:
        HTTPException: If report not found or generation fails
    """
    now = datetime.utcnow().isoformat() + "Z"  # For error timestamps
    
    try:
        # Load the report definition
        report_path = REPORTS_DIR / f"{report_id}.json"
        report_to_generate = load_report_from_file(report_path)
        
        if not report_to_generate:
            logger.warning(f"Report with ID {report_id} not found")
            return ErrorResponse(
                detail=ErrorDetail(
                    code=ErrorCodes.REPORT_NOT_FOUND,
                    message=f"Report with ID {report_id} not found"
                ),
                timestamp=now
            )

        # Check if the report has a vector store ID but the vector store doesn't exist
        if report_to_generate.vectorStoreId:
            try:
                # Verify that the vector store exists by making a call to the embedding service
                async with httpx.AsyncClient() as client:
                    response = await client.get(f"{EMBEDDING_SERVICE_BASE_URL}/api/embedding/vectorstores/{report_to_generate.vectorStoreId}")
                    if response.status_code == 404:
                        logger.warning(f"Report {report_id} references non-existent vector store ID: {report_to_generate.vectorStoreId}")
                        return ErrorResponse(
                            detail=ErrorDetail(
                                code=ErrorCodes.VECTOR_STORE_ERROR,
                                message=f"Vector store with ID {report_to_generate.vectorStoreId} not found"
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

        # Check MAGE service availability
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{MAGE_LLM_SERVICE_URL}/api/generation/health")
                response.raise_for_status()
        except (httpx.RequestError, httpx.HTTPStatusError) as e:
            logger.error(f"MAGE service is not available: {str(e)}")
            return ErrorResponse(
                detail=ErrorDetail(
                    code=ErrorCodes.MAGE_SERVICE_ERROR,
                    message=f"MAGE service is not available. Please try again later."
                ),
                timestamp=now
            )

        logger.info(f"Generating report for ID: {report_id}")
        markdown_parts = []  # Initialize a list to hold parts of the markdown
        markdown_parts.append(f"# {report_to_generate.name}\n")

        if report_to_generate.description:
            markdown_parts.append(f"{report_to_generate.description}\n\n")  # Add extra newline for spacing after description

        # Track any errors encountered during generation
        generation_errors = []

        # Process each element in the report
        logger.info(f"Processing {len(report_to_generate.content.elements)} elements")
        for element in report_to_generate.content.elements:
            if element.title:
                markdown_parts.append(f"## {element.title}\n")
            
            if element.type == 'explicit':
                # For explicit elements, directly use the content
                if element.content:
                    markdown_parts.append(f"{element.content}\n")
            elif element.type == 'generative':
                try:
                    # For generative elements, call MAGE service
                    logger.info(f"Generating content for element ID: {element.id}")
                    generated_content = await generate_element_content(
                        element, 
                        report_to_generate.vectorStoreId,
                        previous_content="".join(markdown_parts)  # Pass previously generated content as context
                    )
                    markdown_parts.append(f"{generated_content}\n")
                except Exception as e:
                    # Log the specific error but continue with a placeholder
                    logger.error(f"Error generating content for element {element.id}: {str(e)}", exc_info=True)
                    
                    # Categorize the error
                    error_message = str(e)
                    error_code = ErrorCodes.GENERATION_FAILED
                    
                    if "Error connecting to MAGE service" in error_message:
                        error_code = ErrorCodes.MAGE_SERVICE_ERROR
                    elif "Vector store" in error_message:
                        error_code = ErrorCodes.VECTOR_STORE_ERROR
                    
                    # Add to the list of errors
                    generation_errors.append({
                        "element_id": element.id,
                        "element_title": element.title or "Untitled Element",
                        "error_code": error_code,
                        "error_message": error_message
                    })
                    
                    # Add a placeholder indicating the error
                    error_placeholder = f"*[Error generating AI content: {error_message}]*\n"
                    if element.instructions:
                        error_placeholder += f"*Instructions: {element.instructions}*\n"
                    markdown_parts.append(error_placeholder)
            
            markdown_parts.append("\n")  # Add a blank line for spacing after each element section

        full_markdown = "".join(markdown_parts)  # Join without double newlines if parts already end with one
        
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
    """
    Generate content for a report element using MAGE LLM service.
    
    Args:
        element: The report element to generate content for
        vector_store_id: Optional ID of vector store to use for context
        previous_content: Previously generated content for context
        
    Returns:
        str: The generated content
        
    Raises:
        Exception: If generation fails
    """
    if not element.instructions:
        logger.warning(f"No instructions provided for generative element ID: {element.id}")
        return "*[No instructions provided for AI generation]*"
    
    try:
        # Prepare the prompt for MAGE
        prompt = f"""Generate content for a report section with the following instructions:
        
Instructions: {element.instructions}

This content will be part of a larger report. Here is the content generated so far:
{previous_content}

Please generate markdown-formatted content for this section that follows the instructions.
"""

        # Add vector store context if available
        if vector_store_id:
            logger.info(f"Using vector store ID: {vector_store_id} for element ID: {element.id}")
            prompt += f"\nPlease use information from vector store with ID: {vector_store_id}"
            
        # Call MAGE service
        logger.info(f"Calling MAGE service for element ID: {element.id}")
        async with httpx.AsyncClient(timeout=120.0) as client:  # 2-minute timeout
            url = f"{MAGE_LLM_SERVICE_URL}/api/generation/text"
            
            payload = {
                "prompt": prompt,
                "max_tokens": 1500,  # Reasonable limit for a report section
                "temperature": 0.7,  # Balanced between creative and consistent
            }
            
            # If vector store is specified, add it to the payload
            if vector_store_id:
                payload["vector_store_id"] = vector_store_id
                
            logger.debug(f"Sending request to MAGE at URL: {url}")
            response = await client.post(url, json=payload)
            response.raise_for_status()  # Raise HTTP errors
            
            result = response.json()
            logger.debug(f"Received response from MAGE for element ID: {element.id}")
            
            # Extract the generated content
            if "text" in result:
                return result["text"]
            elif "content" in result:
                return result["content"]
            elif "message" in result:
                return result["message"]
            else:
                logger.error(f"Unexpected response format from MAGE service: {result}")
                raise ValueError("Unexpected response format from MAGE service")
                
    except httpx.RequestError as exc:
        # Network-related errors
        error_msg = f"Error connecting to MAGE service: {str(exc)}"
        logger.error(error_msg)
        raise Exception(error_msg)
        
    except httpx.HTTPStatusError as exc:
        # HTTP response errors (4XX, 5XX)
        status_code = exc.response.status_code
        try:
            error_detail = exc.response.json()
            error_msg = f"MAGE service returned HTTP {status_code}: {error_detail.get('detail', str(exc))}"
        except:
            error_msg = f"MAGE service returned HTTP {status_code}: {str(exc)}"
        
        logger.error(error_msg)
        raise Exception(error_msg)
        
    except Exception as e:
        # Any other unexpected errors
        error_msg = f"Unexpected error during content generation: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise Exception(error_msg)

# Template endpoints
@app.post("/api/report_builder/templates", response_model=Template)
async def create_template(template_in: TemplateCreate):
    from datetime import datetime
    now = datetime.utcnow().isoformat() + "Z"
    template_id = str(uuid.uuid4())
    
    new_template = Template(
        id=template_id,
        name=template_in.name,
        description=template_in.description,
        category=template_in.category,
        createdAt=now,
        updatedAt=now,
        content=template_in.content
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
                # No existing content, generate it
                logger.info(f"No existing content found, generating report {report_id} for Word export")
                generation_result = await generate_report(report_id)
                
                # Check if we got an error response
                if hasattr(generation_result, 'error') and generation_result.error:
                    return generation_result  # Return the error response
                
                markdown_content = generation_result.markdown_content
                
                # Save the generated content for future use
                with open(report_content_path, "w", encoding="utf-8") as f:
                    f.write(markdown_content)
        
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

# Add other report builder related endpoints here 