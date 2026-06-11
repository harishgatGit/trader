"""
Studio Video Generator for InvestingAtti
=========================================
Generates the TSM studio-style video with:
  - InvestingAtti avatar as the presenter background
  - OpenAI TTS narration (onyx voice — deep, professional finance tone)
  - Remotion StockReportStudio composition
"""

import sys
import os
import json
import shutil
import subprocess
from pathlib import Path

# ─── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent.resolve()
REPO_ROOT    = SCRIPT_DIR.parents[4]          # trader/
SERVICE_ROOT = REPO_ROOT / "video_agents_service"
REMOTION_DIR = SERVICE_ROOT / "templates" / "remotion"
PUBLIC_DIR   = REMOTION_DIR / "public"
OUTPUT_DIR   = SCRIPT_DIR

# ─── Load env ────────────────────────────────────────────────────────────────
def load_env():
    env_file = REPO_ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip())

load_env()

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# ─── Narration script ─────────────────────────────────────────────────────────
NARRATION = (
    "Hey traders, welcome to InvestingAtti! Today we're breaking down TSM — Taiwan Semiconductor, "
    "one of the world's most critical semiconductor manufacturers.\n\n"
    "TSM is currently priced at 419 dollars and 17 cents, pulling back sharply by about 5.75 percent "
    "from its recent highs. That's a significant intraday move to the downside.\n\n"
    "The stock is technically in a bullish long-term trend — it's still above its key moving averages "
    "and MACD is signalling bullish momentum. However, short-term timeframes are showing bearish pressure "
    "with price falling below VWAP and short-term moving averages.\n\n"
    "Looking at the evidence: news sentiment is positive, and the semiconductor sector is showing strength. "
    "But volume is below average — and that's the red flag. Low volume on a 5.75 percent drop suggests "
    "the move may be profit-taking rather than a true reversal.\n\n"
    "On the daily chart, we're seeing a consolidation near resistance around 425 to 432. "
    "Price is pausing right here before its next move. \n\n"
    "Technically: MACD is bullish on the daily. RSI is not overbought. Moving averages are aligned. "
    "But that short-term institutional distribution score of 36 tells me smart money is offloading.\n\n"
    "For swing traders: the entry zone is between 399 dollars 70 cents and 410 dollars 12 cents. "
    "Stop-loss sits at 399 dollars 70 — below key support. "
    "Targets: 425 dollars 5 cents, then 432 dollars 34 cents. "
    "Risk-reward is not yet optimal — hence our WAIT rating.\n\n"
    "On the short side: squeeze risk is MEDIUM. Short interest data is unavailable, "
    "but with a high P/E of 35.81 and institutional distribution, there could be further downside. "
    "Proceed with caution if you're considering a bearish play.\n\n"
    "The semiconductor sector overall remains strong — global AI chip demand is sky-high — "
    "and TSM is the backbone of that industry. But the near-term pullback signals possible profit-taking.\n\n"
    "Bottom line: WAIT for a clearer entry signal or a confirmed breakout above 425 before committing. "
    "The long-term thesis is intact, but this is not the moment to chase. "
    "Manage your risk, stay patient, and as always — trade smart, not emotional. "
    "This is InvestingAtti. See you in the next one!"
)

