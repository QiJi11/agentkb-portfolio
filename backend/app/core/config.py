from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    app_env: str = "development"
    public_base_url: str = "http://127.0.0.1:5173"

    llm_provider: str = "SiliconFlow"
    llm_base_url: str = ""
    llm_model: str = "DeepSeek-V4-Flash"
    llm_api_key: str = ""
    llm_endpoints_json: str = ""

    embedding_provider: str = "SiliconFlow"
    embedding_base_url: str = ""
    embedding_model: str = "text-embedding-v4"
    embedding_api_key: str = ""

    interviewer_code_hash: str = ""
    daily_token_budget_rmb: float = 10
    priority_daily_token_budget_rmb: float = 20

    max_upload_mb: int = 5
    max_question_chars: int = 2000
    max_session_chars: int = 300000
    rag_ttl_seconds: int = 7200
    summary_ttl_seconds: int = 86400

    max_global_running: int = 2
    max_guest_running: int = 1
    max_interviewer_running: int = 1
    max_guest_queue: int = 20
    max_priority_queue: int = 5

    data_dir: Path = Field(default=Path("data"))
    sqlite_path: Path = Field(default=Path("data/sqlite/agentkb.db"))

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [self.public_base_url, "http://127.0.0.1:5173", "http://127.0.0.1:5174"]


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()


settings = get_settings()
