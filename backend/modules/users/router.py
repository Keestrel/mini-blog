from core.database import SessionDep
from core.config import security, config
from authx import TokenPayload
from fastapi import APIRouter, Depends, Response
from schemas.user_schema import UserShortSchema
from modules.users.service import UserService

router = APIRouter(prefix="/users", tags=["Профили"])

@router.get("/me", response_model=UserShortSchema)
async def get_me(session: SessionDep, payload: TokenPayload = Depends(security.access_token_required)):
    current_user_id = int(payload.sub)
    return await UserService.get_me(session, current_user_id)

@router.get("/{user_id}", response_model=UserShortSchema)
async def get_users_by_id(user_id: int, session: SessionDep, payload: TokenPayload = Depends(security.access_token_required)):
    return await UserService.get_user_by_id(session, user_id)

