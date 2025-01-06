from pydantic import BaseModel
from enum import Enum

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
    password: str = None
    permission: UserPermission = None

class UserOut(UserBase):
    id: int
    permission: UserPermission

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str
