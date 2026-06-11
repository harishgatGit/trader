import os
from pathlib import Path
from typing import Dict, Any
from openai import OpenAI
from app.config import OPENAI_API_KEY, OPENAI_MODEL

class VideoStoryAgent:
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

    def generate(self, normalized_json: Dict[str, Any], output_path: Path) -> str:
        """
        Creates a layman-friendly narration script for a 45-60 second stock video story.
        Saves the script to narration-script.txt.
        """
        ticker = normalized_json.get("ticker", "Unavailable")
        company_name = normalized_json.get("companyName", ticker)
        overall_signal = normalized_json.get("overallSignal", "Unavailable")
        current_price = normalized_json.get("currentPrice", "Unavailable")
        why_moved = normalized_json.get("whyStockMoved", "Unavailable")
        catalyst = normalized_json.get("catalystSummary", "Unavailable")
        volume = normalized_json.get("volumeSummary", "Unavailable")
        trend = normalized_json.get("trendSummary", "Unavailable")
        entry = normalized_json.get("entryZone", "Unavailable")
        stop = normalized_json.get("stopLoss", "Unavailable")
        targets = normalized_json.get("targets", [])
        short_view = normalized_json.get("shortTradeView", "Unavailable")
        verdict = normalized_json.get("finalVerdict", "Unavailable")
        exec_summary = normalized_json.get("executiveSummary", "Unavailable")

        target_str = ", ".join([f"${t}" for t in targets]) if targets else "Unavailable"

        user_fallback = f"""
You are the lead narrative scriptwriter for InvestingAtti, a platform that explains complex stock setups to retail traders in simple terms.
Write a narrative voiceover script for an animated short video about the stock {ticker} ({company_name}) as a professional financial analyst.

Narrator Personality:
- Professional, clear, engaging, beginner-friendly.
- Speaks with authority but explains complex metrics simply.
- No hype, no guaranteed-profit language.

Here is the completed daily stock analysis report data:
- Ticker: {ticker} ({company_name})
- Current Price: ${current_price}
- Executive Summary / Key Findings: {exec_summary}
- Signal: {overall_signal}
- Why it moved: {why_moved}
- Catalysts: {catalyst}
- Volume: {volume}
- Trend: {trend}
- Swing Entry Zone: {entry}
- Stop Loss: {stop}
- Targets: {target_str}
- Short Selling View: {short_view}
- Final Verdict: {verdict}

CRITICAL RULES:
1. The script must be exactly 10 detailed paragraphs (one paragraph per scene, in exact order, separated by a single newline). Each paragraph should contain 2-3 sentences, walking the viewer through the charts, graphs, and indicators shown on the screen.
   Scene 1: Stock Overview (Start directly with a professional analyst greeting, introducing the ticker, name, rating, and confidence, with a catchy hook. Do NOT use any informal or mascot language, and NEVER mention any panda mascot or "Atti Panda").
   Scene 2: Current Price and Price Action (Current price, intraday trend, and daily percentage move)
   Scene 3: Current Trend and Reason for Trend (Trend direction and main driver/reason)
   Scene 4: Evidence Behind the Trend (The source/strength of news, volume confirmation, or key levels)
   Scene 5: Daily Trend chart story (Support, resistance, and zone type like consolidation or breakout)
   Scene 6: Technical Metrics (Briefly explain RSI, MACD, or Moving Average bias)
   Scene 7: Tactical Trader Setup (Entry zone, stop loss, and target levels)
   Scene 8: Short Trade View (Cautionary view on shorting, breakdown level, or short squeeze risk)
   Scene 9: Ecosystem Insight (How sector, market, or peers support/weaken the setup)
   Scene 10: Final Verdict and Risk Warning (Final rating action, key level to watch, main risk, and disclaimer)

2. GREETING & HOOK RULE: Start the script directly with a professional analyst greeting and a catchy hook, for example: "Welcome to the Investing Atti stock analysis for TSM. With the stock pulling back sharply today, is this a golden buying opportunity or a warning sign?"
   NEVER use generic, informal, or mascot-based greetings like "Hello investors", "Hello traders", "Welcome back", "It's/I'm Atti Panda here", or mention any panda mascot. Keep it strictly professional, direct, and focused on the stock.
3. The voiceover script should feel like a direct, interactive stock research walkthrough.
4. Keep the narration script concise and avoid repeating information across different scenes (e.g. do not repeat the price or rating multiple times).
5. The total narration script should be around 250 to 300 words to ensure it fits comfortably in the video duration constraints and keeps the viewer engaged.
6. Output ONLY the raw script text. Do not include scene numbers, titles, or bracketed instructions. Only the 10 spoken paragraphs, separated by a single newline.
"""

        user_template = self._get_prompt_template("video-story.user.md", None)
        if user_template:
            prompt = user_template.format(
                ticker=ticker,
                company_name=company_name,
                current_price=current_price,
                exec_summary=exec_summary,
                overall_signal=overall_signal,
                why_moved=why_moved,
                catalyst=catalyst,
                volume=volume,
                trend=trend,
                entry=entry,
                stop=stop,
                target_str=target_str,
                short_view=short_view,
                verdict=verdict
            )
        else:
            prompt = user_fallback

        script_text = ""
        
        if self.client:
            try:
                print(f"[VideoStoryAgent] Prompting OpenAI model={OPENAI_MODEL}...")
                
                system_fallback = (
                    "You are a professional financial analyst and video scriptwriter for Investing Atti. "
                    "You write direct, institutional-grade walkthroughs. You NEVER speak as a mascot or a character (like 'Atti Panda' or 'Panda'). "
                    "You start scripts directly with the ticker analysis and a professional, high-impact hook."
                )
                system_prompt = self._get_prompt_template("video-story.system.md", system_fallback)

                response = self.client.chat.completions.create(
                    model=OPENAI_MODEL,
                    messages=[
                        {
                            "role": "system", 
                            "content": system_prompt
                        },
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=1200
                )
                script_text = response.choices[0].message.content.strip()
                print(f"[VideoStoryAgent] Generated Script:\n{script_text}\n---")
            except Exception as e:
                print(f"[VideoStoryAgent] Error calling OpenAI: {e}")
                # If OpenAI fails, use a fallback local script generator
                script_text = self._fallback_script(normalized_json)
        else:
            script_text = self._fallback_script(normalized_json)

        # Write to file
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(script_text)

        return script_text

    def _fallback_script(self, data: Dict[str, Any]) -> str:
        ticker = data.get("ticker", "Unavailable")
        company_name = data.get("companyName", ticker)
        price = data.get("currentPrice", "N/A")
        why_moved = data.get("whyStockMoved", "general market movement")
        signal = data.get("overallSignal", "HOLD")
        entry = data.get("entryZone", "N/A")
        stop = data.get("stopLoss", "N/A")
        targets = data.get("targets", [])
        target_str = ", ".join([f"${t}" for t in targets]) if targets else "N/A"
        verdict = data.get("finalVerdict", "Unavailable")
        day_change = data.get("dayChangePct", "N/A")

        return (
            f"Welcome to the Investing Atti stock briefing. Analyzing {company_name}, ticker {ticker}, showing a {signal} rating setup.\n"
            f"The stock is trading around ${price}, following a daily move of {day_change}%.\n"
            f"The main catalyst behind today's movement is {why_moved}.\n"
            f"Our report analyzes news, volume, and sector flows, indicating supportive evidence.\n"
            f"On the daily chart, we are tracking key support and resistance levels closely.\n"
            f"Key metrics show momentum and buying pressure are adjusting to this recent move.\n"
            f"For tactical swing traders, the possible entry zone is between {entry}, with a stop loss near {stop}.\n"
            f"Short sellers should use extreme caution due to possible short squeeze risks.\n"
            f"Looking at the broader market, the sector and peer group are influencing the setup.\n"
            f"Our final verdict is {verdict}. Keep risk managed, and visit investingatti.com for the full report."
        )
