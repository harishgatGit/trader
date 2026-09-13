import { Injectable, NotFoundException, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketDataAgent } from '../../agents/market-data.agent';
import { sanitizeSymbol } from '../../agents/orchestrator.agent';
import { AlpacaService } from '../../services/alpaca.service';
import OpenAI from 'openai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { OpenAIRateLimiterService } from '../../agents/openai-rate-limiter.service';
import { OPENAI_TOKEN_ESTIMATES } from '../../agents/openai-token-estimates';

export interface SwingCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const SwingAIContextSchema = z.object({
  trendBias: z.enum(['BULLISH', 'BEARISH', 'NEUTRAL']),
  summary: z.string(),
  keyObservation: z.string(),
});
export type SwingAIContext = z.infer<typeof SwingAIContextSchema>;

export interface CachedAsset {
  symbol: string;
  name: string;
  exchange: string;
}

@Injectable()
export class StocksService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StocksService.name);
  private assetsCache: CachedAsset[] = [];
  private readonly cacheFilePath = path.join(__dirname, '..', '..', 'assets', 'stocks_cache.json');

  // Fallback list of top stocks to ensure autocomplete works even if Alpaca/file is completely offline
  private readonly fallbackAssets: CachedAsset[] = [
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
    { symbol: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'NASDAQ' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
    { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ' },
    { symbol: 'META', name: 'Meta Platforms, Inc.', exchange: 'NASDAQ' },
    { symbol: 'BRK.A', name: 'Berkshire Hathaway Inc.', exchange: 'NYSE' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE' },
    { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE' },
    { symbol: 'PG', name: 'Procter & Gamble Company', exchange: 'NYSE' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE' },
    { symbol: 'UNH', name: 'UnitedHealth Group Incorporated', exchange: 'NYSE' },
    { symbol: 'HD', name: 'The Home Depot, Inc.', exchange: 'NYSE' },
    { symbol: 'MA', name: 'Mastercard Incorporated', exchange: 'NYSE' },
    { symbol: 'CI', name: 'The Cigna Group', exchange: 'NYSE' },
    { symbol: 'LLY', name: 'Eli Lilly and Company', exchange: 'NYSE' },
    { symbol: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ' },
    { symbol: 'COST', name: 'Costco Wholesale Corporation', exchange: 'NASDAQ' },
    { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', exchange: 'NASDAQ' },
  ];

  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataAgent: MarketDataAgent,
    private readonly alpaca: AlpacaService,
    private readonly config: ConfigService,
    private readonly rateLimiter: OpenAIRateLimiterService,
  ) {
    this.openai = new OpenAI({ apiKey: this.config.get('OPENAI_API_KEY') || 'mock-key-not-configured' });
    this.model = this.config.get('OPENAI_MODEL', 'gpt-4o');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOP MOVERS — cached in-memory for 1 hour
  // ─────────────────────────────────────────────────────────────────────────
  private moversCache: { symbols: string[]; fetchedAt: number } | null = null;
  private readonly MOVERS_UNIVERSE = [
    'AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','AVGO','LLY','JPM',
    'V','UNH','XOM','JNJ','PG','HD','MA','BAC','ABBV','MRK',
    'COST','ORCL','AMD','QCOM','NFLX','TMO','IBM','GS','ADBE','INTU',
    'CRM','NOW','PANW','AMAT','MRVL','KLAC','LRCX','TXN','INTC','MU',
  ];

  async getTopMovers(): Promise<{ symbol: string; changePercent: number; label: string }[]> {
    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();

    // Return cached result if still fresh
    if (this.moversCache && now - this.moversCache.fetchedAt < ONE_HOUR) {
      return this.moversCache.symbols.map(s => ({ symbol: s, changePercent: 0, label: 'cached' }));
    }

    try {
      const snapshots = await this.alpaca.getSnapshots(this.MOVERS_UNIVERSE);
      const withChange = Object.entries(snapshots)
        .filter(([, snap]) => snap?.dailyBar)
        .map(([symbol, snap]: [string, any]) => {
          const close = snap.dailyBar?.c ?? snap.latestTrade?.p ?? 0;
          const open  = snap.dailyBar?.o ?? close;
          const changePercent = open > 0 ? ((close - open) / open) * 100 : 0;
          return { symbol, changePercent };
        })
        .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
        .slice(0, 10)
        .map(m => ({
          symbol: m.symbol,
          changePercent: parseFloat(m.changePercent.toFixed(2)),
          label: m.changePercent >= 0 ? 'gainer' : 'loser',
        }));

      this.moversCache = { symbols: withChange.map(m => m.symbol), fetchedAt: now };
      return withChange;
    } catch (err: any) {
      this.logger.warn(`getTopMovers failed: ${err.message}. Returning fallback.`);
      // Return a shuffled subset of the universe as graceful fallback
      const fallback = [...this.MOVERS_UNIVERSE].sort(() => Math.random() - 0.5).slice(0, 10);
      return fallback.map(s => ({ symbol: s, changePercent: 0, label: 'popular' }));
    }
  }

  async onApplicationBootstrap() {
    // 1. Try to load from local cached file first (immediate availability)
    this.loadCacheFromFile();

    // 2. Fetch fresh list from Alpaca in background
    this.refreshCacheFromAlpaca();
  }

  private loadCacheFromFile() {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const data = fs.readFileSync(this.cacheFilePath, 'utf8');
        this.assetsCache = JSON.parse(data);
        this.logger.log(`Loaded ${this.assetsCache.length} stocks from local cache file.`);
      } else {
        this.assetsCache = [...this.fallbackAssets];
        this.logger.log(`No cache file found. Initialized with ${this.assetsCache.length} fallback stocks.`);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to read cache file: ${err.message}. Using fallback assets.`);
      this.assetsCache = [...this.fallbackAssets];
    }
  }

  private async refreshCacheFromAlpaca() {
    this.logger.log('Starting background refresh of stock assets from Alpaca...');
    try {
      const assets = await this.alpaca.getAssets();
      if (assets && assets.length > 0) {
        // Filter for active tradeable stocks, indices, and ETFs
        const filtered = assets
          .filter((a: any) => a.tradable && a.status === 'active')
          .map((a: any) => ({
            symbol: a.symbol,
            name: a.name,
            exchange: a.exchange,
          }));

        if (filtered.length > 0) {
          this.assetsCache = filtered;
          this.logger.log(`Successfully fetched and cached ${filtered.length} tradable assets from Alpaca.`);
          this.saveCacheToFile();
        }
      }
    } catch (err: any) {
      this.logger.error(`Failed to refresh assets from Alpaca: ${err.message}`);
    }
  }

  private saveCacheToFile() {
    try {
      const dir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.assetsCache, null, 2), 'utf8');
      this.logger.log(`Saved ${this.assetsCache.length} assets to ${this.cacheFilePath}`);
    } catch (err: any) {
      this.logger.warn(`Failed to save cache file: ${err.message}`);
    }
  }

  /** All known tradable ticker symbols, uppercased — used to validate candidate
   * tickers extracted from free text (e.g. social-trending discovery) so a
   * random capitalized word ("CEO", "USA") doesn't get treated as a real symbol. */
  getSymbolSet(): Set<string> {
    return new Set(this.assetsCache.map((a) => a.symbol.toUpperCase()));
  }

  async searchAssets(query: string): Promise<CachedAsset[]> {
    if (!query) return [];
    const cleanQuery = query.toUpperCase().trim();
    if (!cleanQuery) return [];

    const exactSymbolMatches: CachedAsset[] = [];
    const startsWithSymbolMatches: CachedAsset[] = [];
    const nameMatches: CachedAsset[] = [];

    for (const asset of this.assetsCache) {
      const sym = asset.symbol.toUpperCase();
      const name = asset.name.toUpperCase();

      if (sym === cleanQuery) {
        exactSymbolMatches.push(asset);
      } else if (sym.startsWith(cleanQuery)) {
        startsWithSymbolMatches.push(asset);
      } else if (name.includes(cleanQuery)) {
        nameMatches.push(asset);
      }
    }

    startsWithSymbolMatches.sort((a, b) => a.symbol.localeCompare(b.symbol));
    nameMatches.sort((a, b) => a.symbol.localeCompare(b.symbol));

    const combined = [...exactSymbolMatches, ...startsWithSymbolMatches, ...nameMatches];
    
    const seen = new Set<string>();
    const unique: CachedAsset[] = [];
    for (const asset of combined) {
      if (!seen.has(asset.symbol)) {
        seen.add(asset.symbol);
        unique.push(asset);
      }
    }

    return unique.slice(0, 30);
  }

  async getLatestReport(rawSymbol: string) {
    const symbol = sanitizeSymbol(rawSymbol);
    const report = await this.prisma.agentReport.findFirst({
      where: { symbol, status: 'completed' },
      orderBy: { createdAt: 'desc' },
    });

    if (!report) {
      throw new NotFoundException(`No reports found for ${symbol}`);
    }

    return {
      ...report,
      reportJson: report.reportJson,
    };
  }

  async getReports(rawSymbol: string) {
    const symbol = sanitizeSymbol(rawSymbol);
    return this.prisma.agentReport.findMany({
      where: { symbol },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        symbol: true,
        finalRating: true,
        confidenceScore: true,
        currentPrice: true,
        technicalScore: true,
        executiveSummary: true,
        createdAt: true,
        status: true,
      },
    });
  }

  async getMarketData(rawSymbol: string) {
    const symbol = sanitizeSymbol(rawSymbol);
    const snapshot = await this.marketDataAgent.run(symbol);
    const historical = await this.prisma.marketSnapshot.findFirst({
      where: { symbol },
      orderBy: { timestamp: 'desc' },
    });
    return {
      live: snapshot,
      historical: historical
        ? {
            ...historical,
            volume: historical.volume ? Number(historical.volume) : null,
          }
        : null,
    };
  }

  async getTechnicals(rawSymbol: string) {
    const symbol = sanitizeSymbol(rawSymbol);
    const latest = await this.prisma.technicalIndicator.findFirst({
      where: { symbol, timeframe: '1Day' },
      orderBy: { timestamp: 'desc' },
    });

    const candles = await this.prisma.historicalPrice.findMany({
      where: { symbol, timeframe: '1Day' },
      orderBy: { timestamp: 'asc' },
      take: 200,
    });

    return {
      indicators: latest
        ? {
            ...latest,
            obv: latest.obv ? Number(latest.obv) : null,
          }
        : null,
      candles: candles.map((c) => ({
        time: c.timestamp.toISOString().split('T')[0],
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: Number(c.volume),
        vwap: c.vwap,
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SWING DASHBOARD — real 1H candles + live price from Alpaca (never
  // web-scraped), with an optional short OpenAI read using that real data
  // as context. AI failure is non-fatal — price/candles still return.
  // ─────────────────────────────────────────────────────────────────────────

  async getSwingData(rawSymbol: string): Promise<{
    symbol: string;
    currentPrice: number;
    candles: SwingCandle[];
    aiContext: SwingAIContext | null;
  }> {
    const symbol = sanitizeSymbol(rawSymbol);

    // Alpaca requires an explicit `start` for intraday timeframes — 30 calendar
    // days comfortably covers 100 hourly bars (~15 trading days) with margin
    // for weekends/holidays, matching HistoricalDataAgent's 1Hour window.
    //
    // Alpaca's bars endpoint returns oldest-first starting at `start`, capped
    // by `limit` — a 30-day window holds well over 100 trading hours, so a
    // `limit: 100` request here silently truncates to the OLDEST 100 bars in
    // the window (ending roughly a week ago), not the most recent ones. Ask
    // for far more than can exist in the window, then take the newest 100.
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [snapshot, rawBars] = await Promise.all([
      this.alpaca.getSnapshot(symbol),
      this.alpaca.getBars(symbol, '1Hour', 1000, start),
    ]);
    const bars = rawBars.slice(-100);

    if (!bars || bars.length === 0) {
      throw new NotFoundException(`No intraday price data available for ${symbol}.`);
    }

    const candles: SwingCandle[] = bars.map((b) => ({
      time: new Date(b.t).getTime(),
      open: b.o,
      high: b.h,
      low: b.l,
      close: b.c,
      volume: b.v,
    }));

    const currentPrice =
      snapshot?.latestTrade?.p ?? snapshot?.minuteBar?.c ?? candles[candles.length - 1].close;

    const aiContext = await this.getSwingAIContext(symbol, candles, currentPrice);

    return { symbol, currentPrice, candles, aiContext };
  }

  private async getSwingAIContext(
    symbol: string,
    candles: SwingCandle[],
    currentPrice: number,
  ): Promise<SwingAIContext | null> {
    try {
      // Keep the prompt small — last 30 hourly bars is enough context for a
      // short technical read without a heavyweight token spend.
      const recent = candles.slice(-30);
      const systemPrompt =
        'You are a swing-trading technical analyst. Given recent 1-hour OHLCV candles for a US stock, ' +
        'return a concise structured read based only on that data. Respond with JSON only.';
      const userPrompt = [
        `Symbol: ${symbol}`,
        `Current price: $${currentPrice.toFixed(2)}`,
        `Most recent ${recent.length} hourly candles (oldest to newest), each as [open,high,low,close,volume]:`,
        JSON.stringify(recent.map((c) => [c.open, c.high, c.low, c.close, c.volume])),
        '',
        'Return JSON: { "trendBias": "BULLISH"|"BEARISH"|"NEUTRAL", "summary": "<=280 chars", "keyObservation": "<=160 chars" }',
      ].join('\n');

      await this.rateLimiter.acquire(OPENAI_TOKEN_ESTIMATES.SWING_AI_CONTEXT);
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 400,
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) return null;

      const result = SwingAIContextSchema.safeParse(JSON.parse(raw));
      return result.success ? result.data : null;
    } catch (err: any) {
      this.logger.warn(`Swing AI context failed for ${symbol}: ${err.message}`);
      return null;
    }
  }
}
