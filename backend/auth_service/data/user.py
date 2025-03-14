from sqlalchemy import Column, Integer, String, Enum
from database import Base
from pydantic import BaseModel, ConfigDict
from enum import Enum as PyEnum

class UserPermission(str, PyEnum):
    ADMIN = "admin"
    DATA_SCIENTIST = "data_scientist"
    BASIC_USER = "basic_user"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    permission = Column(Enum(UserPermission), default=UserPermission.BASIC_USER)

class UserCreate(BaseModel):
    username: str
    password: str
    permission: UserPermission

class UserOut(BaseModel):
    id: int
    username: str
    permission: UserPermission

    # Replace Config class with model_config
    model_config = ConfigDict(from_attributes=True)  # replaces orm_mode=True

class Token(BaseModel):
    access_token: str
    token_type: str

