import subprocess
import re
import json
import os
from pathlib import Path
from typing import Dict, Any, Tuple
from app.config import FFMPEG_PATH, FFPROBE_PATH

class FFmpegService:
    def __init__(self):
        self.ffmpeg = self._resolve_path(FFMPEG_PATH, "ffmpeg.exe")
        self.ffprobe = self._resolve_path(FFPROBE_PATH, "ffprobe.exe")

    def _resolve_path(self, env_val: str, binary_name: str) -> str:
        # 1. Check if env_val exists or is executable directly
        if env_val != binary_name.split('.')[0]:
            if os.path.exists(env_val):
                return env_val

        # 2. Try running it from PATH
        try:
            subprocess.run([env_val, "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return env_val
        except FileNotFoundError:
            pass

        # 3. Fallback: Search in backend/node_modules for static binaries
        root_dir = Path(__file__).resolve().parent.parent.parent.parent
        node_modules_dir = root_dir / "backend" / "node_modules"
        
        if "ffmpeg" in binary_name:
            static_path = node_modules_dir / "ffmpeg-static" / binary_name
            if static_path.exists():
                return str(static_path)
        else: # ffprobe
            # ffprobe-static places it in bin/win32/x64/ffprobe.exe on Windows
            static_path = node_modules_dir / "ffprobe-static" / "bin" / "win32" / "x64" / binary_name
            if static_path.exists():
                return str(static_path)
            # fallback generic
            static_path_alt = node_modules_dir / "ffprobe-static" / binary_name
            if static_path_alt.exists():
                return str(static_path_alt)

        # 4. Final fallback just return the name and hope it works on execution
        return env_val

    def run_cmd(self, args: list) -> Tuple[str, str, int]:
        """Runs a command and returns (stdout, stderr, exit_code)"""
        result = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='ignore')
        return result.stdout, result.stderr, result.returncode

    def normalize_audio(self, input_path: Path, output_path: Path):
        """Applies loudnorm filter to normalize audio file volume"""
        args = [self.ffmpeg, "-y", "-i", str(input_path), "-filter:a", "loudnorm", str(output_path)]
        stdout, stderr, code = self.run_cmd(args)
        if code != 0:
            raise Exception(f"FFmpeg loudnorm failed with code {code}: {stderr}")

    def probe_media(self, file_path: Path) -> Dict[str, Any]:
        """Runs ffprobe and returns the parsed metadata JSON"""
        args = [
            self.ffprobe,
            "-v", "error",
            "-show_entries", "format=duration,size:stream=codec_type,codec_name",
            "-print_format", "json",
            str(file_path)
        ]
        stdout, stderr, code = self.run_cmd(args)
        if code != 0:
            raise Exception(f"FFprobe failed with code {code}: {stderr}")
        return json.loads(stdout)

    def detect_volume(self, audio_path: Path) -> Tuple[float, float]:
        """Detects mean_volume and max_volume in dB using volumedetect filter"""
        args = [self.ffmpeg, "-i", str(audio_path), "-filter:a", "volumedetect", "-f", "null", "-"]
        stdout, stderr, code = self.run_cmd(args)
        
        # ffmpeg volumedetect outputs to stderr
        output = stderr + stdout
        
        mean_vol = -90.0
        max_vol = -90.0
        
        mean_match = re.search(r"mean_volume:\s*([-+]?\d*\.?\d+)\s*dB", output)
        if mean_match:
            mean_vol = float(mean_match.group(1))
            
        max_match = re.search(r"max_volume:\s*([-+]?\d*\.?\d+)\s*dB", output)
        if max_match:
            max_vol = float(max_match.group(1))
            
        return mean_vol, max_vol
