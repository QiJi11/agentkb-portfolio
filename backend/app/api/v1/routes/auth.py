from fastapi import APIRouter, HTTPException, Request, Response

from app.schemas.auth import InterviewerLoginRequest, InterviewerLoginResponse
from app.services.auth_service import login_interviewer

router = APIRouter(prefix="/auth")


@router.post("/interviewer", response_model=InterviewerLoginResponse)
def interviewer_login(
    payload: InterviewerLoginRequest,
    request: Request,
    response: Response,
) -> InterviewerLoginResponse:
    """Authenticate interviewer access code."""
    result = login_interviewer(payload.code, request.cookies.get("agentkb_session"), response)
    if result is None:
        raise HTTPException(status_code=401, detail="访问码无效")
    return result
