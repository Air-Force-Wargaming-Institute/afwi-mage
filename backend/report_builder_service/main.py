from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
import uuid
import json
from pathlib import Path
import httpx # For making async HTTP requests
import os

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

# New Pydantic model for our endpoint's response structure
class ReportBuilderVectorStoreInfo(BaseModel):
    id: str
    name: str

class GeneratedReportMarkdown(BaseModel):
    report_id: str
    markdown_content: str

REPORTS_DATA_FILE = Path(__file__).parent / "reports_data.json"

# In-memory database for reports, loaded from/saved to JSON file
# Now Report is defined
fake_reports_db: List[Report] = []

def load_reports_from_file() -> List[Report]:
    if REPORTS_DATA_FILE.exists():
        with open(REPORTS_DATA_FILE, "r") as f:
            try:
                data = json.load(f)
                # Ensure Report model is fully defined before list comprehension
                return [Report(**report_data) for report_data in data]
            except json.JSONDecodeError:
                return [] # Return empty list if file is corrupted or empty
    return []

def save_reports_to_file(reports: List[Report]):
    with open(REPORTS_DATA_FILE, "w") as f:
        json.dump([report.dict() for report in reports], f, indent=4)

# Load initial data when the app starts
# Ensure load_reports_from_file uses the now-defined Report model
fake_reports_db = load_reports_from_file()

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
    fake_reports_db.append(new_report)
    save_reports_to_file(fake_reports_db)
    return new_report

@app.get("/api/report_builder/reports", response_model=List[Report])
async def get_reports():
    # Simulate fetching all reports
    return fake_reports_db

@app.get("/api/report_builder/reports/{report_id}", response_model=Report)
async def get_report(report_id: str):
    for report in fake_reports_db:
        if report.id == report_id:
            return report
    raise HTTPException(status_code=404, detail="Report not found")

@app.put("/api/report_builder/reports/{report_id}", response_model=Report)
async def update_report(report_id: str, report_update: ReportCreate):
    from datetime import datetime
    now = datetime.utcnow().isoformat() + "Z"
    for i, report in enumerate(fake_reports_db):
        if report.id == report_id:
            updated_data = report_update.dict(exclude_unset=True)
            
            current_report_data = report.dict()
            
            for key, value in updated_data.items():
                if key == 'content' and isinstance(value, dict):
                    current_report_data[key] = ReportContent(**value)
                else:
                    current_report_data[key] = value
            
            current_report_data['updatedAt'] = now
            current_report_data['id'] = report_id
            
            updated_instance = Report(**current_report_data)
            fake_reports_db[i] = updated_instance
            save_reports_to_file(fake_reports_db)
            return updated_instance
            
    raise HTTPException(status_code=404, detail="Report not found")

@app.delete("/api/report_builder/reports/{report_id}", status_code=204)
async def delete_report(report_id: str):
    global fake_reports_db
    report_to_remove = None
    for report in fake_reports_db:
        if report.id == report_id:
            report_to_remove = report
            break
    if not report_to_remove:
        raise HTTPException(status_code=404, detail="Report not found")
    fake_reports_db.remove(report_to_remove)
    save_reports_to_file(fake_reports_db)
    return

@app.post("/api/report_builder/reports/{report_id}/generate", response_model=GeneratedReportMarkdown)
async def generate_report_placeholder(report_id: str):
    report_to_generate = None
    for report_in_db in fake_reports_db:
        if report_in_db.id == report_id:
            report_to_generate = report_in_db
            break
    
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

@app.get("/api/report_builder/health")
async def health_check():
    return {"status": "healthy"}

@app.get("")
async def root():
    return {"message": "Report Builder Service is running"}

# Add other report builder related endpoints here 