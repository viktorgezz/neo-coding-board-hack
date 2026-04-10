"""Настройки сервиса из переменных окружения и файла `.env`."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Параметры окружения: строка подключения к PostgreSQL."""

    database_url: str = Field(
        default="postgresql+psycopg2://postgres:postgres@localhost:5432/neo_tasks_bank",
        validation_alias="DATABASE_URL",
    )
    jwt_public_key_path: str = Field(
        default="keys/public_key.pem",
        validation_alias="JWT_PUBLIC_KEY_PATH",
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
