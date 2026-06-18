from fastapi import APIRouter

from app.schemas.health import HealthResponse
from app.services.health_service import get_health

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Return non-sensitive service status."""
    return get_health()
