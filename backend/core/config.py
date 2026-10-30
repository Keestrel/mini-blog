import os
from authx import AuthX, AuthXConfig
import jwt
from dotenv import load_dotenv

load_dotenv()

config = AuthXConfig()
config.JWT_SECRET_KEY = os.getenv("JWT_SECRET")
config.JWT_ACCESS_COOKIE_NAME = "my_access_token"
config.JWT_TOKEN_LOCATION = ["cookies", "headers"]

security = AuthX(config=config)

def verify_websocket_token(token: str) -> dict:
    return jwt.decode(
        token,
        config.JWT_SECRET_KEY,
        algorithms=[getattr(config, "JWT_ALGORITHM", "HS256")],
    )