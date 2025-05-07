from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid

app = FastAPI()

# In-memory database for reports (replace with actual DB later)
fake_reports_db = []

class ReportElement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str # e.g., 'text', 'image', 'chart', 'table'
    content: Any
    # Add other element-specific fields like position, size, etc.

class ReportContent(BaseModel):
    elements: List[ReportElement] = []
    # Potentially add layout, styling info here

class ReportBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "Custom" # Custom, Template-based
    templateId: Optional[str] = None

class ReportCreate(ReportBase):
    content: Optional[ReportContent] = Field(default_factory=ReportContent)

class Report(ReportBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    createdAt: str # ISO format string
    updatedAt: str # ISO format string
    status: str = "draft"
    content: ReportContent

@app.post("/api/report_builder/reports", response_model=Report)
async def create_report(report_in: ReportCreate):
    from datetime import datetime
    now = datetime.utcnow().isoformat() + "Z"
    report_id = str(uuid.uuid4())
    new_report = Report(
        **report_in.dict(),
        id=report_id,
        createdAt=now,
        updatedAt=now,
        status="draft",
        content=report_in.content if report_in.content else ReportContent()
    )
    fake_reports_db.append(new_report)
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
async def update_report(report_id: str, report_update: ReportCreate): # For now, allow full update like create
    from datetime import datetime
    now = datetime.utcnow().isoformat()
    for i, report in enumerate(fake_reports_db):
        if report.id == report_id:
            updated_report_data = report_update.dict(exclude_unset=True)
            # Create a new Report instance for the update to ensure all fields are correctly typed
            # and defaults applied if necessary, especially for nested models like ReportContent.
            current_report_data = report.dict()
            current_report_data.update(updated_report_data)
            current_report_data['updatedAt'] = now
            
            # Ensure content is properly handled
            if 'content' in updated_report_data:
                current_report_data['content'] = ReportContent(**updated_report_data['content'])
            elif not current_report_data.get('content'): # Ensure content exists
                 current_report_data['content'] = ReportContent()

            updated_instance = Report(**current_report_data) # Re-validate with Report model
            fake_reports_db[i] = updated_instance
            return updated_instance
    raise HTTPException(status_code=404, detail="Report not found")

@app.delete("/api/report_builder/reports/{report_id}", status_code=204)
async def delete_report(report_id: str):
    global fake_reports_db
    report_found = False
    for report in fake_reports_db:
        if report.id == report_id:
            report_found = True
            break
    if not report_found:
        raise HTTPException(status_code=404, detail="Report not found")
    fake_reports_db = [r for r in fake_reports_db if r.id != report_id]
    return

@app.get("/api/report_builder/health")
async def health_check():
    return {"status": "healthy"}

# Placeholder for root, if Traefik uses it for an initial check before health_check path is called
@app.get("")
async def root():
    return {"message": "Report Builder Service is running"}

# Add other report builder related endpoints here 