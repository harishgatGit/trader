import os
from pathlib import Path
from typing import Dict, Any
from openai import OpenAI
from app.config import OPENAI_API_KEY, OPENAI_MODEL

class VideoStoryAgent:
    """
    Generates narration scripts for stock videos.

    SHORTS format (default): 12 ultra-short punchy lines, ≤220 words total.
    Each line = one scene (~6-8 seconds). Written for YouTube Shorts energy:
    fast, vivid, hook-driven, no jargon.

    LONG_FORM format (future): Reserved. Will use a separate detailed prompt.
    """

    def __init__(self):
        if OPENAI_API_KEY:
            self.client = OpenAI(api_key=OPENAI_API_KEY)
        else:
            self.client = None

    def _get_prompt_template(self, filename: str, fallback: str) -> str:
        try:
            dir_path = Path(__file__).parent / "prompts"
            file_path = dir_path / filename
            if file_path.exists():
                return file_path.read_text(encoding="utf-8")
            return fallback
        except Exception as e:
            print(f"[VideoStoryAgent] Error reading prompt template {filename}: {e}")
            return fallback

    def generate(self, normalized_json: Dict[str, Any], output_path: Path,
                 video_format: str = "SHORTS") -> str:
        """
        Generates the narration script and saves it to narration-script.txt.
        video_format: "SHORTS" (default) or "LONG_FORM" (future).
        """
        if video_format == "LONG_FORM":
            return self._generate_long_form(normalized_json, output_path)
        return self._generate_shorts(normalized_json, output_path)

    # ─── SHORTS ──────────────────────────────────────────────────────────────

    def _generate_shorts(self, normalized_json: Dict[str, Any], output_path: Path) -> str:
        ticker        = normalized_json.get("ticker", "this stock")
        company_name  = normalized_json.get("companyName", ticker)
        price         = normalized_json.get("currentPrice", "N/A")
        day_change    = normalized_json.get("dayChangePct", "N/A")
        overall_signal= normalized_json.get("overallSignal", "HOLD")
        why_moved     = normalized_json.get("whyStockMoved", "general market movement")
        catalyst      = normalized_json.get("catalystSummary", "N/A")
        entry         = normalized_json.get("entryZone", "N/A")
        stop          = normalized_json.get("stopLoss", "N/A")
        targets       = normalized_json.get("targets", [])
        risk_warnings = normalized_json.get("riskWarnings", "standard market risk")
        verdict       = normalized_json.get("finalVerdict", "Watch and confirm")
        exec_summary  = normalized_json.get("executiveSummary", "N/A")
        support_levels= normalized_json.get("supportLevels", [])
        resistance_levels = normalized_json.get("resistanceLevels", [])

        target_str    = ", ".join([f"${t}" for t in targets]) if targets else "N/A"
        support_str   = ", ".join([f"${s}" for s in support_levels]) if support_levels else "N/A"
        resistance_str= ", ".join([f"${r}" for r in resistance_levels]) if resistance_levels else "N/A"

        prompt = f"""You are a YouTube Shorts scriptwriter for InvestingAtti — an AI stock analysis platform.

Write EXACTLY 11 lines of narration for a YouTube Short about {ticker} ({company_name}).
Each line = one scene. Each line must be 15-22 words max — punchy, vivid, no jargon.
Total script must be under 220 words.

RULES (CRISP Framework):
- Line 1: HOOK — Grab attention in 1 sentence. Make it a burning question or shocking fact.
- Line 2: COMPANY SNAPSHOT — Simple, high-impact one-sentence profile of the company.
- Line 3: CURRENT MARKET ACTION — State the current price of ${price} and day change of {day_change}% in one vivid line.
- Line 4: TREND ANALYSIS — Explain the overall price trend direction or EMA levels.
- Line 5: MOMENTUM INDICATORS — Describe the current momentum (e.g., RSI or MACD) status.
- Line 6: SUPPORT & RESISTANCE — Highlight key support ({support_str}) and resistance ({resistance_str}) levels.
- Line 7: ENTRY ZONE — Describe the safer entry zone of {entry}.
- Line 8: RISK ANALYSIS — State the stop loss level ({stop}) and core risk warnings.
- Line 9: UPSIDE POTENTIAL — Detail the upside targets ({target_str}).
- Line 10: AI INSIGHTS — State the AI signal ({overall_signal}) and executive summary.
- Line 11: RECOMMENDATION & CTA — Final investment verdict and call-to-action: "Get the full report at InvestingAtti.com!"

FINANCIAL SAFETY: Never say "buy now", "guaranteed profit", or "will go up".
Use "if confirmed", "watch zone", "risk increases if", "may offer".

Stock data:
- Ticker: {ticker} ({company_name})
- Price: ${price} | Day change: {day_change}%
- Signal: {overall_signal}
- Why moved: {why_moved}
- Catalyst: {catalyst}
- Support: {support_str} | Resistance: {resistance_str}
- Entry zone: {entry}
- Stop loss: {stop}
- Targets: {target_str}
- Risk: {risk_warnings}
- Verdict: {verdict}
- Summary: {exec_summary}

Output ONLY the 11 lines, each on its own line. No numbering, no titles, no markdown."""

        script_text = ""
        if self.client:
            try:
                print(f"[VideoStoryAgent] Generating SHORTS script for {ticker}...")
                system_prompt = (
                    "You are an energetic YouTube Shorts scriptwriter for a financial platform. "
                    "You write exactly 11 lines — each under 22 words — punchy, vivid, hook-driven. "
                    "Never give direct buy/sell advice. Always conditional language. Output raw lines only."
                )
                response = self.client.chat.completions.create(
                    model=OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.8,
                    max_tokens=600
                )
                script_text = response.choices[0].message.content.strip()
                print(f"[VideoStoryAgent] SHORTS script generated ({len(script_text.split())} words)")
            except Exception as e:
                print(f"[VideoStoryAgent] OpenAI error: {e}. Using fallback.")
                script_text = self._fallback_shorts_script(normalized_json)
        else:
            script_text = self._fallback_shorts_script(normalized_json)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(script_text)
        return script_text

    def _fallback_shorts_script(self, data: Dict[str, Any]) -> str:
        ticker   = data.get("ticker", "this stock")
        company  = data.get("companyName", ticker)
        price    = data.get("currentPrice", "N/A")
        change   = data.get("dayChangePct", "N/A")
        signal   = data.get("overallSignal", "HOLD")
        why      = data.get("whyStockMoved", "market momentum")
        catalyst = data.get("catalystSummary", "N/A")
        entry    = data.get("entryZone", "N/A")
        stop     = data.get("stopLoss", "N/A")
        targets  = data.get("targets", [])
        risk     = data.get("riskWarnings", "standard market risk")
        verdict  = data.get("finalVerdict", "Watch and confirm")
        support  = data.get("supportLevels", [])
        resistance = data.get("resistanceLevels", [])

        target_str = f"${targets[0]}" if targets else "N/A"
        support_str = f"${support[0]}" if support else "N/A"
        resistance_str = f"${resistance[0]}" if resistance else "N/A"

        signal_upper = signal.upper()
        zone = "Buy Watch Zone" if "BUY" in signal_upper or "BULL" in signal_upper else \
               "Risk Zone" if "SELL" in signal_upper or "BEAR" in signal_upper else "Wait Zone"

        lines = [
            f"Is {ticker} about to break out — or is this the classic trap? Here's what the AI says.",
            f"{company} is a leading player in its space, building next-generation technology.",
            f"The stock is trading at ${price}, up {change}% today following recent momentum.",
            f"The overall trend remains {signal_upper} as price holds near key moving averages.",
            f"Momentum indicators show RSI is holding neutral while MACD prepares a cross signal.",
            f"Key support rests near {support_str} with minor resistance overhead at {resistance_str}.",
            f"If price settles near {entry}, that may offer the safest entry zone.",
            f"Risk management is clear: a stop loss below {stop} invalidates the current setup.",
            f"Upside targets sit near {target_str} if buyers resume control.",
            f"AI signal is {signal} — indicating support holds but warnings remain on {risk}.",
            f"Final take: {verdict}. Get the full analysis and report at InvestingAtti.com!"
        ]
        return "\n".join(lines)

    # ─── LONG_FORM (reserved) ─────────────────────────────────────────────────

    def _generate_long_form(self, normalized_json: Dict[str, Any], output_path: Path) -> str:
        """
        Placeholder for future long-form (8-15 min) video narration generation.
        Uses the original 7-section walkthrough format with extended detail.
        Falls back to original fallback script for now.
        """
        print("[VideoStoryAgent] LONG_FORM format requested — using extended walkthrough script.")
        script_text = self._fallback_long_form_script(normalized_json)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(script_text)
        return script_text

    def _fallback_long_form_script(self, data: Dict[str, Any]) -> str:
        ticker   = data.get("ticker", "Unavailable")
        company  = data.get("companyName", ticker)
        price    = data.get("currentPrice", "N/A")
        signal   = data.get("overallSignal", "HOLD")
        why      = data.get("whyStockMoved", "general market movement")
        entry    = data.get("entryZone", "N/A")
        stop     = data.get("stopLoss", "N/A")
        targets  = data.get("targets", [])
        target_str = ", ".join([f"${t}" for t in targets]) if targets else "N/A"
        verdict  = data.get("finalVerdict", "Watch and confirm")
        support  = data.get("supportLevels", [])
        resistance = data.get("resistanceLevels", [])
        risk     = data.get("riskWarnings", "standard market risk")
        support_str = ", ".join([f"${s}" for s in support]) if support else "nearby support"
        resistance_str = ", ".join([f"${r}" for r in resistance]) if resistance else "overhead resistance"
        signal_upper = signal.upper()
        zone = "Buy Watch Zone" if "BUY" in signal_upper or "BULL" in signal_upper else \
               "Risk Zone" if "SELL" in signal_upper or "BEAR" in signal_upper else "Wait Zone"
        return (
            f"Welcome to the InvestingAtti decision walkthrough for {company}, ticker {ticker}. "
            f"The stock is near a key zone — should you chase this move, or wait for confirmation?\n"
            f"Right now, {ticker} is in a {zone} at ${price}. Signal: {signal}. Let's break it down.\n"
            f"The main driver: {why}. Watch how price reacts to key levels before making any decision.\n"
            f"A safer entry may form near {entry} if {support_str} holds and volume confirms.\n"
            f"For profit booking, watch resistance near {resistance_str}. Targets: {target_str}.\n"
            f"Risk factors include {risk}. Stop loss area: {stop}.\n"
            f"Verdict: {verdict}. Use this as research support, not financial advice. "
            f"Visit investingatti.com for the full report."
        )
