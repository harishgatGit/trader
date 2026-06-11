from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class JobStatus(str, Enum):
    PENDING = "PENDING"
    REPORT_RECEIVED = "REPORT_RECEIVED"
    SCRIPT_GENERATED = "SCRIPT_GENERATED"
    STORYBOARD_GENERATED = "STORYBOARD_GENERATED"
    VOICEOVER_GENERATED = "VOICEOVER_GENERATED"
    ANIMATION_RENDERED = "ANIMATION_RENDERED"
    MP4_EXPORTED = "MP4_EXPORTED"
    VALIDATION_PASSED = "VALIDATION_PASSED"
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
    videoUrl: Optional[str] = None
    artifacts: VideoJobArtifacts = Field(default_factory=VideoJobArtifacts)
    forceRegenerate: bool = False
