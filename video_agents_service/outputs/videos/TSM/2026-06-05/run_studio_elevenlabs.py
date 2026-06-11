"""
ElevenLabs Voice Clone + Studio Video Generator
================================================
1. Clones a voice from voicesample.mp3 using ElevenLabs Instant Voice Cloning
2. Generates the TSM narration in the cloned voice
3. Renders the StockReportStudio Remotion composition
"""

import sys
import os
import json
import shutil
import subprocess
import requests
from pathlib import Path

# ─── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent.resolve()
REPO_ROOT    = SCRIPT_DIR.parents[4]
SERVICE_ROOT = REPO_ROOT / "video_agents_service"
REMOTION_DIR = SERVICE_ROOT / "templates" / "remotion"
PUBLIC_DIR   = REMOTION_DIR / "public"
OUTPUT_DIR   = SCRIPT_DIR
VOICE_SAMPLE = PUBLIC_DIR / "voicesample.mp3"

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

ELEVENLABS_API_KEY  = os.environ.get("TTS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "").strip()
ELEVENLABS_BASE     = "https://api.elevenlabs.io/v1"
HEADERS_JSON        = {
    "xi-api-key": ELEVENLABS_API_KEY,
    "Content-Type": "application/json"
}

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
    "On the daily chart, we're seeing a potential consolidation near resistance around 425 to 432. "
    "Price is pausing right here before its next move.\n\n"
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
    {"sceneNumber": 1, "sceneName": "Stock Overview", "durationSeconds": 8,
     "narration": "Hey traders, welcome to InvestingAtti! Today we're breaking down TSM — Taiwan Semiconductor, one of the world's most critical semiconductor manufacturers.",
     "pandaAction": "walk", "speechBubbleText": "TSM: A semiconductor giant!",
     "visualElements": [], "chartElements": [], "animationInstructions": [], "dataFields": {}},
    {"sceneNumber": 2, "sceneName": "Price Action", "durationSeconds": 9,
     "narration": "TSM is currently priced at $419.17, pulling back sharply by about 5.75% from recent highs.",
     "pandaAction": "magnifying", "speechBubbleText": "Down 5.75% today!",
     "visualElements": [], "chartElements": [], "animationInstructions": [], "dataFields": {}},
    {"sceneNumber": 3, "sceneName": "Trend Reason", "durationSeconds": 9,
     "narration": "Bullish long-term structure, but short-term bearish pressure with price below VWAP.",
     "pandaAction": "caution", "speechBubbleText": "Bullish trend but short-term bearish!",
     "visualElements": [], "chartElements": [], "animationInstructions": [], "dataFields": {}},
    {"sceneNumber": 4, "sceneName": "Evidence", "durationSeconds": 9,
     "narration": "Positive sentiment, but low volume is the red flag — suggests profit-taking not reversal.",
     "pandaAction": "magnifying", "speechBubbleText": "Low volume = hesitation",
     "visualElements": [], "chartElements": [], "animationInstructions": [], "dataFields": {}},
    {"sceneNumber": 5, "sceneName": "Daily Trend", "durationSeconds": 7,
     "narration": "Consolidation near resistance at 425 to 432. Price pausing before its next move.",
     "pandaAction": "drawing", "speechBubbleText": "Consolidation near resistance!",
     "visualElements": [], "chartElements": [], "animationInstructions": [], "dataFields": {}},
    {"sceneNumber": 6, "sceneName": "Technical Metrics", "durationSeconds": 9,
     "narration": "Bullish MACD, RSI not overbought — but institutional distribution score of 36 is concerning.",
     "pandaAction": "caution", "speechBubbleText": "Institutions selling!",
     "visualElements": [], "chartElements": [], "animationInstructions": [], "dataFields": {}},
    {"sceneNumber": 7, "sceneName": "Tactical Setup", "durationSeconds": 11,
     "narration": "Entry: $399.70-$410.12. Stop: $399.70. Targets: $425.05 and $432.34. WAIT rating.",
     "pandaAction": "point", "speechBubbleText": "Entry: $399.70-$410.12",
     "visualElements": [], "chartElements": [], "animationInstructions": [], "dataFields": {}},
    {"sceneNumber": 8, "sceneName": "Short Trade", "durationSeconds": 8,
     "narration": "Short side: MEDIUM squeeze risk. High P/E and distribution signal possible downside.",
     "pandaAction": "caution", "speechBubbleText": "Medium squeeze risk!",
     "visualElements": [], "chartElements": [], "animationInstructions": [], "dataFields": {}},
    {"sceneNumber": 9, "sceneName": "Ecosystem Insight", "durationSeconds": 8,
     "narration": "Semiconductor sector remains strong on AI chip demand, but pullback signals profit-taking.",
     "pandaAction": "magnifying", "speechBubbleText": "Sector strong, watch profit-taking",
     "visualElements": [], "chartElements": [], "animationInstructions": [], "dataFields": {}},
    {"sceneNumber": 10, "sceneName": "Final Verdict", "durationSeconds": 12,
     "narration": "WAIT for breakout above $425. Long-term thesis intact. Trade smart, not emotional.",
     "pandaAction": "default", "speechBubbleText": "WAIT — patience is key!",
     "visualElements": [], "chartElements": [], "animationInstructions": [], "dataFields": {}}
]

