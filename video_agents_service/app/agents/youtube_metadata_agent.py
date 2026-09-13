import json
import re
from app.config import OPENAI_API_KEY, OPENAI_MODEL
from openai import OpenAI

# ── Company name lookup (ticker → full name) ──────────────────────────────────
COMPANY_NAMES: dict[str, str] = {
    "AAPL": "Apple", "MSFT": "Microsoft", "NVDA": "NVIDIA", "AMZN": "Amazon",
    "GOOGL": "Alphabet", "GOOG": "Alphabet", "META": "Meta", "TSLA": "Tesla",
    "NFLX": "Netflix", "AMD": "AMD", "AVGO": "Broadcom", "QCOM": "Qualcomm",
    "TXN": "Texas Instruments", "INTC": "Intel", "CRM": "Salesforce",
    "ADBE": "Adobe", "CSCO": "Cisco", "ORCL": "Oracle", "IBM": "IBM",
    "PLTR": "Palantir", "SNOW": "Snowflake", "PANW": "Palo Alto Networks",
    "ARM": "Arm Holdings", "COIN": "Coinbase", "MSTR": "MicroStrategy",
    "MARA": "MARA Holdings", "RIOT": "Riot Platforms", "SOFI": "SoFi",
    "NIO": "NIO", "BABA": "Alibaba", "MU": "Micron", "SMCI": "Super Micro",
    "SHOP": "Shopify", "SQ": "Block", "PYPL": "PayPal", "UBER": "Uber",
    "LYFT": "Lyft", "SNAP": "Snap", "SPOT": "Spotify", "HOOD": "Robinhood",
    "RIVN": "Rivian", "LCID": "Lucid Motors", "F": "Ford", "GM": "General Motors",
    "BA": "Boeing", "CAT": "Caterpillar", "GE": "GE Aerospace",
    "JPM": "JPMorgan Chase", "BAC": "Bank of America", "GS": "Goldman Sachs",
    "MS": "Morgan Stanley", "WFC": "Wells Fargo", "C": "Citigroup",
    "V": "Visa", "MA": "Mastercard", "AMGN": "Amgen", "PFE": "Pfizer",
    "JNJ": "Johnson & Johnson", "UNH": "UnitedHealth", "LLY": "Eli Lilly",
    "XOM": "ExxonMobil", "CVX": "Chevron", "SPY": "S&P 500 ETF",
    "QQQ": "Nasdaq-100 ETF", "IWM": "Russell 2000 ETF",
}

def _fmt_date(date_str: str) -> str:
    """Convert YYYY-MM-DD (or already MM/DD/YYYY) to MM/DD/YYYY."""
    try:
        parts = date_str.strip().split("-")
        if len(parts) == 3 and len(parts[0]) == 4:
            return f"{parts[1]}/{parts[2]}/{parts[0]}"
    except Exception:
        pass
    return date_str


def _resolve_company(ticker: str, company_name: str | None) -> str:
    """Return company name from argument, dict lookup, or ticker fallback."""
    if company_name and company_name.strip():
        return company_name.strip()
    return COMPANY_NAMES.get(ticker.upper(), ticker.upper())


