from fastapi import Request, Response

from app.core.config import settings
from app.services.auth_service import ROLE_COOKIE, SESSION_COOKIE, set_session_cookie
from app.schemas.identity import BudgetState, CurrentRunState, LimitState, MeResponse, PoolState, QueueState
from app.stores.sqlite import (
    count_runs_by_role,
    get_active_run_for_session,
    get_or_create_session,
    get_run_queue_state,
    get_today_budget_used_for_role,
)


def budget_status(used_rmb: float, budget_rmb: float) -> str:
    """Return a compact budget status for UI display."""
    if used_rmb >= budget_rmb:
        return "exhausted"
    if used_rmb >= budget_rmb * 0.8:
        return "tight"
    return "available"


def build_pool_state(role: str) -> PoolState:
    """Build queue and budget state for a role-backed pool."""
    counts = count_runs_by_role(role)
    if role == "interviewer":
        max_running = settings.max_interviewer_running
        max_queue = settings.max_priority_queue
        daily_budget = settings.priority_daily_token_budget_rmb
    else:
        max_running = settings.max_guest_running
        max_queue = settings.max_guest_queue
        daily_budget = settings.daily_token_budget_rmb
    used_rmb = get_today_budget_used_for_role(role)
    return PoolState(
        running=counts["running"],
        queued=counts["queued"],
        max_running=max_running,
        max_queue=max_queue,
        daily_budget_rmb=daily_budget,
        estimated_used_rmb=used_rmb,
        budget_status=budget_status(used_rmb, daily_budget),
    )


def get_current_identity(request: Request, response: Response) -> MeResponse:
    """Resolve the current safe identity from cookies."""
    role = "interviewer" if request.cookies.get(ROLE_COOKIE) == "interviewer" else "guest"
    session_id = get_or_create_session(request.cookies.get(SESSION_COOKIE), role)
    set_session_cookie(response, session_id, role)
    guest_pool = build_pool_state("guest")
    priority_pool = build_pool_state("interviewer")
    current_pool_name = "priority" if role == "interviewer" else "guest"
    current_pool = priority_pool if role == "interviewer" else guest_pool
    active_run = get_active_run_for_session(session_id)
    current_run = None
    if active_run:
        run_state = get_run_queue_state(active_run["id"])
        current_pool_name = str(run_state["pool"])
        current_run = CurrentRunState(
            run_id=str(run_state["run_id"]),
            status=str(run_state["status"]),
            pool=run_state["pool"],
            queue_position=int(run_state["queue_position"]),
            estimated_wait_seconds=int(run_state["estimated_wait_seconds"]),
        )
    return MeResponse(
        role=role,
        is_priority=role == "interviewer",
        current_pool=current_pool_name,
        current_run=current_run,
        pools={"guest": guest_pool, "priority": priority_pool},
        queue=QueueState(
            running=current_pool.running,
            queued=current_pool.queued,
            estimated_wait_seconds=current_pool.queued * 45,
        ),
        budget=BudgetState(
            daily_budget_rmb=current_pool.daily_budget_rmb,
            estimated_used_rmb=current_pool.estimated_used_rmb,
            status=current_pool.budget_status,
        ),
        limits=LimitState(
            max_question_chars=settings.max_question_chars,
            max_upload_mb=settings.max_upload_mb,
            max_session_chars=settings.max_session_chars,
            max_guest_queue=settings.max_guest_queue,
            max_priority_queue=settings.max_priority_queue,
        ),
    )
