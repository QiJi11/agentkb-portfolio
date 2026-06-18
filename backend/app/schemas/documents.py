from datetime import datetime

from pydantic import BaseModel


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    size_bytes: int
    chunk_count: int
    status: str
    expires_at: datetime
