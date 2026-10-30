from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from schemas.user_schema import UserShortSchema 


class ChatMemberResponseSchema(BaseModel):
    user_id: int
    joined_at: datetime
    user: UserShortSchema

    model_config = ConfigDict(from_attributes=True)

class ChatAddSchema(BaseModel):
    title: str | None = Field(None, max_length=50)
    is_group: bool = False
    members: list[str] = []

class ChatResponseSchema(ChatAddSchema):
    id: int
    created_at: datetime
    members: list[ChatMemberResponseSchema] = []

    model_config = ConfigDict(from_attributes=True)

class ChatDetailSchema(ChatResponseSchema):
    pass