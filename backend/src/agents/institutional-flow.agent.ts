import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TechnicalResult } from './technical-analysis.lib';
import { MarketDataResult } from './market-data.agent';

export interface InstitutionalFlowResult {
  proxyScore: number;         // 0-100 composite
  interpretation: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL' | 'UNCERTAIN';
  subScores: {
    relVolumeScore: number;
    obvTrendScore: number;
    priceVwapScore: number;
    pvDivergenceScore: number;
    supportHoldScore: number;
    breakoutVolScore: number;
    largeBodyScore: number;
  };
  signals: string[];
  disclaimer: string;
}

const DISCLAIMER =
  'IMPORTANT: This is an Institutional Flow PROXY score only. ' +
  'It is calculated from publicly available volume and price data. ' +
  'It does NOT represent actual dark pool data, institutional ownership data, ' +
  'block trade data, or any premium feed. Do not treat this as official institutional activity.';

@Injectable()
export class InstitutionalFlowAgent {
  private readonly logger = new Logger(InstitutionalFlowAgent.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(
    symbol: string,
    technicals: TechnicalResult | null,
    marketData: MarketDataResult,
    candles: Array<{ open: number; high: number; low: number; close: number; volume: number }>,
  ): Promise<InstitutionalFlowResult> {
    this.logger.log(`Calculating institutional flow proxy for ${symbol}`);

    const signals: string[] = [];
    let relVolumeScore = 0;
    let obvTrendScore = 0;
    let priceVwapScore = 0;
    let pvDivergenceScore = 0;
    let supportHoldScore = 0;
    let breakoutVolScore = 0;
    let largeBodyScore = 0;

    // ── 1. Relative Volume Score (0-20) ─────────────────────────────
    if (technicals?.relVolume != null) {
      const rv = technicals.relVolume;
      if (rv >= 3) { relVolumeScore = 20; signals.push(`Very high relative volume (${rv.toFixed(1)}x)`); }
      else if (rv >= 2) { relVolumeScore = 15; signals.push(`High relative volume (${rv.toFixed(1)}x)`); }
      else if (rv >= 1.5) { relVolumeScore = 10; signals.push(`Above-average volume (${rv.toFixed(1)}x)`); }
      else if (rv >= 1) { relVolumeScore = 5; }
      else { relVolumeScore = 0; signals.push(`Below-average volume (${rv.toFixed(1)}x)`); }
    }

    // ── 2. OBV Trend Score (0-15) ────────────────────────────────────
    if (candles.length >= 20 && technicals?.obv != null) {
      // Compare recent OBV direction over last 10 bars
      const recentCandles = candles.slice(-10);
      let upDays = 0;
      let downDays = 0;
      for (let i = 1; i < recentCandles.length; i++) {
        if (recentCandles[i].close > recentCandles[i - 1].close) upDays++;
        else if (recentCandles[i].close < recentCandles[i - 1].close) downDays++;
      }
      const obvBias = upDays - downDays;
      if (obvBias >= 4) { obvTrendScore = 15; signals.push('OBV trend strongly bullish'); }
      else if (obvBias >= 2) { obvTrendScore = 10; signals.push('OBV trend bullish'); }
      else if (obvBias <= -4) { obvTrendScore = 0; signals.push('OBV trend strongly bearish'); }
      else if (obvBias <= -2) { obvTrendScore = 5; signals.push('OBV trend bearish'); }
      else obvTrendScore = 8;
    }

    // ── 3. Price vs VWAP Score (0-15) ────────────────────────────────
    if (technicals?.vwap != null && marketData.price != null) {
      const pct = ((marketData.price - technicals.vwap) / technicals.vwap) * 100;
      if (pct > 2) { priceVwapScore = 15; signals.push(`Price significantly above VWAP (+${pct.toFixed(1)}%)`); }
      else if (pct > 0) { priceVwapScore = 10; signals.push('Price above VWAP'); }
      else if (pct > -1) { priceVwapScore = 8; }
      else { priceVwapScore = 0; signals.push(`Price below VWAP (${pct.toFixed(1)}%)`); }
    }

    // ── 4. Price-Volume Divergence Score (0-15) ───────────────────────
    if (candles.length >= 5) {
      const last5 = candles.slice(-5);
      const priceUp = last5[4].close > last5[0].close;
      const avgVol = last5.slice(0, 4).reduce((s, c) => s + c.volume, 0) / 4;
      const lastVol = last5[4].volume;
      const volIncreasing = lastVol > avgVol;

      if (priceUp && volIncreasing) {
        pvDivergenceScore = 15;
        signals.push('Price rising with increasing volume (bullish)');
      } else if (!priceUp && !volIncreasing) {
        pvDivergenceScore = 8;
        signals.push('Price declining with decreasing volume (possible absorption)');
      } else if (!priceUp && volIncreasing) {
        pvDivergenceScore = 2;
        signals.push('Price falling with rising volume (bearish distribution)');
      } else {
        pvDivergenceScore = 8;
        signals.push('Price rising with declining volume (weaker rally)');
      }
    }

    // ── 5. Support Hold Score (0-10) ─────────────────────────────────
    if (technicals?.supportLevels?.length > 0 && marketData.price != null) {
      const closestSupport = technicals.supportLevels
        .filter((s) => s < marketData.price)
        .sort((a, b) => b - a)[0];

      if (closestSupport) {
        const pctAbove = ((marketData.price - closestSupport) / closestSupport) * 100;
        if (pctAbove <= 1) {
          supportHoldScore = 10;
          signals.push(`Price holding near support ($${closestSupport.toFixed(2)})`);
        } else if (pctAbove <= 3) {
          supportHoldScore = 6;
        } else {
          supportHoldScore = 3;
        }
      }
    }

    // ── 6. Breakout Volume Score (0-15) ───────────────────────────────
    if (candles.length >= 20 && technicals?.resistanceLevels?.length > 0 && marketData.price != null) {
      const closestResistance = technicals.resistanceLevels
        .filter((r) => r >= marketData.price * 0.99)
        .sort((a, b) => a - b)[0];

      const avgVol20 = candles.slice(-20, -1).reduce((s, c) => s + c.volume, 0) / 19;
      const lastVol = candles[candles.length - 1].volume;

      if (closestResistance && marketData.price >= closestResistance * 0.995 && lastVol > avgVol20 * 1.5) {
        breakoutVolScore = 15;
        signals.push(`Potential breakout above $${closestResistance.toFixed(2)} with high volume`);
      } else if (technicals?.relVolume > 1.5) {
        breakoutVolScore = 8;
      } else {
        breakoutVolScore = 3;
      }
    }

    // ── 7. Large Body Candle Score (0-10) ─────────────────────────────
    if (candles.length >= 2) {
      const lastCandle = candles[candles.length - 1];
      const bodySize = Math.abs(lastCandle.close - lastCandle.open);
      const totalRange = lastCandle.high - lastCandle.low;
      const bodyRatio = totalRange > 0 ? bodySize / totalRange : 0;
      const isBullishCandle = lastCandle.close > lastCandle.open;

      if (bodyRatio > 0.7 && isBullishCandle) {
        largeBodyScore = 10;
        signals.push('Large bullish candle body (strong buying pressure)');
      } else if (bodyRatio > 0.7 && !isBullishCandle) {
        largeBodyScore = 0;
        signals.push('Large bearish candle body (strong selling pressure)');
      } else if (bodyRatio > 0.5 && isBullishCandle) {
        largeBodyScore = 6;
      } else if (bodyRatio > 0.5 && !isBullishCandle) {
        largeBodyScore = 2;
      } else {
        largeBodyScore = 5; // indecision
      }
    }

    // ── Composite Score ───────────────────────────────────────────────
    const proxyScore = Math.min(100, Math.max(0,
      relVolumeScore + obvTrendScore + priceVwapScore +
      pvDivergenceScore + supportHoldScore + breakoutVolScore + largeBodyScore,
    ));

    const interpretation: InstitutionalFlowResult['interpretation'] =
      proxyScore >= 65 ? 'ACCUMULATION'
        : proxyScore >= 45 ? 'NEUTRAL'
        : proxyScore >= 25 ? 'DISTRIBUTION'
        : 'UNCERTAIN';

    const result: InstitutionalFlowResult = {
      proxyScore: +proxyScore.toFixed(1),
      interpretation,
      subScores: {
        relVolumeScore,
        obvTrendScore,
        priceVwapScore,
        pvDivergenceScore,
        supportHoldScore,
        breakoutVolScore,
        largeBodyScore,
      },
      signals,
      disclaimer: DISCLAIMER,
    };

    // Persist
    try {
      await this.prisma.institutionalFlow.create({
        data: {
          symbol,
          proxyScore: result.proxyScore,
          relVolumeScore,
          obvTrendScore,
          priceVwapScore,
          pvDivergScore: pvDivergenceScore,
          supportHoldScore,
          breakoutVolScore,
          largeBodyScore,
          interpretation,
          signals,
          disclaimer: DISCLAIMER,
        },
      });
    } catch (e) {
      this.logger.warn(`Institutional flow persist failed: ${e.message}`);
    }

    return result;
  }
}
