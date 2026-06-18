from fastapi import APIRouter, Request, Response
from fastapi.responses import StreamingResponse

from app.schemas.chat import ChatRunCreateRequest, ChatRunCreateResponse
from app.services.chat_service import create_chat_run, stream_chat_run

router = APIRouter(prefix="/chat")


@router.post("/runs", response_model=ChatRunCreateResponse)
def create_run(payload: ChatRunCreateRequest, request: Request, response: Response) -> ChatRunCreateResponse:
    """Create a queued chat run."""
    return create_chat_run(request, response, payload)


@router.get("/runs/{run_id}/stream")
async def stream_run(run_id: str) -> StreamingResponse:
    """Stream queued, Agent, token and done events."""
    return StreamingResponse(stream_chat_run(run_id), media_type="text/event-stream")
