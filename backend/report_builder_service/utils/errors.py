from fastapi import HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime
import logging

from config import logger
from models.schemas import ErrorResponse, ErrorDetail, ErrorCodes

async def http_exception_handler(request, exc):
    """Global HTTP exception handler for FastAPI exceptions"""
    now = datetime.utcnow().isoformat() + "Z"
    
    # Map HTTP status codes to our error codes
    error_code = ErrorCodes.UNKNOWN_ERROR
    if exc.status_code == 404:
        error_code = ErrorCodes.REPORT_NOT_FOUND
    
    logger.warning(f"HTTP Exception {exc.status_code}: {str(exc.detail)}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            detail=ErrorDetail(
                code=error_code,
                message=str(exc.detail)
            ),
            timestamp=now
        ).dict()
    )

async def general_exception_handler(request, exc):
    """Global exception handler for all uncaught exceptions"""
    now = datetime.utcnow().isoformat() + "Z"
    
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            detail=ErrorDetail(
                code=ErrorCodes.UNKNOWN_ERROR,
                message=f"Internal server error: {str(exc)}"
            ),
            timestamp=now
        ).dict()
    )

def create_error_response(code: str, message: str) -> ErrorResponse:
    """
    Helper function to create a standardized error response
    
    Args:
        code: Error code from ErrorCodes class
        message: Detailed error message
        
    Returns:
        ErrorResponse: Formatted error response object
    """
    return ErrorResponse(
        detail=ErrorDetail(
            code=code,
            message=message
        ),
        timestamp=datetime.utcnow().isoformat() + "Z"
    ) 