class YouTubeMetadataAgent:
    def __init__(self):
        if OPENAI_API_KEY:
            self.client = OpenAI(api_key=OPENAI_API_KEY)
        else:
            self.client = None

    def generate(
        self,
        ticker: str,
        report_date: str,
        rating: str,
        summary: str,
        bias: str,
        rsi: str = "",
        sector: str = "",
        company_name: str | None = None,
    ) -> dict:
        """
        Generates SEO-optimized YouTube Title, Description, and Tags.
        Title format: MM/DD/YYYY — {Company Name} Stock Analysis | Rating | Key Signal
        """
        formatted_date = _fmt_date(report_date)
        company = _resolve_company(ticker, company_name)

        if not self.client:
            print("[YouTubeMetadataAgent] OpenAI API key not configured, using fallback.")
            return self._fallback_metadata(ticker, company, formatted_date, rating, summary)

        prompt = f"""You are writing YouTube SEO metadata for an AI-generated stock analysis video.
Details:
- Ticker: {ticker}
- Company Name: {company}
- Date: {formatted_date}
- Rating: {rating}
- Executive Summary: {summary}
- Bias: {bias}
- RSI: {rsi}
- Sector: {sector}

Generate a YouTube title, description, and tags.
Rules:
- Title: max 95 characters. MUST START WITH THE DATE in MM/DD/YYYY format (no brackets). Use the company name (not $ticker). Format: "MM/DD/YYYY — Company Name Stock Analysis | Rating | Key Signal"
- Description: 3-5 short paragraphs. Paragraph 1 covers what was analyzed and current price zone; Paragraph 2 explains technical/momentum bias (e.g. RSI, trend support); Paragraph 3 explains key sector/macro catalysts; Paragraph 4 contains educational disclaimer; Paragraph 5 contains relevant hashtags (e.g., #{ticker} #stockmarket #investing).
- Tags: A list of 10-15 relevant keywords/tags.

Respond strictly in valid JSON:
{{
  "title": "...",
  "description": "...",
  "tags": ["...", "...", ...]
}}
"""
        try:
            response = self.client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=800,
            )
            result = json.loads(response.choices[0].message.content.strip())
            title = result.get("title", "")
            
            # Deterministically format title to guarantee: "MM/DD/YYYY — Company Name Stock Analysis | Rating | Key Signal"
            parts = [p.strip() for p in title.split("|")]
            rating_val = parts[1] if len(parts) > 1 else rating
            signal_val = parts[2] if len(parts) > 2 else ""
            
            # If the LLM returned a custom title base, strip dates/tickers/dashes from it
            if len(parts) > 0 and parts[0]:
                base_part = parts[0]
                # Strip dates like [06/28/2026] or 06/28/2026
                base_part = re.sub(r'\[?\d{2}/\d{2}/\d{4}\]?', '', base_part)
                # Strip tickers starting with $
                base_part = re.sub(r'\$\w+', '', base_part)
                # Strip leading/trailing dashes, slashes, spaces
                base_part = re.sub(r'^[\s—\-\/|]+|[\s—\-\/|]+$', '', base_part).strip()
            else:
                base_part = f"{company} Stock Analysis"
                
            if "Stock Analysis" not in base_part:
                base_part = f"{company} Stock Analysis"
            else:
                # Replace ticker with company name if ticker was used inside text
                base_part = re.sub(rf'\b{ticker}\b', company, base_part, flags=re.IGNORECASE)
                
            suffix = ""
            if rating_val:
                suffix += f" | {rating_val}"
            if signal_val:
                suffix += f" | {signal_val}"
                
            result["title"] = f"{formatted_date} — {base_part}{suffix} #{ticker.lower()}"
            return result
        except Exception as e:
            print(f"[YouTubeMetadataAgent] OpenAI error: {e}. Falling back.")
            return self._fallback_metadata(ticker, company, formatted_date, rating, summary)

    def generate_market_recap(
        self,
        report_date: str,
        mood: str,
        market_story_summary: str,
        catalyst_summary: str,
        sector_names: list[str],
    ) -> dict:
        """
        Generates SEO-optimized YouTube Title, Description, and Tags for a
        whole-market MARKET_RECAP video (not tied to a single ticker).
        Title format: MM/DD/YYYY — Stock Market Recap | Mood | Top Sector
        """
        formatted_date = _fmt_date(report_date)
        top_sector = sector_names[0] if sector_names else "All Sectors"

        if not self.client:
            print("[YouTubeMetadataAgent] OpenAI API key not configured, using fallback.")
            return self._fallback_market_recap_metadata(
                formatted_date, mood, market_story_summary, catalyst_summary, sector_names
            )

        prompt = f"""You are writing YouTube SEO metadata for an AI-generated daily stock MARKET RECAP video
(covers the whole market, not a single stock).
Details:
- Date: {formatted_date}
- Market Mood: {mood}
- Market Story Summary: {market_story_summary}
- Catalyst Summary: {catalyst_summary}
- Sectors covered: {', '.join(sector_names)}

Generate a YouTube title, description, and tags.
Rules:
- Title: max 95 characters. MUST START WITH THE DATE in MM/DD/YYYY format (no brackets). Do NOT reference a
  single ticker. Format: "MM/DD/YYYY — Stock Market Recap | {mood} | Key Theme"
- Description: 3-5 short paragraphs. Paragraph 1 summarizes the day's overall market action. Paragraph 2
  covers the main catalysts/news driving the move. Paragraph 3 highlights notable sector trends. Paragraph 4
  contains an educational disclaimer. Paragraph 5 contains relevant hashtags (e.g. #stockmarket #investing
  #marketrecap).
- Tags: A list of 10-15 relevant keywords/tags (no ticker symbols).

Respond strictly in valid JSON:
{{
  "title": "...",
  "description": "...",
  "tags": ["...", "...", ...]
}}
"""
        try:
            response = self.client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=800,
            )
            result = json.loads(response.choices[0].message.content.strip())
            if not result.get("title"):
                result["title"] = f"{formatted_date} — Stock Market Recap | {mood} | {top_sector} in Focus"
            if not result.get("description"):
                result["description"] = market_story_summary
            if not result.get("tags"):
                result["tags"] = ["stockmarket", "marketrecap", "investing", "finance", "stocks"]
            return result
        except Exception as e:
            print(f"[YouTubeMetadataAgent] OpenAI error: {e}. Falling back.")
            return self._fallback_market_recap_metadata(
                formatted_date, mood, market_story_summary, catalyst_summary, sector_names
            )

    def _fallback_market_recap_metadata(
        self, report_date: str, mood: str, market_story_summary: str,
        catalyst_summary: str, sector_names: list[str],
    ) -> dict:
        top_sector = sector_names[0] if sector_names else "All Sectors"
        return {
            "title": f"{report_date} — Stock Market Recap | {mood} | {top_sector} in Focus",
            "description": (
                f"Stock market recap for {report_date}.\n\n"
                f"Market Mood: {mood}\n\n"
                f"{market_story_summary}\n\n"
                f"Key Catalysts: {catalyst_summary}\n\n"
                "⚠️ Disclaimer: Educational purposes only. Stock trading carries high risk. This is not financial advice.\n\n"
                "#stockmarket #investing #marketrecap #finance #stocks"
            ),
            "tags": ["stockmarket", "marketrecap", "investing", "finance", "stocks", "dailymarket"]
                    + [s.lower().replace(" ", "") for s in sector_names[:5]],
        }

    def _fallback_metadata(self, ticker: str, company: str, report_date: str, rating: str, summary: str) -> dict:
        return {
            "title": f"{report_date} — {company} Stock Analysis | {rating} | AI Trade Setup #{ticker.lower()}",
            "description": (
                f"{company} (${ticker}) AI Stock analysis for {report_date}.\n\n"
                f"Rating: {rating}\n"
                f"Executive Summary: {summary}\n\n"
                "⚠️ Disclaimer: Educational purposes only. Stock trading carries high risk. This is not financial advice.\n\n"
                f"#{ticker} #stockmarket #investing #tradeidea #AIPortfolio"
            ),
            "tags": [ticker, company, "stocks", "investing", "stockanalysis", "tradeidea", "finance", "AI"]
        }
