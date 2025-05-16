from fastapi import APIRouter, HTTPException
from typing import List
import httpx

from models.schemas import ReportBuilderVectorStoreInfo
from config import EMBEDDING_SERVICE_BASE_URL, logger

router = APIRouter(prefix="/api/report_builder", tags=["vector_stores"])

@router.get("/vector_stores", response_model=List[ReportBuilderVectorStoreInfo])
async def get_vector_stores_for_report_builder():
    """
    Get a list of available vector stores from the embedding service
    
    Returns:
        List[ReportBuilderVectorStoreInfo]: List of vector stores with id and name
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{EMBEDDING_SERVICE_BASE_URL}/api/embedding/vectorstores")
            response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
            
            vector_stores_data = response.json() # This will be List of dicts from embedding_service
            
            # Transform to the desired response model
            # Assuming vector_stores_data is a list of dictionaries, each with 'id' and 'name'
            return [
                ReportBuilderVectorStoreInfo(id=vs.get("id"), name=vs.get("name")) 
                for vs in vector_stores_data
            ]

    except httpx.RequestError as exc:
        logger.error(f"An error occurred while requesting vector stores from embedding service: {exc}")
        raise HTTPException(status_code=503, detail=f"Could not connect to embedding service: {str(exc)}")
    except httpx.HTTPStatusError as exc:
        logger.error(f"Embedding service returned an error: {exc.response.status_code} - {exc.response.text}")
        raise HTTPException(status_code=exc.response.status_code, detail=f"Embedding service error: {exc.response.text}")
    except Exception as exc:
        logger.error(f"An unexpected error occurred: {exc}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while fetching vector stores.") 