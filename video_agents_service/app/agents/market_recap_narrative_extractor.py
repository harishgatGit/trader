import json
from pathlib import Path
from typing import Dict, Any, List


class MarketRecapNarrativeExtractor:
    """
    Normalizes the MARKET_RECAP payload from the NestJS backend.
    Input: WhatsForToday Run 4 (EOD) data.
    Does NOT call OpenAI or fetch external data — pure normalization.
    """

    def extract(self, report_json: Dict[str, Any], output_path: Path) -> Dict[str, Any]:
        date = report_json.get("date", "Today")
        mood = report_json.get("mood", "NEUTRAL")
        index_movements = report_json.get("indexMovements") or {}
        sectors = report_json.get("sectors") or []
        trending_stocks = report_json.get("trendingStocks") or []

        normalized = {
            "ticker": "MARKET_RECAP",
            "date": date,
            "title": report_json.get("title") or f"Market Recap: {date}",
            "mood": mood,
            "moodColor": self._mood_to_color(mood),
            "indexMovements": index_movements,
            "indexSummary": self._build_index_summary(index_movements),
            "marketStorySummary": report_json.get("marketStorySummary") or "",
            "catalystSummary": report_json.get("catalystSummary") or "",
            "newsSentiment": report_json.get("newsSentiment") or "NEUTRAL",
            "volumeBehavior": report_json.get("volumeBehavior") or "",
            "volatilityLevel": report_json.get("volatilityLevel") or "MEDIUM",
            "riskLevel": report_json.get("riskLevel") or "MEDIUM",
            "beginnerExplanation": report_json.get("beginnerExplanation") or "",
            "economicEvents": report_json.get("economicEvents") or [],
            "sectors": sectors,
            "sectorWinners": [s for s in sectors if s.get("trend") in ("STRONG",)][:2],
            "sectorLosers": [s for s in sectors if s.get("trend") in ("WEAK", "REVERSING")][:2],
            "trendingStocks": trending_stocks[:5],
            "bullishStocks": [s for s in trending_stocks if (s.get("signal") or "") in ("BUY", "WATCHLIST")][:3],
            "bearishStocks": [s for s in trending_stocks if (s.get("signal") or "") in ("SELL", "AVOID")][:2],
        }

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(normalized, f, indent=2)

        return normalized

    # ── Helpers ────────────────────────────────────────────────────────────────

    def _build_index_summary(self, index_movements: Dict[str, Any]) -> str:
        display_names = {
            "SP500": "S&P 500", "SPY": "S&P 500",
            "NASDAQ": "Nasdaq",  "QQQ": "Nasdaq",
            "DOW": "Dow",        "DJI": "Dow Jones",
            "RUSSELL": "Russell 2000",
        }
        parts = []
        for key, name in display_names.items():
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
            sign = "+" if pct >= 0 else ""
            parts.append(f"{name} {sign}{pct:.2f}%")
            if len(parts) == 4:
                break
        return ", ".join(parts) if parts else "Markets closed mixed"

    def _mood_to_color(self, mood: str) -> str:
        upper = (mood or "").upper()
        if upper in ("BULLISH", "RISK_ON"):
            return "green"
        if upper in ("BEARISH", "RISK_OFF"):
            return "red"
        return "yellow"
