from pydantic import BaseModel, ConfigDict, Field
from schemas.user_schema import UserShortSchema


class PostAddSchema(BaseModel):
    title: str = Field(..., max_length=30)
    content: str = Field(..., max_length=100)


class PostShortSchema(PostAddSchema):
    id: int

    model_config = ConfigDict(from_attributes=True)


class PostResponseSchema(PostAddSchema):
    id: int
    author_id: int
    author: UserShortSchema

    model_config = ConfigDict(from_attributes=True)


class PostUpdateSchema(BaseModel):
    title: str | None = Field(None, max_length=30)
    content: str | None = Field(None, max_length=100)