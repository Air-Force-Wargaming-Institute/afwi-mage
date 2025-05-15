from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging

from config import logger
from services.websocket_service import ws_manager

router = APIRouter(tags=["websockets"])

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint for real-time updates.
    Client should connect with a unique client_id which is used for the duration of the session.
    
    Args:
        websocket: The WebSocket connection
        client_id: A unique ID to identify the client
    """
    await ws_manager.connect(websocket, client_id)
    try:
        while True:
            # Wait for messages from the client
            data = await websocket.receive_text()
            # Echo back for testing/debugging 
            await websocket.send_json({
                "type": "echo",
                "data": f"Message received: {data}"
            })
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for client: {client_id}")
        ws_manager.disconnect(websocket, client_id)
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {e}")
        ws_manager.disconnect(websocket, client_id) 