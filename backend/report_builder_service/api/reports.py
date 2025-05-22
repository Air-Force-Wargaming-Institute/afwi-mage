from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Union
from datetime import datetime
import uuid
import json

from models.schemas import Report, ReportCreate, GeneratedReportMarkdown, ErrorResponse, ErrorCodes, ReportElement, Section, ReportItem
from services.file_service import load_report_from_file, save_report_to_file, load_all_reports
from utils.errors import create_error_response
from config import REPORTS_DIR, logger

router = APIRouter(prefix="/api/report_builder/reports", tags=["reports"])

def process_content_items(content_items: List[ReportItem]) -> List[dict]:
    """Process content items (sections and elements) ensuring proper parent-child relationships"""
    processed_items = []
    
    for item in content_items:
        item_dict = item.dict(exclude_unset=True) if hasattr(item, 'dict') else item
        
        if item_dict.get('item_type') == 'section':
            # Process section
            section_id = item_dict.get('id')
            
            # Ensure section has elements array
            if 'elements' not in item_dict:
                item_dict['elements'] = []
            
            # Process each child element to ensure proper parent_uuid
            for child_element in item_dict['elements']:
                if isinstance(child_element, dict):
                    child_element['parent_uuid'] = section_id
                    child_element['item_type'] = 'element'
                    
                    # Ensure proper ai_generated_content handling
                    element_type = child_element.get('type')
                    if element_type == 'explicit':
                        child_element['ai_generated_content'] = None
                    elif element_type == 'generative':
                        if 'ai_generated_content' not in child_element:
                            child_element['ai_generated_content'] = None
            
            processed_items.append(item_dict)
            
            # Add child elements to flat structure (dual state management)
            processed_items.extend(item_dict['elements'])
            
        elif item_dict.get('item_type') == 'element':
            # Process standalone element
            if 'parent_uuid' not in item_dict:
                item_dict['parent_uuid'] = None
                
            # Ensure proper ai_generated_content handling
            element_type = item_dict.get('type')
            if element_type == 'explicit':
                item_dict['ai_generated_content'] = None
            elif element_type == 'generative':
                if 'ai_generated_content' not in item_dict:
                    item_dict['ai_generated_content'] = None
            else:
                # Default to explicit type if missing
                if not element_type:
                    item_dict['type'] = 'explicit'
                item_dict['ai_generated_content'] = None
                
            processed_items.append(item_dict)
    
    return processed_items

def convert_legacy_elements_to_items(elements: List[dict]) -> List[dict]:
    """Convert legacy content.elements structure to new content.items structure"""
    items = []
    for element in elements:
        element_dict = dict(element)
        element_dict['item_type'] = 'element'
        if 'parent_uuid' not in element_dict:
            element_dict['parent_uuid'] = None
        items.append(element_dict)
    return items

def handle_content_compatibility(content_data: dict) -> dict:
    """Handle backward compatibility between old elements and new items structure"""
    result_content = {}
    
    # Check if we have the new items structure
    if 'items' in content_data:
        # New structure - process normally
        items = content_data['items']
        if isinstance(items, list):
            # Convert Pydantic models to dicts if needed
            items_dicts = []
            for item in items:
                if hasattr(item, 'dict'):
                    items_dicts.append(item.dict(exclude_unset=True))
                else:
                    items_dicts.append(item)
            processed_items = process_content_items(items_dicts)
            result_content['items'] = processed_items
        else:
            result_content['items'] = []
    
    # Check if we have the legacy elements structure (for backward compatibility)
    elif 'elements' in content_data:
        # Legacy structure - convert to new format
        elements = content_data['elements']
        if isinstance(elements, list):
            items = convert_legacy_elements_to_items(elements)
            processed_items = process_content_items(items)
            result_content['items'] = processed_items
        else:
            result_content['items'] = []
    
    else:
        # Neither structure present - initialize empty
        result_content['items'] = []
    
    # Copy any other content properties
    for key, value in content_data.items():
        if key not in ['items', 'elements']:
            result_content[key] = value
    
    return result_content

@router.post("", response_model=Report)
async def create_report(report_in: ReportCreate):
    from datetime import datetime
    now = datetime.utcnow().isoformat() + "Z"
    report_id = str(uuid.uuid4())
    
    # Handle content structure (new items vs legacy elements)
    content_dict = handle_content_compatibility(report_in.content.dict() if report_in.content else {})
    
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
    for key, value in updated_data.items():
        if key != 'content':
            current_report_data[key] = value

    # Step 2: Handle the 'content' field with new items/sections structure
    if 'content' in updated_data and isinstance(updated_data['content'], dict):
        # Ensure 'content' object exists in current_report_data
        if 'content' not in current_report_data or not isinstance(current_report_data.get('content'), dict):
            current_report_data['content'] = {'items': []}
        
        # Handle content structure compatibility
        new_content = handle_content_compatibility(updated_data['content'])
        
        # If we have items in the payload, process them
        if 'items' in new_content:
            # Create a map of existing items by ID for efficient lookup
            existing_items = current_report_data['content'].get('items', [])
            existing_items_map = {}
            
            for item in existing_items:
                if isinstance(item, dict) and 'id' in item:
                    existing_items_map[item['id']] = item
            
            # Process new items from payload
            new_items_list = []
            for item in new_content['items']:
                if not isinstance(item, dict):
                    continue
                
                item_id = item.get('id')
                
                # Start with existing item data if ID matches
                working_item = {}
                if item_id and item_id in existing_items_map:
                    working_item.update(existing_items_map[item_id])
                
                # Override with new data from payload
                working_item.update(item)
                
                # Ensure proper structure for elements
                if working_item.get('item_type') == 'element':
                    element_type = working_item.get('type')
                    if element_type == 'explicit':
                        working_item['ai_generated_content'] = None
                    elif element_type == 'generative':
                        if 'ai_generated_content' not in working_item:
                            working_item['ai_generated_content'] = None
                    else:
                        if not element_type:
                            working_item['type'] = 'explicit'
                        working_item['ai_generated_content'] = None
                
                new_items_list.append(working_item)
            
            current_report_data['content']['items'] = new_items_list
        
        # Update any other content properties
        for content_key, content_value in new_content.items():
            if content_key != 'items':
                current_report_data['content'][content_key] = content_value
    
    # Step 3: Update the 'updatedAt' timestamp
    current_report_data['updatedAt'] = now
    
    # Create a Report model instance from the merged data and save it
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