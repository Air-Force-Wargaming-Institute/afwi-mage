import os
import shutil
from fastapi import APIRouter, HTTPException, Body, Query
from fastapi.responses import StreamingResponse, JSONResponse
from pathlib import Path
from config import DATASET_DIR, EXTRACTION_DIR, BASE_MODELS_DIR
import csv
import json
import logging
import traceback
from services.llm_service import initialize_model, chat_with_model, generate_text
import ollama
import services.llm_service as llm_service

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/api/generate/health")
async def health_check():
    """Health check endpoint for compatibility with other services."""
    logger.info("Health check endpoint called")
    return JSONResponse(content={"status": "healthy"}, status_code=200)

@router.get("/api/generate/training-datasets/")
async def get_training_datasets():
    try:
        datasets = []
        logger.info(f"Listing files in DATASET_DIR: {DATASET_DIR}")
        for file in os.listdir(DATASET_DIR):
            if file.endswith('.csv'):
                file_path = os.path.join(DATASET_DIR, file)
                datasets.append({
                    "name": file,
                    "created_at": os.path.getctime(file_path)
                })
        logger.info(f"Found {len(datasets)} training datasets")
        return JSONResponse(content=datasets, status_code=200)
    except Exception as e:
        logger.error(f"Error fetching training datasets: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error fetching training datasets: {str(e)}")

@router.get("/api/generate/csv-preview/{filename}")
async def get_csv_preview(filename: str, rows: int = 100):
    logger.info(f"Received request for CSV preview: {filename}")
    try:
        file_path = Path(DATASET_DIR) / filename
        logger.info(f"Looking for file at: {file_path}")
        logger.info(f"DATASET_DIR: {DATASET_DIR}")
        logger.info(f"File exists: {file_path.exists()}")

        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            raise HTTPException(status_code=404, detail="CSV file not found")

        logger.info(f"File size: {file_path.stat().st_size} bytes")

        data = []
        try:
            with open(file_path, 'r', newline='', encoding='utf-8') as csvfile:
                logger.info(f"File opened successfully")
                content = csvfile.read(1000)  # Read first 1000 characters
                logger.info(f"File content (first 1000 characters): {content}")
                csvfile.seek(0)  # Reset file pointer to the beginning
                csv_reader = csv.DictReader(csvfile)
                logger.info(f"CSV reader created")
                logger.info(f"CSV headers: {csv_reader.fieldnames}")
                for i, row in enumerate(csv_reader):
                    if i >= rows:
                        break
                    data.append(row)
                    if i == 0:
                        logger.info(f"First row: {row}")
                    if i % 10 == 0:  # Log every 10th row
                        logger.info(f"Row {i} read successfully")
        except csv.Error as e:
            logger.error(f"CSV Error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error reading CSV file: {str(e)}")
        except UnicodeDecodeError as e:
            logger.error(f"Unicode Decode Error: {str(e)}")
            raise HTTPException(status_code=500, detail="Error decoding CSV file. It might not be in UTF-8 encoding.")

        if not data:
            logger.warning(f"No data read from the CSV file: {filename}")
            return JSONResponse(content=[], status_code=200)

        logger.info(f"Successfully read {len(data)} rows from {filename}")
        return JSONResponse(content=data, status_code=200)
    except Exception as e:
        logger.error(f"Error fetching CSV preview: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error fetching CSV preview: {str(e)}")

@router.post("/api/generate/generate-dataset/")
async def generate_dataset(request: dict):
    try:
        source_file = request.get("sourceFile")
        dataset_name = request.get("datasetName")

        if not source_file or not dataset_name:
            raise HTTPException(status_code=400, detail="Both sourceFile and datasetName are required")

        source_path = Path(EXTRACTION_DIR) / source_file
        if not source_path.exists():
            raise HTTPException(status_code=404, detail="Source CSV file not found")

        # Create the datasets directory if it doesn't exist
        Path(DATASET_DIR).mkdir(parents=True, exist_ok=True)

        # Copy the file to the datasets directory with the new name
        destination_path = Path(DATASET_DIR) / f"{dataset_name}.csv"
        shutil.copy2(source_path, destination_path)

        return JSONResponse(content={"message": f"Dataset '{dataset_name}' created successfully"}, status_code=200)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating dataset: {str(e)}")

@router.post("/api/generate/initialize-model/{model_name}")
async def init_model(model_name: str):
    try:
        initialize_model(model_name)
        return JSONResponse(content={"message": f"Model {model_name} initialized successfully"}, status_code=200)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error initializing model: {str(e)}")

@router.post("/api/generate/chat-with-model/{model_name}")
async def chat(model_name: str, messages: list = Body(...), stream: bool = Query(False)):
    try:
        response = chat_with_model(model_name, messages, stream)
        if stream:
            return StreamingResponse(response, media_type="text/event-stream")
        return JSONResponse(content=response, status_code=200)
    except Exception as e:
        logger.error(f"Error chatting with model: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error chatting with model: {str(e)}")

@router.post("/api/generate/generate-text/{model_name}")
async def generate(model_name: str, request: dict = Body(...), stream: bool = Query(False)):
    try:
        logger.info(f"Received generate-text request for model: {model_name}")
        
        # Extract the prompt from the request body
        if not request or not isinstance(request, dict):
            logger.error(f"Invalid request body: {request}")
            raise HTTPException(status_code=400, detail="Request must be a JSON object with a 'prompt' field")
            
        if "prompt" not in request:
            logger.error(f"Missing 'prompt' field in request: {request}")
            raise HTTPException(status_code=400, detail="Request must contain a 'prompt' field")
            
        prompt = request["prompt"]
        logger.debug(f"Extracted prompt: {prompt[:100]}...")  # Log first 100 chars
            
        # Check if model exists or try to use default
        try:
            models_list = ollama.list()
            available_models = [model["name"] for model in models_list.get("models", [])]
            
            if model_name not in available_models:
                # If the requested model is not available, use default
                logger.warning(f"Model '{model_name}' not found. Available models: {available_models}")
                
                if hasattr(llm_service, 'DEFAULT_MODEL') and llm_service.DEFAULT_MODEL in available_models:
                    logger.info(f"Using default model '{llm_service.DEFAULT_MODEL}' instead")
                    model_name = llm_service.DEFAULT_MODEL
                elif available_models:
                    logger.info(f"Using first available model '{available_models[0]}' instead")
                    model_name = available_models[0]
                else:
                    # No models available, we need to pull one
                    default_model = "llama2"
                    logger.info(f"No models available, pulling {default_model}...")
                    ollama.pull(default_model)
                    model_name = default_model
        except Exception as e:
            logger.error(f"Error checking available models: {str(e)}")
            # Continue with requested model_name and let generate_text handle any errors
            
        # Pass the actual prompt content to the LLM
        response = generate_text(model_name, prompt, stream)
        if stream:
            return StreamingResponse(response, media_type="text/event-stream")
        return JSONResponse(content=response, status_code=200)
    except Exception as e:
        logger.error(f"Error generating text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating text: {str(e)}")

# Add this new route
@router.get("/api/generate/available-models/")
async def get_available_models():
    try:
        logger.info(f"Searching for models in: {BASE_MODELS_DIR}")
        models = []
        for file in BASE_MODELS_DIR.glob('*'):
            logger.info(f"Found file: {file}")
            if file.is_file() and file.suffix.lower() in ['.modelfile', '.gguf']:
                models.append(file.stem)
        logger.info(f"Found models: {models}")
        return JSONResponse(content=models, status_code=200)
    except Exception as e:
        logger.error(f"Error fetching available models: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error fetching available models: {str(e)}")