import shutil
import os
from pathlib import Path
from typing import Dict, Any
from app.services.remotion_renderer import RemotionRenderer
from app.config import REMOTION_PROJECT_PATH

class AnimationRenderAgent:
    def __init__(self, remotion_renderer: RemotionRenderer):
        self.renderer = remotion_renderer

    def render(self, 
               normalized_data: Dict[str, Any], 
               storyboard: Dict[str, Any], 
               audio_path: Path, 
               output_dir: Path) -> Path:
        """
        Renders the animated stock video matching the website styling using Remotion.
        """
        # Resolve Remotion project path
        remotion_dir = Path(REMOTION_PROJECT_PATH).resolve()
        if not remotion_dir.exists():
            raise Exception(f"Remotion template directory not found at: {remotion_dir}")

        # 1. Copy narration audio file to public folder of Remotion project so Remotion staticFile() can access it
        public_dir = remotion_dir / "public"
        public_dir.mkdir(exist_ok=True)
        
        # We rename/copy the audio to public/ticker-date-audio.mp3 to avoid conflicts if multiple renders run
        ticker = normalized_data.get("ticker", "STOCK").upper()
        date_str = normalized_data.get("reportDate", "TODAY")
        
        target_audio_filename = f"{ticker}_{date_str}_audio.mp3"
        dest_audio_path = public_dir / target_audio_filename
        
        # Copy audio file
        shutil.copy(audio_path, dest_audio_path)

        # 2. Construct props for Remotion render
        props = {
            "ticker": ticker,
            "companyName": normalized_data.get("companyName", ticker),
            "reportDate": date_str,
            "currentPrice": normalized_data.get("currentPrice", 0.0),
            "dayChangePct": normalized_data.get("dayChangePct", 0.0),
            "overallSignal": normalized_data.get("overallSignal", "HOLD"),
            "audioUrl": target_audio_filename, # relative to public/
            "scenes": storyboard.get("scenes") or storyboard.get("storyboard") or [],
            "normalizedData": normalized_data
        }

        # 3. Trigger render
        final_video_name = "final-video.mp4"
        dest_video_path = output_dir / final_video_name

        try:
            rendered_path = self.renderer.render(
                project_path=remotion_dir,
                composition_id="StockReportVideo",
                output_path=dest_video_path,
                props=props
            )
            return Path(rendered_path)
        finally:
            # Clean up the audio file from the public directory after rendering is finished
            if dest_audio_path.exists():
                try:
                    os.remove(dest_audio_path)
                except:
                    pass
