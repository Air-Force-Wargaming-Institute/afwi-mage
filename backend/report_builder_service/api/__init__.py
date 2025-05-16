from fastapi import APIRouter
from .reports import router as reports_router
from .templates import router as templates_router
from .generation import router as generation_router
# from .websockets import router as websockets_router # Removed
from .vectorstores import router as vectorstores_router

# Create a combined router
api_router = APIRouter()

# Include all sub-routers
api_router.include_router(reports_router)
api_router.include_router(templates_router)
api_router.include_router(generation_router)
# api_router.include_router(websockets_router) # Removed
api_router.include_router(vectorstores_router)
