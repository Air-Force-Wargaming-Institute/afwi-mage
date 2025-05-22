from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Union, Dict, Any
from datetime import datetime
import uuid

from models.schemas import Report, ReportCreate, ReportContent, Section, ReportElement
from services.file_service import load_report_from_file, save_report_to_file, load_all_reports
from config import REPORTS_DIR, logger

router = APIRouter(prefix="/api/report_builder/reports", tags=["reports"])

def process_element_dict(element_data: Dict[str, Any]) -> Dict[str, Any]:
    """Helper function to process an element dictionary for ai_generated_content."""
    processed_element = element_data.copy()
    if processed_element.get('type') == 'explicit':
        processed_element['ai_generated_content'] = None
    elif processed_element.get('type') == 'generative':
        if 'ai_generated_content' not in processed_element:
            processed_element['ai_generated_content'] = None
    else: # Unknown or missing type
        if not processed_element.get('type'): # Default type if missing
             processed_element['type'] = 'explicit'
        processed_element['ai_generated_content'] = None
    return processed_element

@router.post("", response_model=Report)
async def create_report(report_in: ReportCreate):
    now = datetime.utcnow().isoformat() + "Z"
    report_id = str(uuid.uuid4())

    processed_items_list = []
    if report_in.content and report_in.content.items:
        for item_model in report_in.content.items:
            item_dict = item_model.dict(exclude_unset=True)
            if item_model.item_type == 'element':
                processed_items_list.append(process_element_dict(item_dict))
            elif item_model.item_type == 'section':
                processed_section_elements = []
                if 'elements' in item_dict and isinstance(item_dict['elements'], list):
                    for element_dict_in_section in item_dict['elements']:
                        # Assuming elements within a section are already dicts from Pydantic model
                        # and ReportElement models were used to create them.
                        # We still need to apply the explicit/generative logic.
                        # The element_dict_in_section should conform to ReportElement structure
                        # If it was created from ReportElement model, .type should exist.
                        temp_element_model = ReportElement(**element_dict_in_section)
                        processed_section_elements.append(process_element_dict(temp_element_model.dict(exclude_unset=True)))
                item_dict['elements'] = processed_section_elements
                processed_items_list.append(item_dict)
            else: # Should not happen if validation is correct
                logger.warning(f"Unknown item type encountered during report creation: {item_model.item_type}")
                processed_items_list.append(item_dict)
        
        content_dict = report_in.content.dict(exclude_unset=True) # Use exclude_unset
        content_dict['items'] = processed_items_list
    else:
        # Create default empty content if none provided
        content_dict = ReportContent().dict()

    new_report_dict = {
        "id": report_id,
        "name": report_in.name,
        "description": report_in.description,
        "type": report_in.type,
        "templateId": report_in.templateId,
        "vectorStoreId": report_in.vectorStoreId,
        "createdAt": now,
        "updatedAt": now,
        "status": "draft", # Default status
        "content": content_dict,
        "generation_errors": None, # Initialize optional fields
        "has_errors": False
    }
    
    new_report = Report(**new_report_dict)
    save_report_to_file(new_report)
    return new_report

