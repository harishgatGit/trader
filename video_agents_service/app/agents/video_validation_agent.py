import json
import subprocess
from pathlib import Path
from typing import Dict, Any, List
from app.services.ffmpeg_service import FFmpegService
from app.models.validation import VideoValidationResult

class VideoValidationAgent:
    def __init__(self, ffmpeg_service: FFmpegService):
        self.ffmpeg = ffmpeg_service

    def validate(self, video_path: Path, output_path: Path) -> VideoValidationResult:
        """
        Validates the rendered stock video MP4 file and saves the validation result JSON.
        """
        errors: List[str] = []
        ffprobe_valid = False
        has_video = False
        has_audio = False
        duration = 0.0
        file_size_mb = 0.0
        audio_mean_volume = -90.0
        frame_diffs_passed = False

        # 1. File existence check
        if not video_path.exists():
            errors.append("Final video file does not exist.")
            result = VideoValidationResult(
                ffprobe_valid=False,
                has_video_stream=False,
                has_audio_stream=False,
                duration=0.0,
                file_size_mb=0.0,
                audio_mean_volume_db=-90.0,
                frame_differences_passed=False,
                passed=False,
                errors=errors
            )
            self._save_result(result, output_path)
            return result

        # Calculate file size
        file_size_bytes = video_path.stat().st_size
        file_size_mb = file_size_bytes / (1024 * 1024)

        # 2. Run ffprobe validation
        try:
            probe = self.ffmpeg.probe_media(video_path)
            ffprobe_valid = True
            
            # Check streams
            streams = probe.get("streams", [])
            has_video = any(s.get("codec_type") == "video" for s in streams)
            has_audio = any(s.get("codec_type") == "audio" for s in streams)
            
            # Get duration
            duration = float(probe.get("format", {}).get("duration", 0.0))
        except Exception as e:
            errors.append(f"ffprobe check failed: {e}")

        # Validate stream presence
        if not has_video:
            errors.append("No video stream found in the MP4 file.")
        if not has_audio:
            errors.append("No audio stream found in the MP4 file.")

        # Validate duration (60 - 180 seconds)
        if duration < 60.0 or duration > 185.0:
            errors.append(f"Video duration is out of range: {duration:.1f} seconds (expected 60-180s).")

        # Validate file size (scale expected min size to 2.0 MB for longer videos)
        expected_min_size = 2.0 # MB
        if file_size_mb < expected_min_size:
            errors.append(f"Video file size is too small: {file_size_mb:.2f} MB (expected >= {expected_min_size} MB).")

        # 3. Validate audio mean volume
        try:
            mean_vol, max_vol = self.ffmpeg.detect_volume(video_path)
            audio_mean_volume = mean_vol
            if mean_vol < -35.0:
                errors.append(f"Video audio mean volume is too low: {mean_vol:.1f} dB (expected > -35 dB).")
        except Exception as e:
            errors.append(f"Audio volume detection failed: {e}")

        # 4. Run frame difference check to confirm animation
        try:
            frame_diffs_passed = self._check_frame_differences(video_path)
            if not frame_diffs_passed:
                errors.append("Frame difference check failed: The video frames do not show enough animation or scene changes.")
        except Exception as e:
            errors.append(f"Frame difference check encountered an error: {e}")

        # Final pass check
        passed = len(errors) == 0

        result = VideoValidationResult(
            ffprobe_valid=ffprobe_valid,
            has_video_stream=has_video,
            has_audio_stream=has_audio,
            duration=duration,
            file_size_mb=file_size_mb,
            audio_mean_volume_db=audio_mean_volume,
            frame_differences_passed=frame_diffs_passed,
            passed=passed,
            errors=errors
        )

        self._save_result(result, output_path)
        return result

    def _check_frame_differences(self, video_path: Path) -> bool:
        """
        Extracts 10x10 raw RGB frames at regular intervals and checks that they are not identical,
        confirming that scene transitions and animations occur.
        """
        # Select 1 frame every 120 frames (~4 seconds at 30fps)
        cmd = [
            self.ffmpeg.ffmpeg,
            "-y",
            "-i", str(video_path),
            "-vf", "select=not(mod(n\\,120)),scale=10:10,format=rgb24",
            "-vsync", "vfr",
            "-f", "rawvideo",
            "-"
        ]
        
        # We run the command and read the raw bytes from stdout
        res = subprocess.run(cmd, capture_output=True)
        if res.returncode != 0:
            return False
            
        data = res.stdout
        frame_size = 10 * 10 * 3 # 300 bytes
        num_frames = len(data) // frame_size
        
        if num_frames < 3:
            return False # Need at least a few frames to verify changes
            
        unique_changes = 0
        prev_frame = None
        
        for i in range(num_frames):
            frame = data[i * frame_size : (i + 1) * frame_size]
            if prev_frame is not None:
                # Compare frame bytes
                if frame != prev_frame:
                    unique_changes += 1
            prev_frame = frame
            
        # We expect at least 3-4 changes across a 45-60s animated slide video
        return unique_changes >= 3

    def _save_result(self, result: VideoValidationResult, output_path: Path):
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result.model_dump(), f, indent=2)
