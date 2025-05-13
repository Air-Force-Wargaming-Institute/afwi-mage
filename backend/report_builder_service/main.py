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

# --- LLM Integration Constants ---
REPORT_SECTION_SYSTEM_PROMPT = (
    "You are an AI assistant tasked with generating a specific section of a technical report. "
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

# Placeholder for the MAGE Generation Service URL
GENERATION_SERVICE_BASE_URL = os.getenv("GENERATION_SERVICE_URL", "http://generation_service:8003")

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
async def generate_report(report_id: str):
    # --- START DEBUG ---
    # logger.info(f"--- DEBUG: Entering generate_report for ID: {report_id} ---")
    # --- END DEBUG ---
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
        # logger.info(f"--- DEBUG: Inside try block for report ID: {report_id} ---") # Add another debug log

        # Load the report definition
        report_path = REPORTS_DIR / f"{report_id}.json"
        # logger.info(f"--- DEBUG: Attempting to load report from: {report_path} ---") # Add another debug log
        report_to_generate = load_report_from_file(report_path)
        # logger.info(f"--- DEBUG: Report loaded: {'Exists' if report_to_generate else 'Not Found'} ---") # Add another debug log
        
        if not report_to_generate:
            logger.warning(f"Report with ID {report_id} not found")
            return ErrorResponse(
                detail=ErrorDetail(
                    code=ErrorCodes.REPORT_NOT_FOUND,
                    message=f"Report with ID {report_id} not found"
                ),
                timestamp=now
            )

        # --- START DEBUG: Temporarily comment out service checks ---
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
                response = await client.get(f"{GENERATION_SERVICE_BASE_URL}/api/generation/health")
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
        # --- END DEBUG: Temporarily comment out service checks ---

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
                # --- LLM Integration Phase 1, Story 2: Call Generation Service ---
                logger.info(f"Found generative element ID: {element.id}, Title: {element.title}")
                logger.info(f"  System Prompt: {REPORT_SECTION_SYSTEM_PROMPT}") # Log the system prompt
                logger.info(f"  User Instructions: {element.instructions}") # Log user instructions

                # --- LLM Integration Phase 1, Story 2: Call Generation Service ---
                full_prompt = f"{REPORT_SECTION_SYSTEM_PROMPT}\\n\\nUser Instructions:\\n{element.instructions}"
                generated_content = None
                error_message = None

                try:
                    async with httpx.AsyncClient(timeout=120.0) as client: # Use a longer timeout for generation
                        payload = {"prompt": full_prompt}
                        url = f"{GENERATION_SERVICE_BASE_URL}/api/generation/text"
                        logger.info(f"Calling Generation Service at: {url} for element {element.id}")
                        response = await client.post(url, json=payload)

                        if response.status_code == 200:
                            response_data = response.json()
                            generated_content = response_data.get("generated_text")
                            if generated_content:
                                logger.info(f"Successfully received generated content for element {element.id}.")
                                # We will use this content in the next user story.
                            else:
                                logger.warning(f"Generation service response for {element.id} missing 'generated_text'. Response: {response.text}")
                                error_message = "Generation service response format incorrect."
                        else:
                            logger.error(f"Generation service call failed for element {element.id}. Status: {response.status_code}, Response: {response.text}")
                            error_message = f"Generation service failed with status {response.status_code}."
                            response.raise_for_status() # Raise an exception for non-200 responses

                except httpx.RequestError as e:
                    logger.error(f"Could not connect to Generation Service for element {element.id}: {str(e)}")
                    error_message = f"Could not connect to Generation Service: {str(e)}"
                except httpx.HTTPStatusError as e:
                    # Already logged above, just re-capture message if needed
                    if not error_message:
                        error_message = f"Generation service failed with status {e.response.status_code}."
                except Exception as e:
                    logger.error(f"An unexpected error occurred during generation call for element {element.id}: {str(e)}", exc_info=True)
                    error_message = f"Unexpected error during generation: {str(e)}"

                # Placeholder logic remains for now, using the result of the API call (or error)
                if generated_content:
                    # --- LLM Integration Phase 1, Story 3: Integrate Content ---
                    # Instead of a placeholder, append the actual generated content
                    logger.info(f"Integrating generated content for element {element.id}")
                    element.ai_generated_content = generated_content # Store in the new dedicated field
                    markdown_parts.append(f"{generated_content}\n")
                    # --- End LLM Integration Phase 1, Story 3 ---
                else:
                    # If the call failed or content was missing, log and use error placeholder
                    error_placeholder = f"*[/Placeholder: Error calling Generation Service for '{element.title or 'Untitled'}'. {error_message or 'Unknown error'}]*\\n"
                    markdown_parts.append(error_placeholder)
                    # Optionally collect these errors like the commented-out section below
                    generation_errors.append({
                        "element_id": element.id,
                        "element_title": element.title or "Untitled Element",
                        "error_code": ErrorCodes.GENERATION_FAILED, # Or MAGE_SERVICE_ERROR
                        "error_message": error_message or "Unknown generation error"
                    })

                # --- End LLM Integration Phase 1, Story 2 ---

            markdown_parts.append("\n")  # Fix double backslash for spacing line

        full_markdown = "".join(markdown_parts)  # Join without double newlines if parts already end with one
        
        # Save the updated report with the generated content back to the file
        save_report_to_file(report_to_generate)

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
            url = f"{GENERATION_SERVICE_BASE_URL}/api/generation/text"
            
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
                # No existing content, generate it
                logger.info(f"No existing content found, generating report {report_id} for Word export")
                
                # Use a clean report generation function that only includes actual content
                markdown_content = await generate_export_markdown(report)
                
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
                # If no generated content yet, leave an indicator
                markdown_parts.append("*[Content not yet generated]*\n")

        markdown_parts.append("\n")  # Add spacing
    
    return "".join(markdown_parts)  # Join all parts together

# Add other report builder related endpoints here 