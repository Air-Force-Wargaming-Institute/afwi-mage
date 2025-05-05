import json
import os
from pathlib import Path
import uuid
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from datetime import datetime

# Import models and config using absolute paths from WORKDIR (/app)
from schemas import WargameBuild, WargameBuildListItem
from config import STORAGE_DIR

# --- CRUD Operations for Wargames (using JSON files) ---

def get_wargame(wargame_id: str) -> Optional[WargameBuild]:
    """Loads a single wargame build from its JSON file."""
    file_path = STORAGE_DIR / f"{wargame_id}.json"
    if file_path.exists():
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                # Add validation step if needed before returning
                return WargameBuild(**data)
        except (json.JSONDecodeError, Exception) as e:
            print(f"Error loading wargame {wargame_id}: {e}")
            # Optionally re-raise or return specific error
            return None
    return None

def create_new_wargame(payload: Dict[str, Any]) -> WargameBuild:
    """Creates a new WargameBuild object, saves it, and returns it."""
    new_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() # Requires datetime import

    # Use the detailed model for creation, ensuring defaults are set
    new_wargame_data = {
        "id": new_id,
        "name": payload.get("name", "Untitled Wargame"),
        "description": payload.get("description"),
        "createdAt": now,
        "modifiedAt": now,
        # Explicitly set defaults for other fields based on schema
        "designer": None,
        "securityClassification": None,
        "roadToWar": None,
        "researchObjectives": [],
        "numberOfIterations": 5,
        "numberOfMoves": 10,
        "timeHorizon": None,
        "wargameStartDate": None,
        "selectedVectorstore": None,
        "selectedDatabase": None,
        "approvedFields": {},
        "activatedEntities": [],
        "customEntities": [],
        "nationRelationships": {},
        "conflictTheaters": [],
        "lastExecuted": None,
    }
    # Consider if we need to merge other fields from payload carefully

    new_wargame = WargameBuild(**new_wargame_data)
    save_existing_wargame(new_wargame)
    return new_wargame

def save_existing_wargame(wargame: WargameBuild):
    """Saves a WargameBuild object to its corresponding JSON file."""
    file_path = STORAGE_DIR / f"{wargame.id}.json"
    try:
        with open(file_path, 'w') as f:
            # Use .model_dump() for Pydantic v2 compatibility
            json.dump(wargame.model_dump(mode='json'), f, indent=2)
    except Exception as e:
        print(f"Error saving wargame {wargame.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save wargame data.")

def get_all_wargames_list() -> List[WargameBuildListItem]:
    """Loads all wargames and returns a list of basic info."""
    wargames_list = []
    for f in STORAGE_DIR.glob("*.json"):
        wargame_id = f.stem
        wargame_data = get_wargame(wargame_id) # Use the existing loading function
        if wargame_data:
            wargames_list.append(
                WargameBuildListItem(
                    id=wargame_data.id,
                    name=wargame_data.name,
                    description=wargame_data.description,
                    createdAt=wargame_data.createdAt,
                    modifiedAt=wargame_data.modifiedAt
                )
            )
    return wargames_list

def delete_existing_wargame(wargame_id: str) -> bool:
    """Deletes the JSON file for a given wargame ID. Returns True if successful."""
    file_path = STORAGE_DIR / f"{wargame_id}.json"
    if not file_path.exists():
        return False # Indicate not found
    try:
        os.remove(file_path)
        return True
    except Exception as e:
        print(f"Error deleting wargame {wargame_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete wargame file.") 