from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status, Depends
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from core.database import SessionDep
from core.config import verify_websocket_token
from models.chat_members import ChatMembersModel
from models.message import MessageModel
from schemas.message_schema import MessageResponseSchema
from services.ws_manager import manager

router = APIRouter(prefix="/ws", tags=["WebSockets"])


@router.websocket("/chats/{chat_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    chat_id: int,
    session: SessionDep,      
    token: str = Query(...), 
):
    # проверка токена
    try:
        payload = verify_websocket_token(token)
        user_id = int(payload.get("sub"))
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # проверка доступа к чату
    member_check = select(ChatMembersModel).where(
        and_(ChatMembersModel.chat_id == chat_id, ChatMembersModel.user_id == user_id)
    )
    is_member = (await session.execute(member_check)).scalar_one_or_none()
    if not is_member:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # подключение к менеджеру и обработка сообщений
    await manager.connect(websocket, chat_id)
    try:
        while True:
            data = await websocket.receive_json()
            content = data.get("content")
            if not content or not content.strip():
                continue

            new_message = MessageModel(
                chat_id=chat_id,
                sender_id=user_id,
                content=content.strip(),
            )
            session.add(new_message)
            await session.commit()

            query = (
                select(MessageModel)
                .options(selectinload(MessageModel.sender))
                .where(MessageModel.id == new_message.id)
            )
            message_db = (await session.execute(query)).scalar_one()
            response_data = MessageResponseSchema.model_validate(message_db).model_dump(mode="json")

            await manager.broadcast(response_data, chat_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, chat_id)