NORMALIZED_DATA = {
    "companyName": "Taiwan Semiconductor Manufacturing Co.",
    "confidenceScore": 72,
    "whyStockMoved": "Sector-sympathy pullback + institutional distribution",
    "catalystSummary": "Positive news sentiment and strong semiconductor sector performance, but low volume confirms hesitation",
    "volumeSummary": "Volume below average — not confirming a strong continuation move",
    "trendSummary": "Bullish long-term structure but short-term bearish pressure with institutional distribution",
    "supportLevels": [410.12, 415.11],
    "resistanceLevels": [425.05, 432.34],
    "entryZone": "$399.70 - $410.12",
    "stopLoss": "$399.70 (Below key support)",
    "targets": [425.05, 432.34],
    "shortTradeView": "Squeeze Risk: MEDIUM. High P/E (35.81) + institutional distribution.",
    "riskWarnings": "High valuation; Near-term pullback risk; Low volume",
    "finalVerdict": "Wait for breakout above $425 or confirmed re-entry near support before taking new position.",
    "riskWarning": "High valuation + institutional distribution signal profit-taking risk",
    "keyLevel": "$425 Resistance",
    "executiveSummary": "TSM pulling back despite bullish setup. Wait for confirmation before entering."
}


# ─── Step 1: Clone voice from sample ─────────────────────────────────────────
def clone_voice() -> str:
    """
    Use ElevenLabs Instant Voice Cloning to create a voice from voicesample.mp3.
    Returns the new voice_id. Caches it in .env ELEVENLABS_VOICE_ID.
    """
    global ELEVENLABS_VOICE_ID

    # Return cached ID if already cloned
    if ELEVENLABS_VOICE_ID:
        print(f"[VOICE] Using existing cloned voice ID: {ELEVENLABS_VOICE_ID}")
        return ELEVENLABS_VOICE_ID

    if not VOICE_SAMPLE.exists():
        # Try Downloads as fallback
        fallback = Path(r"C:\Users\haris\Downloads\voicesample.mp3")
        if fallback.exists():
            shutil.copy2(fallback, VOICE_SAMPLE)
            print(f"[VOICE] Copied voice sample from Downloads to public folder")
        else:
            raise FileNotFoundError(f"Voice sample not found at {VOICE_SAMPLE}")

    print(f"[VOICE] Cloning voice from: {VOICE_SAMPLE}")
    print(f"[VOICE] Sample size: {VOICE_SAMPLE.stat().st_size // 1024} KB")

    url = f"{ELEVENLABS_BASE}/voices/add"
    
    with open(VOICE_SAMPLE, "rb") as audio_file:
        response = requests.post(
            url,
            headers={"xi-api-key": ELEVENLABS_API_KEY},
            data={
                "name": "InvestingAtti Presenter",
                "description": "InvestingAtti finance video presenter voice — cloned from sample"
            },
            files={"files": ("voicesample.mp3", audio_file, "audio/mpeg")}
        )

    if response.status_code not in (200, 201):
        raise Exception(
            f"ElevenLabs voice cloning failed ({response.status_code}): {response.text}"
        )

    voice_data = response.json()
    voice_id = voice_data.get("voice_id", "")
    
    if not voice_id:
        raise Exception(f"No voice_id returned: {voice_data}")

    print(f"[VOICE] Voice cloned successfully! voice_id = {voice_id}")

    # Persist voice ID to .env so we don't re-clone next time
    env_file = REPO_ROOT / ".env"
    env_text = env_file.read_text(encoding="utf-8")
    env_text = env_text.replace("ELEVENLABS_VOICE_ID=", f"ELEVENLABS_VOICE_ID={voice_id}")
    env_file.write_text(env_text, encoding="utf-8")
    print(f"[VOICE] Voice ID saved to .env")

    ELEVENLABS_VOICE_ID = voice_id
    return voice_id


