from pydantic import BaseModel, Field, EmailStr


class UserAddSchema(BaseModel):
    username: str = Field(max_length=30)
    password: str = Field(max_length=30)
    email: EmailStr

class UserSchema(UserAddSchema):
    id: int
    posts: str
