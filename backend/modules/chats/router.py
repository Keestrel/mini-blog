from fastapi import APIRouter, Depends, HTTPException, Query, status
from authx import TokenPayload
from core.database import SessionDep
from core.config import security
from schemas.chat_schema import ChatAddSchema, ChatResponseSchema, ChatDetailSchema
from schemas.message_schema import MessageResponseSchema
from modules.chats.service import ChatService
from modules.chats.repository import ChatRepository

router = APIRouter(prefix="/chats", tags=["Чаты"])

@router.post("", response_model=ChatResponseSchema)
async def create_chat(data: ChatAddSchema, session: SessionDep, target_username: str | None = None, payload: TokenPayload = Depends(security.access_token_required)):
    return await ChatService.create(session, int(payload.sub), data, target_username)

@router.get("", response_model=list[ChatResponseSchema])
async def get_chats(session: SessionDep, payload: TokenPayload = Depends(security.access_token_required)):
    return await ChatRepository.get_user_chats(session, int(payload.sub))

@router.get("/{chat_id}", response_model=ChatDetailSchema)
async def get_detail(chat_id: int, session: SessionDep, payload: TokenPayload = Depends(security.access_token_required)):
    if not await ChatRepository.is_member(session, chat_id, int(payload.sub)):
        raise HTTPException(403, "Нет доступа")
    return await ChatRepository.get_chat_detail(session, chat_id)

@router.get("/{chat_id}/messages", response_model=list[MessageResponseSchema])
async def get_messages(chat_id: int, session: SessionDep, limit: int = 50, offset: int = 0, payload: TokenPayload = Depends(security.access_token_required)):
    if not await ChatRepository.is_member(session, chat_id, int(payload.sub)):
        raise HTTPException(403, "Нет доступа")
    return await ChatRepository.get_messages(session, chat_id, limit, offset)

@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(chat_id: int, session: SessionDep, delete_for_all: bool = Query(False), payload: TokenPayload = Depends(security.access_token_required)):
    await ChatService.delete(session, chat_id, int(payload.sub), delete_for_all)