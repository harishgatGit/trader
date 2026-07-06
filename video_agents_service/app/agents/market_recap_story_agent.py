import json
from pathlib import Path
from typing import Dict, Any
from openai import OpenAI
from app.config import OPENAI_API_KEY, OPENAI_MODEL


class MarketRecapStoryAgent:
    """
    Generates a storytelling narration script for the daily market recap video.

    Produces exactly 11 narration lines — one per scene.
    Style: financial news anchor — authoritative, clear, narrative-driven.
    Format: MARKET_RECAP (landscape, ~3-5 minutes).
    """

    def __init__(self):
        self.client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

    def generate(self, normalized: Dict[str, Any], output_path: Path) -> str:
        script = self._call_openai(normalized) if self.client else self._fallback_script(normalized)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(script)
        print(f"[MarketRecapStoryAgent] Script generated ({len(script.split())} words)")
        return script

    # ── OpenAI generation ──────────────────────────────────────────────────────

    def _call_openai(self, d: Dict[str, Any]) -> str:
        date = d.get("date", "today")
        mood = d.get("mood", "NEUTRAL")
        index_summary = d.get("indexSummary", "indexes closed mixed")
        story_summary = d.get("marketStorySummary", "")
        catalyst = d.get("catalystSummary", "")
        volatility = d.get("volatilityLevel", "MEDIUM")
        risk = d.get("riskLevel", "MEDIUM")
        volume = d.get("volumeBehavior", "")
        news_sentiment = d.get("newsSentiment", "NEUTRAL")
        beginner_exp = d.get("beginnerExplanation", "")

        sector_winners = d.get("sectorWinners", [])
        sector_losers = d.get("sectorLosers", [])
        trending_stocks = d.get("trendingStocks", [])
        bullish_stocks = d.get("bullishStocks", [])
        bearish_stocks = d.get("bearishStocks", [])

        winner_names = ", ".join(s.get("name", "") or s.get("sectorName", "") or "" for s in sector_winners if s) or "no clear winners"
        loser_names = ", ".join(s.get("name", "") or s.get("sectorName", "") or "" for s in sector_losers if s) or "no clear losers"
        bullish_tickers = ", ".join(f"${s['symbol']}" for s in bullish_stocks[:2] if s.get("symbol")) or "none"
        bearish_tickers = ", ".join(f"${s['symbol']}" for s in bearish_stocks[:2] if s.get("symbol")) or "none"

        trending_block = ""
        for s in trending_stocks[:3]:
            sym = s.get("symbol", "N/A")
            sig = s.get("signal", "HOLD")
            summary = s.get("summary", "")[:120]
            trending_block += f"  - ${sym} ({sig}): {summary}\n"

        system_prompt = (
            "You are a financial news anchor scriptwriter for InvestingAtti. "
            "Write clear, authoritative, story-driven narration for a daily market recap video. "
            "The tone is confident but balanced — explain WHY things happened, not just WHAT. "
            "Avoid jargon. Be specific. Each line should flow naturally into the next. "
            "Never give direct buy/sell advice. Use conditional language (may, could, watch for). "
            "Output exactly 11 lines, one per scene. No numbering, no titles."
        )

        user_prompt = f"""Write exactly 11 narration lines for a daily market recap video for {date}.

SCENE GUIDE (one line per scene):
1. HOOK: Open with the biggest thing that happened today. Make it vivid and specific. (~20-25 words)
2. INDEX OVERVIEW: Cover how S&P 500, Nasdaq, Dow moved today — use the data, be specific. (~20-25 words)
3. MAIN CATALYST: Explain the primary reason markets moved today. The WHY behind the headline. (~25-30 words)
4. TOP WINNER: Highlight the standout stock or sector that gained most. Explain what drove it. (~20-25 words)
5. TOP LOSER: Cover the biggest loser — stock or sector. Explain what caused the selloff. (~20-25 words)
6. SECTOR ROTATION: Which sectors rotated in and out of favor today? What does that signal? (~20-25 words)
7. VOLUME & MOMENTUM: Was today's move backed by volume? Was it conviction or low-volume drift? (~20-25 words)
8. SENTIMENT PULSE: What does the AI read in today's news flow and market breadth? (~20-25 words)
9. RISK SNAPSHOT: Summarize today's risk level and what volatility told us. (~20-25 words)
10. TOMORROW OUTLOOK: What are the key things to watch tomorrow? Economic events, levels, catalysts. (~25-30 words)
11. CTA OUTRO: Close with energy. Invite viewers to get full reports at InvestingAtti.com. (~15-20 words)

TODAY'S DATA:
- Date: {date}
- Market Mood: {mood}
- Indexes: {index_summary}
- News Sentiment: {news_sentiment}
- Volatility: {volatility} | Risk: {risk}
- Volume: {volume}

MARKET STORY:
{story_summary[:400]}

MAIN CATALYST:
{catalyst[:250]}

SECTOR WINNERS: {winner_names}
SECTOR LOSERS: {loser_names}
BULLISH STOCKS: {bullish_tickers}
BEARISH STOCKS: {bearish_tickers}

TOP STOCKS TODAY:
{trending_block}

BEGINNER CONTEXT:
{beginner_exp[:200]}

RULES:
- Each line must stand alone — it will be read aloud as a separate scene narration.
- Never say "buy now", "guaranteed", or "will go up". Use conditional language.
- Be specific with numbers when available (percent changes, price levels).
- Sound like a knowledgeable anchor, not a robot.
- Output ONLY the 11 lines, one per line. No numbering, no labels, no markdown."""

        try:
            response = self.client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.75,
                max_tokens=900,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"[MarketRecapStoryAgent] OpenAI error: {e}. Using fallback.")
            return self._fallback_script(d)

    # ── Fallback script ────────────────────────────────────────────────────────

    def _fallback_script(self, d: Dict[str, Any]) -> str:
        date = d.get("date", "today")
        mood = d.get("mood", "NEUTRAL")
        index_summary = d.get("indexSummary", "markets closed mixed")
        catalyst = d.get("catalystSummary", "a mix of economic data and earnings")
        volatility = d.get("volatilityLevel", "MEDIUM")
        risk = d.get("riskLevel", "MEDIUM")
        story = d.get("marketStorySummary", "Markets moved on broad macro catalysts today.")
        trending = d.get("trendingStocks", [])
        sw = d.get("sectorWinners", [])
        sl = d.get("sectorLosers", [])

        winner_name = trending[0].get("symbol", "a leading stock") if trending else "leading tech names"
        loser_name = d.get("bearishStocks", [{}])
        loser_sym = loser_name[0].get("symbol", "high-multiple names") if loser_name else "high-multiple names"
        winner_sector = sw[0].get("name") or sw[0].get("sectorName", "Technology") if sw else "Technology"
        loser_sector = sl[0].get("name") or sl[0].get("sectorName", "Real Estate") if sl else "Real Estate"

        mood_adj = {"BULLISH": "bullish", "BEARISH": "bearish", "MIXED": "mixed", "CAUTIOUS": "cautious"}.get(mood, "mixed")
        vol_adj = {"LOW": "calm", "MEDIUM": "moderate", "HIGH": "elevated"}.get(volatility, "moderate")

        lines = [
            f"Today's markets closed {mood_adj} — here's a breakdown of everything that moved and why it matters for tomorrow.",
            f"The major indexes ended the session with {index_summary} — a day that told a clear story if you knew where to look.",
            f"The primary catalyst driving today's move was {catalyst[:120]}.",
            f"${winner_name} was among today's standout performers, attracting strong buying interest as sentiment shifted positive.",
            f"${loser_sym} faced selling pressure today, with concerns around valuation and macro headwinds weighing on sentiment.",
            f"Sector rotation was in play — {winner_sector} attracted capital while {loser_sector} saw profit-taking and outflows.",
            f"Volume behavior today was {vol_adj} — suggesting {'conviction behind the move' if volatility != 'LOW' else 'cautious, low-conviction trading'}.",
            f"News flow today leaned {d.get('newsSentiment', 'NEUTRAL').lower()} — AI analysis flagged {risk.lower()} risk in the broader tape.",
            f"Volatility was {vol_adj} today with {risk.lower()} risk levels — traders should size positions accordingly heading into tomorrow.",
            f"Tomorrow, watch for key earnings reports, economic data releases, and whether today's levels hold as support or resistance.",
            f"That's your InvestingAtti market recap for {date}. Get the full AI analysis on every stock at InvestingAtti.com.",
        ]
        return "\n".join(lines)
