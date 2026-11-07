from typing import TYPE_CHECKING
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime

if TYPE_CHECKING:
    from schemas.post_schema import PostShortSchema



class UserAddSchema(BaseModel):
    username: str = Field(..., max_length=30)
    password: str = Field(..., max_length=30)
    email: EmailStr


class UserShortSchema(BaseModel):
    id: int
    username: str
    email: str
    
    last_seen: datetime | None = None
    is_online: bool = False

    model_config = ConfigDict(from_attributes=True)


class UserResponseSchema(BaseModel):
    id: int
    username: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


class UserWithPostsSchema(UserResponseSchema):
    posts: list["PostShortSchema"] = []