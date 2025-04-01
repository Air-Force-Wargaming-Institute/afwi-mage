from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import List
from data.user import User, UserCreate, UserOut, Token, UserPermission
from database import get_db
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/users/token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(db: Session, username: str, password: str):
    user = db.query(User).filter(User.username == username).first()
    if user is None or verify_password(password, user.hashed_password) is False:
        return False
    return user

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/api/auth/users/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if user is False:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/api/auth/users/", response_model=UserOut)
def create_user(user: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.permission != UserPermission.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to create users")
    db_user = User(username=user.username, hashed_password=get_password_hash(user.password), permission=user.permission)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/api/auth/users/", response_model=List[UserOut])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.permission not in [UserPermission.ADMIN, UserPermission.DATA_SCIENTIST]:
        raise HTTPException(status_code=403, detail="Not authorized to view all users")
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/api/auth/users/me", response_model=UserOut)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/api/auth/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    user_update: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.permission != UserPermission.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to update users")
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user fields
    db_user.username = user_update.username
    db_user.permission = user_update.permission
    
    # Only update password if provided
    if user_update.password:
        db_user.hashed_password = get_password_hash(user_update.password)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/api/auth/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.permission != UserPermission.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to delete users")
    
    # Prevent deleting the last admin user
    admin_count = db.query(User).filter(User.permission == UserPermission.ADMIN).count()
    db_user = db.query(User).filter(User.id == user_id).first()
    
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    if db_user.permission == UserPermission.ADMIN and admin_count <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the last admin user"
        )
    
    db.delete(db_user)
    db.commit()
    return None

@router.get("/api/auth/users/validate-token")
async def validate_token(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Endpoint for API Gateway ForwardAuth middleware to validate tokens.
    Returns 200 if token is valid, 401 if invalid.
    Also refreshes the token's expiration time.
    """
    # Create a new token with refreshed expiration time
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    refreshed_token = create_access_token(
        data={"sub": current_user.username}, expires_delta=access_token_expires
    )
    
    response = JSONResponse(content={
        "status": "valid",
        "user_id": current_user.id,
        "username": current_user.username,
        "permission": current_user.permission,
        "refreshed_token": refreshed_token
    })
    response.headers["X-User-ID"] = str(current_user.id)
    response.headers["X-Username"] = current_user.username
    response.headers["X-User-Permission"] = current_user.permission
    response.headers["X-Refreshed-Token"] = refreshed_token
    return response

