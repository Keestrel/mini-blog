from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from core.database import SessionDep, engine
from schemas.user_schema import UserAddSchema
from models.user import UserModel
from pydantic import BaseModel
from core.config import security, config

router = APIRouter(prefix="/auth", tags=["Пользователи"])

# HANDs FOR WORK WITH DATA FROM DATABASE

@router.post("/users", summary="Добавление пользователя")
async def add_users(data: UserAddSchema, session: SessionDep):
    new_user = UserModel(
        username = data.username,
        password = data.password,
        email = data.email
    )
    session.add(new_user)
    await session.commit()
    return {"OK": True}


@router.get("/users", summary="Список пользователей")
async def get_users(session: SessionDep):
    query = select(UserModel)
    result = await session.execute(query)
    return result.scalars().all()


@router.get("/users/{user_id}", summary="Пользователь по ID", dependencies=[Depends(security.access_token_required)])
async def get_users_id(session: SessionDep, user_id: int):
    query = select(UserModel).where(UserModel.id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Такого пользователя не существует!"
        )
    return user



#REGISTER

@router.post("/register", summary="Регистрация")
async def register(data: UserAddSchema, session: SessionDep):
    query = select(UserModel).where(UserModel.username == data.username)
    result = await session.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Пользователь с таким именем уже существует")
    
    new_user = UserModel(
        username=data.username,
        password=data.password,
        email=data.email
    )
    session.add(new_user)
    await session.commit()
    return {"OK": True}


#AUTHORIZATION

class UserLoginSchema(BaseModel):
    username: str
    password: str

@router.post("/login", summary="Авторизация")
async def login(credentials: UserLoginSchema, response: Response, session: SessionDep):
    query = select(UserModel).where(UserModel.username == credentials.username)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user or user.password != credentials.password:
        raise HTTPException(status_code=401, detail="Неверное имя пользователя или пароль")
    
    token = security.create_access_token(uid=str(user.id))
    response.set_cookie(config.JWT_ACCESS_COOKIE_NAME, token)
    return {"access_token": token}


