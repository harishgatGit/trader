from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class StoryboardScene(BaseModel):
    sceneNumber: int = Field(..., alias="sceneNumber")
    sceneTitle: str = Field(..., alias="sceneTitle")
    durationSeconds: float = Field(..., alias="durationSeconds")
    voiceover: str
    textOverlay: str = Field(..., alias="textOverlay")
    visualInstruction: str = Field(..., alias="visualInstruction")
    animationType: str = Field(..., alias="animationType")
    dataFields: Dict[str, Any] = Field(default_factory=dict, alias="dataFields")

    class Config:
        populate_by_name = True

class Storyboard(BaseModel):
    ticker: str
    videoTitle: str = Field(..., alias="videoTitle")
    format: str = "vertical_9_16"
    durationSeconds: float = Field(..., alias="durationSeconds")
    scenes: List[StoryboardScene]

    class Config:
        populate_by_name = True
