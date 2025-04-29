from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware # Example if CORS needed at app level

# Potentially import settings from config
# from config import settings

# Import the main API router using absolute path from WORKDIR (/app)
from api.v1.api import api_router

# Create FastAPI instance
app = FastAPI(
    title="MAGE Wargame Builder Service",
    description="Manages the creation, configuration, and persistence of wargame builds.",
    version="0.1.0",
    # Add other FastAPI parameters like openapi_url if needed
    # openapi_url=f"/api/v1/openapi.json"
)

# --- Middleware --- (Optional: Add CORS, etc., if not handled by gateway)
# origins = [
#     "http://localhost",
#     "http://localhost:3000",
# ]
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# --- Routers ---
# Include the API router with a prefix
app.include_router(api_router, prefix="/api/v1")

# --- Health Check --- (Can be kept in main.py or moved here)
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}

# --- Root Endpoint --- (Optional)
@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the MAGE Wargame Builder Service"}
