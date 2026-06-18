from fastapi import APIRouter, Request, Response

from app.schemas.identity import MeResponse
from app.services.identity_service import get_current_identity

router = APIRouter()


@router.get("/me", response_model=MeResponse)
def get_me(request: Request, response: Response) -> MeResponse:
    """Return current role and safe quota state."""
    return get_current_identity(request, response)
