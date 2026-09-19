from fastapi import FastAPI
from api.routers.auth import router as auth_router
from api.routers.posts import router as posts_router
import uvicorn

app = FastAPI()

app.include_router(auth_router)
app.include_router(posts_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)