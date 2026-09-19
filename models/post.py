from typing import TYPE_CHECKING
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey
from models.base import Base

if TYPE_CHECKING:
    from models.user import UserModel


class PostModel(Base):
    __tablename__ = "posts"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    content: Mapped[str]
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    author: Mapped["UserModel"] = relationship(back_populates="posts")