from contextlib import asynccontextmanager
from fastapi import FastAPI
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

from core.database import init_db
from modules.auth.router import router as auth_router
from modules.posts.router import router as posts_router
from modules.chats.router import router as chats_router
from modules.messages.router import router as messages_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost", "http://192.168.1.182:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(posts_router)
app.include_router(chats_router)
app.include_router(messages_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)