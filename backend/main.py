from contextlib import asynccontextmanager
from fastapi import FastAPI
import uvicorn

from fastapi.middleware.cors import CORSMiddleware

from api.routers.auth import router as auth_router
from api.routers.posts import router as posts_router

from core.database import init_db

import models.user
import models.post
import models.chat_members
import models.chat
import models.message

@asynccontextmanager
async def lifespan(app: FastAPI):
    # выполняется при старте сервера до приема запросов
    await init_db()
    yield

app = FastAPI(lifespan=lifespan)

app.include_router(auth_router)
app.include_router(posts_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)