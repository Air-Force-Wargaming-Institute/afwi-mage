from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from extraction_routes import router as extraction_router

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(extraction_router, prefix="/api/extraction")

@app.get("/")
async def root():
    return {"message": "Welcome to AFWI MAGE Extraction Service API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
