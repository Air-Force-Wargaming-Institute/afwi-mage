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
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Key Points",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Key Points",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Key Points",
                    "type": "explicit",
                    "format": "bulletList",
                    "content": "Main findings\nCritical issues\nRecommendations",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Background",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Background",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Background",
                    "type": "explicit",
                    "format": "paragraph",
                    "content": "Brief context and purpose of the report",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Conclusions",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Conclusions",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Conclusions",
                    "type": "explicit",
                    "format": "paragraph",
                    "content": "Key conclusions and next steps",
                    "instructions": None,
                    "ai_generated_content": None
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
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Issue",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Issue",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Issue",
                    "type": "explicit",
                    "format": "paragraph",
                    "content": "Clear statement of the issue",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Background",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Background",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Background",
                    "type": "explicit",
                    "format": "bulletList",
                    "content": "Historical context\nCurrent situation\nKey stakeholders",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Analysis",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Analysis",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Analysis",
                    "type": "explicit",
                    "format": "bulletList",
                    "content": "Key factors\nImplications\nRisks",
                    "instructions": None,
                    "ai_generated_content": None
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
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Introduction",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Introduction",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Introduction",
                    "type": "explicit",
                    "format": "paragraph",
                    "content": "Purpose and scope of the paper",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Historical Context",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Historical Context",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Historical Context",
                    "type": "explicit",
                    "format": "paragraph",
                    "content": "Detailed historical background",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Current Situation",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Current Situation",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Current Situation",
                    "type": "explicit",
                    "format": "paragraph",
                    "content": "Analysis of current circumstances",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Recommendations",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Recommendations",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Recommendations",
                    "type": "explicit",
                    "format": "bulletList",
                    "content": "Proposed actions\nImplementation plan\nExpected outcomes",
                    "instructions": None,
                    "ai_generated_content": None
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
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Key Messages",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Key Messages",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Key Messages",
                    "type": "explicit",
                    "format": "bulletList",
                    "content": "Main points to convey\nSupporting evidence\nCall to action",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Talking Points",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Talking Points",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Talking Points",
                    "type": "explicit",
                    "format": "bulletList",
                    "content": "Point 1 with supporting data\nPoint 2 with supporting data\nPoint 3 with supporting data",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Q&A Preparation",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Q&A Preparation",
                    "instructions": None,
                    "ai_generated_content": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Q&A Preparation",
                    "type": "explicit",
                    "format": "bulletList",
                    "content": "Anticipated questions\nPrepared responses\nAdditional resources",
                    "instructions": None,
                    "ai_generated_content": None
                }
            ]
        }
    },
    {
        "name": "Situation Report",
        "description": "The Commander\'s SITREP is a multipurpose, narrative report submitted IAW United States Message Text Format (USMTF) instructions found in reference (c). It keeps addressees informed and enables the commands and Services concerned to expect and prepare for potential occurrences. Message instructions in reference (c) identify unit (tactical)-level SITREP information requirements as well as the CJCS-level content requirements. Current as of 28 Feburary 2025",
        "category": "System",
        "id": "cjcs_sitrep",
        "content": {
            "elements": [
                {
                    "id": str(uuid.uuid4()),
                    "title": "Wargame SITREP (Title)",
                    "type": "explicit",
                    "format": "h1",
                    "content": "Wargame SITREP",
                    "instructions": "",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Optional addition background information (Title)",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Optional addition background information (Title)",
                    "instructions": "",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Optional addition background information (Content)",
                    "type": "explicit",
                    "format": "paragraph",
                    "content": "Content for this section",
                    "instructions": "",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Own situation, disposition, and/or status of forces (Title)",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Own situation, disposition, and/or status of forces.",
                    "instructions": "",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Own situation, disposition, and/or status of forces (Content)",
                    "type": "generative",
                    "format": "paragraph",
                    "content": "",
                    "instructions": "User content:\\n\\nBackground of this section:\\nOwn Situation, Disposition, and/or Status of Forces. Includes summary updating changes to (or not previously reported) major combatant and support forces, equipment, and critical supplies and their locations; status of deployment; completion of transportation closure; status, progress, and completion of joint reception, staging, onward movement, and integration (JRSOI); significant degradation in unit mission readiness; current deployments; proposed deployments (to include concept of operations for deployment if not previously provided); changes in task force designations, organization, or change of operational control; and projected requirements for additional forces. In addressing the status of deployment, updates should be keyed to major forces (combatant and support forces) as outlined in the approved execute order (EXORD), deployment order (DEPORD), and modifications to EXORDs and/or DEPORDs. Comments should provide an update on their deployment status and location, to include updates on the JRSOI process. Final comments will be the commander\'s declaration that the unit is operationally ready and an overall assessment of operational and/or combat capability in the joint area of operations.",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Situation overview (Title)",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Situation overview.",
                    "instructions": "",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Situation overview (Content)",
                    "type": "generative",
                    "format": "paragraph",
                    "content": "",
                    "instructions": "User content:\\n\\nBackground of this section:\\nSituation Overview. Provide a brief overall assessment of the situation, including circumstances or conditions that increase, or materially detract from, the capability and readiness of forces assigned or under operational control of the command or Service.",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Operations (Title)",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Operations.",
                    "instructions": "",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Operations (Content)",
                    "type": "generative",
                    "format": "paragraph",
                    "content": "",
                    "instructions": "User content:\\n\\nBackground of this section:\\nOperations. A brief description and the results of combat operations carried out by major combatant elements during the reporting period, information on allied forces\' operations, a summary of plans for combat operations during the next 24 hours (including objectives and probable enemy reaction), and deviations or variations from previously reported intentions or plans.",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Critical assets (Title)",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Critical assets.",
                    "instructions": "",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Critical assets (Content)",
                    "type": "generative",
                    "format": "paragraph",
                    "content": "",
                    "instructions": "User content:\\n\\nBackground of this section:\\nCritical Assets. Report the loss, incapacitation, or disruption of a Defense Critical Infrastructure (DCI) Task Critical Asset (TCA), which could result in mission failure at the CCMD or sub-unified command level. Paragraph 13.b of reference (a) requires CCDRs to take such actions only at SecDef direction, with narrow exceptions, and to report any action taken to the NMCC. The report should describe the TCA\'s actual impact upon the CCMD and/or sub-unified command mission. A list of assets critical to each CCMD or sub-unified command is maintained by command\'s associated DCI office, normally within the Directorate for Operations, J-3.",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Intelligence and reconnaissance (Title)",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Intelligence and reconnaissance.",
                    "instructions": "",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Intelligence and reconnaissance (Content)",
                    "type": "generative",
                    "format": "paragraph",
                    "content": "",
                    "instructions": "User content:\\n\\nBackground of this section:\\nIntelligence and Reconnaissance. A brief overview of the situation, including operations, order of battle, capabilities, and threat changes, and references to any significant intelligence reporting submitted in the previous 24 hours.",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Logistics (Title)",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Logistics.",
                    "instructions": "",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Logistics (Content)",
                    "type": "generative",
                    "format": "paragraph",
                    "content": "",
                    "instructions": "User content:\\n\\nBackground of this section:\\nLogistics. Provide a logistics supportability analyses dealing with all joint logistics capability areas (JCAs) (deployment and distribution, supply and maintenance, logistics services, health service support, operational contracting, and operational engineering) ensuring identification of deficiencies affecting the support of planned operations beyond the commander\'s and Service\'s capability to mitigate in a timely manner.",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Communications and connectivity (Title)",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Communications and connectivity.",
                    "instructions": "",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Communications and connectivity (Content)",
                    "type": "generative",
                    "format": "paragraph",
                    "content": "",
                    "instructions": "User content:\\n\\nBackground of this section:\\nCommunication and Connectivity. Significant outages, quantitative equipment deficiencies, secure interoperable equipment incompatibilities, traffic volume, etc. Also, provide an assessment of the mission impact caused by any C4 degradation or network outage.",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Personnel (Title)",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Personnel.",
                    "instructions": "",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Personnel (Content)",
                    "type": "generative",
                    "format": "paragraph",
                    "content": "",
                    "instructions": "User content:\\n\\nBackground of this section:\\nPersonnel. Factors affecting readiness of forces or units, mobilization status, the number of daily battle casualties (i.e., killed in action, wounded in action, and missing in action) aggregated by Service and the effect of all casualties sustained (i.e., battle, non-battle, critical skills, key personnel) on the command\'s mission capability; or, upon occurrence of a natural or manmade disaster, any degradation in capability or negative impact on mission readiness, and the magnitude of injury or death to DoD affiliated personnel. Total troop strength is tabulated, including data on military, civilian, and contractor personnel physically present in a geographic CCDR\'s area of responsibility or a subordinate joint force commander\'s joint operations area. Use joint personnel status report format in reference (b).",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Significant political, military, and diplomatic events (Title)",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Significant political, military, and diplomatic events.",
                    "instructions": "",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Significant political, military, and diplomatic events (Content)",
                    "type": "generative",
                    "format": "paragraph",
                    "content": "",
                    "instructions": "User content:\\n\\nBackground of this section:\\nSignificant Political, Military, and Diplomatic Events. Events not reported by OPREP-3 PINNACLE that could result in local, national, or international public reaction; results and decisions of key allied or other foreign government meetings; civil unrest or indications of civil defense measures contemplated or implemented; large-scale military exercises; critical infrastructure failures and/or events affecting attitudes, emotions, or behavior of the populace that could be used in developing psychological operations (PSYOP) campaigns.",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Commander\'s evaluation and/or CCDR\'s assessment (Title)",
                    "type": "explicit",
                    "format": "h2",
                    "content": "Commander\'s evaluation and/or CCDR\'s assessment.",
                    "instructions": "",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Commander\'s evaluation and/or CCDR\'s assessment (Content)",
                    "type": "generative",
                    "format": "paragraph",
                    "content": "",
                    "instructions": "User content:\\n\\nBackground of this section:\\nCommander\'s Evaluation and/or CCDR\'s Assessment. Summary of key points from subparagraphs 8.a.(1) through 8.a.(8) highlighting areas requiring Presidential, SecDef, and/or CJCS action or decisions and continuity of operations plans implementation or intentions on execution. If not previously addressed, this section will include the commander\'s assessment of operational and/or combatant capability in theater. Comments will provide an overall assessment and individual comments keyed to major forces (combatant and support forces) as outlined in the approved EXORD, DEPORD, and/or their modifications.",
                    "ai_generated_content": None,
                    "generation_status": None,
                    "generation_error": None,
                    "updatedAt": None
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