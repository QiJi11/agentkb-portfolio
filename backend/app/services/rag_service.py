import re
from datetime import UTC, datetime, timedelta
from io import BytesIO

from fastapi import HTTPException, Request, Response, UploadFile
from pypdf import PdfReader

from app.core.config import settings
from app.schemas.documents import DocumentUploadResponse
from app.schemas.retrieve import RetrieveMatch, RetrieveRequest, RetrieveResponse
from app.services.auth_service import ROLE_COOKIE, SESSION_COOKIE, set_session_cookie
from app.stores.sqlite import cleanup_expired, get_or_create_session, insert_document, list_active_chunks

ALLOWED_EXTENSIONS = {".txt", ".md", ".pdf"}
CHUNK_SIZE = 512
CHUNK_OVERLAP = 50


async def upload_document(request: Request, response: Response, file: UploadFile) -> DocumentUploadResponse:
    """Parse an uploaded document and persist temporary chunks."""
    cleanup_expired()
    filename = file.filename or "document.txt"
    extension = get_extension(filename)
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="仅支持 TXT、Markdown、PDF 文件")

    content = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"文件不能超过 {settings.max_upload_mb} MiB")

    text = parse_document_text(extension, content)
    if not text.strip():
        raise HTTPException(status_code=400, detail="文档没有可解析文本")

    limited_text = text[: settings.max_session_chars]
    chunks = split_text(limited_text)
    if not chunks:
        raise HTTPException(status_code=400, detail="文档无法生成有效分块")

    role = "interviewer" if request.cookies.get(ROLE_COOKIE) == "interviewer" else "guest"
    session_id = get_or_create_session(request.cookies.get(SESSION_COOKIE), role)
    set_session_cookie(response, session_id, role)
    expires_at = datetime.now(UTC) + timedelta(seconds=settings.rag_ttl_seconds)
    record = insert_document(session_id, filename, len(content), chunks, expires_at)
    return DocumentUploadResponse(**record)


def retrieve_chunks(request: Request, payload: RetrieveRequest) -> RetrieveResponse:
    """Retrieve relevant chunks with a lightweight lexical score."""
    cleanup_expired()
    role = "interviewer" if request.cookies.get(ROLE_COOKIE) == "interviewer" else "guest"
    session_id = get_or_create_session(request.cookies.get(SESSION_COOKIE), role)
    normalized_query = normalize_text(payload.query)
    query_terms = tokenize(payload.query)
    matches: list[RetrieveMatch] = []
    if not query_terms:
        return RetrieveResponse(matches=[])

    for row in list_active_chunks(session_id):
        score = lexical_score(normalized_query, query_terms, row["text"])
        if score <= 0:
            continue
        matches.append(
            RetrieveMatch(
                document_id=row["document_id"],
                filename=row["filename"],
                chunk_id=row["id"],
                score=score,
                text=row["text"],
            )
        )

    matches.sort(key=lambda item: item.score, reverse=True)
    return RetrieveResponse(matches=matches[: payload.top_k])


def get_extension(filename: str) -> str:
    """Return lowercase file extension."""
    match = re.search(r"(\.[^.]+)$", filename.lower())
    return match.group(1) if match else ""


def parse_document_text(extension: str, content: bytes) -> str:
    """Parse supported document bytes into text."""
    if extension in {".txt", ".md"}:
        return decode_text(content)
    if extension == ".pdf":
        reader = PdfReader(BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    raise HTTPException(status_code=400, detail="不支持的文件类型")


def decode_text(content: bytes) -> str:
    """Decode text with UTF-8 fallbacks."""
    for encoding in ("utf-8", "utf-8-sig", "gb18030"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise HTTPException(status_code=400, detail="文本编码无法识别")


def split_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks."""
    normalized = re.sub(r"\s+", " ", text).strip()
    chunks: list[str] = []
    start = 0
    while start < len(normalized):
        chunk = normalized[start : start + chunk_size].strip()
        if chunk:
            chunks.append(chunk)
        if start + chunk_size >= len(normalized):
            break
        start += max(1, chunk_size - overlap)
    return chunks


def tokenize(text: str) -> set[str]:
    """Tokenize Chinese and English text for lightweight retrieval."""
    lowered = text.lower()
    words = set(re.findall(r"[a-z0-9_]{2,}", lowered))
    chinese_chars = set(re.findall(r"[\u4e00-\u9fff]", lowered))
    return words | chinese_chars


def normalize_text(text: str) -> str:
    """Normalize text for substring matching."""
    return re.sub(r"\s+", "", text.lower())


def lexical_score(normalized_query: str, query_terms: set[str], text: str) -> float:
    """Compute a simple overlap score with a mild length penalty."""
    normalized_chunk = normalize_text(text)
    chunk_terms = tokenize(text)
    if not chunk_terms and normalized_query not in normalized_chunk:
        return 0
    substring_bonus = 2.0 if normalized_query and normalized_query in normalized_chunk else 0
    overlap = len(query_terms & chunk_terms)
    if overlap == 0 and substring_bonus == 0:
        return 0
    return substring_bonus + overlap / (len(query_terms) ** 0.5 + max(1, len(chunk_terms)) ** 0.25)
