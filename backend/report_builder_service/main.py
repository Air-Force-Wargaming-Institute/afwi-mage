from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
import uuid
import json
from pathlib import Path
import httpx # For making async HTTP requests
import os
import shutil
from init_templates import init_templates

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

@app.post("/api/report_builder/reports/{report_id}/generate", response_model=GeneratedReportMarkdown)
async def generate_report_placeholder(report_id: str):
    report_path = REPORTS_DIR / f"{report_id}.json"
    report_to_generate = load_report_from_file(report_path)
    
    if not report_to_generate:
        raise HTTPException(status_code=404, detail="Report not found")

    markdown_parts = [] # Initialize a list to hold parts of the markdown
    markdown_parts.append(f"# {report_to_generate.name}\n")

    if report_to_generate.description:
        markdown_parts.append(f"{report_to_generate.description}\n\n") # Add extra newline for spacing after description

    for element in report_to_generate.content.elements:
        if element.title:
            markdown_parts.append(f"## {element.title}\n")
        
        if element.type == 'explicit':
            if element.content:
                markdown_parts.append(f"{element.content}\n")
        elif element.type == 'generative':
            # Construct mock content for generative elements
            mock_content = f"*[Placeholder for AI Generation]*\n"
            if element.instructions:
                mock_content += f"*Instructions: {element.instructions}*\n"
            else:
                mock_content += f"*Instructions: N/A*\n"
            
            if report_to_generate.vectorStoreId:
                mock_content += f"*Using Vector Store ID: {report_to_generate.vectorStoreId}*\n"
            else:
                mock_content += f"*Vector Store ID: None linked*\n"
            markdown_parts.append(mock_content)
        
        markdown_parts.append("\n") # Add a blank line for spacing after each element section

    full_markdown = "".join(markdown_parts) # Join without double newlines if parts already end with one
    
    return GeneratedReportMarkdown(report_id=report_id, markdown_content=full_markdown)

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

@app.get("")
async def root():
    return {"message": "Report Builder Service is running"}

# Add other report builder related endpoints here 