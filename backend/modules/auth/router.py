from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel
from core.database import SessionDep
from core.config import security, config
from schemas.user_schema import UserAddSchema
from modules.auth.service import AuthService
from modules.auth.repository import AuthRepository

class UserLoginSchema(BaseModel):
    username: str
    password: str

router = APIRouter(prefix="/auth", tags=["Пользователи"])

@router.post("/register")
async def register(data: UserAddSchema, session: SessionDep):
    return await AuthService.register(session, data)

@router.post("/login")
async def login(credentials: UserLoginSchema, response: Response, session: SessionDep):
    token = await AuthService.login(session, credentials.username, credentials.password)
    response.set_cookie(config.JWT_ACCESS_COOKIE_NAME, token)
    return {"access_token": token}