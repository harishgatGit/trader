from pydantic import BaseModel
from typing import List, Optional

class VideoValidationResult(BaseModel):
    ffprobe_valid: bool
    has_video_stream: bool
    has_audio_stream: bool
    duration: float
    file_size_mb: float
    audio_mean_volume_db: float
    frame_differences_passed: bool
    passed: bool
    errors: List[str]
