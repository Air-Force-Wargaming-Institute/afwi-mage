from fastapi import HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime
import logging
from typing import Dict, Optional, Union

from config import logger
from models.schemas import ErrorResponse, ErrorDetail, ErrorCodes

# Map error codes to HTTP status codes for consistent API responses
ERROR_CODE_TO_STATUS = {
    # 404 errors
    ErrorCodes.REPORT_NOT_FOUND: 404,
    
    # 400 errors - bad request
    ErrorCodes.INVALID_REPORT_STRUCTURE: 400,
    ErrorCodes.GENERATION_VALIDATION_ERROR: 400,
    
    # 401/403 errors - authentication/authorization
    ErrorCodes.GENERATION_AUTH_ERROR: 403,
    
    # 408 - request timeout
    ErrorCodes.GENERATION_TIMEOUT: 408,
    
    # 502/503/504 - bad gateway, service unavailable, gateway timeout
    ErrorCodes.GENERATION_CONNECTION_ERROR: 502,
    ErrorCodes.VECTOR_STORE_ERROR: 503,
    ErrorCodes.MAGE_SERVICE_ERROR: 503,
    
    # 500 - internal server errors
    ErrorCodes.GENERATION_FAILED: 500,
    ErrorCodes.GENERATION_RUNTIME_ERROR: 500,
    ErrorCodes.PDF_EXPORT_FAILED: 500,
    ErrorCodes.UNKNOWN_ERROR: 500
}

# Map error codes to human-readable error titles for frontend display
ERROR_CODE_TO_TITLE = {
    ErrorCodes.REPORT_NOT_FOUND: "Report Not Found",
    ErrorCodes.INVALID_REPORT_STRUCTURE: "Invalid Report Structure",
    ErrorCodes.GENERATION_VALIDATION_ERROR: "Invalid Generation Request",
    ErrorCodes.GENERATION_AUTH_ERROR: "Authentication Error",
    ErrorCodes.GENERATION_TIMEOUT: "Generation Timeout",
    ErrorCodes.GENERATION_CONNECTION_ERROR: "Connection Error",
    ErrorCodes.VECTOR_STORE_ERROR: "Knowledge Store Error",
    ErrorCodes.MAGE_SERVICE_ERROR: "MAGE Service Error",
    ErrorCodes.GENERATION_FAILED: "Generation Failed",
    ErrorCodes.GENERATION_RUNTIME_ERROR: "Runtime Error",
    ErrorCodes.PDF_EXPORT_FAILED: "PDF Export Failed",
    ErrorCodes.UNKNOWN_ERROR: "Unknown Error"
}

# Map error codes to suggested actions for the frontend to display to users
ERROR_CODE_TO_SUGGESTION = {
    ErrorCodes.REPORT_NOT_FOUND: "Please check that the report ID is correct or create a new report.",
    ErrorCodes.INVALID_REPORT_STRUCTURE: "The report structure is invalid. Please check your report configuration.",
    ErrorCodes.GENERATION_VALIDATION_ERROR: "Please review your generation request parameters and try again.",
    ErrorCodes.GENERATION_AUTH_ERROR: "Your session may have expired. Please refresh the page and try again.",
    ErrorCodes.GENERATION_TIMEOUT: "The generation request timed out. Please try again with simpler instructions or fewer sections.",
    ErrorCodes.GENERATION_CONNECTION_ERROR: "Could not connect to the generation service. Please try again later.",
    ErrorCodes.VECTOR_STORE_ERROR: "Could not access the knowledge store. Please verify it exists or try a different one.",
    ErrorCodes.MAGE_SERVICE_ERROR: "A required MAGE service is currently unavailable. Please try again later.",
    ErrorCodes.GENERATION_FAILED: "Generation failed. Please try again with different instructions.",
    ErrorCodes.GENERATION_RUNTIME_ERROR: "An error occurred during generation. Please try again or contact support.",
    ErrorCodes.PDF_EXPORT_FAILED: "Failed to export the report to PDF. Please try again or check the report content.",
    ErrorCodes.UNKNOWN_ERROR: "An unexpected error occurred. Please try again or contact support."
}

