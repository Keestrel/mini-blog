from schemas.user_schema import UserShortSchema
from sqlalchemy import select
from core.database import SessionDep
from models.user import UserModel

class UserRepository:
    @staticmethod
    async def get_by_id(session: SessionDep, user_id: int) -> UserModel | None:
        return await session.get(UserModel, user_id)

    @staticmethod
    async def get_all(session: SessionDep) -> list[UserModel]:
        query = select(UserModel).order_by(UserModel.id.asc())
        return list((await session.execute(query)).scalars().all())