from sqlalchemy import select
from sqlalchemy.orm import selectinload
from core.database import SessionDep
from models.message import MessageModel
from schemas.message_schema import MessageResponseSchema

class MessageRepository:
    @staticmethod
    async def save_message(session: SessionDep, chat_id: int, sender_id: int, content: str) -> dict:
        new_msg = MessageModel(chat_id=chat_id, sender_id=sender_id, content=content)
        session.add(new_msg)
        await session.commit()
        
        query = select(MessageModel).options(selectinload(MessageModel.sender)).where(MessageModel.id == new_msg.id)
        message_db = (await session.execute(query)).scalar_one()
        return MessageResponseSchema.model_validate(message_db).model_dump(mode="json")