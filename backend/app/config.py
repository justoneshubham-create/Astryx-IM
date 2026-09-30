from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
import os

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DATABASE_PATH = BASE_DIR / "inventory.db"
DEFAULT_DATABASE_URL = f"sqlite:///{DEFAULT_DATABASE_PATH.as_posix()}"


class Settings(BaseSettings):
    PROJECT_NAME: str = "Astryx Inventory Management System"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "astryx-super-secret-jwt-key-2026-secure-token")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # SQLite default database path resolved from the backend folder so every process hits the same DB.
    DATABASE_URL: str = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["*"]

    model_config = SettingsConfigDict(env_file=".env", extra="allow")


settings = Settings()
