import os
import json
import re
from pathlib import Path
from typing import Dict, Any
from openai import OpenAI
from app.config import OPENAI_API_KEY, OPENAI_MODEL

class StoryboardAgent:
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
            print(f"[StoryboardAgent] Error reading prompt template {filename}: {e}")
            return fallback

    def generate(self, normalized_json: Dict[str, Any], script_text: str, output_path: Path) -> Dict[str, Any]:
        """
        Generates a 6-8 scene storyboard based on the narration script and report data.
        Returns the storyboard JSON and saves it to storyboard.json.
        """
        ticker = normalized_json.get("ticker", "Unavailable")
        overall_signal = normalized_json.get("overallSignal", "Unavailable")
        price = normalized_json.get("currentPrice", "Unavailable")
        exec_summary = normalized_json.get("executiveSummary", "Unavailable")
        
        user_fallback = f"""
You are the lead visual storyboard designer for InvestingAtti. Your job is to split a 10-line narration script into exactly 10 visual scenes for a vertical video (9:16) with professional layouts, charts, and data cards.

Here is the 10-line Narration Script (each line corresponds to one scene, in order):
"{script_text}"

Here is the stock report data:
- Ticker: {ticker}
- Current Price: ${price}
- Rating: {overall_signal}
- Executive Summary: {exec_summary}
- Entry Zone: {normalized_json.get("entryZone")}
- Stop Loss: {normalized_json.get("stopLoss")}
- Targets: {normalized_json.get("targets")}
- Short Selling: {normalized_json.get("shortTradeView")}
- Catalysts: {normalized_json.get("catalystSummary")}
- Trend: {normalized_json.get("trendSummary")}

Create a JSON storyboard containing exactly 10 scenes in order:
1. "Stock Overview" (Make sure to include a catchy, one-line highlight summarizing the stock's current main situation or question under the key "catchyLine" inside "dataFields", e.g., "TSM Pullback: Buying Opportunity or Value Trap?")
2. "Price Action"
3. "Trend Reason"
4. "Evidence"
5. "Daily Trend"
6. "Technical Metrics"
7. "Tactical Setup"
8. "Short Trade"
9. "Ecosystem Insight"
10. "Final Verdict" (Make sure to include a custom motivational/encouraging trading quote under the key "quote", and a short legal disclaimer under the key "disclaimer" inside "dataFields")

For each scene, output these fields:
- "sceneNumber" (number, 1 to 10)
- "sceneName" (string, the name of the scene)
- "durationSeconds" (number, typically 10 to 18 seconds per scene, total video must be 100-180 seconds)
- "narration" (string, the specific paragraph from the script for this scene)
- "pandaAction" (string, legacy layout control property, choose from: "point", "magnifying", "caution", "drawing", "celebrate", "walk", or "default")
- "speechBubbleText" (string, short key highlight overlay text for the scene)
- "visualElements" (array of strings)
- "chartElements" (array of strings)
- "animationInstructions" (array of strings)
- "dataFields" (object/dictionary of relevant data values for the scene; for scene 1, this MUST include the key "catchyLine"; for scene 10, this MUST include the keys "quote" and "disclaimer")

CRITICAL: Output ONLY a valid JSON object matching the requested schema. No markdown wrappers.
"""
        
        user_template = self._get_prompt_template("storyboard.user.md", None)
        if user_template:
            prompt = user_template.format(
                script_text=script_text,
                ticker=ticker,
                price=price,
                overall_signal=overall_signal,
                exec_summary=exec_summary,
                entry=normalized_json.get("entryZone", "Unavailable"),
                stop=normalized_json.get("stopLoss", "Unavailable"),
                targets=normalized_json.get("targets", "Unavailable"),
                short_view=normalized_json.get("shortTradeView", "Unavailable"),
                catalyst=normalized_json.get("catalystSummary", "Unavailable"),
                trend=normalized_json.get("trendSummary", "Unavailable")
            )
        else:
            prompt = user_fallback

        storyboard_data = None
        if self.client:
            try:
                print(f"[StoryboardAgent] Generating storyboard with OpenAI model={OPENAI_MODEL}...")
                
                system_fallback = (
                    "You are a professional storyboard designer. Output only raw JSON. "
                    "CRITICAL: You must ensure that scene 1's 'dataFields' contains the key 'catchyLine' "
                    "(e.g., 'TSM Pullback: Buying Opportunity or Value Trap?') representing a catchy one-line hook."
                )
                system_prompt = self._get_prompt_template("storyboard.system.md", system_fallback)

                response = self.client.chat.completions.create(
                    model=OPENAI_MODEL,
                    messages=[
                        {
                            "role": "system", 
                            "content": system_prompt
                        },
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.3
                )
                storyboard_data = json.loads(response.choices[0].message.content.strip())
                print(f"[StoryboardAgent] Storyboard generated successfully.")
            except Exception as e:
                print(f"[StoryboardAgent] Error generating storyboard: {e}")
                storyboard_data = self._fallback_storyboard(normalized_json, script_text)
        else:
            storyboard_data = self._fallback_storyboard(normalized_json, script_text)

        # Robust helper to recursively locate the "storyboard" or "scenes" list in the parsed JSON structure
        def find_scenes_recursive(data):
            if isinstance(data, dict):
                for key in ["storyboard", "scenes"]:
                    if key in data and isinstance(data[key], list) and len(data[key]) > 0:
                        return data[key]
                for k, v in data.items():
                    res = find_scenes_recursive(v)
                    if res:
                        return res
            elif isinstance(data, list):
                if len(data) > 0 and isinstance(data[0], dict) and ("sceneNumber" in data[0] or "sceneName" in data[0]):
                    return data
                for item in data:
                    res = find_scenes_recursive(item)
                    if res:
                        return res
            return None

        scenes_list = find_scenes_recursive(storyboard_data)
        
        # If we failed to find any scenes, or if it is empty, fall back to the robust offline generator
        if not scenes_list:
            print("[StoryboardAgent] Failed to find scenes in AI response. Falling back to default storyboard.")
            fallback_res = self._fallback_storyboard(normalized_json, script_text)
            scenes_list = fallback_res.get("storyboard", fallback_res.get("scenes", []))

        # Define dynamic motivational trading quotes based on signal rating
        signal_upper = overall_signal.upper()
        if "BUY" in signal_upper or "BULL" in signal_upper:
            motivation_quote = "Success in trading comes from risk control, not from predicting the future. Let the trend be your guide!"
        elif "SELL" in signal_upper or "BEAR" in signal_upper:
            motivation_quote = "Protecting capital is the first rule of trading. Capital preservation is the key to longevity."
        else:
            motivation_quote = "Patience is also a position. The best trades are the ones you have the discipline to wait for."

        # Post-process scenes list to ensure dataFields is present and populated for scene 10
        for scene in scenes_list:
            scene_num = scene.get("sceneNumber")
            if str(scene_num) == "10" or scene == scenes_list[-1]:
                if "dataFields" not in scene or not isinstance(scene["dataFields"], dict):
                    scene["dataFields"] = {}
                df = scene["dataFields"]
                if "quote" not in df:
                    df["quote"] = motivation_quote
                if "disclaimer" not in df:
                    df["disclaimer"] = "Disclaimer: Educational insights only. Not financial advice. Past performance is not indicative of future results."

        storyboard_data = {
            "ticker": ticker,
            "reportDate": normalized_json.get("reportDate", "2026-06-05"),
            "videoTitle": f"{ticker} Stock Report",
            "durationSeconds": sum(float(s.get("durationSeconds", 6)) for s in scenes_list),
            "character": {
                "name": "Atti Panda",
                "role": "animated stock research guide",
                "style": "friendly fintech mascot",
                "placement": "bottom-left or side panel",
                "behavior": ["point", "magnifying", "caution", "drawing", "celebrate", "walk"]
            },
            "narrationScript": script_text,
            "storyboard": scenes_list,
            "designStyle": {
                "theme": "dark InvestingAtti fintech UI",
                "characterStyle": "animated panda guide",
                "layout": "vertical mobile video",
                "animationStyle": "smooth, modern, educational, interactive",
                "charts": "animated line chart, candlestick chart, volume bars, indicator cards",
                "colors": "use website theme tokens"
            }
        }

        # Write to file
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(storyboard_data, f, indent=2)

        return storyboard_data

    def _fallback_storyboard(self, data: Dict[str, Any], script_text: str) -> Dict[str, Any]:
        ticker = data.get("ticker", "Unavailable")
        price = data.get("currentPrice", "Unavailable")
        overall_signal = data.get("overallSignal", "Unavailable")
        
        # Split script into lines
        sentences = [s.strip() for s in script_text.split('\n') if s.strip()]
        while len(sentences) < 10:
            sentences.append("Stay tuned for more updates from investingatti.com.")
        
        scene_names = [
            "Stock Overview", "Price Action", "Trend Reason", "Evidence",
            "Daily Trend", "Technical Metrics", "Tactical Setup", "Short Trade",
            "Ecosystem Insight", "Final Verdict"
        ]
        
        scenes = []
        for i in range(10):
            voiceover = sentences[i]
            name = scene_names[i]
            
            data_fields = {}
            panda_action = "default"
            speech_bubble = ""
            visuals = []
            charts = []
            anims = []
            
            if i == 0:
                data_fields = {
                    "ticker": ticker,
                    "signal": overall_signal,
                    "catchyLine": f"{ticker} Setup: Key Levels to Watch Today"
                }
                panda_action = "walk"
                speech_bubble = f"Let's look at {ticker}!"
                visuals = ["InvestingAtti logo", "ticker card", "confidence meter"]
                anims = ["panda slide in", "logo fade in", "confidence meter count-up"]
            elif i == 1:
                data_fields = {"price": price, "ticker": ticker}
                panda_action = "point"
                speech_bubble = f"Trading around ${price} right now."
                visuals = ["Price card", "Day change badge"]
                charts = ["Mini price trendline"]
                anims = ["price count-up", "day change color pulse"]
            elif i == 2:
                data_fields = {"reason": data.get("whyStockMoved")}
                panda_action = "magnifying"
                speech_bubble = "Checking the trend catalyst."
                visuals = ["Trend arrow", "Reason badge"]
                anims = ["arrow drawing", "catalyst fade-in"]
            elif i == 3:
                data_fields = {"news": data.get("catalystSummary")}
                panda_action = "point"
                speech_bubble = "Analyzing news and volume data."
                visuals = ["News card", "Evidence cards list"]
                anims = ["evidence stamp reveal"]
            elif i == 4:
                data_fields = {"support": data.get("entryZone")}
                panda_action = "drawing"
                speech_bubble = "Here are the support and resistance lines."
                visuals = ["Daily chart card"]
                charts = ["Daily candlestick chart"]
                anims = ["candlestick path draw", "levels overlay draw"]
            elif i == 5:
                data_fields = {"metrics": "Volume, RSI, MACD"}
                panda_action = "point"
                speech_bubble = "Technical metrics showing momentum."
                visuals = ["RSI meter", "MACD indicator"]
                anims = ["metrics flip in", "RSI indicator fill"]
            elif i == 6:
                data_fields = {
                    "entry": data.get("entryZone"),
                    "stop": data.get("stopLoss"),
                    "targets": data.get("targets")
                }
                panda_action = "point"
                speech_bubble = "Swing trade entry and stop loss."
                visuals = ["Trade levels dashboard"]
                charts = ["Entry/Stop/Target overlay"]
                anims = ["zones highlights slide-in", "targets flag placement"]
            elif i == 7:
                data_fields = {"short_view": data.get("shortTradeView")}
                panda_action = "caution"
                speech_bubble = "Be careful with short trades here!"
                visuals = ["Short warning card", "Squeeze risk meter"]
                anims = ["squeeze risk warning pulse"]
            elif i == 8:
                data_fields = {"ecosystem": "Sector and Peers"}
                panda_action = "magnifying"
                speech_bubble = "Broad market and sector view."
                visuals = ["Ecosystem map"]
                anims = ["map zoom out", "peer group connections pulse"]
            else:
                data_fields = {
                    "verdict": overall_signal,
                    "quote": "Success in trading comes from risk control, not from predicting the future. Stay disciplined!",
                    "disclaimer": "Disclaimer: All trading carries risk. Past performance does not guarantee future results. Invest responsibly."
                }
                panda_action = "celebrate" if "BUY" in overall_signal or "BULL" in overall_signal else "caution"
                speech_bubble = f"Final rating: {overall_signal}!"
                visuals = ["Final verdict badge", "Disclaimer footer"]
                anims = ["badge pop in", "checklist tick reveal"]

            scenes.append({
                "sceneNumber": i + 1,
                "sceneName": name,
                "durationSeconds": 15.0,
                "narration": voiceover,
                "pandaAction": panda_action,
                "speechBubbleText": speech_bubble,
                "visualElements": visuals,
                "chartElements": charts,
                "animationInstructions": anims,
                "dataFields": data_fields
            })

        return {"storyboard": scenes}
