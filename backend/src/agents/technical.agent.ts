import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OHLCV, calculateAllIndicators, TechnicalResult } from './technical-analysis.lib';
import { HistoricalDataResult } from './historical-data.agent';

export interface TechnicalAgentResult {
  symbol: string;
  available: boolean;
  timeframes: {
    [key: string]: TechnicalResult | null;
  };
  primary: TechnicalResult | null; // Daily timeframe
}

@Injectable()
export class TechnicalAgent {
  private readonly logger = new Logger(TechnicalAgent.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(symbol: string, historicalData: HistoricalDataResult): Promise<TechnicalAgentResult> {
    this.logger.log(`Calculating technical indicators for ${symbol}`);

    const result: TechnicalAgentResult = {
      symbol,
      available: false,
      timeframes: {},
      primary: null,
    };

    const availableTimeframes = Object.entries(historicalData.timeframes).filter(
      ([, tf]) => tf.available && tf.candles.length >= 30,
    );

    if (availableTimeframes.length === 0) {
      this.logger.warn(`Insufficient data for ${symbol}`);
      return result;
    }

    result.available = true;

    for (const [tfKey, tfData] of availableTimeframes) {
      const candles: OHLCV[] = tfData.candles;
      const indicators = calculateAllIndicators(candles);
      result.timeframes[tfKey] = indicators;

      // Persist indicators for primary timeframe
      if (tfKey === '1Day') {
        result.primary = indicators;
        try {
          await this.prisma.technicalIndicator.create({
            data: {
              symbol,
              timeframe: tfKey,
              ema20: indicators.ema20,
              ema50: indicators.ema50,
              ema200: indicators.ema200,
              sma20: indicators.sma20,
              sma50: indicators.sma50,
              sma200: indicators.sma200,
              rsi14: indicators.rsi14,
              macdLine: indicators.macdLine,
              macdSignal: indicators.macdSignal,
              macdHist: indicators.macdHist,
              bbUpper: indicators.bbUpper,
              bbMiddle: indicators.bbMiddle,
              bbLower: indicators.bbLower,
              bbWidth: indicators.bbWidth,
              atr14: indicators.atr14,
              obv: indicators.obv ? BigInt(indicators.obv) : null,
              relVolume: indicators.relVolume,
              vwap: indicators.vwap,
              adx14: indicators.adx14,
              plusDI: indicators.plusDI,
              minusDI: indicators.minusDI,
              supportLevels: indicators.supportLevels,
              resistanceLevels: indicators.resistanceLevels,
              overallBias: indicators.overallBias,
              signals: indicators.signals,
            },
          });
        } catch (e) {
          this.logger.warn(`Failed to persist indicators: ${e.message}`);
        }
      }
    }

    // If no 1Day but have other timeframes, use the first available as primary
    if (!result.primary && availableTimeframes.length > 0) {
      result.primary = result.timeframes[availableTimeframes[0][0]];
    }

    return result;
  }
}
