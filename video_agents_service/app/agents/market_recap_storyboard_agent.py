import json
from pathlib import Path
from typing import Dict, Any, List

# Scene type → Remotion component mapping for MarketRecapVideo
RECAP_SCENE_TYPES = [
    "recap_intro",        # 1  Opening hook + mood
    "index_overview",     # 2  SP500/NASDAQ/DOW/RUSSELL grid
    "market_catalyst",    # 3  Main reason markets moved
    "top_mover",          # 4  Biggest winner today
    "top_loser",          # 5  Biggest loser today
    "sector_rotation",    # 6  Sector winners/losers bars
    "volume_momentum",    # 7  Volume and momentum context
    "sentiment_pulse",    # 8  News sentiment + AI read
    "risk_snapshot",      # 9  Risk + volatility level
    "tomorrow_outlook",   # 10 Key things to watch
    "recap_outro",        # 11 CTA
]

# Seconds per scene (total ~165s ≈ 2.75 min — landscape long-form)
RECAP_DURATIONS = [12, 14, 16, 14, 14, 16, 12, 12, 12, 16, 12]


class MarketRecapStoryboardAgent:
    """
    Generates the 11-scene storyboard for the daily MARKET_RECAP video.
    Maps scene types to the MarketRecapVideo Remotion composition.
    """

    def generate(
        self,
        normalized: Dict[str, Any],
        script_text: str,
        output_path: Path,
    ) -> Dict[str, Any]:
        lines = [l.strip() for l in script_text.split("\n") if l.strip()]
        while len(lines) < 11:
            lines.append("Visit InvestingAtti.com for the full AI-powered market analysis.")

        storyboard = self._build_storyboard(normalized, lines)
        result = {
            "ticker": "MARKET_RECAP",
            "date": normalized.get("date", ""),
            "videoTitle": normalized.get("title", "Daily Market Recap"),
            "videoFormat": "MARKET_RECAP",
            "layout": "landscape_16_9",
            "durationSeconds": sum(s["durationSeconds"] for s in storyboard),
            "narrationScript": script_text,
            "storyboard": storyboard,
            "scenes": storyboard,
            "designStyle": {
                "theme": "dark InvestingAtti news",
                "layout": "landscape_16_9",
                "fps": 30,
                "resolution": "1280x720",
                "colorPalette": {
                    "background": "#090d16",
                    "surface": "#111827",
                    "teal": "#14b8a6",
                    "green": "#10b981",
                    "red": "#ef4444",
                    "yellow": "#f59e0b",
                    "text": "#f8fafc",
                    "muted": "#64748b",
                },
            },
        }

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)

        total = result["durationSeconds"]
        print(f"[MarketRecapStoryboardAgent] Storyboard: {len(storyboard)} scenes, {total:.1f}s total")
        return result

    # ── Scene builder ──────────────────────────────────────────────────────────

    def _build_storyboard(self, d: Dict[str, Any], lines: List[str]) -> List[Dict[str, Any]]:
        date = d.get("date", "Today")
        mood = d.get("mood", "NEUTRAL")
        mood_color = d.get("moodColor", "yellow")
        index_summary = d.get("indexSummary", "Indexes closed mixed")
        index_movements = d.get("indexMovements", {})
        catalyst = d.get("catalystSummary", "")
        volatility = d.get("volatilityLevel", "MEDIUM")
        risk = d.get("riskLevel", "MEDIUM")
        news_sentiment = d.get("newsSentiment", "NEUTRAL")
        volume = d.get("volumeBehavior", "")

        trending = d.get("trendingStocks", [])
        bullish = d.get("bullishStocks", [])
        bearish = d.get("bearishStocks", [])
        sw = d.get("sectorWinners", [])
        sl = d.get("sectorLosers", [])

        top_winner = bullish[0] if bullish else (trending[0] if trending else {})
        top_loser = bearish[0] if bearish else {}

        winner_sym = top_winner.get("symbol", "N/A")
        winner_sig = top_winner.get("signal", "HOLD")
        loser_sym = top_loser.get("symbol", "N/A")

        vol_color = "red" if volatility == "HIGH" else "yellow" if volatility == "MEDIUM" else "green"
        risk_color = "red" if risk == "HIGH" else "yellow" if risk == "MEDIUM" else "green"
        sent_color = "green" if news_sentiment == "POSITIVE" else "red" if news_sentiment == "NEGATIVE" else "yellow"

        # Build index panels for scene 2
        index_panels = self._extract_index_panels(index_movements)

        # Sector bars for scene 6
        sector_bars = [
            {"name": s.get("name") or s.get("sectorName", ""), "trend": s.get("trend", ""), "color": "green"}
            for s in sw[:2]
        ] + [
            {"name": s.get("name") or s.get("sectorName", ""), "trend": s.get("trend", ""), "color": "red"}
            for s in sl[:2]
        ]

        scenes = [
            # 1 ── Intro
            {
                "sceneNumber": 1, "sceneType": "recap_intro",
                "sceneName": "Opening", "durationSeconds": RECAP_DURATIONS[0],
                "narration": lines[0],
                "textOverlay": f"MARKET RECAP",
                "subText": date,
                "decisionColor": mood_color,
                "dataFields": {"date": date, "mood": mood, "moodColor": mood_color, "title": d.get("title", "")},
            },
            # 2 ── Index Overview
            {
                "sceneNumber": 2, "sceneType": "index_overview",
                "sceneName": "Indexes", "durationSeconds": RECAP_DURATIONS[1],
                "narration": lines[1],
                "textOverlay": "TODAY'S INDEXES",
                "subText": index_summary,
                "decisionColor": mood_color,
                "dataFields": {"indexPanels": index_panels, "indexSummary": index_summary},
            },
            # 3 ── Catalyst
            {
                "sceneNumber": 3, "sceneType": "market_catalyst",
                "sceneName": "Catalyst", "durationSeconds": RECAP_DURATIONS[2],
                "narration": lines[2],
                "textOverlay": "MAIN CATALYST",
                "subText": catalyst[:80] if catalyst else "Key drivers today",
                "decisionColor": mood_color,
                "dataFields": {"catalyst": catalyst[:300], "mood": mood},
            },
            # 4 ── Top Winner
            {
                "sceneNumber": 4, "sceneType": "top_mover",
                "sceneName": "Top Winner", "durationSeconds": RECAP_DURATIONS[3],
                "narration": lines[3],
                "textOverlay": f"${winner_sym}",
                "subText": f"SIGNAL: {winner_sig}",
                "decisionColor": "green",
                "dataFields": {
                    "type": "WINNER",
                    "symbol": winner_sym,
                    "signal": winner_sig,
                    "price": top_winner.get("price"),
                    "summary": top_winner.get("summary", "")[:150],
                    "decisionColor": "green",
                },
            },
            # 5 ── Top Loser
            {
                "sceneNumber": 5, "sceneType": "top_loser",
                "sceneName": "Top Loser", "durationSeconds": RECAP_DURATIONS[4],
                "narration": lines[4],
                "textOverlay": f"${loser_sym}" if loser_sym != "N/A" else "MARKET LAGGARD",
                "subText": "UNDER PRESSURE",
                "decisionColor": "red",
                "dataFields": {
                    "type": "LOSER",
                    "symbol": loser_sym,
                    "signal": top_loser.get("signal", "SELL") if top_loser else "SELL",
                    "price": top_loser.get("price") if top_loser else None,
                    "summary": top_loser.get("summary", "")[:150] if top_loser else "",
                    "decisionColor": "red",
                },
            },
            # 6 ── Sector Rotation
            {
                "sceneNumber": 6, "sceneType": "sector_rotation",
                "sceneName": "Sectors", "durationSeconds": RECAP_DURATIONS[5],
                "narration": lines[5],
                "textOverlay": "SECTOR ROTATION",
                "subText": f"Winners: {', '.join(s['name'] for s in sw[:2]) or 'N/A'}",
                "decisionColor": "teal",
                "dataFields": {"sectorBars": sector_bars, "winners": sw[:2], "losers": sl[:2]},
            },
            # 7 ── Volume & Momentum
            {
                "sceneNumber": 7, "sceneType": "volume_momentum",
                "sceneName": "Volume", "durationSeconds": RECAP_DURATIONS[6],
                "narration": lines[6],
                "textOverlay": f"VOLUME: {volatility}",
                "subText": volume[:60] if volume else "Volume analysis",
                "decisionColor": vol_color,
                "dataFields": {"volatility": volatility, "volume": volume, "color": vol_color},
            },
            # 8 ── Sentiment Pulse
            {
                "sceneNumber": 8, "sceneType": "sentiment_pulse",
                "sceneName": "Sentiment", "durationSeconds": RECAP_DURATIONS[7],
                "narration": lines[7],
                "textOverlay": f"NEWS: {news_sentiment}",
                "subText": "AI SENTIMENT ANALYSIS",
                "decisionColor": sent_color,
                "dataFields": {"sentiment": news_sentiment, "color": sent_color},
            },
            # 9 ── Risk Snapshot
            {
                "sceneNumber": 9, "sceneType": "risk_snapshot",
                "sceneName": "Risk", "durationSeconds": RECAP_DURATIONS[8],
                "narration": lines[8],
                "textOverlay": f"RISK LEVEL: {risk}",
                "subText": f"Volatility: {volatility}",
                "decisionColor": risk_color,
                "dataFields": {"risk": risk, "volatility": volatility, "color": risk_color},
            },
            # 10 ── Tomorrow Outlook
            {
                "sceneNumber": 10, "sceneType": "tomorrow_outlook",
                "sceneName": "Outlook", "durationSeconds": RECAP_DURATIONS[9],
                "narration": lines[9],
                "textOverlay": "WATCH TOMORROW",
                "subText": "Key Levels & Catalysts",
                "decisionColor": "teal",
                "dataFields": {"outlook": lines[9], "trendingStocks": trending[:3]},
            },
            # 11 ── Outro
            {
                "sceneNumber": 11, "sceneType": "recap_outro",
                "sceneName": "Outro", "durationSeconds": RECAP_DURATIONS[10],
                "narration": lines[10],
                "textOverlay": "INVESTINGATTI.COM",
                "subText": "AI-Powered Stock Analysis",
                "decisionColor": "teal",
                "dataFields": {"websiteUrl": "www.investingatti.com", "date": date},
            },
        ]
        return scenes

    def _extract_index_panels(self, index_movements: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extracts up to 4 index panels with name, pct, color for the IndexOverviewScene."""
        mapping = [
            ("SP500", "S&P 500"), ("SPY", "S&P 500"),
            ("NASDAQ", "Nasdaq"), ("QQQ", "Nasdaq"),
            ("DOW", "Dow Jones"), ("DJI", "Dow Jones"),
            ("RUSSELL", "Russell 2K"),
        ]
        seen_names = set()
        panels = []
        for key, name in mapping:
            if name in seen_names:
                continue
            val = index_movements.get(key)
            if val is None:
                continue
            pct = 0.0
            if isinstance(val, dict):
                pct = float(val.get("pct") or val.get("changePercent") or val.get("percent") or 0)
            else:
                try:
                    pct = float(val)
                except (TypeError, ValueError):
                    continue
            panels.append({"name": name, "pct": pct, "color": "green" if pct >= 0 else "red"})
            seen_names.add(name)
            if len(panels) == 4:
                break

        # Fill to 4 panels if needed
        fallback = [
            {"name": "S&P 500", "pct": 0.0, "color": "yellow"},
            {"name": "Nasdaq", "pct": 0.0, "color": "yellow"},
            {"name": "Dow Jones", "pct": 0.0, "color": "yellow"},
            {"name": "Russell 2K", "pct": 0.0, "color": "yellow"},
        ]
        while len(panels) < 4:
            panels.append(fallback[len(panels)])

        return panels
