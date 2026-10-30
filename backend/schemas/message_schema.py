from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from schemas.user_schema import UserShortSchema 

class MessageAddSchema(BaseModel):
    chat_id: int
    content: str = Field(..., max_length=1000)

class MessageResponseSchema(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    content: str
    created_at: datetime
    sender: UserShortSchema

    model_config = ConfigDict(from_attributes=True)

class MessageUpdateSchema(BaseModel):
    content: str = Field(..., max_length=1000)