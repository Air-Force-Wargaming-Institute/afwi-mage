from pydantic import BaseModel, ConfigDict, Field
from enum import Enum
from typing import Optional, List, Dict, Any

class UserPermission(str, Enum):
    ADMIN = "admin"
    DATA_SCIENTIST = "data_scientist"
    BASIC_USER = "basic_user"

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    permission: UserPermission

class UserUpdate(UserBase):
    password: Optional[str] = None
    permission: Optional[UserPermission] = None

class UserOut(UserBase):
    id: int
    permission: UserPermission

    # Replace Config class with model_config
    model_config = ConfigDict(from_attributes=True)  # replaces orm_mode=True

class Token(BaseModel):
    access_token: str
    token_type: str
