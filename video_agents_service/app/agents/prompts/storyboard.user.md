You are the lead visual storyboard designer for InvestingAtti. Your job is to split a 10-line narration script into exactly 10 visual scenes for a vertical video (9:16) with professional layouts, charts, and data cards.

Here is the 10-line Narration Script (each line corresponds to one scene, in order):
"{script_text}"

Here is the stock report data:
- Ticker: {ticker}
- Current Price: ${price}
- Rating: {overall_signal}
- Executive Summary: {exec_summary}
- Entry Zone: {entry}
- Stop Loss: {stop}
- Targets: {targets}
- Short Selling: {short_view}
- Catalysts: {catalyst}
- Trend: {trend}

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