async def http_exception_handler(request, exc):
    """Global HTTP exception handler for FastAPI exceptions"""
    now = datetime.utcnow().isoformat() + "Z"
    
    # Map HTTP status codes to our error codes
    error_code = ErrorCodes.UNKNOWN_ERROR
    if exc.status_code == 404:
        error_code = ErrorCodes.REPORT_NOT_FOUND
    
    logger.warning(f"HTTP Exception {exc.status_code}: {str(exc.detail)}")
    
    # Create an enhanced error response with more details
    error_response = ErrorResponse(
        detail=ErrorDetail(
            code=error_code,
            message=str(exc.detail)
        ),
        timestamp=now
    )
    
    # Include a title and suggestion if available
    error_response_dict = error_response.dict()
    if error_code in ERROR_CODE_TO_TITLE:
        error_response_dict["title"] = ERROR_CODE_TO_TITLE[error_code]
    if error_code in ERROR_CODE_TO_SUGGESTION:
        error_response_dict["suggestion"] = ERROR_CODE_TO_SUGGESTION[error_code]
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response_dict
    )

async def general_exception_handler(request, exc):
    """Global exception handler for all uncaught exceptions"""
    now = datetime.utcnow().isoformat() + "Z"
    
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    error_code = ErrorCodes.UNKNOWN_ERROR
    error_response = ErrorResponse(
        detail=ErrorDetail(
            code=error_code,
            message=f"Internal server error: {str(exc)}"
        ),
        timestamp=now
    )
    
    # Include title and suggestion
    error_response_dict = error_response.dict()
    error_response_dict["title"] = ERROR_CODE_TO_TITLE.get(error_code, "Server Error")
    error_response_dict["suggestion"] = ERROR_CODE_TO_SUGGESTION.get(error_code)
    
    return JSONResponse(
        status_code=500,
        content=error_response_dict
    )

def create_error_response(code: str, message: str, additional_info: Optional[Dict] = None) -> Union[ErrorResponse, Dict]:
    """
    Helper function to create a standardized error response with enriched information
    
    Args:
        code: Error code from ErrorCodes class
        message: Detailed error message
        additional_info: Optional dictionary with additional error details
        
    Returns:
        ErrorResponse or Dict: Formatted error response object
    """
    # Create basic error response
    error_response = ErrorResponse(
        detail=ErrorDetail(
            code=code,
            message=message
        ),
        timestamp=datetime.utcnow().isoformat() + "Z"
    )
    
    # Convert to dict for adding optional fields
    response_dict = error_response.dict()
    
    # Add title and suggestion if available
    if code in ERROR_CODE_TO_TITLE:
        response_dict["title"] = ERROR_CODE_TO_TITLE[code]
    if code in ERROR_CODE_TO_SUGGESTION:
        response_dict["suggestion"] = ERROR_CODE_TO_SUGGESTION[code]
    
    # Add any additional info
    if additional_info:
        for key, value in additional_info.items():
            response_dict[key] = value
    
    return response_dict

def get_status_code_for_error(error_code: str) -> int:
    """
    Get the appropriate HTTP status code for a given error code
    
    Args:
        error_code: The error code from ErrorCodes class
        
    Returns:
        int: The corresponding HTTP status code
    """
    return ERROR_CODE_TO_STATUS.get(error_code, 500)  # Default to 500 if not found

# Custom Service Layer Error
class ServiceError(Exception):
    """Custom exception for service layer errors."""
    def __init__(self, error_code: str, message: str, details: Optional[Dict] = None):
        super().__init__(message)
        self.error_code = error_code
        self.message = message
        self.details = details if details is not None else {}

    def __str__(self):
        return f"{self.error_code}: {self.message}" + (f" (Details: {self.details})") if self.details else "" 