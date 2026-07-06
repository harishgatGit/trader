from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, Literal

class VideoJobRequest(BaseModel):
    ticker: str
    reportDate: str = Field(..., description="Date of the report, format YYYY-MM-DD")
    reportId: str = Field(..., description="ID of the report in NestJS DB")
    source: str = "investingatti-report"
    reportJson: Dict[str, Any] = Field(..., description="The complete report JSON payload")
    outputFolder: Optional[str] = None
    forceRegenerate: bool = False
    # SHORTS = fast-paced vertical video ≤90s (default, YouTube Shorts optimized)
    # LONG_FORM = reserved for future in-depth 8-15 min horizontal video
    videoFormat: Literal["SHORTS", "LONG_FORM", "SHORT_30S", "MARKET_RECAP"] = "SHORTS"
