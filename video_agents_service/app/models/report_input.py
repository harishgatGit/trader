from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

class VideoJobRequest(BaseModel):
    ticker: str
    reportDate: str = Field(..., description="Date of the report, format YYYY-MM-DD")
    reportId: str = Field(..., description="ID of the report in NestJS DB")
    source: str = "investingatti-report"
    reportJson: Dict[str, Any] = Field(..., description="The complete report JSON payload")
    outputFolder: Optional[str] = None
    forceRegenerate: bool = False
