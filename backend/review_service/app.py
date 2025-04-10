from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from review_routes import router as review_router

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
# app.include_router(review_router, prefix="/api/review")
app.include_router(review_router)

@app.get("/")
async def root():
    return {"message": "Welcome to AFWI MAGE Review Service API"}

@app.get("/api/review/health")
async def health_check():
    """Health check endpoint for the API gateway."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)

