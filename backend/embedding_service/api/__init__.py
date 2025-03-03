"""
API endpoints for the embedding service.

This package contains the API endpoints for the embedding service,
separating the API layer from the business logic in the core package.
"""

import os
import sys
from fastapi import APIRouter

# Set up the path to ensure modules can be found
module_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if module_dir not in sys.path:
    sys.path.insert(0, module_dir)

# Import all router modules with proper fallbacks
routers = {}

# Define a function to safely import a router
def import_router(module_name):
    print(f"Attempting to import router from {module_name}")
    try:
        # Try with relative imports (development)
        if module_name == "vectorstore":
            from .vectorstore import router
        elif module_name == "embedding":
            from .embedding import router
        elif module_name == "files":
            from .files import router
        elif module_name == "jobs":
            from .jobs import router
        elif module_name == "llm":
            from .llm import router
        elif module_name == "maintenance":
            from .maintenance import router
        else:
            raise ImportError(f"Unknown module: {module_name}")
        print(f"Successfully imported {module_name} router with relative import")
        return router
    except ImportError as e:
        print(f"Relative import failed for {module_name}: {e}")
        try:
            # Try direct imports for Docker
            module = __import__(f"api.{module_name}", fromlist=["router"])
            print(f"Successfully imported {module_name} router with absolute import")
            return module.router
        except ImportError as e:
            print(f"Absolute import failed for {module_name}: {e}")
            # One more attempt with a different path structure
            try:
                module = __import__(f"api.{module_name}", fromlist=["router"])
                print(f"Successfully imported {module_name} router with modified path")
                return module.router
            except ImportError as e:
                print(f"All import attempts failed for {module_name}: {e}")
                print(f"Current sys.path: {sys.path}")
                raise

# Import all routers
try:
    routers["vectorstore"] = import_router("vectorstore")
    routers["embedding"] = import_router("embedding")
    routers["files"] = import_router("files")
    routers["jobs"] = import_router("jobs")
    routers["llm"] = import_router("llm")
    routers["maintenance"] = import_router("maintenance")
except Exception as e:
    print(f"Critical error importing routers: {e}")
    raise

# Create a main router that includes all sub-routers
main_router = APIRouter(prefix="/api/embedding")

# Include all sub-routers
for name, router in routers.items():
    print(f"Including router: {name}")
    main_router.include_router(router)

__all__ = ['main_router']
