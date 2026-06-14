"""
db.py — Lightweight SQLite job tracking database for the Video Agent Service.

Tracks each video request through its lifecycle:
  RECEIVED → QUEUED → NOT_ELIGIBLE | GENERATED | ERROR

This is separate from the NestJS backend's VideoGenerationJob table.
The NestJS table is updated via callbacks; this table is the source of truth
for the Python service's own queue and eligibility logic.
"""

import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

# Database file path — configurable via env, defaults to outputs directory
_DB_PATH = os.getenv("VIDEO_DB_PATH", str(Path(__file__).resolve().parent.parent / "outputs" / "video_jobs.db"))


def _get_connection() -> sqlite3.Connection:
    """Returns a new SQLite connection with row_factory set for dict-like access."""
    conn = sqlite3.connect(_DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Creates the video_requests table if it doesn't exist."""
    Path(_DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    with _get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS video_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT UNIQUE,
                ticker TEXT NOT NULL,
                report_date TEXT NOT NULL,
                report_id TEXT,
                status TEXT NOT NULL DEFAULT 'RECEIVED',
                eligibility_note TEXT,
                error_message TEXT,
                force_regenerate INTEGER DEFAULT 0,
                received_at TEXT,
                queued_at TEXT,
                completed_at TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
        conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_ticker_date 
            ON video_requests (ticker, report_date)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_status
            ON video_requests (status)
        """)
        conn.commit()
    print(f"[DB] Initialized video_requests DB at {_DB_PATH}")


def upsert_received(job_id: str, ticker: str, report_date: str, report_id: str, force_regenerate: bool) -> dict:
    """
    Inserts a new job with RECEIVED status, or resets an existing ERROR/GENERATED
    job for retry. Returns the stored row as a dict.
    """
    now = datetime.utcnow().isoformat()
    with _get_connection() as conn:
        existing = conn.execute(
            "SELECT * FROM video_requests WHERE ticker = ? AND report_date = ?",
            (ticker, report_date)
        ).fetchone()

        if existing:
            existing = dict(existing)
            # Only reset if force_regenerate or previous status was error
            if not force_regenerate and existing["status"] not in ("ERROR", "FAILED"):
                return existing
            conn.execute("""
                UPDATE video_requests
                SET job_id = ?, report_id = ?, status = 'RECEIVED',
                    eligibility_note = NULL, error_message = NULL,
                    force_regenerate = ?, received_at = ?, queued_at = NULL,
                    completed_at = NULL, updated_at = ?
                WHERE ticker = ? AND report_date = ?
            """, (job_id, report_id, int(force_regenerate), now, now, ticker, report_date))
        else:
            conn.execute("""
                INSERT INTO video_requests
                    (job_id, ticker, report_date, report_id, status, force_regenerate, received_at, updated_at)
                VALUES (?, ?, ?, ?, 'RECEIVED', ?, ?, ?)
            """, (job_id, ticker, report_date, report_id, int(force_regenerate), now, now))
        conn.commit()

    return get_by_job_id(job_id) or {}


def update_status(job_id: str, status: str, *, eligibility_note: str = None, error_message: str = None) -> None:
    """Updates the status (and optional metadata) for a job."""
    now = datetime.utcnow().isoformat()
    fields = ["status = ?", "updated_at = ?"]
    values = [status, now]

    if status == "QUEUED":
        fields.append("queued_at = ?")
        values.append(now)
    if status in ("NOT_ELIGIBLE", "GENERATED", "ERROR", "FAILED", "COMPLETED"):
        fields.append("completed_at = ?")
        values.append(now)
    if eligibility_note is not None:
        fields.append("eligibility_note = ?")
        values.append(eligibility_note)
    if error_message is not None:
        fields.append("error_message = ?")
        values.append(error_message)

    values.append(job_id)
    sql = f"UPDATE video_requests SET {', '.join(fields)} WHERE job_id = ?"

    with _get_connection() as conn:
        conn.execute(sql, values)
        conn.commit()


def get_by_job_id(job_id: str) -> Optional[dict]:
    """Returns a job row by job_id."""
    with _get_connection() as conn:
        row = conn.execute("SELECT * FROM video_requests WHERE job_id = ?", (job_id,)).fetchone()
        return dict(row) if row else None


def get_by_ticker_date(ticker: str, report_date: str) -> Optional[dict]:
    """Returns the latest job row for a ticker/date pair."""
    with _get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM video_requests WHERE ticker = ? AND report_date = ? ORDER BY id DESC LIMIT 1",
            (ticker, report_date)
        ).fetchone()
        return dict(row) if row else None


def has_successful_job(ticker: str, report_date: str) -> bool:
    """Returns True if a GENERATED job already exists for this ticker/date."""
    with _get_connection() as conn:
        row = conn.execute(
            "SELECT id FROM video_requests WHERE ticker = ? AND report_date = ? AND status = 'GENERATED' LIMIT 1",
            (ticker, report_date)
        ).fetchone()
        return row is not None
