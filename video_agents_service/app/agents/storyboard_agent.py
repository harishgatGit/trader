import os
import json
import re
from pathlib import Path
from typing import Dict, Any, List
from openai import OpenAI
from app.config import OPENAI_API_KEY, OPENAI_MODEL

# ─── Scene type → Remotion component name mapping ────────────────────────────
SHORTS_SCENE_TYPES = [
    "crisp_hook",             # 1 Hook
    "company_snapshot",       # 2 Company Snapshot
    "market_action",          # 3 Current Market Action
    "trend_analysis",         # 4 Trend Analysis
    "momentum_indicators",     # 5 Momentum Indicators
    "support_resistance",     # 6 Support & Resistance
    "entry_zone",             # 7 Entry Zone
    "risk_analysis",          # 8 Risk Analysis
    "upside_potential",       # 9 Upside Potential
    "ai_insights",            # 10 AI Insights
    "final_recommendation",   # 11 Final Recommendation + Outro
]

# Total duration ~80s
SHORTS_DURATIONS = [6, 7, 7, 7, 8, 8, 8, 7, 7, 7, 8]


class StoryboardAgent:
    """
    Generates storyboards for stock videos.

    SHORTS (default): Exactly 11 scenes, 6-8 seconds each, ≤90s total.
    Each scene maps to a dedicated animated Remotion component.
    """

    def __init__(self):
        if OPENAI_API_KEY:
            self.client = OpenAI(api_key=OPENAI_API_KEY)
        else:
            self.client = None

    def generate(self, normalized_json: Dict[str, Any], script_text: str,
                 output_path: Path, video_format: str = "SHORTS") -> Dict[str, Any]:
        return self._generate_shorts(normalized_json, script_text, output_path)

    # ─── SHORTS ──────────────────────────────────────────────────────────────

    def _generate_shorts(self, normalized_json: Dict[str, Any], script_text: str,
                          output_path: Path) -> Dict[str, Any]:
        ticker        = normalized_json.get("ticker", "STOCK")
        company_name  = normalized_json.get("companyName", ticker)
        price         = normalized_json.get("currentPrice", "N/A")
        day_change    = normalized_json.get("dayChangePct", 0)
        signal        = normalized_json.get("overallSignal", "HOLD")
        entry         = normalized_json.get("entryZone", "N/A")
        stop          = normalized_json.get("stopLoss", "N/A")
        targets       = normalized_json.get("targets", [])
        support       = normalized_json.get("supportLevels", [])
        resistance    = normalized_json.get("resistanceLevels", [])
        risk          = normalized_json.get("riskWarnings", "N/A")
        catalyst      = normalized_json.get("catalystSummary", "N/A")
        why_moved     = normalized_json.get("whyStockMoved", "N/A")
        verdict       = normalized_json.get("finalVerdict", "Watch and confirm")
        exec_summary  = normalized_json.get("executiveSummary", "N/A")
        confidence    = normalized_json.get("confidenceScore", 80)

        target_str    = ", ".join([f"${t}" for t in targets]) if targets else "N/A"
        support_str   = f"${support[0]}" if support else "N/A"
        resistance_str= f"${resistance[0]}" if resistance else "N/A"

        signal_upper = signal.upper()
        is_bullish   = "BUY" in signal_upper or "BULL" in signal_upper
        is_bearish   = "SELL" in signal_upper or "BEAR" in signal_upper
        signal_color = "green" if is_bullish else "red" if is_bearish else "yellow"

        # Split script into 11 lines
        lines = [l.strip() for l in script_text.split('\n') if l.strip()]
        while len(lines) < 11:
            lines.append("Visit InvestingAtti.com for the full analysis and AI research report.")

        # Try AI-enhanced storyboard generation
        storyboard = None
        if self.client:
            try:
                storyboard = self._ai_enhance_storyboard(
                    ticker, company_name, price, day_change, signal, signal_color,
                    entry, stop, targets, support, resistance, risk, catalyst,
                    why_moved, verdict, confidence, lines
                )
            except Exception as e:
                print(f"[StoryboardAgent] AI enhance failed: {e}. Using deterministic storyboard.")

        if not storyboard:
            storyboard = self._build_deterministic_storyboard(
                ticker, company_name, price, day_change, signal, signal_color,
                entry, stop, targets, support_str, resistance_str, risk, catalyst,
                why_moved, verdict, confidence, lines
            )

        result = {
            "ticker": ticker,
            "companyName": company_name,
            "videoTitle": f"{ticker} Stock Analysis — {signal} Signal",
            "videoFormat": "SHORTS",
            "layout": "vertical_9_16",
            "durationSeconds": sum(s["durationSeconds"] for s in storyboard),
            "narrationScript": script_text,
            "storyboard": storyboard,
            "scenes": storyboard,  # alias for backward compat
            "designStyle": {
                "theme": "dark InvestingAtti fintech",
                "layout": "vertical_9_16",
                "fps": 30,
                "resolution": "720x1280",
                "colorPalette": {
                    "background": "#090d16",
                    "surface": "#111827",
                    "teal": "#14b8a6",
                    "green": "#10b981",
                    "red": "#ef4444",
                    "yellow": "#f59e0b",
                    "text": "#f8fafc",
                    "muted": "#64748b"
                }
            }
        }

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2)
        print(f"[StoryboardAgent] SHORTS storyboard saved ({len(storyboard)} scenes, "
              f"{result['durationSeconds']:.1f}s total)")
        return result

    def _build_deterministic_storyboard(
        self, ticker, company_name, price, day_change, signal, signal_color,
        entry, stop, targets, support_str, resistance_str, risk, catalyst,
        why_moved, verdict, confidence, lines
    ) -> List[Dict[str, Any]]:
        """Builds the 11-scene storyboard deterministically — no AI call needed."""

        target_str = ", ".join([f"${t}" for t in targets]) if isinstance(targets, list) else str(targets)
        is_bullish = "BUY" in signal.upper() or "BULL" in signal.upper()
        is_bearish = "SELL" in signal.upper() or "BEAR" in signal.upper()

        change_num = float(day_change) if day_change not in ("N/A", None) else 0
        change_sign = "+" if change_num >= 0 else ""
        change_color = "green" if change_num >= 0 else "red"

        scenes = [
            # 1 ─ Hook
            {
                "sceneNumber": 1, "sceneType": "crisp_hook",
                "sceneName": "Hook", "durationSeconds": SHORTS_DURATIONS[0],
                "narration": lines[0],
                "textOverlay": f"{ticker} CRITICAL LEVEL",
                "subText": "SHOULD YOU BUY?",
                "decisionColor": signal_color,
                "dataFields": {
                    "ticker": ticker, "companyName": company_name,
                    "hookQuestion": lines[0], "signal": signal,
                    "decisionColor": signal_color,
                    "badge": "DAILY AI ANALYSIS"
                }
            },
            # 2 ─ Company Snapshot
            {
                "sceneNumber": 2, "sceneType": "company_snapshot",
                "sceneName": "Snapshot", "durationSeconds": SHORTS_DURATIONS[1],
                "narration": lines[1],
                "textOverlay": company_name,
                "subText": "STABILITY PROFILE ACTIVE",
                "decisionColor": "yellow",
                "dataFields": {
                    "ticker": ticker, "companyName": company_name,
                    "description": lines[1][:100], "decisionColor": "yellow"
                }
            },
            # 3 ─ Current Market Action
            {
                "sceneNumber": 3, "sceneType": "market_action",
                "sceneName": "Market Action", "durationSeconds": SHORTS_DURATIONS[2],
                "narration": lines[2],
                "textOverlay": f"${price}",
                "subText": f"{change_sign}{day_change}% today",
                "decisionColor": change_color,
                "dataFields": {
                    "price": price, "dayChangePct": day_change,
                    "changeSign": change_sign, "changeColor": change_color,
                    "decisionColor": change_color
                }
            },
            # 4 ─ Trend Analysis
            {
                "sceneNumber": 4, "sceneType": "trend_analysis",
                "sceneName": "Trend Analysis", "durationSeconds": SHORTS_DURATIONS[3],
                "narration": lines[3],
                "textOverlay": "EMA TREND ALIGNED",
                "subText": "MOMENTUM CONFIRMED",
                "decisionColor": signal_color,
                "dataFields": {
                    "trend": "bullish" if is_bullish else "bearish" if is_bearish else "neutral",
                    "decisionColor": signal_color
                }
            },
            # 5 ─ Momentum Indicators
            {
                "sceneNumber": 5, "sceneType": "momentum_indicators",
                "sceneName": "Momentum", "durationSeconds": SHORTS_DURATIONS[4],
                "narration": lines[4],
                "textOverlay": "RSI STABLE",
                "subText": "MACD BULLISH CROSS",
                "decisionColor": signal_color,
                "dataFields": {
                    "rsi": 55, "macd": "bullish" if is_bullish else "bearish" if is_bearish else "neutral",
                    "decisionColor": signal_color
                }
            },
            # 6 ─ Support & Resistance
            {
                "sceneNumber": 6, "sceneType": "support_resistance",
                "sceneName": "Levels", "durationSeconds": SHORTS_DURATIONS[5],
                "narration": lines[5],
                "textOverlay": f"RESISTANCE: {resistance_str}",
                "subText": f"SUPPORT: {support_str}",
                "decisionColor": "yellow",
                "dataFields": {
                    "support": support_str, "resistance": resistance_str,
                    "decisionColor": "yellow"
                }
            },
            # 7 ─ Entry Zone
            {
                "sceneNumber": 7, "sceneType": "entry_zone",
                "sceneName": "Entry Zone", "durationSeconds": SHORTS_DURATIONS[6],
                "narration": lines[6],
                "textOverlay": f"BUY ZONE: {entry}",
                "subText": f"STOP LOSS: {stop}",
                "decisionColor": "green" if is_bullish else "yellow",
                "dataFields": {
                    "entryZone": entry, "stopLoss": stop,
                    "decisionColor": "green" if is_bullish else "yellow"
                }
            },
            # 8 ─ Risk Analysis
            {
                "sceneNumber": 8, "sceneType": "risk_analysis",
                "sceneName": "Risk Analysis", "durationSeconds": SHORTS_DURATIONS[7],
                "narration": lines[7],
                "textOverlay": "RISK LEVEL: MEDIUM",
                "subText": risk[:60] if risk != "N/A" else "Standard market risk",
                "decisionColor": "red",
                "dataFields": {
                    "risk": risk, "stopLoss": stop, "decisionColor": "red"
                }
            },
            # 9 ─ Upside Potential
            {
                "sceneNumber": 9, "sceneType": "upside_potential",
                "sceneName": "Upside Potential", "durationSeconds": SHORTS_DURATIONS[8],
                "narration": lines[8],
                "textOverlay": f"TARGET: {target_str}",
                "subText": "MAX POTENTIAL UPSIDE",
                "decisionColor": "green",
                "dataFields": {
                    "targets": targets, "targetStr": target_str, "decisionColor": "green"
                }
            },
            # 10 ─ AI Insights
            {
                "sceneNumber": 10, "sceneType": "ai_insights",
                "sceneName": "AI Insights", "durationSeconds": SHORTS_DURATIONS[9],
                "narration": lines[9],
                "textOverlay": f"AI RATING: {signal}",
                "subText": f"CONFIDENCE: {confidence}%",
                "decisionColor": signal_color,
                "dataFields": {
                    "signal": signal, "confidence": confidence, "decisionColor": signal_color
                }
            },
            # 11 ─ Final Recommendation & Outro
            {
                "sceneNumber": 11, "sceneType": "final_recommendation",
                "sceneName": "Recommendation", "durationSeconds": SHORTS_DURATIONS[10],
                "narration": lines[10],
                "textOverlay": f"VERDICT: {signal}",
                "subText": "GET FULL AT INVESTINGATTI.COM",
                "decisionColor": signal_color,
                "dataFields": {
                    "verdict": verdict, "signal": signal,
                    "websiteUrl": "www.investingatti.com",
                    "disclaimer": "Not financial advice. Educational insights only.",
                    "decisionColor": signal_color
                }
            },
        ]
        return scenes

    def _ai_enhance_storyboard(
        self, ticker, company_name, price, day_change, signal, signal_color,
        entry, stop, targets, support, resistance, risk, catalyst,
        why_moved, verdict, confidence, lines
    ) -> List[Dict[str, Any]]:
        """
        Calls OpenAI to generate richer textOverlay / subText per scene.
        """
        target_str = ", ".join([f"${t}" for t in targets]) if targets else "N/A"
        support_str = f"${support[0]}" if support else "N/A"
        resistance_str = f"${resistance[0]}" if resistance else "N/A"

        prompt = f"""You are a YouTube Shorts video text editor for InvestingAtti.

Given stock data, write the textOverlay (main big text) and subText (smaller detail text) for exactly 11 scenes.
Keep each textOverlay under 6 words. Keep each subText under 12 words. Make them punchy and vivid.

Stock: {ticker} ({company_name})
Price: ${price} | Change: {day_change}% | Signal: {signal}
Why moved: {why_moved[:100]}
Catalyst: {catalyst[:100]}
Entry: {entry} | Stop: {stop} | Targets: {target_str}
Support: {support_str} | Resistance: {resistance_str}
Risk: {risk[:100]}
Verdict: {verdict[:100]}

Output JSON array with exactly 11 objects:
[
  {{"sceneNumber": 1, "textOverlay": "...", "subText": "..."}},
  ...
  {{"sceneNumber": 11, "textOverlay": "VERDICT: ...", "subText": "WWW.INVESTINGATTI.COM"}}
]
Output ONLY the JSON array, no markdown."""

        response = self.client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You write punchy YouTube Shorts text overlays under 6 words. Output only valid JSON arrays."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
            max_tokens=800
        )

        raw = json.loads(response.choices[0].message.content.strip())
        ai_scenes = raw if isinstance(raw, list) else next(
            (v for v in raw.values() if isinstance(v, list)), []
        )

        if len(ai_scenes) != 11:
            raise ValueError(f"AI returned {len(ai_scenes)} scenes, expected 11")

        base = self._build_deterministic_storyboard(
            ticker, company_name, price, day_change, signal, signal_color,
            entry, stop, targets, support_str, resistance_str, risk, catalyst,
            why_moved, verdict, confidence, lines
        )

        for i, ai_scene in enumerate(ai_scenes):
            if i < len(base):
                base[i]["textOverlay"] = ai_scene.get("textOverlay", base[i]["textOverlay"])
                base[i]["subText"] = ai_scene.get("subText", base[i]["subText"])

        return base
