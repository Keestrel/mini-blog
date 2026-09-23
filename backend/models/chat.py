from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base

if TYPE_CHECKING:
    from models.message import MessageModel
    from models.chat_members import ChatMembersModel

class ChatModel(Base):
    __tablename__ = "chats"
    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(default="direct")
    title: Mapped[str | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    messages: Mapped[list["MessageModel"]] = relationship(
        back_populates="chat", cascade="all, delete-orphan"
    )

    members: Mapped[list["ChatMembersModel"]] = relationship(
        back_populates="chat", cascade="all, delete-orphan"
    )