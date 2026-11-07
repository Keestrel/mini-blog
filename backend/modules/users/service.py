from core.database import SessionDep
from fastapi import HTTPException
from core.config import security
from modules.users.repository import UserRepository
from modules.messages.service import manager
from schemas.user_schema import UserShortSchema

class UserService:
    @staticmethod
    async def get_me(session, current_user_id: int):
        user = await UserRepository.get_by_id(session, user_id=current_user_id)
        if not user:
            raise HTTPException(404, "Пользователь не найден")

        user_data = UserShortSchema.model_validate(user).model_dump()
        user_data["is_online"] = True
        return UserShortSchema(**user_data)
        
    @staticmethod
    async def get_user_by_id(session, target_user_id: int):
        user = await UserRepository.get_by_id(session, user_id=target_user_id)

        if not user:
            raise HTTPException(404, "Пользователь не найден")

        user_data = UserShortSchema.model_validate(user).model_dump()
        user_data["is_online"] = manager.is_user_online(target_user_id)
        return UserShortSchema(**user_data)

        