import logging
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Stores active connections, potentially mapping session_id to WebSocket
        self.active_connections: Dict[str, WebSocket] = {} 
        # Could also store connections per session_id if multiple observers are planned
        # self.active_connections: Dict[str, List[WebSocket]] = {} 

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connected for session: {session_id}")
        # Store by session_id if needed:
        # if session_id not in self.active_connections:
        #     self.active_connections[session_id] = []
        # self.active_connections[session_id].append(websocket)

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            # If storing lists: self.active_connections[session_id].remove(websocket)
            # If list becomes empty: del self.active_connections[session_id]
            del self.active_connections[session_id]
            logger.info(f"WebSocket disconnected for session: {session_id}")
            
    async def send_personal_message(self, message: str, session_id: str):
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            try:
                 await websocket.send_text(message)
            except Exception as e:
                 logger.error(f"Error sending message to session {session_id}: {e}")
                 # Consider disconnecting on error
                 self.disconnect(session_id)


    async def broadcast(self, message: str):
        # Example if broadcasting needed (e.g., to observers)
        disconnected_sessions = []
        for session_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to session {session_id}: {e}")
                disconnected_sessions.append(session_id)
        
        # Clean up disconnected sockets found during broadcast
        for session_id in disconnected_sessions:
             self.disconnect(session_id)

# Instantiate the manager (can be imported into routes)
manager = ConnectionManager() 