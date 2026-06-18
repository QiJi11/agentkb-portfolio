import sqlite3
from contextlib import contextmanager
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Iterator
from uuid import uuid4

from app.core.config import settings


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    """Open a SQLite connection with row dictionaries enabled."""
    settings.sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.sqlite_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    """Create MVP tables if they do not exist."""
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS sessions (
              id TEXT PRIMARY KEY,
              role TEXT NOT NULL DEFAULT 'guest',
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS quotas (
              session_id TEXT PRIMARY KEY,
              day TEXT NOT NULL,
              guest_used INTEGER NOT NULL DEFAULT 0,
              interviewer_used INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS budgets (
              day TEXT PRIMARY KEY,
              llm_input_tokens INTEGER NOT NULL DEFAULT 0,
              llm_output_tokens INTEGER NOT NULL DEFAULT 0,
              embedding_tokens INTEGER NOT NULL DEFAULT 0,
              estimated_rmb REAL NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS runs (
              id TEXT PRIMARY KEY,
              session_id TEXT NOT NULL,
              role TEXT NOT NULL,
              priority INTEGER NOT NULL,
              status TEXT NOT NULL,
              question TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              started_at TEXT,
              finished_at TEXT,
              error TEXT
            );

            CREATE TABLE IF NOT EXISTS documents (
              id TEXT PRIMARY KEY,
              session_id TEXT NOT NULL,
              filename TEXT NOT NULL,
              size_bytes INTEGER NOT NULL,
              chunk_count INTEGER NOT NULL DEFAULT 0,
              status TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              expires_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS chunks (
              id TEXT PRIMARY KEY,
              document_id TEXT NOT NULL,
              session_id TEXT NOT NULL,
              filename TEXT NOT NULL,
              chunk_index INTEGER NOT NULL,
              text TEXT NOT NULL,
              token_hint INTEGER NOT NULL DEFAULT 0,
              embedding_stub TEXT NOT NULL DEFAULT '',
              expires_at TEXT NOT NULL
            );
            """
        )


def ping_db() -> bool:
    """Return whether SQLite can answer a trivial query."""
    try:
        with connect() as conn:
            conn.execute("SELECT 1").fetchone()
        return True
    except sqlite3.Error:
        return False


def count_runs() -> dict[str, int]:
    """Count queued and running chat runs."""
    if not Path(settings.sqlite_path).exists():
        return {"running": 0, "queued": 0}
    with connect() as conn:
        rows = conn.execute(
            "SELECT status, COUNT(*) AS total FROM runs WHERE status IN ('running', 'queued') GROUP BY status"
        ).fetchall()
    counts = {"running": 0, "queued": 0}
    for row in rows:
        counts[row["status"]] = row["total"]
    return counts


def count_runs_by_role(role: str) -> dict[str, int]:
    """Count queued and running chat runs for a role pool."""
    if not Path(settings.sqlite_path).exists():
        return {"running": 0, "queued": 0}
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT status, COUNT(*) AS total
            FROM runs
            WHERE role = ? AND status IN ('running', 'queued')
            GROUP BY status
            """,
            (role,),
        ).fetchall()
    counts = {"running": 0, "queued": 0}
    for row in rows:
        counts[row["status"]] = row["total"]
    return counts


def count_guest_queue() -> int:
    """Count queued guest runs."""
    if not Path(settings.sqlite_path).exists():
        return 0
    with connect() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS total FROM runs WHERE status = 'queued' AND role = 'guest'"
        ).fetchone()
    return int(row["total"])


def count_role_queue(role: str) -> int:
    """Count queued runs for a role pool."""
    if not Path(settings.sqlite_path).exists():
        return 0
    with connect() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS total FROM runs WHERE status = 'queued' AND role = ?",
            (role,),
        ).fetchone()
    return int(row["total"])


def get_today_budget_used() -> float:
    """Return today's estimated RMB spend."""
    today = date.today().isoformat()
    with connect() as conn:
        row = conn.execute("SELECT estimated_rmb FROM budgets WHERE day = ?", (today,)).fetchone()
    return float(row["estimated_rmb"]) if row else 0.0


def get_today_budget_used_for_role(role: str) -> float:
    """Return today's estimated RMB spend for a role pool."""
    today = date.today().isoformat()
    with connect() as conn:
        row = conn.execute(
            "SELECT estimated_rmb FROM budgets WHERE day = ?",
            (today,),
        ).fetchone()
    # Current MVP has no per-role cost writer yet, so reported spend stays conservative at zero per pool.
    if not row:
        return 0.0
    return 0.0


def create_session(role: str = "guest") -> str:
    """Create a new browser session."""
    session_id = f"ses_{uuid4().hex}"
    with connect() as conn:
        conn.execute("INSERT INTO sessions (id, role) VALUES (?, ?)", (session_id, role))
    return session_id


def get_or_create_session(session_id: str | None, role: str = "guest") -> str:
    """Return an existing session id or create a new one."""
    if session_id:
        with connect() as conn:
            row = conn.execute("SELECT id FROM sessions WHERE id = ?", (session_id,)).fetchone()
            if row:
                return session_id
    return create_session(role)


def set_session_role(session_id: str, role: str) -> None:
    """Update session role."""
    with connect() as conn:
        conn.execute(
            "UPDATE sessions SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (role, session_id),
        )


def get_daily_usage(session_id: str, role: str) -> int:
    """Return today's usage count for a role."""
    today = date.today().isoformat()
    column = "interviewer_used" if role == "interviewer" else "guest_used"
    with connect() as conn:
        row = conn.execute(
            f"SELECT {column} AS used FROM quotas WHERE session_id = ? AND day = ?",
            (session_id, today),
        ).fetchone()
    return int(row["used"]) if row else 0


def increment_daily_usage(session_id: str, role: str) -> None:
    """Increment today's quota usage for a session role."""
    today = date.today().isoformat()
    column = "interviewer_used" if role == "interviewer" else "guest_used"
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO quotas (session_id, day, guest_used, interviewer_used)
            VALUES (?, ?, 0, 0)
            ON CONFLICT(session_id) DO UPDATE SET day = excluded.day
            """,
            (session_id, today),
        )
        conn.execute(
            f"UPDATE quotas SET {column} = CASE WHEN day = ? THEN {column} + 1 ELSE 1 END, day = ? WHERE session_id = ?",
            (today, today, session_id),
        )


def create_run(session_id: str, role: str, question: str) -> dict[str, object]:
    """Create a queued chat run and return its queue metadata."""
    run_id = f"run_{uuid4().hex}"
    priority = 50 if role == "byok" else 100 if role == "interviewer" else 10
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO runs (id, session_id, role, priority, status, question)
            VALUES (?, ?, ?, ?, 'queued', ?)
            """,
            (run_id, session_id, role, priority, question),
        )
    return get_run_queue_state(run_id)


