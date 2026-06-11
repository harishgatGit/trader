import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AlpacaService, DataQualityProbe } from '../../services/alpaca.service';

export interface ConsistencyStats {
  totalAnalyses: number;
  analyzedSymbols: number;
  missingPriceCount: number;
  missingPricePct: number;
  missingVolumeCount: number;
  missingVolumePct: number;
  insufficientDataCount: number;
  insufficientDataPct: number;
  lowDataCount: number;
  lowDataPct: number;
  noSnapshotCount: number;
  noSnapshotPct: number;
  noBarsCount: number;
  noBarsPct: number;
  topFailingSymbols: Array<{ symbol: string; failCount: number; lastFailed: string }>;
}

export interface DataGapEntry {
  symbol: string;
  reportId: string;
  analyzedAt: string;
  dataQualityRating: string;
  priceAvailable: boolean;
  volumeAvailable: boolean;
  snapshotAvailable: boolean;
  barsAvailable: boolean;
  newsAvailable: boolean;
  missingFields: string[];
  finalRating: string;
}

@Injectable()
export class DataQualityService {
  private readonly logger = new Logger(DataQualityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alpaca: AlpacaService,
  ) {}

  async probeSymbol(symbol: string): Promise<DataQualityProbe> {
    return this.alpaca.probeSymbol(symbol);
  }

  async getHistoricalConsistency(): Promise<ConsistencyStats> {
    // Pull the last 500 agent reports for aggregation
    const reports = await this.prisma.agentReport.findMany({
      take: 500,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        symbol: true,
        createdAt: true,
        currentPrice: true,
        reportJson: true,
      },
    });

    const total = reports.length;
    if (total === 0) {
      return this.emptyStats();
    }

    let missingPrice = 0;
    let missingVolume = 0;
    let insufficientData = 0;
    let lowData = 0;
    let noSnapshot = 0;
    let noBars = 0;

    const symbolFailCounts: Record<string, { count: number; lastFailed: string }> = {};

    for (const r of reports) {
      const json = r.reportJson as any;
      const dq = json?.dataQuality;
      const rating = dq?.rating as string;

      // Price missing
      if (!r.currentPrice && !json?.currentPrice) {
        missingPrice++;
        this.trackFail(symbolFailCounts, r.symbol, r.createdAt.toISOString());
      }

      // Volume missing (check raw marketData if stored, fallback to price presence for old records)
      const hasVolumeDataSaved = json?.marketData !== undefined;
      const volume = json?.marketData?.volume;
      const volumeAvailable = hasVolumeDataSaved ? (volume != null && volume !== 0) : !!(r.currentPrice || json?.currentPrice);
      if (!volumeAvailable) {
        missingVolume++;
      }

      // Data quality rating
      if (rating === 'INSUFFICIENT') {
        insufficientData++;
        this.trackFail(symbolFailCounts, r.symbol, r.createdAt.toISOString());
      } else if (rating === 'LOW') {
        lowData++;
      }

      // Snapshot availability — market data agent sets available: false when snapshot is null
      const marketDataAvailable = json?.marketData?.available;
      if (marketDataAvailable === false) {
        noSnapshot++;
        this.trackFail(symbolFailCounts, r.symbol, r.createdAt.toISOString());
      }

      // Bars availability — check technicals
      const techTimeframes = json?.technicals?.timeframes as string[] | undefined;
      if (!techTimeframes || techTimeframes.length === 0) {
        noBars++;
      }
    }

    const topFailingSymbols = Object.entries(symbolFailCounts)
      .map(([symbol, { count, lastFailed }]) => ({ symbol, failCount: count, lastFailed }))
      .sort((a, b) => b.failCount - a.failCount)
      .slice(0, 10);

    const uniqueSymbols = new Set(reports.map(r => r.symbol)).size;

    return {
      totalAnalyses: total,
      analyzedSymbols: uniqueSymbols,
      missingPriceCount: missingPrice,
      missingPricePct: this.pct(missingPrice, total),
      missingVolumeCount: missingVolume,
      missingVolumePct: this.pct(missingVolume, total),
      insufficientDataCount: insufficientData,
      insufficientDataPct: this.pct(insufficientData, total),
      lowDataCount: lowData,
      lowDataPct: this.pct(lowData, total),
      noSnapshotCount: noSnapshot,
      noSnapshotPct: this.pct(noSnapshot, total),
      noBarsCount: noBars,
      noBarsPct: this.pct(noBars, total),
      topFailingSymbols,
    };
  }

  async getDataGapReport(): Promise<DataGapEntry[]> {
    const reports = await this.prisma.agentReport.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        symbol: true,
        createdAt: true,
        finalRating: true,
        currentPrice: true,
        reportJson: true,
      },
    });

    return reports.map((r) => {
      const json = r.reportJson as any;
      const dq = json?.dataQuality;
      const missingFields: string[] = dq?.missingFields || [];

      const priceAvailable = !!(r.currentPrice || json?.currentPrice);
      const hasVolumeDataSaved = json?.marketData !== undefined;
      const volumeAvailable = hasVolumeDataSaved ? !!(json?.marketData?.volume) : priceAvailable;
      const snapshotAvailable = json?.marketData?.available !== false;
      const barsAvailable = !!(json?.technicals?.timeframes && json.technicals.timeframes.length > 0);
      const newsAvailable = json?.newsAndCatalysts?.overallSentiment !== 'UNAVAILABLE';

      return {
        symbol: r.symbol,
        reportId: r.id,
        analyzedAt: r.createdAt.toISOString(),
        dataQualityRating: dq?.rating || 'UNKNOWN',
        priceAvailable,
        volumeAvailable,
        snapshotAvailable,
        barsAvailable,
        newsAvailable,
        missingFields,
        finalRating: r.finalRating,
      };
    });
  }

  private pct(count: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((count / total) * 100 * 10) / 10;
  }

  private trackFail(
    map: Record<string, { count: number; lastFailed: string }>,
    symbol: string,
    at: string,
  ) {
    if (!map[symbol]) map[symbol] = { count: 0, lastFailed: at };
    map[symbol].count++;
    if (at > map[symbol].lastFailed) map[symbol].lastFailed = at;
  }

  private emptyStats(): ConsistencyStats {
    return {
      totalAnalyses: 0,
      analyzedSymbols: 0,
      missingPriceCount: 0,
      missingPricePct: 0,
      missingVolumeCount: 0,
      missingVolumePct: 0,
      insufficientDataCount: 0,
      insufficientDataPct: 0,
      lowDataCount: 0,
      lowDataPct: 0,
      noSnapshotCount: 0,
      noSnapshotPct: 0,
      noBarsCount: 0,
      noBarsPct: 0,
      topFailingSymbols: [],
    };
  }
}
