import { Injectable, Logger } from '@nestjs/common';
import { AlpacaService, AlpacaBar } from '../services/alpaca.service';
import { PrismaService } from '../prisma/prisma.service';
import { OHLCV } from './technical-analysis.lib';

export interface HistoricalDataResult {
  symbol: string;
  timeframes: {
    [timeframe: string]: {
      available: boolean;
      candles: OHLCV[];
      count: number;
    };
  };
}

const TIMEFRAMES = [
  { alpaca: '1Day', label: '1Day', limit: 252, daysBack: 365 },
  { alpaca: '4Hour', label: '4Hour', limit: 300, daysBack: 90 },
  { alpaca: '1Hour', label: '1Hour', limit: 300, daysBack: 45 },
  { alpaca: '15Min', label: '15Min', limit: 300, daysBack: 15 },
  { alpaca: '5Min', label: '5Min', limit: 150, daysBack: 5 },
];

@Injectable()
export class HistoricalDataAgent {
  private readonly logger = new Logger(HistoricalDataAgent.name);

  constructor(
    private readonly alpaca: AlpacaService,
    private readonly prisma: PrismaService,
  ) {}

  async run(symbol: string): Promise<HistoricalDataResult> {
    this.logger.log(`Fetching historical data for ${symbol}`);

    const result: HistoricalDataResult = { symbol, timeframes: {} };

    for (const tf of TIMEFRAMES) {
      try {
        const start = new Date(Date.now() - tf.daysBack * 24 * 60 * 60 * 1000).toISOString();
        const bars = await this.alpaca.getBars(symbol, tf.alpaca, tf.limit, start);

        const candles: OHLCV[] = bars.map((b: AlpacaBar) => ({
          timestamp: b.t,
          open: b.o,
          high: b.h,
          low: b.l,
          close: b.c,
          volume: b.v,
          vwap: b.vw,
        }));

        result.timeframes[tf.label] = {
          available: candles.length > 0,
          candles,
          count: candles.length,
        };

        // Persist (upsert to avoid duplicates)
        if (candles.length > 0) {
          const upserts = candles.map((c) =>
            this.prisma.historicalPrice.upsert({
              where: {
                symbol_timeframe_timestamp: {
                  symbol,
                  timeframe: tf.label,
                  timestamp: new Date(c.timestamp),
                },
              },
              update: {
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: BigInt(Math.round(c.volume)),
                vwap: c.vwap || null,
              },
              create: {
                symbol,
                timeframe: tf.label,
                timestamp: new Date(c.timestamp),
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: BigInt(Math.round(c.volume)),
                vwap: c.vwap || null,
              },
            }),
          );
          await Promise.allSettled(upserts);
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch ${tf.alpaca} bars for ${symbol}: ${error.message}`);
        result.timeframes[tf.label] = { available: false, candles: [], count: 0 };
      }
    }

    return result;
  }
}
