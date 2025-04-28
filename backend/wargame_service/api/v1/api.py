from fastapi import APIRouter

# Use absolute import
from api.v1.endpoints import wargames

api_router = APIRouter()

# Include routers from endpoint modules
api_router.include_router(wargames.router, prefix="/wargames", tags=["wargames"])

# Add other endpoint routers here if needed later
# e.g., api_router.include_router(simulations.router, prefix="/simulations", tags=["simulations"]) 