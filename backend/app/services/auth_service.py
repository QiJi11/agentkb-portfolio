from hashlib import sha256
from hmac import compare_digest

from fastapi import Response

from app.core.config import settings
from app.schemas.auth import InterviewerLoginResponse
from app.stores.sqlite import get_or_create_session, set_session_role

SESSION_COOKIE = "agentkb_session"
ROLE_COOKIE = "agentkb_role"


def hash_code(code: str) -> str:
    """Hash an interviewer access code."""
    return sha256(code.strip().upper().encode("utf-8")).hexdigest()


def verify_interviewer_code(code: str) -> bool:
    """Validate interviewer code against configured hash."""
    configured_hash = settings.interviewer_code_hash.strip()
    if not configured_hash:
        return False
    return compare_digest(hash_code(code), configured_hash)


def set_session_cookie(response: Response, session_id: str, role: str = "guest") -> None:
    """Persist safe session cookies for browser continuity."""
    response.set_cookie(SESSION_COOKIE, session_id, httponly=True, samesite="lax")
    response.set_cookie(ROLE_COOKIE, role, httponly=True, samesite="lax")


def login_interviewer(code: str, session_id: str | None, response: Response) -> InterviewerLoginResponse | None:
    """Promote current session to interviewer when the code is valid."""
    if not verify_interviewer_code(code):
        return None
    resolved_session_id = get_or_create_session(session_id, "interviewer")
    set_session_role(resolved_session_id, "interviewer")
    set_session_cookie(response, resolved_session_id, "interviewer")
    return InterviewerLoginResponse(role="interviewer", is_priority=True)
