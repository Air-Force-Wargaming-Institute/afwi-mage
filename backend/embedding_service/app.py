from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from embed_pdfs import router as embed_router

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(embed_router, prefix="/api/embed")

@app.get("/")
async def root():
    return {"message": "Welcome to AFWI MAGE Embedding Service API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)

