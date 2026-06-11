import { Injectable, NotFoundException, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketDataAgent } from '../../agents/market-data.agent';
import { sanitizeSymbol } from '../../agents/orchestrator.agent';
import { AlpacaService } from '../../services/alpaca.service';
import * as fs from 'fs';
import * as path from 'path';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataAgent: MarketDataAgent,
    private readonly alpaca: AlpacaService,
  ) {}

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
}
