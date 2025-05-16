from fastapi import APIRouter, HTTPException, Body, Depends, status
from typing import List, Dict, Any, Optional
from datetime import datetime

# Use absolute imports from project root (/app)
from schemas import WargameBuild, WargameBuildListItem, WargameCreatePayload
import crud

router = APIRouter()

@router.get("/api/wargame", response_model=List[WargameBuildListItem])
async def list_wargames_endpoint():
    """Lists basic information for all saved wargame builds."""
    return crud.get_all_wargames_list()

@router.post("/api/wargame", response_model=WargameBuild, status_code=status.HTTP_201_CREATED)
async def create_wargame_endpoint(payload: WargameCreatePayload = Body(...)):
    """Creates a new wargame build with a unique ID."""
    print(f"Received create request payload via router: {payload.model_dump()}")
    new_wargame = crud.create_new_wargame(payload.model_dump())
    print(f"Created wargame via router: {new_wargame.id}")
    return new_wargame

@router.get("/api/wargame/{wargame_id}", response_model=WargameBuild)
async def get_wargame_endpoint(wargame_id: str):
    """Retrieves the full configuration data for a specific wargame build."""
    wargame = crud.get_wargame(wargame_id)
    if not wargame:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wargame build not found")
    return wargame

@router.put("/api/wargame/{wargame_id}", response_model=WargameBuild)
async def update_wargame_endpoint(wargame_id: str, wargame_update: WargameBuild):
    """Updates the full configuration data for a specific wargame build."""
    if wargame_id != wargame_update.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Wargame ID mismatch")

    existing_wargame = crud.get_wargame(wargame_id)
    if not existing_wargame:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wargame build not found")

    # Update modification time before saving
    wargame_update.modifiedAt = datetime.utcnow().isoformat()
    # Preserve creation time
    wargame_update.createdAt = existing_wargame.createdAt

    crud.save_existing_wargame(wargame_update)
    return wargame_update

@router.delete("/api/wargame/{wargame_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wargame_endpoint(wargame_id: str):
    """Deletes a specific wargame build."""
    deleted = crud.delete_existing_wargame(wargame_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wargame build not found")
    return {} 