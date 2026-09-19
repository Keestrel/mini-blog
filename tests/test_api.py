import pytest
from httpx import AsyncClient, ASGITransport

from main import app

# def func(num: int):
#     return 1 / num

# def test_func():
#     assert func(1) == 1
#     assert func(2) == 0.3

@pytest.mark.asyncio
async def test_get_books():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/books")
        data = response.json
        assert response.status_code == 200
        assert len(data) == 2

