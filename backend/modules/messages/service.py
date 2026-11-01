from collections import defaultdict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, chat_id: int):
        await websocket.accept()
        self.active_connections[chat_id].append(websocket)

    def disconnect(self, websocket: WebSocket, chat_id: int):
        if chat_id in self.active_connections and websocket in self.active_connections[chat_id]:
            self.active_connections[chat_id].remove(websocket)
            if not self.active_connections[chat_id]:
                del self.active_connections[chat_id]

    async def broadcast(self, message: dict, chat_id: int):
        if chat_id not in self.active_connections:
            return
        for connection in list(self.active_connections[chat_id]):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection, chat_id)

manager = ConnectionManager()