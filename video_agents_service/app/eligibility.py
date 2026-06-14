"""
eligibility.py — Eligibility checker for the Video Agent Service.

Determines whether an incoming video request should be queued for generation.
All rules are evaluated before pushing to the internal queue.

Status returned:
  (True, None)         — eligible, proceed to queue
  (False, reason_str)  — not eligible, log reason and skip

Rules (in order):
  1. A GENERATED job already exists for this ticker/date → skip (idempotent)
  2. Report JSON is missing critical required fields → skip (cannot produce meaningful video)
  3. (Extensible: add market-hours check, confidence threshold, etc.)
"""

from typing import Tuple, Optional, Dict, Any
from app import db

# Minimum fields required in the report JSON to produce a meaningful video
REQUIRED_REPORT_FIELDS = [
    "finalRating",
    "executiveSummary",
]


def check_eligibility(
    ticker: str,
    report_date: str,
    report_json: Dict[str, Any],
    force_regenerate: bool = False,
) -> Tuple[bool, Optional[str]]:
    """
    Returns (is_eligible, reason).
    - is_eligible: True if the request should be queued for video generation.
    - reason: Human-readable explanation if not eligible, None otherwise.
    """

    # Rule 1: Skip if a successful video already exists (unless force_regenerate)
    if not force_regenerate and db.has_successful_job(ticker, report_date):
        return False, f"A GENERATED video already exists for {ticker} on {report_date}. Use force_regenerate=true to override."

    # Rule 2: Skip if report JSON is missing critical fields
    missing_fields = [
        field for field in REQUIRED_REPORT_FIELDS
        if not report_json.get(field)
    ]
    if missing_fields:
        return False, f"Report JSON is missing critical fields required for video generation: {', '.join(missing_fields)}"

    # All rules passed — eligible
    return True, None
