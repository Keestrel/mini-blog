from collections import defaultdict
from fastapi import WebSocket
from datetime import datetime, timezone
from core.database import new_session
from modules.auth.repository import AuthRepository

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[tuple[WebSocket, int]]] = defaultdict(list)
        self.user_connections: dict[int, set[WebSocket]] = defaultdict(set)

    def is_user_online(self, user_id: int) -> bool:
        return user_id in self.user_connections and len(self.user_connections[user_id]) > 0

    async def connect(self, websocket: WebSocket, chat_id: int, user_id: int):
        await websocket.accept()
        self.active_connections[chat_id].append((websocket, user_id))
        self.user_connections[user_id].add(websocket)
        
        await self.broadcast({"type": "status_update", "user_id": user_id, "is_online": True}, chat_id)

    async def disconnect(self, websocket: WebSocket, chat_id: int, user_id: int):
        if chat_id in self.active_connections:
            self.active_connections[chat_id] = [(ws, uid) for ws, uid in self.active_connections[chat_id] if ws != websocket]
            if not self.active_connections[chat_id]:
                del self.active_connections[chat_id]
        
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
                
                now = datetime.now(timezone.utc)
                async with new_session() as session:
                    await AuthRepository.update_last_seen(session, user_id, now)
                
                await self.broadcast({
                    "type": "status_update", 
                    "user_id": user_id, 
                    "is_online": False, 
                    "last_seen": now.isoformat()
                }, chat_id)

    async def broadcast(self, message: dict, chat_id: int):
        if chat_id not in self.active_connections: return
        for connection, _ in list(self.active_connections[chat_id]):
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()