@router.get("", response_model=List[Report])
async def get_reports():
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
    now = datetime.utcnow().isoformat() + "Z"
    
    report_path = REPORTS_DIR / f"{report_id}.json"
    existing_report = load_report_from_file(report_path)
    
    if not existing_report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    current_report_data = existing_report.dict()
    update_payload_data = report_update.dict(exclude_unset=True)

    # Update top-level fields (excluding content)
    for key, value in update_payload_data.items():
        if key != 'content':
            current_report_data[key] = value

    # Handle content update
    if 'content' in update_payload_data and isinstance(update_payload_data['content'], dict):
        current_content_dict = current_report_data.setdefault('content', {'items': []})
        if not isinstance(current_content_dict, dict): # Should be a dict
             current_content_dict = {'items': []}
        if 'items' not in current_content_dict or not isinstance(current_content_dict.get('items'), list):
            current_content_dict['items'] = []

        # This is the flat list of items from the frontend payload
        payload_items_flat = update_payload_data['content'].get('items', [])
        
        final_ordered_items = []
        sections_lookup: Dict[str, Dict[str, Any]] = {} # To store references to section dicts

        for item_payload_dict in payload_items_flat:
            if not isinstance(item_payload_dict, dict):
                logger.warning(f"Skipping non-dict item in payload_items_flat: {item_payload_dict}")
                continue

            item_id = item_payload_dict.get('id')
            item_type = item_payload_dict.get('item_type')

            if item_type == 'section':
                # Process section: ensure 'elements' list exists, prepare for lookup
                # Children are already transformed and nested by the frontend within item_payload_dict['elements']
                # Backend Section model expects 'elements' to be List[ReportElement]
                # Frontend sends children that are already structured like ReportElement (with item_type, type, parent_uuid)
                
                # Validate and reconstruct child elements to ensure they are valid ReportElement models
                # and apply any necessary backend processing (like process_element_dict).
                processed_child_elements = []
                if 'elements' in item_payload_dict and isinstance(item_payload_dict['elements'], list):
                    for child_element_dict in item_payload_dict['elements']:
                        try:
                            # Ensure child_element_dict has parent_uuid pointing to this section
                            child_element_dict['parent_uuid'] = item_id 
                            child_model = ReportElement(**child_element_dict)
                            processed_child_elements.append(process_element_dict(child_model.dict(exclude_none=True)))
                        except Exception as e:
                            logger.error(f"Pydantic validation error for child element of section {item_id}: {child_element_dict.get('id')}, error: {e}")
                            # Optionally skip this child or add as-is if non-critical
                
                section_object = {
                    'id': item_id,
                    'item_type': 'section',
                    'title': item_payload_dict.get('title'),
                    'elements': processed_child_elements # Use processed children
                }
                sections_lookup[item_id] = section_object 
                final_ordered_items.append(section_object)

            elif item_type == 'element':
                # Process element: validate and ensure it's correctly structured
                # This element from payload_items_flat should be a TOP-LEVEL element.
                # Child elements are expected to be nested within their section's 'elements' array by the frontend.
                try:
                    # If it's a top-level element, parent_uuid should be None or not present.
                    # The frontend should not send child elements as top-level items in this list if they are also nested.
                    # If parentUUID was sent from frontend, Pydantic ReportElement model handles aliasing to parent_uuid.
                    if 'parentUUID' in item_payload_dict and item_payload_dict.get('parentUUID'):
                        logger.warning(f"Top-level element {item_id} in payload_items_flat has parentUUID {item_payload_dict.get('parentUUID')}. This is unexpected if children are only nested.")
                        # Forcing parent_uuid to None for elements directly in this list,
                        # as they are considered top-level by appearing here.
                        item_payload_dict['parent_uuid'] = None # Or ensure parentUUID is None if that's the alias target
                        if 'parentUUID' in item_payload_dict: # remove frontend key if it exists
                             del item_payload_dict['parentUUID']

                    element_model = ReportElement(**item_payload_dict)
                    processed_element_dict = process_element_dict(element_model.dict(exclude_none=True))
                    
                    # Ensure top-level elements indeed have no parent_uuid or it's None after processing
                    if processed_element_dict.get('parent_uuid'):
                        logger.warning(f"Element {processed_element_dict.get('id')} processed as top-level still has parent_uuid {processed_element_dict.get('parent_uuid')}. Clearing it.")
                        processed_element_dict['parent_uuid'] = None

                    final_ordered_items.append(processed_element_dict)
                except Exception as e:
                    logger.error(f"Pydantic validation error for top-level element: {item_id}, error: {e}")
                    # Optionally skip or add as-is if non-critical

            else:
                logger.warning(f"Unknown item type in update payload: {item_type} for ID {item_id}. Adding as-is.")
                if item_id: # Only add if it has an ID, otherwise it's not identifiable
                    final_ordered_items.append(item_payload_dict)
        
        current_content_dict['items'] = final_ordered_items

        # Update other direct properties of 'content' object if any (e.g., layout, global styles)
        for content_key, content_value in update_payload_data['content'].items():
            if content_key != 'items':
                current_content_dict[content_key] = content_value
    
    current_report_data['updatedAt'] = now
    
    # At this point, current_report_data['content']['items'] should have the correct nested structure.
    # Pydantic will validate it when creating the Report instance.
    try:
        updated_instance = Report(**current_report_data)
    except Exception as e:
        logger.error(f"Error creating Report model instance during update: {e}")
        logger.error(f"Data causing error: {current_report_data}")
        raise HTTPException(status_code=422, detail=f"Failed to process report structure: {str(e)}")
        
    save_report_to_file(updated_instance)
    return updated_instance

@router.delete("/{report_id}", status_code=204)
async def delete_report(report_id: str):
    report_path = REPORTS_DIR / f"{report_id}.json"
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")
    report_path.unlink()
    return 