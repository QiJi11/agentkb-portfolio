from app.schemas.health import BudgetHealth, HealthResponse, QueueHealth
from app.stores.sqlite import count_runs, ping_db


def get_health() -> HealthResponse:
    """Build a health response without leaking secrets."""
    queue_counts = count_runs()
    return HealthResponse(
        status="ok",
        database="ok" if ping_db() else "error",
        vector_store="not_configured",
        queue=QueueHealth(running=queue_counts["running"], queued=queue_counts["queued"]),
        budget=BudgetHealth(guest_available=True),
    )
