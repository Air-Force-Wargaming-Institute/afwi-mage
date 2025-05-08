import json
import uuid
from pathlib import Path
from datetime import datetime

# Define directory structure
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
TEMPLATES_DIR = DATA_DIR / "templates"

# Ensure directories exist
def ensure_directories():
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

# Default templates
TEMPLATES = [
    {
        "id": "exec_summary",
        "name": "Executive Summary",
        "description": "A concise overview for decision-makers.",
        "category": "Standard",
        "content": {
            "elements": [
                {
                    "id": str(uuid.uuid4()),
                    "title": "Executive Summary",
                    "type": "explicit",
                    "format": "h1",
                    "content": "Executive Summary",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Key Points",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Key Points",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Key Points",
                    "type": "explicit",
                    "format": "bulletList",
                    "content": "Main findings\nCritical issues\nRecommendations",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Background",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Background",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Background",
                    "type": "explicit",
                    "format": "paragraph",
                    "content": "Brief context and purpose of the report",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Conclusions",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Conclusions",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Conclusions",
                    "type": "explicit",
                    "format": "paragraph",
                    "content": "Key conclusions and next steps",
                    "instructions": None
                }
            ]
        }
    },
    {
        "id": "bbp",
        "name": "Bullet Background Paper (BBP)",
        "description": "A concise background paper with bullet points.",
        "category": "Standard",
        "content": {
            "elements": [
                {
                    "id": str(uuid.uuid4()),
                    "title": "Bullet Background Paper",
                    "type": "explicit",
                    "format": "h1",
                    "content": "Bullet Background Paper",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Issue",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Issue",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Issue",
                    "type": "explicit",
                    "format": "paragraph",
                    "content": "Clear statement of the issue",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Background",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Background",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Background",
                    "type": "explicit",
                    "format": "bulletList",
                    "content": "Historical context\nCurrent situation\nKey stakeholders",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Analysis",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Analysis",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Analysis",
                    "type": "explicit",
                    "format": "bulletList",
                    "content": "Key factors\nImplications\nRisks",
                    "instructions": None
                }
            ]
        }
    },
    {
        "id": "bp",
        "name": "Background Paper (BP)",
        "description": "A comprehensive background paper.",
        "category": "Standard",
        "content": {
            "elements": [
                {
                    "id": str(uuid.uuid4()),
                    "title": "Background Paper",
                    "type": "explicit",
                    "format": "h1",
                    "content": "Background Paper",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Introduction",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Introduction",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Introduction",
                    "type": "explicit",
                    "format": "paragraph",
                    "content": "Purpose and scope of the paper",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Historical Context",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Historical Context",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Historical Context",
                    "type": "explicit",
                    "format": "paragraph",
                    "content": "Detailed historical background",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Current Situation",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Current Situation",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Current Situation",
                    "type": "explicit",
                    "format": "paragraph",
                    "content": "Analysis of current circumstances",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Recommendations",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Recommendations",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Recommendations",
                    "type": "explicit",
                    "format": "bulletList",
                    "content": "Proposed actions\nImplementation plan\nExpected outcomes",
                    "instructions": None
                }
            ]
        }
    },
    {
        "id": "tp",
        "name": "Talking Paper (TP)",
        "description": "A concise background paper with talking points.",
        "category": "Standard",
        "content": {
            "elements": [
                {
                    "id": str(uuid.uuid4()),
                    "title": "Talking Paper",
                    "type": "explicit",
                    "format": "h1",
                    "content": "Talking Paper",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Key Messages",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Key Messages",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Key Messages",
                    "type": "explicit",
                    "format": "bulletList",
                    "content": "Main points to convey\nSupporting evidence\nCall to action",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Talking Points",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Talking Points",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Talking Points",
                    "type": "explicit",
                    "format": "bulletList",
                    "content": "Point 1 with supporting data\nPoint 2 with supporting data\nPoint 3 with supporting data",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Q&A Preparation",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Q&A Preparation",
                    "instructions": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Q&A Preparation",
                    "type": "explicit",
                    "format": "bulletList",
                    "content": "Anticipated questions\nPrepared responses\nAdditional resources",
                    "instructions": None
                }
            ]
        }
    }
]

def init_templates():
    """Initialize templates in the templates directory"""
    ensure_directories()
    now = datetime.utcnow().isoformat() + "Z"
    
    # Check if templates directory is empty
    if not list(TEMPLATES_DIR.glob("*.json")):
        print("Initializing templates...")
        for template_data in TEMPLATES:
            # Add created and updated timestamps
            template_data["createdAt"] = now
            template_data["updatedAt"] = now
            
            # Save template to file
            template_path = TEMPLATES_DIR / f"{template_data['id']}.json"
            with open(template_path, "w") as f:
                json.dump(template_data, f, indent=4)
                
        print(f"Successfully initialized {len(TEMPLATES)} templates")
    else:
        print("Templates already exist, skipping initialization")

if __name__ == "__main__":
    init_templates() 