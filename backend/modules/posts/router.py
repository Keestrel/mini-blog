from fastapi import APIRouter, Depends
from authx import TokenPayload
from core.database import SessionDep
from core.config import security
from schemas.post_schema import PostAddSchema, PostUpdateSchema
from modules.posts.service import PostService
from modules.posts.repository import PostRepository

router = APIRouter(prefix="/posts", tags=["Публикации"])

@router.post("")
async def create(data: PostAddSchema, session: SessionDep, p: TokenPayload = Depends(security.access_token_required)):
    return await PostRepository.create(session, data.title, data.content, int(p.sub))

@router.get("")
async def get_all(session: SessionDep, author_id: int | None = None):
    return await PostRepository.get_all(session, author_id=author_id)

@router.put("/{post_id}")
async def put_post(post_id: int, data: PostAddSchema, session: SessionDep, p: TokenPayload = Depends(security.access_token_required)):
    return await PostService.update(session, post_id, int(p.sub), data)

@router.patch("/{post_id}")
async def patch_post(post_id: int, data: PostUpdateSchema, session: SessionDep, p: TokenPayload = Depends(security.access_token_required)):
    return await PostService.patch(session, post_id, int(p.sub), data)

@router.delete("/{post_id}")
async def del_post(post_id: int, session: SessionDep, p: TokenPayload = Depends(security.access_token_required)):
    return await PostService.delete(session, post_id, int(p.sub))