from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from user_routes import router as user_router
from database import engine, Base
import logging
import os

app = FastAPI()

# Create database tables
Base.metadata.create_all(bind=engine)

# Get CORS origins from environment variable or use default in development
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,*").split(",")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(user_router, prefix="/api/users")

@app.get("/")
async def root():
    return {"message": "Welcome to AFWI MAGE FineTune Auth API"}

@app.get("/api/auth/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)

