from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from core.database import SessionDep
from core.config import security
from schemas.post_schema import PostAddSchema, PostUpdateSchema
from models.post import PostModel
from authx import TokenPayload
from sqlalchemy.orm import joinedload

router = APIRouter(prefix="/posts", tags=["Публикации"])



@router.post("", summary="Создание поста")
async def create_post(
    data: PostAddSchema, 
    session: SessionDep, 
    payload: TokenPayload = Depends(security.access_token_required)
    ):
    user_id = int(payload.sub)

    new_post = PostModel(
        title=data.title,
        content=data.content,
        author_id=user_id
    )
    session.add(new_post)
    await session.commit()
    return {"OK": True}


@router.get("", summary="Все публикации",)
async def get_posts(session: SessionDep):
    query = select(PostModel).options(joinedload(PostModel.author))
    result = await session.execute(query)
    posts = result.scalars().all()
    return posts


@router.put("/{post_id}", summary="Изменение поста")
async def put_posts(
    post_id: int,
    data: PostAddSchema,
    session: SessionDep, 
    payload: TokenPayload = Depends(security.access_token_required)
    ):
    query = select(PostModel).where(PostModel.id == post_id)
    result = await session.execute(query)
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Такого поста не существует"
        )
    

    user_id = int(payload.sub)

    if post.author_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Вы можете редактировать только свои публикации"
        )
    
    post.title = data.title
    post.content = data.content

    session.commit()
    await session.add()
    return {"OK": True}


@router.delete("/{post_id}", summary="Удаление публикации")
async def delete_posts(
    post_id: int,
    session: SessionDep,
    payload: TokenPayload = Depends(security.access_token_required)
    ):
    query = select(PostModel).where(PostModel.id == post_id)
    result = await session.execute(query)
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Такого поста не существует"
        )
    
    user_id = int(payload.sub)

    if post.author_id != user_id:
        raise HTTPException(
            status_code=403, 
            detail="Вы можете удалять только свои публикации"
        )
    
    await session.delete(post)
    await session.commit()

    return {"OK": True, "message": "Пост успешно удален!"}


@router.patch("/{post_id}", summary="Частичное изменение поста")
async def patch_posts(
    post_id: int,
    data: PostUpdateSchema,
    session: SessionDep,
    payload: TokenPayload = Depends(security.access_token_required)
    ):
    query = select(PostModel).where(PostModel.id == post_id)
    result = await session.execute(query)
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Такого поста не существует"
        )
    
    user_id = int(payload.sub)

    if post.author_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Вы можете изменять только свои посты"
        )
    
    update_data = data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="Не переданы поля для обновления"
        )
    
    for key, value in update_data:
        setattr(post, key, value)

    await session.commit()
    return {"OK": True, "message": "Пост частично обновлен", "update_fields": list(update_data.keys())}