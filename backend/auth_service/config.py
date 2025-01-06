import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/authdb")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

