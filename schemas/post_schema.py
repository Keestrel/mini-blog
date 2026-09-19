from pydantic import BaseModel, Field



class PostAddSchema(BaseModel):
    title: str = Field(max_length=30)
    content: str = Field(max_length=100)

class PostAuthorSchema(BaseModel):
    id: int
    username: str

    class Config:
        from_attributes = True

class PostResponseSchema(PostAddSchema):
    id: int
    author_id: int
    author: PostAuthorSchema

    class Config:
        from_attributes = True


class PostUpdateSchema(BaseModel):
    title: str | None = Field(None, max_length= 30)
    content: str | None = Field(None, max_length=100)