import { Injectable, Logger } from '@nestjs/common';
import { AlpacaService, AlpacaSnapshot } from '../services/alpaca.service';
import { PrismaService } from '../prisma/prisma.service';

export interface MarketDataResult {
  symbol: string;
  available: boolean;
  price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  vwap: number | null;
  bid: number | null;
  ask: number | null;
  spread: number | null;
  changePercent: number | null;
  timestamp: string | null;
  raw: AlpacaSnapshot | null;
}

@Injectable()
export class MarketDataAgent {
  private readonly logger = new Logger(MarketDataAgent.name);

  constructor(
    private readonly alpaca: AlpacaService,
    private readonly prisma: PrismaService,
  ) {}

  async run(symbol: string): Promise<MarketDataResult> {
    this.logger.log(`Fetching market data for ${symbol}`);

    const snapshot = await this.alpaca.getSnapshot(symbol);

    if (!snapshot) {
      return {
        symbol, available: false,
        price: null, open: null, high: null, low: null, close: null,
        volume: null, vwap: null, bid: null, ask: null,
        spread: null, changePercent: null, timestamp: null, raw: null,
      };
    }

    const price = snapshot.latestTrade?.p || snapshot.minuteBar?.c || null;
    const bid = snapshot.latestQuote?.bp || null;
    const ask = snapshot.latestQuote?.ap || null;
    const spread = bid && ask ? +(ask - bid).toFixed(4) : null;

    let changePercent: number | null = null;
    if (snapshot.dailyBar && snapshot.prevDailyBar) {
      const prevClose = snapshot.prevDailyBar.c;
      const currentClose = snapshot.dailyBar.c;
      changePercent = prevClose > 0 ? +((currentClose - prevClose) / prevClose * 100).toFixed(2) : null;
    }

    // Persist snapshot
    try {
      await this.prisma.marketSnapshot.create({
        data: {
          symbol,
          price,
          open: snapshot.dailyBar?.o || null,
          high: snapshot.dailyBar?.h || null,
          low: snapshot.dailyBar?.l || null,
          close: snapshot.dailyBar?.c || null,
          volume: snapshot.dailyBar?.v ? BigInt(Math.round(snapshot.dailyBar.v)) : null,
          vwap: snapshot.dailyBar?.vw || null,
          bid,
          ask,
          spread,
          raw: snapshot as any,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to persist market snapshot: ${e.message}`);
    }

    return {
      symbol, available: true, price,
      open: snapshot.dailyBar?.o || null,
      high: snapshot.dailyBar?.h || null,
      low: snapshot.dailyBar?.l || null,
      close: snapshot.dailyBar?.c || null,
      volume: snapshot.dailyBar?.v || null,
      vwap: snapshot.dailyBar?.vw || null,
      bid, ask, spread, changePercent,
      timestamp: snapshot.latestTrade?.t || new Date().toISOString(),
      raw: snapshot,
    };
  }
}
