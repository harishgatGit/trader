from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal

# ─── Shared scene model (used by both SHORTS and LONG_FORM) ──────────────────

class StoryboardScene(BaseModel):
    sceneNumber: int
    sceneName: str
    # SHORTS scene types (maps 1:1 to Remotion component)
    # LONG_FORM scene types are a superset of these
    sceneType: str = "generic"  # thumbnail_hook | price_ticker | reason_card | signal_badge |
                                 # entry_setup | stop_loss | targets | risk_warning |
                                 # verdict_stamp | decision_map | bonus_insight | cta_screen
    durationSeconds: float
    narration: str              # The exact line spoken by TTS voiceover
    textOverlay: str            # Primary large text shown on screen
    subText: str = ""           # Secondary smaller text
    decisionColor: str = "yellow"  # green | yellow | red
    dataFields: Dict[str, Any] = Field(default_factory=dict)

    # Legacy fields (kept for LONG_FORM / MainVideo backward compatibility)
    pandaAction: str = "default"
    speechBubbleText: str = ""
    visualElements: List[str] = Field(default_factory=list)
    chartElements: List[str] = Field(default_factory=list)
    animationInstructions: List[str] = Field(default_factory=list)

    class Config:
        populate_by_name = True


# ─── Root storyboard model ────────────────────────────────────────────────────

class Storyboard(BaseModel):
    ticker: str
    companyName: str = ""
    videoTitle: str
    videoFormat: Literal["SHORTS", "LONG_FORM"] = "SHORTS"
    # SHORTS: 720x1280 (9:16 vertical) | LONG_FORM: 1920x1080 (16:9 horizontal, future)
    layout: str = "vertical_9_16"
    durationSeconds: float
    scenes: List[StoryboardScene]
    narrationScript: str = ""

    class Config:
        populate_by_name = True
