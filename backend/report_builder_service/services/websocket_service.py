from fastapi import WebSocket
from typing import Dict, List
import logging

from config import logger

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = []
        self.active_connections[client_id].append(websocket)
        logger.info(f"WebSocket connection established for client: {client_id}")

    def disconnect(self, websocket: WebSocket, client_id: str):
        if client_id in self.active_connections:
            self.active_connections[client_id].remove(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
            logger.info(f"WebSocket connection closed for client: {client_id}")

    async def send_json(self, message: dict, client_id: str):
        if client_id in self.active_connections:
            for connection in self.active_connections[client_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to WebSocket for client {client_id}: {e}")
                    
    async def broadcast(self, message: dict):
        """Send a message to all connected clients"""
        for client_id in self.active_connections:
            await self.send_json(message, client_id)

# Create a global instance of the connection manager
ws_manager = ConnectionManager() 