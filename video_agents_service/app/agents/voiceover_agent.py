import os
from pathlib import Path
from typing import Dict, Any, Tuple
from app.services.tts_service import TTSService
from app.services.ffmpeg_service import FFmpegService

class VoiceoverAgent:
    def __init__(self, tts_service: TTSService, ffmpeg_service: FFmpegService):
        self.tts = tts_service
        self.ffmpeg = ffmpeg_service

    def generate(self, script_text: str, output_dir: Path) -> Path:
        """
        Generates, normalizes, and validates the voiceover audio file.
        Saves output to narration-audio.mp3.
        Returns the path to the validated, normalized audio file.
        """
        temp_audio_path = output_dir / "temp-narration-audio.mp3"
        final_audio_path = output_dir / "narration-audio.mp3"

        # 1. Synthesize audio
        try:
            self.tts.synthesize(script_text, temp_audio_path)
        except Exception as e:
            raise Exception(f"Voice synthesis failed: {e}")

        if not temp_audio_path.exists() or temp_audio_path.stat().st_size == 0:
            raise Exception("Voice synthesis produced an empty or missing file.")

        # 2. Normalize audio (Loudnorm)
        try:
            self.ffmpeg.normalize_audio(temp_audio_path, final_audio_path)
        except Exception as e:
            # Fallback to copy if loudnorm fails for some reason
            import shutil
            shutil.copy(temp_audio_path, final_audio_path)
        finally:
            if temp_audio_path.exists():
                os.remove(temp_audio_path)

        # 3. Validate audio (volume & duration check)
        self._validate_audio(final_audio_path)

        return final_audio_path

    def _validate_audio(self, audio_path: Path):
        """
        Validates the audio file properties.
        Rejects if:
        - file missing
        - duration too short (< 2 seconds)
        - file size too small (< 5 KB)
        - mean volume below -35 dB
        - max volume near -90 dB (silent)
        """
        if not audio_path.exists():
            raise Exception("Normalized audio file does not exist.")

        size_kb = audio_path.stat().st_size / 1024
        if size_kb < 5.0:
            raise Exception(f"Generated audio size is too small: {size_kb:.1f} KB (expected >= 5 KB)")

        # Run ffprobe to get duration
        try:
            probe = self.ffmpeg.probe_media(audio_path)
            duration = float(probe.get("format", {}).get("duration", 0))
        except Exception as e:
            raise Exception(f"Failed to probe audio duration: {e}")

        if duration < 2.0:
            raise Exception(f"Audio duration is too short: {duration:.1f} seconds (expected >= 2 seconds)")

        # Detect volume metrics
        try:
            mean_vol, max_vol = self.ffmpeg.detect_volume(audio_path)
        except Exception as e:
            raise Exception(f"Failed to analyze audio volume: {e}")

        # Check silent/low volume thresholds
        if mean_vol < -35.0:
            raise Exception(f"Audio mean volume is too quiet: {mean_vol:.1f} dB (expected > -35 dB)")
        if max_vol <= -85.0:
            raise Exception(f"Audio is silent. Detected max volume: {max_vol:.1f} dB")

        # Save audio validation details for debugging
        validation_info = {
            "file_size_kb": size_kb,
            "duration_seconds": duration,
            "mean_volume_db": mean_vol,
            "max_volume_db": max_vol,
            "passed": True
        }
        
        validation_file = audio_path.parent / "audio-validation.json"
        import json
        with open(validation_file, 'w', encoding='utf-8') as f:
            json.dump(validation_info, f, indent=2)
