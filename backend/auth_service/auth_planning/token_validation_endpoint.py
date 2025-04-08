from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from typing import Optional
import os
from data.user import User
from database import get_db
from config import SECRET_KEY, ALGORITHM

# Add this to the existing router in user_routes.py

@router.get("/validate-token")
async def validate_token(
    request: Request,
    dev_mode: bool = False,
    db: Session = Depends(get_db)
):
    """
    Validates JWT token for the API Gateway.
    
    This endpoint is designed to be used with Traefik's ForwardAuth middleware.
    It checks if a token is valid and returns user information as headers.
    
    Args:
        request: The incoming request with Authorization header
        dev_mode: If True, applies more lenient validation for development
        db: Database session
        
    Returns:
        JSONResponse with auth status and user headers
    """
    # Get auth header from request
    auth_header = request.headers.get("Authorization")
    
    # Environment variable based auth disabling
    if os.getenv("DISABLE_AUTH", "false").lower() == "true":
        return JSONResponse(
            content={"status": "Auth disabled, access granted"},
            headers={
                "X-Auth-Status": "disabled",
                "X-Auth-User": "anonymous",
                "X-Auth-Role": "anonymous"
            }
        )
    
    # Handle public paths that don't require authentication
    request_path = request.url.path
    public_paths = os.getenv("PUBLIC_PATHS", "/api/health,/docs").split(",")
    
    if any(request_path.startswith(path.strip()) for path in public_paths):
        return JSONResponse(
            content={"status": "Public path, access granted"},
            headers={
                "X-Auth-Status": "public",
                "X-Auth-User": "anonymous",
                "X-Auth-Role": "anonymous"
            }
        )
    
    # No authorization header provided
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Extract token
    token = auth_header.replace("Bearer ", "")
    
    try:
        # Decode and validate JWT
        payload = jwt.decode(
            token, 
            SECRET_KEY, 
            algorithms=[ALGORITHM]
        )
        
        # Extract username from token
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims",
                headers={"WWW-Authenticate": "Bearer"}
            )
            
        # Get user from database
        user = db.query(User).filter(User.username == username).first()
        
        # Check if user exists
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Set user information in headers to be forwarded
        return JSONResponse(
            content={"authenticated": True},
            headers={
                "X-Auth-User": user.username,
                "X-Auth-Role": str(user.permission),
                "X-Auth-Status": "authenticated",
                "X-Auth-User-ID": str(user.id)
            }
        )
        
    except JWTError as e:
        # Handle token validation errors
        if dev_mode:
            # In dev mode, we may want to log the error but still allow the request
            print(f"Token validation error in dev mode: {str(e)}")
            return JSONResponse(
                content={"status": "Dev mode: Token invalid but access granted"},
                headers={
                    "X-Auth-Status": "dev-bypass",
                    "X-Auth-User": "dev-user",
                    "X-Auth-Role": "admin"  # Consider security implications
                }
            )
        else:
            # In production, always enforce token validity
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"}
            ) 