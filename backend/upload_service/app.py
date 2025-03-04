import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from upload_routes import router as upload_router

# Configure logging first, before any other operations
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

# Set specific loggers to DEBUG level
logging.getLogger("upload_service").setLevel(logging.DEBUG)
logging.getLogger("uvicorn").setLevel(logging.INFO)

# Get logger for this file
logger = logging.getLogger("upload_service")
logger.info("Initializing Upload Service")

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("Configuring routes")
# Include routers
app.include_router(upload_router, prefix="/api/upload")

@app.get("/")
async def root():
    return {"message": "Welcome to AFWI MAGE Upload Service API"}

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Upload Service")
    uvicorn.run(app, host="0.0.0.0", port=8005)
