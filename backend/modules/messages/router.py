from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy import select, and_
from core.database import SessionDep
from core.config import verify_websocket_token
from models.chat_members import ChatMembersModel
from modules.messages.service import manager
from modules.messages.repository import MessageRepository

router = APIRouter(prefix="/ws", tags=["WebSockets"])

@router.websocket("/chats/{chat_id}")
async def websocket_chat(websocket: WebSocket, chat_id: int, session: SessionDep, token: str = Query(...)):
    try:
        user_id = int(verify_websocket_token(token).get("sub"))
    except Exception:
        return await websocket.close(code=status.WS_1008_POLICY_VIOLATION)

    check = select(ChatMembersModel).where(and_(ChatMembersModel.chat_id == chat_id, ChatMembersModel.user_id == user_id))
    if not (await session.execute(check)).scalar_one_or_none():
        return await websocket.close(code=status.WS_1008_POLICY_VIOLATION)

    await manager.connect(websocket, chat_id, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            if content := data.get("content", "").strip():
                response_data = await MessageRepository.save_message(session, chat_id, user_id, content)
                response_data["type"] = "new_message"
                await manager.broadcast(response_data, chat_id)
    except WebSocketDisconnect:
        await manager.disconnect(websocket, chat_id, user_id)