from fastapi import HTTPException
from core.database import SessionDep
from schemas.chat_schema import ChatAddSchema, ChatDetailSchema
from modules.chats.repository import ChatRepository
from modules.messages.service import manager

class ChatService:
    @staticmethod
    async def create(session: SessionDep, current_id: int, data: ChatAddSchema, target_username: str | None):
        members_ids = [current_id]

        if not data.is_group:
            if not target_username: raise HTTPException(400, "Укажите никнейм собеседника")
            users = await ChatRepository.get_users_by_usernames(session, [target_username])
            if not users: raise HTTPException(404, "Пользователь не найден")
            
            target = users[0]
            if target.id == current_id: raise HTTPException(400, "Нельзя создать чат с собой")
            if await ChatRepository.check_personal_chat(session, current_id, target.id):
                raise HTTPException(400, "Личный диалог уже существует")
            
            members_ids.append(target.id)
            title = None
        else:
            if data.members:
                for u in await ChatRepository.get_users_by_usernames(session, data.members):
                    if u.id != current_id: members_ids.append(u.id)
            title = data.title

        return await ChatRepository.create_chat(session, title, data.is_group, members_ids)

    @staticmethod
    async def delete(session: SessionDep, chat_id: int, user_id: int, for_all: bool):
        member_link = await ChatRepository.is_member(session, chat_id, user_id)
        if not member_link: raise HTTPException(403, "Нет доступа")
        await ChatRepository.delete_chat_all(session, chat_id) if for_all else await ChatRepository.leave_chat(session, chat_id, member_link)

    @staticmethod
    async def get_detail(session, chat_id: int, current_user_id: int):
        if not await ChatRepository.is_member(session, chat_id, current_user_id):
            raise HTTPException(403, "Нет доступа")

        chat_db = await ChatRepository.get_chat_detail(session, chat_id)
        if not chat_db:
            raise HTTPException(404, "Чат не найден")

        chat_data = ChatDetailSchema.model_validate(chat_db).model_dump()
        for member in chat_data["members"]:
            uid = member["user"]["id"]
            member["user"]["is_online"] = manager.is_user_online(uid)

        return chat_data