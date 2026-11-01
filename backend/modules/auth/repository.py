from sqlalchemy import select
from core.database import SessionDep
from models.user import UserModel

class AuthRepository:
    @staticmethod
    async def get_user(session: SessionDep, username: str = None, user_id: int = None):
        q = select(UserModel)
        if username: q = q.where(UserModel.username == username)
        if user_id: q = q.where(UserModel.id == user_id)
        return (await session.execute(q)).scalar_one_or_none()

    @staticmethod
    async def get_all_users(session: SessionDep):
        return (await session.execute(select(UserModel))).scalars().all()

    @staticmethod
    async def create_user(session: SessionDep, username: str, hashed_pw: str, email: str):
        user = UserModel(username=username, password=hashed_pw, email=email)
        session.add(user)
        await session.commit()
        return user