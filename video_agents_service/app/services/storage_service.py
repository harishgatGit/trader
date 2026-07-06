from pathlib import Path
from app.config import OUTPUT_BASE_DIR

class StorageService:
    def __init__(self):
        self.base_dir = Path(OUTPUT_BASE_DIR).resolve()

    def get_job_dir(self, ticker: str, date_str: str, subfolder: str = "") -> Path:
        """
        Gets or creates the directory for the video job outputs: outputs/videos/{date}/{ticker}/{subfolder}
        """
        # Clean ticker name
        clean_ticker = ticker.upper().replace("/", "_").replace("\\", "_")
        job_dir = self.base_dir / date_str / clean_ticker
        if subfolder:
            job_dir = job_dir / subfolder
        job_dir.mkdir(parents=True, exist_ok=True)
        return job_dir
