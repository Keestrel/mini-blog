from fastapi import HTTPException
from core.database import SessionDep
from schemas.post_schema import PostAddSchema, PostUpdateSchema
from modules.posts.repository import PostRepository

class PostService:
    @staticmethod
    async def _check(session, post_id, user_id):
        post = await PostRepository.get_by_id(session, post_id)
        if not post: raise HTTPException(404, "Пост не найден")
        if post.author_id != user_id: raise HTTPException(403, "Нет прав")
        return post

    @staticmethod
    async def update(session, post_id, user_id, data: PostAddSchema):
        await PostRepository.update(session, await PostService._check(session, post_id, user_id), title=data.title, content=data.content)
        return {"OK": True}

    @staticmethod
    async def patch(session, post_id, user_id, data: PostUpdateSchema):
        await PostRepository.update(session, await PostService._check(session, post_id, user_id), **data.model_dump(exclude_unset=True))
        return {"OK": True}

    @staticmethod
    async def delete(session, post_id, user_id):
        await PostRepository.delete(session, await PostService._check(session, post_id, user_id))
        return {"OK": True}