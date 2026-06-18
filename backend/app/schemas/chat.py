from typing import Literal

from pydantic import BaseModel, Field


class ChatRunCreateRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    top_k: int = Field(default=8, ge=1, le=20)
    temperature: float = Field(default=0.3, ge=0, le=2)
    use_rerank: bool = False
    execution_mode: Literal["server_key", "byok"] = "server_key"


class ChatRunCreateResponse(BaseModel):
    run_id: str
    role: Literal["guest", "interviewer"]
    pool: Literal["guest", "priority", "byok"]
    status: Literal["queued", "running"]
    queue_position: int
    estimated_wait_seconds: int
    is_existing_active_run: bool = False
