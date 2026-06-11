import json
from pathlib import Path
from typing import Dict, Any

class ReportNarrativeExtractor:
    def __init__(self):
        pass

    def extract(self, report_json: Dict[str, Any], output_path: Path) -> Dict[str, Any]:
        """
        Extracts and normalizes necessary data fields from the full website report JSON.
        Does not invent values. Marks missing fields as 'Unavailable'.
        """
        # Find ticker
        ticker = report_json.get("ticker") or report_json.get("symbol") or "Unavailable"
        
        # Find company name
        company_name = "Unavailable"
        if "companyInsights" in report_json and isinstance(report_json["companyInsights"], dict):
            company_name = report_json["companyInsights"].get("name") or ticker
        else:
            company_name = ticker

        # Find report date
        report_date = report_json.get("reportDate") or report_json.get("analysisDate") or "Unavailable"

        # Price and day change
        current_price = "Unavailable"
        if "marketData" in report_json and isinstance(report_json["marketData"], dict):
            current_price = report_json["marketData"].get("price") or report_json.get("currentPrice")
        else:
            current_price = report_json.get("currentPrice")
        
        if current_price is not None and current_price != "Unavailable":
            try:
                current_price = float(current_price)
            except ValueError:
                pass
        else:
            current_price = "Unavailable"

        day_change_pct = "Unavailable"
        if "marketData" in report_json and isinstance(report_json["marketData"], dict):
            day_change_pct = report_json["marketData"].get("changePercent") or report_json["marketData"].get("dayChangePercent")
        if day_change_pct is None or day_change_pct == "Unavailable":
            # try finding in other places
            day_change_pct = "Unavailable"
        
        if day_change_pct is not None and day_change_pct != "Unavailable":
            try:
                day_change_pct = float(day_change_pct)
            except ValueError:
                pass

        # Signal
        overall_signal = report_json.get("finalRating") or "Unavailable"
        if "finalDecision" in report_json and isinstance(report_json["finalDecision"], dict):
            if overall_signal == "Unavailable":
                overall_signal = report_json["finalDecision"].get("finalRating") or "Unavailable"

        # Why stock moved
        why_stock_moved = "Unavailable"
        if "trendStory" in report_json and isinstance(report_json["trendStory"], dict):
            move_cls = report_json["trendStory"].get("move_classification")
            if isinstance(move_cls, dict):
                why_stock_moved = move_cls.get("primary_reason") or move_cls.get("explanation") or "Unavailable"
            else:
                why_stock_moved = report_json["trendStory"].get("narrative") or "Unavailable"
        
        # News/Catalyst summary
        catalysts = report_json.get("keyCatalysts") or []
        if not catalysts and "newsAndCatalysts" in report_json and isinstance(report_json["newsAndCatalysts"], dict):
            catalysts = report_json["newsAndCatalysts"].get("keyCatalysts") or []
        catalyst_summary = "; ".join(catalysts) if catalysts else "Unavailable"

        # Volume summary
        volume_summary = "Unavailable"
        if "technicalAnalysis" in report_json and isinstance(report_json["technicalAnalysis"], dict):
            volume_summary = report_json["technicalAnalysis"].get("volumeAnalysis") or report_json["technicalAnalysis"].get("volumeTrendStatus") or "Unavailable"

        # Trend summary
        trend_summary = "Unavailable"
        if "tacticalHorizonView" in report_json and isinstance(report_json["tacticalHorizonView"], dict):
            daily_trend = report_json["tacticalHorizonView"].get("dailyTrend")
            if isinstance(daily_trend, dict):
                trend_summary = daily_trend.get("analysis") or daily_trend.get("trend") or "Unavailable"

        # Levels
        support_levels = []
        resistance_levels = []
        
        # Look in tacticalHorizonView
        if "tacticalHorizonView" in report_json and isinstance(report_json["tacticalHorizonView"], dict):
            th_supports = report_json["tacticalHorizonView"].get("supportLevels") or []
            th_resistances = report_json["tacticalHorizonView"].get("resistanceLevels") or []
            
            # support levels can be list of numbers or list of dicts
            for item in th_supports:
                if isinstance(item, dict) and "price" in item:
                    support_levels.append(item["price"])
                elif isinstance(item, (int, float)):
                    support_levels.append(item)
            
            for item in th_resistances:
                if isinstance(item, dict) and "price" in item:
                    resistance_levels.append(item["price"])
                elif isinstance(item, (int, float)):
                    resistance_levels.append(item)

        # Fallback to technicals or top level
        if not support_levels and "technicals" in report_json and isinstance(report_json["technicals"], dict):
            prim = report_json["technicals"].get("primary")
            if isinstance(prim, dict):
                support_levels = prim.get("supportLevels") or []
                resistance_levels = prim.get("resistanceLevels") or []
        
        # Convert all to floats
        support_levels = [float(x) for x in support_levels if x is not None]
        resistance_levels = [float(x) for x in resistance_levels if x is not None]

        # Entry Zone, Stop Loss, Targets
        entry_zone = "Unavailable"
        stop_loss = "Unavailable"
        targets = []

        if "swingTradeView" in report_json and isinstance(report_json["swingTradeView"], dict):
            st_view = report_json["swingTradeView"]
            accum = st_view.get("accumulationZone")
            if isinstance(accum, dict):
                entry_zone = f"Low: {accum.get('low')}, High: {accum.get('high')}"
            
            sl = st_view.get("stopLoss")
            if isinstance(sl, dict):
                stop_loss = f"Price: {sl.get('price') or sl.get('low')}"
                if sl.get("description"):
                    stop_loss += f" ({sl.get('description')})"
            
            targets_list = st_view.get("targets") or []
            for t in targets_list:
                if isinstance(t, dict) and "price" in t:
                    targets.append(t["price"])
                elif isinstance(t, (int, float)):
                    targets.append(t)
        
        # Fallback to tacticalHorizonView
        if "tacticalHorizonView" in report_json and isinstance(report_json["tacticalHorizonView"], dict):
            th = report_json["tacticalHorizonView"]
            if entry_zone == "Unavailable" and th.get("suggestedEntryPrice"):
                entry_zone = f"Price: {th.get('suggestedEntryPrice')}"
            if stop_loss == "Unavailable" and th.get("stopLossPrice"):
                stop_loss = f"Price: {th.get('stopLossPrice')}"
            if not targets and th.get("suggestedExitPrice"):
                targets.append(th.get("suggestedExitPrice"))

        targets = [float(x) for x in targets if x is not None]

        # Short trade view / short filter
        short_trade_view = "Unavailable"
        if "tacticalHorizonView" in report_json and isinstance(report_json["tacticalHorizonView"], dict):
            sf = report_json["tacticalHorizonView"].get("shortFilter")
            if isinstance(sf, dict):
                short_trade_view = f"SI%: {sf.get('shortInterest', 'N/A')}, Borrow Fee: {sf.get('borrowFee', 'N/A')}, Squeeze Risk: {sf.get('squeezeRisk', 'N/A')}"
            elif sf:
                short_trade_view = str(sf)

        # Risk warnings
        risks = report_json.get("keyRisks") or []
        if not risks and "riskAnalysis" in report_json and isinstance(report_json["riskAnalysis"], dict):
            risks = report_json["riskAnalysis"].get("topRisks") or []
        risk_warnings = "; ".join(risks) if risks else "Unavailable"

        # Final verdict
        final_verdict = "Unavailable"
        if "finalDecision" in report_json and isinstance(report_json["finalDecision"], dict):
            final_verdict = report_json["finalDecision"].get("decisionSummary") or "Unavailable"
        if final_verdict == "Unavailable":
            final_verdict = report_json.get("executiveSummary") or "Unavailable"

        # Executive Summary
        executive_summary = report_json.get("executiveSummary") or "Unavailable"

        normalized = {
            "ticker": ticker,
            "companyName": company_name,
            "reportDate": report_date,
            "currentPrice": current_price,
            "dayChangePct": day_change_pct,
            "overallSignal": overall_signal,
            "whyStockMoved": why_stock_moved,
            "catalystSummary": catalyst_summary,
            "volumeSummary": volume_summary,
            "trendSummary": trend_summary,
            "supportLevels": support_levels,
            "resistanceLevels": resistance_levels,
            "entryZone": entry_zone,
            "stopLoss": stop_loss,
            "targets": targets,
            "shortTradeView": short_trade_view,
            "riskWarnings": risk_warnings,
            "finalVerdict": final_verdict,
            "executiveSummary": executive_summary
        }

        # Write to file
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(normalized, f, indent=2)

        return normalized