def get_active_run_for_session(session_id: str) -> sqlite3.Row | None:
    """Return a session's current queued or running run."""
    with connect() as conn:
        return conn.execute(
            """
            SELECT *
            FROM runs
            WHERE session_id = ? AND status IN ('queued', 'running')
            ORDER BY created_at ASC
            LIMIT 1
            """,
            (session_id,),
        ).fetchone()


def get_run(run_id: str) -> sqlite3.Row | None:
    """Return a run row by id."""
    with connect() as conn:
        return conn.execute("SELECT * FROM runs WHERE id = ?", (run_id,)).fetchone()


def get_run_queue_state(run_id: str) -> dict[str, object]:
    """Return queue position and estimated wait for a run."""
    with connect() as conn:
        run = conn.execute("SELECT * FROM runs WHERE id = ?", (run_id,)).fetchone()
        if not run:
            raise KeyError(run_id)
        ahead = conn.execute(
            """
            SELECT COUNT(*) AS total
            FROM runs
            WHERE status = 'queued'
              AND role = ?
              AND (priority > ? OR (priority = ? AND created_at < ?))
            """,
            (run["role"], run["priority"], run["priority"], run["created_at"]),
        ).fetchone()["total"]
    position = int(ahead) + 1
    pool = "byok" if run["role"] == "byok" else "priority" if run["role"] == "interviewer" else "guest"
    return {
        "run_id": run_id,
        "role": "interviewer" if run["role"] == "interviewer" else "guest",
        "pool": pool,
        "status": run["status"],
        "queue_position": position,
        "estimated_wait_seconds": max(0, int(ahead) * 45),
    }


def mark_run_running(run_id: str) -> None:
    """Mark a run as running."""
    started_at = datetime.now(UTC).isoformat()
    with connect() as conn:
        conn.execute(
            "UPDATE runs SET status = 'running', started_at = ? WHERE id = ?",
            (started_at, run_id),
        )


def mark_run_done(run_id: str) -> None:
    """Mark a run as done."""
    finished_at = datetime.now(UTC).isoformat()
    with connect() as conn:
        conn.execute(
            "UPDATE runs SET status = 'done', finished_at = ? WHERE id = ?",
            (finished_at, run_id),
        )


def cleanup_expired() -> None:
    """Delete expired document and chunk records."""
    now = datetime.now(UTC).isoformat()
    with connect() as conn:
        conn.execute("DELETE FROM chunks WHERE expires_at <= ?", (now,))
        conn.execute("DELETE FROM documents WHERE expires_at <= ?", (now,))


def insert_document(
    session_id: str,
    filename: str,
    size_bytes: int,
    chunks: list[str],
    expires_at: datetime,
) -> dict[str, object]:
    """Insert document metadata and chunks."""
    document_id = f"doc_{uuid4().hex}"
    expires_at_value = expires_at.isoformat()
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO documents (id, session_id, filename, size_bytes, chunk_count, status, expires_at)
            VALUES (?, ?, ?, ?, ?, 'ready', ?)
            """,
            (document_id, session_id, filename, size_bytes, len(chunks), expires_at_value),
        )
        for index, text in enumerate(chunks):
            chunk_id = f"chk_{uuid4().hex}"
            conn.execute(
                """
                INSERT INTO chunks (id, document_id, session_id, filename, chunk_index, text, token_hint, embedding_stub, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    chunk_id,
                    document_id,
                    session_id,
                    filename,
                    index,
                    text,
                    max(1, len(text) // 4),
                    " ".join(sorted(set(text.lower().split()))[:64]),
                    expires_at_value,
                ),
            )
    return {
        "document_id": document_id,
        "filename": filename,
        "size_bytes": size_bytes,
        "chunk_count": len(chunks),
        "status": "ready",
        "expires_at": expires_at,
    }


def list_active_chunks(session_id: str) -> list[sqlite3.Row]:
    """Return non-expired chunks for a session."""
    cleanup_expired()
    now = datetime.now(UTC).isoformat()
    with connect() as conn:
        return conn.execute(
            """
            SELECT id, document_id, filename, text
            FROM chunks
            WHERE session_id = ? AND expires_at > ?
            """,
            (session_id, now),
        ).fetchall()
