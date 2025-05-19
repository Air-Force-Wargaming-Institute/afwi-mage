from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Union
from datetime import datetime
import uuid
import json

from models.schemas import Report, ReportCreate, GeneratedReportMarkdown, ErrorResponse, ErrorCodes, ReportElement
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
    
    updated_data = report_update.dict(exclude_unset=True) # Data from the request payload
    current_report_data = existing_report.dict() # Data loaded from the file
    
    # Step 1: Update all top-level fields from the payload, EXCEPT for 'content'.
    # This ensures 'name', 'description', 'vectorStoreId', 'type', 'status', etc., are updated.
    for key, value in updated_data.items():
        if key != 'content':
            current_report_data[key] = value

    # Step 2: Handle the 'content' field and its 'elements' separately with merging logic.
    if 'content' in updated_data and isinstance(updated_data['content'], dict):
        # Ensure 'content' object exists in current_report_data (it should for an update)
        if 'content' not in current_report_data or not isinstance(current_report_data.get('content'), dict):
            current_report_data['content'] = {'elements': []} # Initialize if somehow missing
        
        # Update elements if they are provided in the payload's content
        if 'elements' in updated_data['content']:
            new_elements_list = []
            # Create a map of existing elements by ID for efficient lookup
            existing_elements_map = {
                el['id']: el 
                for el in current_report_data['content'].get('elements', []) 
                if isinstance(el, dict) and 'id' in el
            }

            for element_payload in updated_data['content']['elements']:
                if not isinstance(element_payload, dict):
                    # Skip malformed elements in payload, or handle as an error
                    continue 
                
                element_id = element_payload.get('id')
                
                # Start with the existing element's data if an ID match is found
                working_element = {}
                if element_id and element_id in existing_elements_map:
                    working_element.update(existing_elements_map[element_id])
                
                # Override with values from the payload for this element
                working_element.update(element_payload)

                # Ensure type-specific handling for ai_generated_content and default type
                element_type = working_element.get('type')
                if element_type == 'explicit':
                    working_element['ai_generated_content'] = None
                elif element_type == 'generative':
                    # Ensure ai_generated_content field exists, even if it's null from payload
                    if 'ai_generated_content' not in working_element:
                        working_element['ai_generated_content'] = None
                else: # Default handling for unknown or missing type
                    if not element_type: # If type is missing from payload and not existing
                        working_element['type'] = 'explicit' # Default to 'explicit'
                    working_element['ai_generated_content'] = None # Default for safety
                
                new_elements_list.append(working_element)
            
            current_report_data['content']['elements'] = new_elements_list
            
        # Update any other direct properties of the 'content' object (besides 'elements')
        # For example, if content could have its own description: content: { description: "...", elements: [] }
        for content_key, content_value in updated_data['content'].items():
            if content_key != 'elements':
                current_report_data['content'][content_key] = content_value
    
    # Step 3: Update the 'updatedAt' timestamp.
    current_report_data['updatedAt'] = now
    
    # Create a Report model instance from the merged data and save it.
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