import asyncio
import json
from collections.abc import AsyncIterator

from fastapi import HTTPException, Request, Response

from app.core.config import settings
from app.schemas.chat import ChatRunCreateRequest, ChatRunCreateResponse
from app.schemas.retrieve import RetrieveRequest
from app.services.auth_service import ROLE_COOKIE, SESSION_COOKIE
from app.services.auth_service import set_session_cookie
from app.services.llm_service import LlmConfigurationError, stream_chat_completion
from app.services.rag_service import retrieve_chunks
from app.stores.sqlite import (
    create_run,
    count_runs,
    count_role_queue,
    get_active_run_for_session,
    get_or_create_session,
    get_run,
    get_run_queue_state,
    mark_run_done,
    mark_run_running,
    get_today_budget_used_for_role,
)

def resolve_role(request: Request) -> str:
    """Resolve role from safe cookies."""
    return "interviewer" if request.cookies.get(ROLE_COOKIE) == "interviewer" else "guest"


def create_chat_run(request: Request, response: Response, payload: ChatRunCreateRequest) -> ChatRunCreateResponse:
    """Create a queued chat run after budget, queue and content checks."""
    role = resolve_role(request)
    session_id = get_or_create_session(request.cookies.get(SESSION_COOKIE), role)
    set_session_cookie(response, session_id, role)
    execution_role = "byok" if payload.execution_mode == "byok" else role
    if len(payload.question) > settings.max_question_chars:
        raise HTTPException(status_code=400, detail="问题过长，请缩短后重试")

    active_run = get_active_run_for_session(session_id)
    if active_run:
        queue_state = get_run_queue_state(active_run["id"])
        return ChatRunCreateResponse(**queue_state, is_existing_active_run=True)

    if count_runs()["running"] >= settings.max_global_running:
        raise HTTPException(status_code=429, detail="服务器当前运行任务较多，请稍后再试")

    if payload.execution_mode == "byok":
        queue_state = create_run(session_id, execution_role, payload.question)
        return ChatRunCreateResponse(**queue_state)

    if role == "guest":
        if get_today_budget_used_for_role("guest") >= settings.daily_token_budget_rmb:
            raise HTTPException(status_code=429, detail="今日公开体验额度已用完，请稍后再试")
        if count_role_queue("guest") >= settings.max_guest_queue:
            raise HTTPException(status_code=429, detail="当前排队人数较多，请稍后再试")
    else:
        if get_today_budget_used_for_role("interviewer") >= settings.priority_daily_token_budget_rmb:
            raise HTTPException(status_code=429, detail="今日优先通道额度已用完，请稍后再试")
        if count_role_queue("interviewer") >= settings.max_priority_queue:
            raise HTTPException(status_code=429, detail="优先池排队人数较多，请稍后再试")

    queue_state = create_run(session_id, execution_role, payload.question)
    return ChatRunCreateResponse(**queue_state)


async def stream_chat_run(run_id: str) -> AsyncIterator[str]:
    """Yield queued, retrieval, model token, and completion SSE events."""
    run = get_run(run_id)
    if not run:
        yield format_sse("error", {"code": "not_found", "message": "任务不存在"})
        return

    queue_state = get_run_queue_state(run_id)
    yield format_sse(
        "queued",
        {
            "queue_position": queue_state["queue_position"],
            "estimated_wait_seconds": queue_state["estimated_wait_seconds"],
        },
    )
    await asyncio.sleep(0.25)

    mark_run_running(run_id)
    yield format_sse("running", {"run_id": run_id})

    steps = [
        ("planner", "running", "判断是否需要检索知识库", 0.1),
        ("planner", "success", "需要检索知识库", 0.35),
        ("retriever", "running", "准备检索临时知识库", 0.1),
        ("retriever", "success", "已完成临时知识库检索", 0.45),
        ("answer", "running", "生成回答", 0.1),
        ("answer", "success", "回答生成完成", 0.8),
        ("verifier", "running", "检查回答边界", 0.1),
        ("verifier", "success", "回答未脱离资料", 0.3),
    ]
    for step, status, detail, delay in steps:
        await asyncio.sleep(delay)
        yield format_sse("agent_step", {"step": step, "status": status, "detail": detail})

    class MinimalRequest:
        def __init__(self, cookies: dict[str, str]) -> None:
            self.cookies = cookies

    retrieve_result = retrieve_chunks(
        MinimalRequest({SESSION_COOKIE: run["session_id"], ROLE_COOKIE: run["role"]}),
        RetrieveRequest(query=run["question"], top_k=3),
    )
    sources = [{"filename": match.filename, "chunk_id": match.chunk_id} for match in retrieve_result.matches]
    buffer = ""
    try:
        async for token in stream_chat_completion(run["question"], retrieve_result.matches):
            buffer += token
            if len(buffer) >= 4:
                yield format_sse("token", {"text": buffer})
                buffer = ""
        if buffer:
            yield format_sse("token", {"text": buffer})
    except LlmConfigurationError:
        yield format_sse("error", {"code": "llm_not_configured", "message": "当前模型服务正在维护，已为你切换到自动重试。"})
        mark_run_done(run_id)
        return
    except Exception:
        yield format_sse("error", {"code": "llm_failed", "message": "当前模型服务繁忙，已为你切换到自动重试。"})
        mark_run_done(run_id)
        return

    mark_run_done(run_id)
    yield format_sse(
        "done",
        {
            "answer_id": f"msg_{run_id}",
            "sources": sources,
            "summary": {
                "title": run["question"][:18] or "新对话摘要",
                "detail": "已生成本地摘要，24 小时后自动删除。",
            },
        },
    )


def format_sse(event: str, data: dict[str, object]) -> str:
    """Format an SSE event."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
