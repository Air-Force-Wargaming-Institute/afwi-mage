from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
import uuid

from models.schemas import Template, TemplateCreate, ReportElement, ReportContent, Section, ReportItem
from services.file_service import load_template_from_file, save_template_to_file, load_all_templates
from config import TEMPLATES_DIR, logger

router = APIRouter(prefix="/api/report_builder/templates", tags=["templates"])

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

@router.post("", response_model=Template)
async def create_template(template_in: TemplateCreate):
    from datetime import datetime
    now = datetime.utcnow().isoformat() + "Z"
    template_id = str(uuid.uuid4())
    
    # Handle content structure (new items vs legacy elements)
    content_dict = handle_content_compatibility(template_in.content.dict() if template_in.content else {})
    
    new_template = Template(
        id=template_id,
        name=template_in.name,
        description=template_in.description,
        category=template_in.category,
        createdAt=now,
        updatedAt=now,
        content=ReportContent(**content_dict)
    )
    
    # Save the template to its own file
    save_template_to_file(new_template)
    
    return new_template

@router.get("", response_model=List[Template])
async def get_templates():
    # Load all templates from individual files
    return load_all_templates()

@router.get("/{template_id}", response_model=Template)
async def get_template(template_id: str):
    template_path = TEMPLATES_DIR / f"{template_id}.json"
    template = load_template_from_file(template_path)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return template

@router.put("/{template_id}", response_model=Template)
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
            # Handle content structure compatibility
            new_content = handle_content_compatibility(value)
            
            # If we have items in the payload, process them
            if 'items' in new_content:
                # Create a map of existing items by ID for efficient lookup
                existing_items = current_template_data['content'].get('items', [])
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
                
                current_template_data['content']['items'] = new_items_list
            
            # Update any other content properties
            for content_key, content_value in new_content.items():
                if content_key != 'items':
                    current_template_data['content'][content_key] = content_value
        else:
            current_template_data[key] = value
    
    current_template_data['updatedAt'] = now
    
    updated_instance = Template(**current_template_data)
    save_template_to_file(updated_instance)
    
    return updated_instance

@router.delete("/{template_id}", status_code=204)
async def delete_template(template_id: str):
    template_path = TEMPLATES_DIR / f"{template_id}.json"
    
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Delete the template file
    template_path.unlink()
    
    return 