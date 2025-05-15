from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
import uuid

from models.schemas import Template, TemplateCreate, ReportElement, ReportContent
from services.file_service import load_template_from_file, save_template_to_file, load_all_templates
from config import TEMPLATES_DIR, logger

router = APIRouter(prefix="/api/report_builder/templates", tags=["templates"])

@router.post("", response_model=Template)
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
                current_template_data[key] = ReportContent(**value).dict()
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