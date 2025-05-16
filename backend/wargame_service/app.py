from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# from fastapi.middleware.cors import CORSMiddleware # Example if CORS needed at app level

# Potentially import settings from config
# from config import settings

# Import the main API router using absolute path from WORKDIR (/app)
from api.v1.api import api_router

# Create FastAPI instance
app = FastAPI(
    title="MAGE Wargame Builder Service",
    description="API for creating, managing, and retrieving wargame build configurations.",
    version="0.1.0"
)

# --- Health Check --- (Defined before including the main router)
@app.get("/api/wargame/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}

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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost","http://localhost:3000","*"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
# Include the API router with a prefix
app.include_router(api_router)

# --- Root Endpoint --- (Optional)
@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the MAGE Wargame Builder Service"}