# ─── Storyboard scenes ────────────────────────────────────────────────────────
SCENES = [
    {
        "sceneNumber": 1,
        "sceneName": "Stock Overview",
        "durationSeconds": 8,
        "narration": "Hey traders, welcome to InvestingAtti! Today we're breaking down TSM — Taiwan Semiconductor, one of the world's most critical semiconductor manufacturers.",
        "pandaAction": "walk",
        "speechBubbleText": "TSM: A semiconductor giant!",
        "visualElements": ["TSM logo", "semiconductor imagery"],
        "chartElements": [],
        "animationInstructions": ["Logo fade in", "ticker card slide up"],
        "dataFields": {}
    },
    {
        "sceneNumber": 2,
        "sceneName": "Price Action",
        "durationSeconds": 9,
        "narration": "TSM is currently priced at $419.17, pulling back sharply by about 5.75 percent from its recent highs. That's a significant intraday move to the downside.",
        "pandaAction": "magnifying",
        "speechBubbleText": "Down 5.75% today!",
        "visualElements": ["price tag", "downward arrow"],
        "chartElements": ["price chart showing recent pullback"],
        "animationInstructions": ["Price count-up", "day change color pulse"],
        "dataFields": {}
    },
    {
        "sceneNumber": 3,
        "sceneName": "Trend Reason",
        "durationSeconds": 9,
        "narration": "The stock is technically in a bullish long-term trend — it's still above its key moving averages and MACD is signalling bullish momentum. However, short-term timeframes are showing bearish pressure with price falling below VWAP.",
        "pandaAction": "caution",
        "speechBubbleText": "Bullish trend but short-term bearish!",
        "visualElements": ["bull and bear icons"],
        "chartElements": ["trend line with recent dip"],
        "animationInstructions": ["Overlay bear icon on recent dip in chart"],
        "dataFields": {}
    },
    {
        "sceneNumber": 4,
        "sceneName": "Evidence",
        "durationSeconds": 9,
        "narration": "Looking at the evidence: news sentiment is positive, and the semiconductor sector is showing strength. But volume is below average — and that's the red flag. Low volume on a 5.75 percent drop suggests the move may be profit-taking rather than a true reversal.",
        "pandaAction": "magnifying",
        "speechBubbleText": "Low volume = hesitation",
        "visualElements": ["news headlines", "volume bars"],
        "chartElements": ["volume chart"],
        "animationInstructions": ["Highlight low volume bars"],
        "dataFields": {}
    },
    {
        "sceneNumber": 5,
        "sceneName": "Daily Trend",
        "durationSeconds": 7,
        "narration": "On the daily chart, we're seeing a consolidation near resistance around 425 to 432. Price is pausing right here before its next move.",
        "pandaAction": "drawing",
        "speechBubbleText": "Consolidation near resistance!",
        "visualElements": ["resistance line"],
        "chartElements": ["consolidation pattern"],
        "animationInstructions": ["Draw resistance line on chart"],
        "dataFields": {}
    },
    {
        "sceneNumber": 6,
        "sceneName": "Technical Metrics",
        "durationSeconds": 9,
        "narration": "Technically: MACD is bullish on the daily. RSI is not overbought. Moving averages are aligned. But that short-term institutional distribution score of 36 tells me smart money is offloading.",
        "pandaAction": "caution",
        "speechBubbleText": "Bullish MACD, but institutions selling!",
        "visualElements": ["MACD indicator", "moving averages"],
        "chartElements": ["technical indicators overlay"],
        "animationInstructions": ["Highlight MACD and moving averages"],
        "dataFields": {}
    },
    {
        "sceneNumber": 7,
        "sceneName": "Tactical Setup",
        "durationSeconds": 11,
        "narration": "For swing traders: the entry zone is between $399.70 and $410.12. Stop-loss sits at $399.70 — below key support. Targets: $425.05, then $432.34. Risk-reward is not yet optimal — hence our WAIT rating.",
        "pandaAction": "point",
        "speechBubbleText": "Entry: $399.70–$410.12",
        "visualElements": ["entry zone highlight", "target markers"],
        "chartElements": ["entry and target zones"],
        "animationInstructions": ["Highlight entry and target zones on chart"],
        "dataFields": {}
    },
    {
        "sceneNumber": 8,
        "sceneName": "Short Trade",
        "durationSeconds": 8,
        "narration": "On the short side: squeeze risk is MEDIUM. With a high P/E of 35.81 and institutional distribution, there could be further downside. Proceed with caution if you're considering a bearish play.",
        "pandaAction": "caution",
        "speechBubbleText": "Medium squeeze risk!",
        "visualElements": ["warning sign"],
        "chartElements": [],
        "animationInstructions": ["Flash warning sign"],
        "dataFields": {}
    },
    {
        "sceneNumber": 9,
        "sceneName": "Ecosystem Insight",
        "durationSeconds": 8,
        "narration": "The semiconductor sector overall remains strong — global AI chip demand is sky-high — and TSM is the backbone of that industry. But the near-term pullback signals possible profit-taking.",
        "pandaAction": "magnifying",
        "speechBubbleText": "Sector strong, but profit-taking?",
        "visualElements": ["sector strength imagery"],
        "chartElements": ["sector performance chart"],
        "animationInstructions": ["Highlight sector performance"],
        "dataFields": {}
    },
    {
        "sceneNumber": 10,
        "sceneName": "Final Verdict",
        "durationSeconds": 12,
        "narration": "Bottom line: WAIT for a clearer entry signal or a confirmed breakout above 425 before committing. The long-term thesis is intact, but this is not the moment to chase. Manage your risk, stay patient, and as always — trade smart, not emotional. This is InvestingAtti. See you in the next one!",
        "pandaAction": "default",
        "speechBubbleText": "WAIT — patience is key!",
        "visualElements": ["stopwatch", "caution sign"],
        "chartElements": [],
        "animationInstructions": ["Show stopwatch ticking"],
        "dataFields": {}
    }
]

