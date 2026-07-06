import asyncio
import requests
from pathlib import Path
from openai import OpenAI
import edge_tts
from app.config import (
    TTS_PROVIDER, TTS_API_KEY, TTS_VOICE,
    TTS_VOICE_SHORTS_EDGE, TTS_VOICE_OPENAI_SHORTS, TTS_VOICE_OPENAI_LONGFORM,
)

class TTSService:
    def __init__(self):
        self.provider = TTS_PROVIDER.lower()
        self.api_key = TTS_API_KEY

    def synthesize(self, text: str, output_path: Path, video_format: str = "SHORTS"):
        """
        Synthesizes text into speech and saves it as an MP3 file at output_path.

        Chooses voice based on video_format:
        - SHORTS   → energetic, fast-paced voice (nova / en-US-AnaNeural)
        - LONG_FORM → deep, analytical voice (onyx / en-IN-NeerjaNeural)
        """
        if self.provider == "openai" and self.api_key:
            self._synthesize_openai(text, output_path, video_format)
        elif self.provider == "elevenlabs" and self.api_key:
            self._synthesize_elevenlabs(text, output_path, video_format)
        else:
            # Default: edge-tts (free, no key required)
            asyncio.run(self._synthesize_edge(text, output_path, video_format))

    def _synthesize_openai(self, text: str, output_path: Path, video_format: str = "SHORTS"):
        client = OpenAI(api_key=self.api_key)

        # Choose voice by format
        if video_format in ("LONG_FORM", "MARKET_RECAP"):
            voice = TTS_VOICE_OPENAI_LONGFORM  # "onyx" — deep news-anchor voice
            speed = 1.0
        else:
            voice = TTS_VOICE_OPENAI_SHORTS    # "nova" — energetic, punchy
            speed = 1.1

        # Use tts-1-hd for higher quality
        response = client.audio.speech.create(
            model="tts-1-hd",
            voice=voice,
            input=text,
            speed=speed,  # Shorts=1.1 for energy; Recap=1.0 for clear narration
        )
        with open(output_path, "wb") as f:
            for chunk in response.iter_bytes():
                f.write(chunk)

    def _synthesize_elevenlabs(self, text: str, output_path: Path, video_format: str = "SHORTS"):
        # ElevenLabs Rachel (default) — future: map format → different voice IDs
        voice_id = "21m00Tcm4TlvDq8ikWAM"
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        # Adjust stability/boost for format energy
        stability = 0.4 if video_format == "SHORTS" else 0.6
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": stability,
                "similarity_boost": 0.8
            }
        }
        response = requests.post(url, json=data, headers=headers)
        if response.status_code == 200:
            with open(output_path, "wb") as f:
                f.write(response.content)
        else:
            raise Exception(
                f"ElevenLabs TTS synthesis failed ({response.status_code}): {response.text}"
            )

    async def _synthesize_edge(self, text: str, output_path: Path, video_format: str = "SHORTS"):
        # Pick voice by format
        if video_format in ("LONG_FORM", "MARKET_RECAP"):
            voice = TTS_VOICE  # en-IN-NeerjaNeural — analytical/anchor voice
        else:
            voice = TTS_VOICE_SHORTS_EDGE  # en-US-AnaNeural — upbeat, energetic
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(str(output_path))
