from sqlalchemy import select, and_, delete, func
from sqlalchemy.orm import selectinload
from core.database import SessionDep
from models.chat import ChatModel
from models.chat_members import ChatMembersModel
from models.message import MessageModel
from models.user import UserModel

class ChatRepository:
    @staticmethod
    async def get_users_by_usernames(session: SessionDep, usernames: list[str]):
        query = select(UserModel).where(UserModel.username.in_(usernames))
        return (await session.execute(query)).scalars().all()

    @staticmethod
    async def check_personal_chat(session: SessionDep, user1_id: int, user2_id: int):
        c1 = select(ChatMembersModel.chat_id).where(ChatMembersModel.user_id == user1_id)
        c2 = select(ChatMembersModel.chat_id).where(ChatMembersModel.user_id == user2_id)
        q = select(ChatModel).where(and_(ChatModel.is_group == False, ChatModel.id.in_(c1), ChatModel.id.in_(c2)))
        return (await session.execute(q)).scalars().first()

    @staticmethod
    async def create_chat(session: SessionDep, title: str | None, is_group: bool, members_ids: list[int]):
        chat = ChatModel(title=title, is_group=is_group)
        session.add(chat)
        await session.flush()
        
        session.add_all([ChatMembersModel(chat_id=chat.id, user_id=uid) for uid in members_ids])
        await session.commit()
        
        query = select(ChatModel).options(selectinload(ChatModel.members).selectinload(ChatMembersModel.user)).where(ChatModel.id == chat.id)
        return (await session.execute(query)).scalar_one()

    @staticmethod
    async def get_user_chats(session: SessionDep, user_id: int):
        q = select(ChatModel).join(ChatMembersModel).where(ChatMembersModel.user_id == user_id).options(selectinload(ChatModel.members).selectinload(ChatMembersModel.user)).order_by(ChatModel.created_at.desc())
        return (await session.execute(q)).scalars().unique().all()

    @staticmethod
    async def is_member(session: SessionDep, chat_id: int, user_id: int):
        return (await session.execute(select(ChatMembersModel).where(and_(ChatMembersModel.chat_id == chat_id, ChatMembersModel.user_id == user_id)))).scalar_one_or_none()

    @staticmethod
    async def get_chat_detail(session: SessionDep, chat_id: int):
        return (await session.execute(select(ChatModel).options(selectinload(ChatModel.members).selectinload(ChatMembersModel.user)).where(ChatModel.id == chat_id))).scalar_one_or_none()

    @staticmethod
    async def get_messages(session: SessionDep, chat_id: int, limit: int, offset: int):
        return (await session.execute(select(MessageModel).options(selectinload(MessageModel.sender)).where(MessageModel.chat_id == chat_id).order_by(MessageModel.created_at.asc()).offset(offset).limit(limit))).scalars().all()

    @staticmethod
    async def delete_chat_all(session: SessionDep, chat_id: int):
        await session.execute(delete(MessageModel).where(MessageModel.chat_id == chat_id))
        await session.execute(delete(ChatMembersModel).where(ChatMembersModel.chat_id == chat_id))
        await session.execute(delete(ChatModel).where(ChatModel.id == chat_id))
        await session.commit()

    @staticmethod
    async def leave_chat(session: SessionDep, chat_id: int, member_link: ChatMembersModel):
        await session.delete(member_link)
        if (await session.execute(select(func.count()).select_from(ChatMembersModel).where(ChatMembersModel.chat_id == chat_id))).scalar() == 0:
            await session.execute(delete(MessageModel).where(MessageModel.chat_id == chat_id))
            await session.execute(delete(ChatModel).where(ChatModel.id == chat_id))
        await session.commit()