# ─── Step 2: Generate narration with cloned voice ─────────────────────────────
def generate_audio_elevenlabs(voice_id: str) -> Path:
    """
    Generate the TSM narration using ElevenLabs TTS with the cloned voice.
    Uses multilingual_v2 model for best quality.
    """
    studio_audio = OUTPUT_DIR / "studio-narration-cloned.mp3"

    print(f"[TTS] Generating narration with ElevenLabs cloned voice...")
    print(f"[TTS] Voice ID: {voice_id}")

    url = f"{ELEVENLABS_BASE}/text-to-speech/{voice_id}"

    payload = {
        "text": NARRATION,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.45,            # Slightly lower = more natural variation
            "similarity_boost": 0.82,     # High similarity to cloned voice
            "style": 0.25,                # Some expressiveness for finance delivery
            "use_speaker_boost": True
        }
    }

    response = requests.post(
        url,
        headers={
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
        },
        json=payload,
        stream=True
    )

    if response.status_code != 200:
        raise Exception(
            f"ElevenLabs TTS failed ({response.status_code}): {response.text[:500]}"
        )

    with open(studio_audio, "wb") as f:
        for chunk in response.iter_content(chunk_size=4096):
            if chunk:
                f.write(chunk)

    size_kb = studio_audio.stat().st_size // 1024
    print(f"[TTS] Narration saved: {studio_audio} ({size_kb} KB)")
    return studio_audio


# ─── Step 3: Copy audio to Remotion public ────────────────────────────────────
def copy_audio_to_public(audio_path: Path) -> str:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    dest = PUBLIC_DIR / "studio-narration.mp3"
    shutil.copy2(audio_path, dest)
    print(f"[COPY] Audio copied to Remotion public: {dest}")
    return "studio-narration.mp3"


# ─── Step 4: Render Remotion StockReportStudio ───────────────────────────────
def render_studio_video(audio_filename: str) -> str:
    output_mp4 = OUTPUT_DIR / "studio-final-video.mp4"
    output_mp4.parent.mkdir(parents=True, exist_ok=True)

    props = {
        "ticker":         "TSM",
        "companyName":    "Taiwan Semiconductor Manufacturing Co.",
        "reportDate":     "2026-06-05",
        "currentPrice":   419.17,
        "dayChangePct":   -5.75,
        "overallSignal":  "WAIT",
        "audioUrl":       audio_filename,
        "scenes":         SCENES,
        "normalizedData": NORMALIZED_DATA
    }

    props_file = REMOTION_DIR / "tmp-studio-props.json"
    props_file.write_text(json.dumps(props, indent=2), encoding="utf-8")

    env = os.environ.copy()
    node_path = r"C:\Program Files\nodejs"
    if sys.platform == "win32" and node_path not in env.get("PATH", ""):
        env["PATH"] = f"{node_path};{env.get('PATH', '')}"

    cmd = [
        "npx", "remotion", "render",
        "index.ts",
        "StockReportStudio",
        str(output_mp4),
        f"--props={props_file.name}",
        "--overwrite",
        "--log=verbose",
    ]

    print(f"\n[RENDER] Starting Remotion render...")
    print(f"  Composition : StockReportStudio")
    print(f"  Audio       : {audio_filename}")
    print(f"  Output      : {output_mp4}\n")

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

    try:
        props_file.unlink()
    except Exception:
        pass

    if result.returncode != 0:
        print(f"\n[FAIL] Render failed (exit {result.returncode})")
        print(f"  Log: {log_file}")
        print(f"  Stderr: {result.stderr[-800:]}")
        sys.exit(1)

    size_mb = output_mp4.stat().st_size / (1024 * 1024)
    print(f"\n[SUCCESS] Studio video rendered!")
    print(f"  File : {output_mp4}")
    print(f"  Size : {size_mb:.1f} MB")
    return str(output_mp4)


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("=" * 62)
    print("  InvestingAtti Studio Video — ElevenLabs Voice Clone")
    print("  Ticker: TSM  |  Style: Avatar Studio  |  Voice: Cloned")
    print("=" * 62)
    print()

    if not ELEVENLABS_API_KEY:
        print("[ERROR] No ElevenLabs API key found in .env (TTS_API_KEY)")
        sys.exit(1)

    # Ensure avatar is in public folder
    avatar_dst = PUBLIC_DIR / "investingatti-avatar.png"
    if not avatar_dst.exists():
        gen_avatar = Path(r"C:\Users\haris\.gemini\antigravity-ide\brain\03a5438f-20df-4e76-af96-71e426c1a5f7\investingatti_avatar_1780681573646.png")
        if gen_avatar.exists():
            shutil.copy2(gen_avatar, avatar_dst)
            print(f"[ASSET] Avatar copied to public folder")
    else:
        print(f"[ASSET] Avatar already in public folder")

    # 1. Clone voice (or reuse existing clone)
    voice_id = clone_voice()

    # 2. Generate narration with cloned voice
    audio_path = generate_audio_elevenlabs(voice_id)

    # 3. Copy to Remotion public
    audio_filename = copy_audio_to_public(audio_path)

    # 4. Render
    render_studio_video(audio_filename)


if __name__ == "__main__":
    main()
