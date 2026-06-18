from pydantic import BaseModel, Field


class RetrieveRequest(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    top_k: int = Field(default=8, ge=1, le=20)


class RetrieveMatch(BaseModel):
    document_id: str
    filename: str
    chunk_id: str
    score: float
    text: str


class RetrieveResponse(BaseModel):
    matches: list[RetrieveMatch]
