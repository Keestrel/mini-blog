from typing import Annotated
import os
from dotenv import load_dotenv

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import select
from models.base import Base

DATABASE_URL = os.getenv("DB_URL")
engine = create_async_engine(DATABASE_URL)

new_session = async_sessionmaker(bind=engine, expire_on_commit=False)

async def get_session():
    async with new_session() as session:
        yield session

SessionDep = Annotated[AsyncSession, Depends(get_session)]

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)