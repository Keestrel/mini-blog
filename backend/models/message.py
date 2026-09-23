from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, func
from models.base import Base

if TYPE_CHECKING:
    from models.user import UserModel
    from models.chat import ChatModel

class MessageModel(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    chat_id: Mapped[int] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"))
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    content: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    is_edited: Mapped[bool] = mapped_column(default="False")

    chat: Mapped["ChatModel"] = relationship(back_populates="messages")
    sender: Mapped["UserModel"] = relationship(back_populates="messages")