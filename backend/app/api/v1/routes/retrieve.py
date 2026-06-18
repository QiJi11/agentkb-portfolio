from fastapi import APIRouter, Request

from app.schemas.retrieve import RetrieveRequest, RetrieveResponse
from app.services.rag_service import retrieve_chunks

router = APIRouter()


@router.post("/retrieve", response_model=RetrieveResponse)
def retrieve(payload: RetrieveRequest, request: Request) -> RetrieveResponse:
    """Retrieve relevant temporary chunks."""
    return retrieve_chunks(request, payload)
