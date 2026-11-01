from fastapi import HTTPException
from core.database import SessionDep
from core.config import security
from core.security import get_password_hash, verify_password
from schemas.user_schema import UserAddSchema
from modules.auth.repository import AuthRepository

class AuthService:
    @staticmethod
    async def register(session: SessionDep, data: UserAddSchema):
        if await AuthRepository.get_user(session, username=data.username):
            raise HTTPException(400, "Пользователь существует")
        await AuthRepository.create_user(session, data.username, get_password_hash(data.password), data.email)
        return {"OK": True}

    @staticmethod
    async def login(session: SessionDep, username: str, password_raw: str):
        user = await AuthRepository.get_user(session, username=username)
        if not user or not verify_password(password_raw, user.password):
            raise HTTPException(401, "Неверные данные")
        return security.create_access_token(uid=str(user.id))