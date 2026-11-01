from sqlalchemy import select
from sqlalchemy.orm import joinedload
from core.database import SessionDep
from models.post import PostModel

class PostRepository:
    @staticmethod
    async def create(session: SessionDep, title: str, content: str, author_id: int):
        post = PostModel(title=title, content=content, author_id=author_id)
        session.add(post)
        await session.commit()
        return post

    @staticmethod
    async def get_all(session: SessionDep):
        return (await session.execute(select(PostModel).options(joinedload(PostModel.author)))).scalars().all()

    @staticmethod
    async def get_by_id(session: SessionDep, post_id: int):
        return (await session.execute(select(PostModel).where(PostModel.id == post_id))).scalar_one_or_none()

    @staticmethod
    async def update(session: SessionDep, post: PostModel, **kwargs):
        for k, v in kwargs.items(): setattr(post, k, v)
        await session.commit()

    @staticmethod
    async def delete(session: SessionDep, post: PostModel):
        await session.delete(post)
        await session.commit()