NORMALIZED_DATA = {
    "companyName": "Taiwan Semiconductor Manufacturing Co.",
    "confidenceScore": 72,
    "whyStockMoved": "Sector-sympathy pullback + institutional distribution",
    "catalystSummary": "Positive news sentiment and strong semiconductor sector performance, but low volume confirms hesitation",
    "volumeSummary": "Volume is below average — not confirming a strong continuation move",
    "trendSummary": "Bullish long-term structure above key MAs and bullish MACD, but short-term bearish pressure below VWAP with institutional distribution (proxy score 36) suggesting profit-taking",
    "supportLevels": [410.12, 415.11],
    "resistanceLevels": [425.05, 432.34],
    "entryZone": "$399.70 – $410.12",
    "stopLoss": "$399.70 (Below key support)",
    "targets": [425.05, 432.34],
    "shortTradeView": "Squeeze Risk: MEDIUM. High P/E (35.81) + institutional distribution = potential downside, but sector tailwind limits conviction on short.",
    "riskWarnings": "High valuation; Near-term pullback risk; Low volume",
    "finalVerdict": "The long-term bullish thesis is intact, but current risk/reward is unfavourable. Wait for breakout above $425 or a confirmed re-entry near support before taking a new position.",
    "riskWarning": "High valuation + institutional distribution signal profit-taking risk",
    "keyLevel": "$425 Resistance",
    "executiveSummary": "TSM is pulling back sharply despite a bullish technical setup. Wait for confirmation before entering."
}

def generate_audio_openai():
    """Generate narration audio using OpenAI TTS (onyx voice)."""
    if not OPENAI_API_KEY:
        print("[WARN] No OpenAI API key found -- skipping audio generation, using existing narration-audio.mp3")
        existing = OUTPUT_DIR / "narration-audio.mp3"
        studio_audio = OUTPUT_DIR / "studio-narration.mp3"
        if existing.exists():
            shutil.copy2(existing, studio_audio)
            print(f"  Copied existing audio to {studio_audio}")
        return studio_audio

    try:
        from openai import OpenAI
    except ImportError:
        print("[WARN] openai package not installed -- using existing narration audio")
        existing = OUTPUT_DIR / "narration-audio.mp3"
        studio_audio = OUTPUT_DIR / "studio-narration.mp3"
        if existing.exists():
            shutil.copy2(existing, studio_audio)
        return studio_audio

    print("[TTS] Generating studio narration with OpenAI TTS (voice: onyx)...")
    client = OpenAI(api_key=OPENAI_API_KEY)
    
    studio_audio = OUTPUT_DIR / "studio-narration.mp3"
    
    # OpenAI SDK v2: use with_streaming_response to get HttpxBinaryResponseContent
    with client.audio.speech.with_streaming_response.create(
        model="tts-1-hd",
        voice="onyx",       # Deep, authoritative finance narrator voice
        input=NARRATION,
        speed=0.95          # Slightly slower for clarity
    ) as response:
        response.stream_to_file(studio_audio)
    
    print(f"  [OK] Studio narration saved: {studio_audio} ({studio_audio.stat().st_size // 1024} KB)")
    return studio_audio


