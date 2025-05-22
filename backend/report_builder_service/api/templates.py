from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from datetime import datetime
import uuid

from models.schemas import Template, TemplateCreate, ReportElement, ReportContent, Section
from services.file_service import load_template_from_file, save_template_to_file, load_all_templates
from config import TEMPLATES_DIR, logger

router = APIRouter(prefix="/api/report_builder/templates", tags=["templates"])

# Helper function (same as in reports.py, consider moving to utils if widely used)
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

@router.post("", response_model=Template)
async def create_template(template_in: TemplateCreate):
    now = datetime.utcnow().isoformat() + "Z"
    template_id = str(uuid.uuid4())
    
    processed_items_list = []
    if template_in.content and template_in.content.items:
        for item_model in template_in.content.items:
            item_dict = item_model.dict(exclude_unset=True)
            if item_model.item_type == 'element':
                # Ensure element_dict is passed, not ReportElement model instance
                processed_items_list.append(process_element_dict(item_dict))
            elif item_model.item_type == 'section':
                processed_section_elements = []
                # item_dict here is a dict representation of a Section model
                if 'elements' in item_dict and isinstance(item_dict['elements'], list):
                    for element_dict_in_section in item_dict['elements']:
                         # Elements in a section are defined as List[ReportElement]
                         # So element_dict_in_section should conform to ReportElement structure if validated by Pydantic
                         # For safety, can re-validate or assume structure based on model creation path
                         temp_element_model = ReportElement(**element_dict_in_section)
                         processed_section_elements.append(process_element_dict(temp_element_model.dict(exclude_unset=True)))
                item_dict['elements'] = processed_section_elements
                processed_items_list.append(item_dict)
            else:
                logger.warning(f"Unknown item type encountered during template creation: {item_model.item_type}")
                processed_items_list.append(item_dict) # Or handle error
        
        content_dict = template_in.content.dict(exclude_unset=True)
        content_dict['items'] = processed_items_list
    else:
        content_dict = ReportContent().dict() # Default empty content
    
    new_template = Template(
        id=template_id,
        name=template_in.name,
        description=template_in.description,
        category=template_in.category,
        createdAt=now,
        updatedAt=now,
        content=ReportContent(**content_dict) # Ensure content is ReportContent model
    )
    
    save_template_to_file(new_template)
    return new_template

@router.get("", response_model=List[Template])
async def get_templates():
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
    now = datetime.utcnow().isoformat() + "Z"
    
    template_path = TEMPLATES_DIR / f"{template_id}.json"
    existing_template = load_template_from_file(template_path)
    
    if not existing_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    current_template_data = existing_template.dict()
    update_payload_data = template_update.dict(exclude_unset=True)

    # Update top-level fields (excluding content)
    for key, value in update_payload_data.items():
        if key != 'content':
            current_template_data[key] = value

    # Handle content update
    if 'content' in update_payload_data and isinstance(update_payload_data['content'], dict):
        current_content = current_template_data.setdefault('content', {'items': []})
        if not isinstance(current_content, dict):
            current_content = {'items': []}
        if 'items' not in current_content or not isinstance(current_content.get('items'), list):
            current_content['items'] = []
        
        payload_items = update_payload_data['content'].get('items', [])
        
        existing_items_map: Dict[str, Dict[str, Any]] = {}
        if isinstance(current_content.get('items'), list):
            for item in current_content['items']:
                if isinstance(item, dict) and 'id' in item:
                    existing_items_map[item['id']] = item
        
        new_items_list = []
        processed_item_ids = set()

        for item_payload_dict in payload_items:
            if not isinstance(item_payload_dict, dict): continue

            item_id = item_payload_dict.get('id')
            item_type = item_payload_dict.get('item_type')
            
            if not item_id:
                logger.warning("Item in template update payload missing ID. Skipping.")
                continue
            
            processed_item_ids.add(item_id)
            existing_item_dict = existing_items_map.get(item_id)
            
            merged_item_dict = {}
            if existing_item_dict:
                merged_item_dict.update(existing_item_dict)
            merged_item_dict.update(item_payload_dict)

            if item_type == 'element':
                new_items_list.append(process_element_dict(merged_item_dict))
            elif item_type == 'section':
                processed_section_elements = []
                section_elements_payload = merged_item_dict.get('elements', [])
                if not isinstance(section_elements_payload, list):
                    section_elements_payload = []
                
                existing_section_elements_map: Dict[str, Dict[str, Any]] = {}
                if existing_item_dict and isinstance(existing_item_dict.get('elements'), list):
                    for el in existing_item_dict['elements']:
                        if isinstance(el, dict) and 'id' in el:
                            existing_section_elements_map[el['id']] = el
                
                processed_section_element_ids = set()
                for element_payload_in_section in section_elements_payload:
                    if not isinstance(element_payload_in_section, dict): continue
                    el_id = element_payload_in_section.get('id')
                    if not el_id: 
                        logger.warning("Element in template section payload missing ID. Skipping.")
                        continue
                    
                    processed_section_element_ids.add(el_id)
                    existing_el_dict = existing_section_elements_map.get(el_id)
                    
                    merged_el_dict = {}
                    if existing_el_dict:
                        merged_el_dict.update(existing_el_dict)
                    merged_el_dict.update(element_payload_in_section)
                    processed_section_elements.append(process_element_dict(merged_el_dict))

                if existing_item_dict and isinstance(existing_item_dict.get('elements'), list):
                    for el_id, el_data in existing_section_elements_map.items():
                        if el_id not in processed_section_element_ids:
                            processed_section_elements.append(el_data)
                
                merged_item_dict['elements'] = processed_section_elements
                new_items_list.append(merged_item_dict)
            else:
                logger.warning(f"Unknown item type in template update payload: {item_type} for ID {item_id}")
                new_items_list.append(merged_item_dict)

        if isinstance(current_content.get('items'), list):
            for item_id, item_data in existing_items_map.items():
                if item_id not in processed_item_ids:
                    new_items_list.append(item_data)
        
        current_content['items'] = new_items_list

        for content_key, content_value in update_payload_data['content'].items():
            if content_key != 'items':
                current_content[content_key] = content_value
        
    current_template_data['updatedAt'] = now
    current_template_data['content'] = ReportContent(**current_template_data.get('content', {'items':[]})).dict()

    updated_instance = Template(**current_template_data)
    save_template_to_file(updated_instance)
    return updated_instance

@router.delete("/{template_id}", status_code=204)
async def delete_template(template_id: str):
    template_path = TEMPLATES_DIR / f"{template_id}.json"
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Template not found")
    template_path.unlink()
    return 