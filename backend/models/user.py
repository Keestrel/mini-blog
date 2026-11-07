from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import DateTime
from models.base import Base
from datetime import datetime

if TYPE_CHECKING:
    from models.post import PostModel
    from models.message import MessageModel
    from models.chat_members import ChatMembersModel


class UserModel(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(unique=True, index=True)
    password: Mapped[str]
    email: Mapped[str] = mapped_column(unique=True, index=True)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    
    posts: Mapped[list["PostModel"]] = relationship(back_populates="author")
    messages: Mapped[list["MessageModel"]] = relationship(back_populates="sender")
    chat_members: Mapped[list["ChatMembersModel"]] = relationship(back_populates="user")