def copy_audio_to_public(audio_path: Path):
    """Copy the generated audio into Remotion's public folder so staticFile() can find it."""
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    dest = PUBLIC_DIR / "studio-narration.mp3"
    shutil.copy2(audio_path, dest)
    print(f"  [OK] Audio copied to Remotion public: {dest}")
    return "studio-narration.mp3"   # relative name for staticFile()


def render_studio_video(audio_filename: str):
    """Render the StockReportStudio Remotion composition."""
    output_mp4 = OUTPUT_DIR / "studio-final-video.mp4"
    output_mp4.parent.mkdir(parents=True, exist_ok=True)

    props = {
        "ticker":        "TSM",
        "companyName":   "Taiwan Semiconductor Manufacturing Co.",
        "reportDate":    "2026-06-05",
        "currentPrice":  419.17,
        "dayChangePct":  -5.75,
        "overallSignal": "WAIT",
        "audioUrl":      audio_filename,
        "scenes":        SCENES,
        "normalizedData": NORMALIZED_DATA
    }

    props_file = REMOTION_DIR / "tmp-studio-props.json"
    props_file.write_text(json.dumps(props, indent=2), encoding="utf-8")

    env = os.environ.copy()
    node_path = r"C:\Program Files\nodejs"
    if sys.platform == "win32" and node_path not in env.get("PATH", ""):
        env["PATH"] = f"{node_path};{env.get('PATH', '')}"

    # Install node_modules if needed
    nm = REMOTION_DIR / "node_modules"
    if not nm.exists():
        print("[PKG] Installing Remotion dependencies...")
        subprocess.run(
            ["npm", "install"],
            cwd=str(REMOTION_DIR),
            env=env,
            shell=(sys.platform == "win32"),
            check=True
        )

    cmd = [
        "npx", "remotion", "render",
        "index.ts",
        "StockReportStudio",
        str(output_mp4),
        f"--props={props_file.name}",
        "--overwrite",
        "--log=verbose",
    ]

    print(f"\n[RENDER] Rendering StockReportStudio composition...")
    print(f"   Output: {output_mp4}")
    print(f"   Command: {' '.join(cmd)}\n")

    result = subprocess.run(
        cmd,
        cwd=str(REMOTION_DIR),
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
        shell=(sys.platform == "win32")
    )

    log_file = OUTPUT_DIR / "studio-render-log.txt"
    log_file.write_text(
        f"STDOUT:\n{result.stdout}\n\nSTDERR:\n{result.stderr}",
        encoding="utf-8"
    )

    # Clean up props file
    try:
        props_file.unlink()
    except Exception:
        pass

    if result.returncode != 0:
        print(f"\n[FAIL] Render FAILED (exit {result.returncode})")
        print(f"   See log: {log_file}")
        print(f"   Last stderr:\n{result.stderr[-800:]}")
        sys.exit(1)

    print(f"\n[SUCCESS] Studio video rendered successfully!")
    print(f"   [VIDEO] {output_mp4}")
    print(f"   Size: {output_mp4.stat().st_size / (1024*1024):.1f} MB")
    return str(output_mp4)


def main():
    print("=" * 60)
    print("  InvestingAtti Studio Video Generator")
    print("  Ticker: TSM | Voice: OpenAI onyx | Style: Avatar Studio")
    print("=" * 60)
    print()

    # 1. Generate audio
    audio_path = generate_audio_openai()

    # 2. Copy audio to Remotion public folder
    audio_filename = copy_audio_to_public(audio_path)

    # 3. Ensure avatar image is in public folder
    avatar_src = Path(r"C:\Users\haris\Downloads") / "investingatti-avatar.png"
    avatar_dst = PUBLIC_DIR / "investingatti-avatar.png"
    # It's already been copied earlier, but double-check
    if not avatar_dst.exists():
        # Try the generated one
        gen_avatar = Path(r"C:\Users\haris\.gemini\antigravity-ide\brain\03a5438f-20df-4e76-af96-71e426c1a5f7\investingatti_avatar_1780681573646.png")
        if gen_avatar.exists():
            shutil.copy2(gen_avatar, avatar_dst)
            print(f"  [OK] Avatar copied to public: {avatar_dst}")
    else:
        print(f"  [OK] Avatar already in public folder")

    # 4. Render the studio video
    render_studio_video(audio_filename)


if __name__ == "__main__":
    main()
