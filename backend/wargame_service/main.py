# This file might become just the entry point for Uvicorn if app creation moves to app.py
# Or it can import the app and add things like middleware or startup/shutdown events.

from .app import app

# If you need to run background tasks, configure logging further, etc., do it here.

# Example: Add startup/shutdown events if needed later
# @app.on_event("startup")
# async def startup_event():
#     print("Wargame Service starting up...")
#     # Initialize database connection pool, etc.

# @app.on_event("shutdown")
# async def shutdown_event():
#     print("Wargame Service shutting down...")
#     # Clean up resources

# Print statement moved to app.py or remove if not needed for Uvicorn entry point
# print("Wargame Service Initialized - via main.py")

# Uvicorn will typically be pointed at this file like `uvicorn backend.wargame_service.main:app`
# So, the `app` imported from `app.py` needs to be available here.

# --- All code below this line is redundant and removed --- # 