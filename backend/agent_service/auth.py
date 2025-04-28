from fastapi import Depends, HTTPException, status, Header
import logging

# Use absolute import from the root level of the service
# from config import settings
from models import User

logger = logging.getLogger(__name__)

# Remove oauth2_scheme definition
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token") 

# Update credentials_exception
credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not identify user from headers.", # Detail reflects header reliance
    # headers={"WWW-Authenticate": "Bearer"}, # Remove WWW-Authenticate header
)

# Rewrite get_current_user function to use X-Username Header
def get_current_user(
    x_username: str | None = Header(None, alias="X-Username") # Get username from header
) -> User:
    """
    Dependency function to get user info from headers set by auth middleware.
    Relies on the upstream auth-middleware to validate the actual token.
    """
    logger.debug(f"Attempting to get user from X-Username header: {x_username}")
    
    if x_username is None:
        logger.error("X-Username header missing or None after auth middleware.")
        raise credentials_exception
    
    # Create User object from the username passed in the header
    user = User(username=x_username)
    logger.info(f"User identified via X-Username header: {user.username}")
    return user

# Old JWT decoding logic has been removed. 