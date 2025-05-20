from fastapi import APIRouter, HTTPException, Depends
# import requests
from config import UPLOAD_SERVICE_URL, EXTRACTION_SERVICE_URL, AGENT_SERVICE_URL, EMBEDDING_SERVICE_URL, AUTH_SERVICE_URL

router = APIRouter()
# # 
# async def verify_token(token: str):
#     response = requests.get(f"{AUTH_SERVICE_URL}/api/users/me", headers={"Authorization": f"Bearer {token}"})
#     if response.status_code != 200:
#         raise HTTPException(status_code=401, detail="Invalid token")
#     return response.json()
    
    # status = {}
    # for service, url in services.items():
    #     try:
    #         response = requests.get(f"{url}/health", timeout=5)
    #         status[service] = "up" if response.status_code == 200 else "down"
    #     except requests.RequestException:
    #         status[service] = "down"
    
    # return {"status": status}

# Add other core-specific routes here, using the verify_token function as a dependency where needed
# For example:
# @router.get("/protected-route")
# async def protected_route(user: dict = Depends(verify_token)):
#     return {"message": "This is a protected route", "user": user}
