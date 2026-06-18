from fastapi import APIRouter, File, Request, Response, UploadFile

from app.schemas.documents import DocumentUploadResponse
from app.services.rag_service import upload_document

router = APIRouter(prefix="/documents")


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload(request: Request, response: Response, file: UploadFile = File(...)) -> DocumentUploadResponse:
    """Upload and index a temporary document."""
    return await upload_document(request, response, file)
