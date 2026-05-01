import os
from pydantic_settings import BaseSettings

# Always resolve the DB path relative to this file so it works regardless of cwd
_HERE = os.path.dirname(os.path.abspath(__file__))
_DB_PATH = os.path.join(_HERE, "..", "sage.db")

class Settings(BaseSettings):
    SECRET_KEY: str = "change-this-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    DATABASE_URL: str = f"sqlite:///{os.path.abspath(_DB_PATH)}"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()