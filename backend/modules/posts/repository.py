from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload
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
    async def get_all(session: SessionDep, author_id: int | None = None):
        query = select(PostModel).options(selectinload(PostModel.author)).order_by(PostModel.id.desc()) #Нетерпеливая загрзка
        if author_id is not None:
            query = query.where(PostModel.author_id == author_id)
        return list((await session.execute(query)).scalars().all())

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