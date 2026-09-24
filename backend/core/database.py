from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import select
from models.base import Base

engine = create_async_engine("postgresql+psycopg://postgres:admin@db:5432/messanger")

new_session = async_sessionmaker(bind=engine, expire_on_commit=False)

async def get_session():
    async with new_session() as session:
        yield session

SessionDep = Annotated[AsyncSession, Depends(get_session)]

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)