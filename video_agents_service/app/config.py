import os
from pathlib import Path
from dotenv import load_dotenv

# Load env file from current dir or root directory
ENV_FILE = Path(__file__).resolve().parent.parent.parent / '.env'
if ENV_FILE.exists():
    load_dotenv(dotenv_path=ENV_FILE)
else:
    load_dotenv()

PORT = int(os.getenv("PORT", "8090"))
OUTPUT_BASE_DIR = os.getenv("OUTPUT_BASE_DIR", "./outputs/videos")
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "edge")
TTS_API_KEY = os.getenv("TTS_API_KEY", "")
TTS_VOICE = os.getenv("TTS_VOICE", "en-IN-NeerjaNeural")
# Format-specific TTS voice overrides
# SHORTS: energetic, punchy voice for YouTube Shorts
# LONG_FORM: deep analytical voice for long-form content (future)
TTS_VOICE_SHORTS_EDGE = os.getenv("TTS_VOICE_SHORTS", "en-US-AnaNeural")
TTS_VOICE_OPENAI_SHORTS = os.getenv("TTS_VOICE_OPENAI_SHORTS", "nova")
TTS_VOICE_OPENAI_LONGFORM = os.getenv("TTS_VOICE_OPENAI_LONGFORM", "onyx")
REMOTION_PROJECT_PATH = os.getenv("REMOTION_PROJECT_PATH", "./templates/remotion")
CURRENT_APP_CALLBACK_URL = os.getenv("CURRENT_APP_CALLBACK_URL", "http://localhost:3000/api/video-callback")
CURRENT_APP_CALLBACK_API_KEY = os.getenv("CURRENT_APP_CALLBACK_API_KEY", "your-key")

# We can default FFMPEG paths to host-wide commands or look them up
FFMPEG_PATH = os.getenv("FFMPEG_PATH", "ffmpeg")
FFPROBE_PATH = os.getenv("FFPROBE_PATH", "ffprobe")

# API key for incoming requests to Python service
VIDEO_SERVICE_API_KEY = os.getenv("VIDEO_SERVICE_API_KEY", "your-key")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

# YouTube configuration
YOUTUBE_CLIENT_ID = os.getenv("YOUTUBE_CLIENT_ID", "")
YOUTUBE_CLIENT_SECRET = os.getenv("YOUTUBE_CLIENT_SECRET", "")
YOUTUBE_UPLOAD_VISIBILITY = os.getenv("YOUTUBE_UPLOAD_VISIBILITY", "private")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
BASE_DIR = Path(__file__).resolve().parent

# CORS — restrict to backend origin; wildcard only as last-resort fallback
_backend_url = BACKEND_URL or "http://localhost:3000"
ALLOWED_ORIGINS: list[str] = [_backend_url]
_extra = os.getenv("VIDEO_ALLOWED_ORIGINS", "")
if _extra:
    ALLOWED_ORIGINS += [o.strip() for o in _extra.split(",") if o.strip()]

