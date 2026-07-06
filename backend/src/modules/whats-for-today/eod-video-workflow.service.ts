import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VideoJobService } from '../video/video-job.service';
import { TrendingScraperService } from '../../services/trending-scraper.service';

@Injectable()
export class EODVideoWorkflowService {
  private readonly logger = new Logger(EODVideoWorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly videoJobService: VideoJobService,
    private readonly trendingScraper: TrendingScraperService,
  ) {}

  /**
   * Runs every weekday after market close (~5:45 PM EST).
   * 1. Fetches top 5 trending tickers and fires a SHORTS video job for each.
   * 2. Fetches WhatsForToday Run 4 (EOD report) and fires one MARKET_RECAP video.
   */
  async runEODWorkflow(): Promise<{ shorts: string[]; marketRecap: boolean }> {
    // Use UTC date. The cron fires at 5:45 PM EST = 9:45 PM UTC, so UTC date always
    // matches the trading date. For manual triggers before midnight UTC the UTC date
    // is also correct since all data (WFT reports, AgentReports) is stored in UTC.
    const today = new Date().toISOString().split('T')[0];

    this.logger.log(`[EOD] Starting EOD video workflow for market date ${today}...`);

    const firedShorts = await this.fireTop5Shorts(today);
    const marketRecap = await this.fireMarketRecapVideo(today);

    this.logger.log(
      `[EOD] Completed. SHORTS fired: ${firedShorts.length}/5, MARKET_RECAP: ${marketRecap}`,
    );
    return { shorts: firedShorts, marketRecap };
  }

  // ── Step 1: SHORTS for top 5 trending stocks ────────────────────────────────

  private async fireTop5Shorts(today: string): Promise<string[]> {
    const fired: string[] = [];
    try {
      const trending = await this.trendingScraper.fetchTrendingTickers(10);
      const top5 = trending.slice(0, 5);
      this.logger.log(`[EOD] Top 5 trending: ${top5.join(', ')}`);

      for (const symbol of top5) {
        try {
          const report = await this.findTodaysReport(symbol, today);
          if (!report) {
            this.logger.warn(`[EOD] No analysis for ${symbol} today — skipping its SHORTS.`);
            continue;
          }
          await this.videoJobService.fireAndForget(
            symbol, today, report.id, report.reportJson, false, 'SHORTS',
          );
          fired.push(symbol);
          this.logger.log(`[EOD] SHORTS queued for ${symbol}`);
        } catch (err: any) {
          this.logger.error(`[EOD] SHORTS failed for ${symbol}: ${err.message}`);
        }
      }
    } catch (err: any) {
      this.logger.error(`[EOD] Error in top-5 SHORTS step: ${err.message}`);
    }
    return fired;
  }

  private async findTodaysReport(symbol: string, today: string) {
    const startOfDay = new Date(`${today}T00:00:00.000Z`);
    const endOfDay = new Date(`${today}T23:59:59.999Z`);
    return this.prisma.agentReport.findFirst({
      where: {
        symbol: symbol.toUpperCase(),
        status: 'completed',
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Step 2: MARKET_RECAP long-form storytelling video ──────────────────────

  private async fireMarketRecapVideo(today: string): Promise<boolean> {
    try {
      const run4 = await this.prisma.dailyMarketReport.findUnique({
        where: { date_runNumber: { date: today, runNumber: 4 } },
        include: { sectors: true },
      });

      if (!run4) {
        this.logger.warn(`[EOD] No WhatsForToday Run 4 for ${today}. Market recap skipped.`);
        return false;
      }

      const topStocks = await this.getTodaysTopStocks(today, 5);
      const payload = this.buildMarketRecapPayload(run4, topStocks, today);

      await this.videoJobService.fireAndForget(
        'MARKET_RECAP',
        today,
        `market-recap-${today}`,
        payload,
        false,
        'MARKET_RECAP',
      );
      return true;
    } catch (err: any) {
      this.logger.error(`[EOD] MARKET_RECAP failed: ${err.message}`);
      return false;
    }
  }

  private async getTodaysTopStocks(today: string, limit: number) {
    const startOfDay = new Date(`${today}T00:00:00.000Z`);
    const endOfDay = new Date(`${today}T23:59:59.999Z`);
    const reports = await this.prisma.agentReport.findMany({
      where: { status: 'completed', createdAt: { gte: startOfDay, lt: endOfDay } },
      orderBy: { confidenceScore: 'desc' },
      take: limit,
      select: {
        symbol: true, currentPrice: true, finalRating: true,
        executiveSummary: true, confidenceScore: true,
      },
    });
    return reports.map(r => ({
      symbol: r.symbol,
      price: r.currentPrice,
      signal: r.finalRating,
      confidence: r.confidenceScore,
      summary: r.executiveSummary?.slice(0, 200) ?? '',
    }));
  }

  private buildMarketRecapPayload(run4: any, topStocks: any[], date: string): any {
    return {
      type: 'MARKET_RECAP',
      date,
      title: run4.title || `Market Recap: ${date}`,
      mood: run4.mood,
      marketStorySummary: run4.marketStorySummary,
      catalystSummary: run4.catalystSummary,
      indexMovements: run4.indexMovements || {},
      economicEvents: run4.economicEvents || [],
      newsSentiment: run4.newsSentiment,
      volumeBehavior: run4.volumeBehavior,
      volatilityLevel: run4.volatilityLevel,
      riskLevel: run4.riskLevel,
      beginnerExplanation: run4.beginnerExplanation,
      sectors: (run4.sectors || []).slice(0, 4).map((s: any) => ({
        name: s.sectorName,
        trend: s.trend,
        reasoning: (s.reasoning || '').slice(0, 250),
        catalyst: (s.catalyst || '').slice(0, 200),
        volumeStrength: s.volumeStrength,
        riskLevel: s.riskLevel,
      })),
      trendingStocks: topStocks,
    };
  }
}
