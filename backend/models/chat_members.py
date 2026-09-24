from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, func
from models.base import Base

if TYPE_CHECKING:
    from models.user import UserModel
    from models.chat import ChatModel

class ChatMembersModel(Base):
    __tablename__ = "chat_members"
    chat_id: Mapped[int] = mapped_column(
        ForeignKey("chats.id", ondelete="CASCADE"), primary_key=True)
    
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    
    role: Mapped[str] = mapped_column(default="member")
    joined_at: Mapped[datetime] = mapped_column(server_default=func.now())

    chat: Mapped["ChatModel"] = relationship(back_populates="members")
    user: Mapped["UserModel"] = relationship(back_populates="chat_members")