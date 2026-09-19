from fastapi import FastAPI, BackgroundTasks
import time
import asyncio

import uvicorn

app = FastAPI()

def sync_task():
    time.sleep(3)
    print("Отправлено письмо на Email")

async def async_task():
    await asyncio.sleep()
    print("Отправлен запрос API")

# @app.post("/")
# #ПРИ СОЗДАНИИ СИНХРОННОЙ РУЧКИ КАЖДЫЙ РАЗ СОЗДАЕТСЯ НОВЫЙ ПОТОК, А ПОТОКИ НЕ БЕСКОНЕЧНЫ...
# async def some_route():
#     ...
#     #ПОЗВОЛЯЕТ ФОНОВО, НО МОМЕНТАЛЬНО ВЫПОЛНЯТЬ АСИНХРОННУЮ ФНУКЦИЮ
#     asyncio.create_task(async_task())
#     return {"OK": True}

@app.post("/")
async def some_route(bg_tasks: BackgroundTasks):
    ...
    # ТАК ЖЕ ПОЗВОЛЯЕТ ВЫПОЛНИТЬ ФУНКЦИЮ, НО !!!СИНХРОННУЮ!!! ПОТОКИ ВСЕ ТАК ЖЕ ПРОДОЛЖАЮТ СОЗДАВАТЬСЯ!!!
    bg_tasks.add_task(sync_task)
    return {"OK": True}

if __name__ == "__main__":
    uvicorn.run("main:app", reload=True)