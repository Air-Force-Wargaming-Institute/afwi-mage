from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import document_library

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],  # React development server
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
    expose_headers=["X-Operation-ID"],  # Expose custom headers
) 