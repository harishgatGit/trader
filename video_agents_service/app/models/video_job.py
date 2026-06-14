from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class JobStatus(str, Enum):
    # ── Primary public statuses (used by backend and frontend) ──────────────
    RECEIVED = "RECEIVED"             # Request logged by video agent service
    QUEUED = "QUEUED"                 # Passed eligibility check, queued for processing
    NOT_ELIGIBLE = "NOT_ELIGIBLE"     # Failed eligibility check (logged, not processed)
    GENERATED = "GENERATED"           # Video successfully produced
    ERROR = "ERROR"                   # Pipeline failed

    # ── Fine-grained internal pipeline statuses (reported via callback) ─────
    REPORT_RECEIVED = "REPORT_RECEIVED"
    SCRIPT_GENERATED = "SCRIPT_GENERATED"
    STORYBOARD_GENERATED = "STORYBOARD_GENERATED"
    VOICEOVER_GENERATED = "VOICEOVER_GENERATED"
    ANIMATION_RENDERED = "ANIMATION_RENDERED"

    # ── Legacy / compatibility ───────────────────────────────────────────────
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED_EXISTING_VIDEO = "SKIPPED_EXISTING_VIDEO"


class VideoJobArtifacts(BaseModel):
    sourceReport: Optional[str] = None
    normalizedInput: Optional[str] = None
    script: Optional[str] = None
    storyboard: Optional[str] = None
    audio: Optional[str] = None
    ffprobe: Optional[str] = None
    validation: Optional[str] = None
    finalVideo: Optional[str] = None


class VideoJob(BaseModel):
    jobId: str
    reportId: str
    ticker: str
    reportDate: str
    status: JobStatus
    startedAt: datetime = Field(default_factory=datetime.utcnow)
    completedAt: Optional[datetime] = None
    errorMessage: Optional[str] = None
    eligibilityNote: Optional[str] = None  # reason if NOT_ELIGIBLE
    videoUrl: Optional[str] = None
    artifacts: VideoJobArtifacts = Field(default_factory=VideoJobArtifacts)
    forceRegenerate: bool = False
