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
REMOTION_PROJECT_PATH = os.getenv("REMOTION_PROJECT_PATH", "./templates/remotion")
CURRENT_APP_CALLBACK_URL = os.getenv("CURRENT_APP_CALLBACK_URL", "http://localhost:3000/api/video-callback")
CURRENT_APP_CALLBACK_API_KEY = os.getenv("CURRENT_APP_CALLBACK_API_KEY", "your-key")

# We can default FFMPEG paths to host-wide commands or look them up
FFMPEG_PATH = os.getenv("FFMPEG_PATH", "ffmpeg")
FFPROBE_PATH = os.getenv("FFPROBE_PATH", "ffprobe")

# API key for incoming requests to Python service
VIDEO_SERVICE_API_KEY = os.getenv("VIDEO_SERVICE_API_KEY", "your-key")

# OpenAI API key (standard OPENAI_API_KEY env)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
