from authx import AuthX, AuthXConfig


config = AuthXConfig()
config.JWT_SECRET_KEY = "SUPER_KEY"
config.JWT_ACCESS_COOKIE_NAME = "my_access_token"
config.JWT_TOKEN_LOCATION = ["cookies", "headers"]

security = AuthX(config=config)