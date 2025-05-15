from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Union
from datetime import datetime
import uuid
import json

from models.schemas import Report, ReportCreate, GeneratedReportMarkdown, ErrorResponse, ErrorCodes
from services.file_service import load_report_from_file, save_report_to_file, load_all_reports
from utils.errors import create_error_response
from config import REPORTS_DIR, logger

router = APIRouter(prefix="/api/report_builder/reports", tags=["reports"])

@router.post("", response_model=Report)
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
                processed_elements.append(element_dict)
            elif element.type == 'generative':
                # For generative elements, ensure ai_generated_content is present (either with value or None)
                if 'ai_generated_content' not in element_dict:
                    element_dict['ai_generated_content'] = None
                processed_elements.append(element_dict)
            else:
                # Unknown type, ensure ai_generated_content is at least null
                element_dict['ai_generated_content'] = None
                processed_elements.append(element_dict)
        
        # Create a new content object with processed elements
        content_dict = report_in.content.dict()
        content_dict['elements'] = processed_elements
    else:
        content_dict = report_in.content.dict() if report_in.content else {'elements': []}
    
    # Create the new report dict
    new_report_dict = {
        "id": report_id,
        "name": report_in.name,
        "description": report_in.description,
        "type": report_in.type,
        "templateId": report_in.templateId,
        "vectorStoreId": report_in.vectorStoreId,
        "createdAt": now,
        "updatedAt": now,
        "status": "draft",
        "content": content_dict
    }
    
    # Create the report object
    new_report = Report(**new_report_dict)
    
    # Save the report to its own file
    save_report_to_file(new_report)
    
    return new_report

@router.get("", response_model=List[Report])
async def get_reports():
    # Load all reports from individual files
    return load_all_reports()

@router.get("/{report_id}", response_model=Report)
async def get_report(report_id: str):
    report_path = REPORTS_DIR / f"{report_id}.json"
    report = load_report_from_file(report_path)
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return report

@router.put("/{report_id}", response_model=Report)
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

@router.delete("/{report_id}", status_code=204)
async def delete_report(report_id: str):
    report_path = REPORTS_DIR / f"{report_id}.json"
    
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Delete the report file
    report_path.unlink()
    
    return 