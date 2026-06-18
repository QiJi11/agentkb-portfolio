from typing import Literal

from pydantic import BaseModel


class QueueState(BaseModel):
    running: int
    queued: int
    estimated_wait_seconds: int


class BudgetState(BaseModel):
    daily_budget_rmb: float
    estimated_used_rmb: float
    status: str


class LimitState(BaseModel):
    max_question_chars: int
    max_upload_mb: int
    max_session_chars: int
    max_guest_queue: int
    max_priority_queue: int


class CurrentRunState(BaseModel):
    run_id: str
    status: str
    pool: Literal["guest", "priority", "byok"]
    queue_position: int
    estimated_wait_seconds: int


class PoolState(BaseModel):
    running: int
    queued: int
    max_running: int
    max_queue: int
    daily_budget_rmb: float
    estimated_used_rmb: float
    budget_status: str


class MeResponse(BaseModel):
    role: Literal["guest", "interviewer"]
    is_priority: bool
    current_pool: Literal["guest", "priority", "byok"]
    current_run: CurrentRunState | None
    pools: dict[str, PoolState]
    queue: QueueState
    budget: BudgetState
    limits: LimitState
