from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, and_, delete, func
from sqlalchemy.orm import selectinload
from authx import TokenPayload

from core.database import SessionDep
from core.config import security
from models.chat import ChatModel
from models.chat_members import ChatMembersModel
from models.message import MessageModel
from schemas.chat_schema import ChatAddSchema, ChatResponseSchema, ChatDetailSchema
from schemas.message_schema import MessageResponseSchema
from models.user import UserModel

router = APIRouter(prefix="/chats", tags=["Чаты"])


@router.post("", summary="Создание чата", response_model=ChatResponseSchema)
async def create_chat(
    data: ChatAddSchema,
    session: SessionDep,
    target_username: str | None = None, # Теперь принимаем никнейм, а не ID
    payload: TokenPayload = Depends(security.access_token_required),
):
    current_user_id = int(payload.sub)

    # Проверки для личных диалогов
    if not data.is_group:
        if not target_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Для создания личного чата необходимо указать никнейм собеседника",
            )
        
        # Ищем пользователя по никнейму
        target_user = (await session.execute(select(UserModel).where(UserModel.username == target_username))).scalar_one_or_none()
        
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Пользователь '{target_username}' не найден",
            )
            
        target_user_id = target_user.id

        if target_user_id == current_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя создать чат с самим собой",
            )

        # Проверка на дубликаты
        chat_ids_me = select(ChatMembersModel.chat_id).where(ChatMembersModel.user_id == current_user_id)
        chat_ids_target = select(ChatMembersModel.chat_id).where(ChatMembersModel.user_id == target_user_id)
        duplicate_check = select(ChatModel).where(
            and_(
                ChatModel.is_group == False,
                ChatModel.id.in_(chat_ids_me),
                ChatModel.id.in_(chat_ids_target)
            )
        )
        existing_chat = (await session.execute(duplicate_check)).scalars().first()
        if existing_chat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Личный диалог с этим пользователем уже существует"
            )

    new_chat = ChatModel(title=data.title, is_group=data.is_group)
    session.add(new_chat)
    await session.flush()

    members = [ChatMembersModel(chat_id=new_chat.id, user_id=current_user_id)]

    if not data.is_group and target_user_id:
        members.append(ChatMembersModel(chat_id=new_chat.id, user_id=target_user_id))

    elif data.is_group and data.members:
        # Групповой чат
        # Находим всех юзеров, чьи никнеймы передал фронтенд
        query = select(UserModel).where(UserModel.username.in_(data.members))
        found_users = (await session.execute(query)).scalars().all()
        
        for u in found_users:
            if u.id != current_user_id:
                members.append(ChatMembersModel(chat_id=new_chat.id, user_id=u.id))

    session.add_all(members)
    await session.commit()
    
    query = (
        select(ChatModel)
        .options(selectinload(ChatModel.members).selectinload(ChatMembersModel.user))
        .where(ChatModel.id == new_chat.id)
    )
    chat_with_members = (await session.execute(query)).scalar_one()

    return chat_with_members


@router.get("", summary="Список чатов пользователя", response_model=list[ChatResponseSchema])
async def get_user_chats(
    session: SessionDep,
    payload: TokenPayload = Depends(security.access_token_required),
):
    user_id = int(payload.sub)

    query = (
        select(ChatModel)
        .join(ChatMembersModel)
        .where(ChatMembersModel.user_id == user_id)
        .options(selectinload(ChatModel.members).selectinload(ChatMembersModel.user))
        .order_by(ChatModel.created_at.desc())
    )
    result = await session.execute(query)
    return result.scalars().unique().all()


@router.get("/{chat_id}", summary="Информация о чате", response_model=ChatDetailSchema)
async def get_chat_detail(
    chat_id: int,
    session: SessionDep,
    payload: TokenPayload = Depends(security.access_token_required),
):
    user_id = int(payload.sub)

    # входит ли пользователь в состав участников
    member_check = select(ChatMembersModel).where(
        and_(ChatMembersModel.chat_id == chat_id, ChatMembersModel.user_id == user_id)
    )
    is_member = (await session.execute(member_check)).scalar_one_or_none()
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="У вас нет доступа к этому чату",
        )

    # загружаем чат со всеми участниками и их профилями
    query = (
        select(ChatModel)
        .options(selectinload(ChatModel.members).selectinload(ChatMembersModel.user))
        .where(ChatModel.id == chat_id)
    )
    result = await session.execute(query)
    chat = result.scalar_one_or_none()

    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Чат не найден",
        )

    return chat


@router.get("/{chat_id}/messages", summary="История сообщений чата", response_model=list[MessageResponseSchema])
async def get_chat_messages(
    chat_id: int,
    session: SessionDep,
    limit: int = 50,
    offset: int = 0,
    payload: TokenPayload = Depends(security.access_token_required),
):
    user_id = int(payload.sub)

    # проверка участия в чате
    member_check = select(ChatMembersModel).where(
        and_(ChatMembersModel.chat_id == chat_id, ChatMembersModel.user_id == user_id)
    )
    is_member = (await session.execute(member_check)).scalar_one_or_none()
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="У вас нет доступа к истории этого чата",
        )

    # от старых к новым с данными авторов
    query = (
        select(MessageModel)
        .options(selectinload(MessageModel.sender))
        .where(MessageModel.chat_id == chat_id)
        .order_by(MessageModel.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(query)
    return result.scalars().all()


@router.delete("/{chat_id}", summary="Удаление чата", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(
    chat_id: int,
    session: SessionDep,
    delete_for_all: bool = Query(False),
    payload: TokenPayload = Depends(security.access_token_required),
):
    user_id = int(payload.sub)

    # Проверяем, состоит ли пользователь в чате
    member_check = select(ChatMembersModel).where(
        and_(ChatMembersModel.chat_id == chat_id, ChatMembersModel.user_id == user_id)
    )
    is_member = (await session.execute(member_check)).scalar_one_or_none()
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="У вас нет доступа к этому чату",
        )

    if delete_for_all:
        # Удаляем для всех (Сообщения -> Участников -> Сам чат)
        await session.execute(delete(MessageModel).where(MessageModel.chat_id == chat_id))
        await session.execute(delete(ChatMembersModel).where(ChatMembersModel.chat_id == chat_id))
        await session.execute(delete(ChatModel).where(ChatModel.id == chat_id))
    else:
        # Удаляем только себя из участников
        await session.delete(is_member)
        
        # Если участников больше нет, чистим базу, удаляя чат полностью
        remaining = await session.execute(
            select(func.count()).select_from(ChatMembersModel).where(ChatMembersModel.chat_id == chat_id)
        )
        if remaining.scalar() == 0:
            await session.execute(delete(MessageModel).where(MessageModel.chat_id == chat_id))
            await session.execute(delete(ChatModel).where(ChatModel.id == chat_id))

    await session.commit()
    return None