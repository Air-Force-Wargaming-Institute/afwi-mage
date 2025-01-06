from sqlalchemy.orm import Session
from data.user import User 
from schemas import UserPermission
from database import SessionLocal, engine
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def init_db():
    db = SessionLocal()
    try:
        # Check if any users exist
        user_count = db.query(User).count()
        print(f"Current user count: {user_count}")
        if user_count == 0:
            # Create admin user
            admin_user = User(
                username="admin",
                hashed_password=get_password_hash("12345"),
                permission=UserPermission.ADMIN
            )
            db.add(admin_user)
            db.commit()
            print("Admin user created successfully.")
            
            # Verify the user was actually added
            new_user_count = db.query(User).count()
            print(f"New user count: {new_user_count}")
            
            # Retrieve and print the admin user details
            admin = db.query(User).filter(User.username == "admin").first()
            if admin:
                print(f"Admin user details: ID={admin.id}, Username={admin.username}, Permission={admin.permission}")
            else:
                print("Failed to retrieve admin user after creation")
        else:
            print("Users already exist. Skipping admin user creation.")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
