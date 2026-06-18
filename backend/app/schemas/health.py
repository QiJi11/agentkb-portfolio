from pydantic import BaseModel


class QueueHealth(BaseModel):
    running: int
    queued: int


class BudgetHealth(BaseModel):
    guest_available: bool


class HealthResponse(BaseModel):
    status: str
    database: str
    vector_store: str
    queue: QueueHealth
    budget: BudgetHealth
