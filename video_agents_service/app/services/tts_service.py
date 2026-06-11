import asyncio
import requests
from pathlib import Path
from openai import OpenAI
import edge_tts
from app.config import TTS_PROVIDER, TTS_API_KEY, TTS_VOICE

class TTSService:
    def __init__(self):
        self.provider = TTS_PROVIDER.lower()
        self.api_key = TTS_API_KEY

    def synthesize(self, text: str, output_path: Path):
        """
        Synthesizes text into speech and saves it as an MP3 file at output_path.
        """
        if self.provider == "openai" and self.api_key:
            self._synthesize_openai(text, output_path)
        elif self.provider == "elevenlabs" and self.api_key:
            self._synthesize_elevenlabs(text, output_path)
        else:
            # Default to edge-tts which is free and does not require keys
            asyncio.run(self._synthesize_edge(text, output_path))

    def _synthesize_openai(self, text: str, output_path: Path):
        client = OpenAI(api_key=self.api_key)
        response = client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text
        )
        with open(output_path, "wb") as f:
            for chunk in response.iter_bytes():
                f.write(chunk)

    def _synthesize_elevenlabs(self, text: str, output_path: Path):
        # Default voice id (Rachel)
        voice_id = "21m00Tcm4TlvDq8ikWAM"
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        response = requests.post(url, json=data, headers=headers)
        if response.status_code == 200:
            with open(output_path, "wb") as f:
                f.write(response.content)
        else:
            raise Exception(f"ElevenLabs TTS synthesis failed with status code {response.status_code}: {response.text}")

    async def _synthesize_edge(self, text: str, output_path: Path):
        communicate = edge_tts.Communicate(text, TTS_VOICE)
        await communicate.save(str(output_path))
