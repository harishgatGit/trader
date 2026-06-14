import { Injectable, Logger } from '@nestjs/common';
import { OrchestratorAgent, sanitizeSymbol } from '../../agents/orchestrator.agent';
import { PrismaService } from '../../prisma/prisma.service';
import { VideoJobService } from '../video/video-job.service';
import axios from 'axios';
import * as crypto from 'crypto';

export function isFundSymbol(symbol: string): boolean {
  const clean = symbol.toUpperCase().trim();
  const fundSymbols = [
    'SPY', 'QQQ', 'DIA', 'IWM', 'VOO', 'VTI', 'TLT', 'GLD', 'USO', 'XLF', 'XLK', 'XLE', 'XLV', 'XLY', 'XLP', 'XLI', 'IVV', 'VFIAX', 'FXAIX', 'ARKK',
    'SCHD', 'VUG', 'IEMG', 'BND', 'VWO', 'VEA', 'IEFA', 'AGG', 'EFA', 'IJH', 'IJR', 'IWF', 'IWD', 'VTV', 'VT', 'VXUS', 'QQQM', 'JEPI', 'JEPQ', 'SCHB', 'ITOT', 'USMV', 'DVY', 'EEM', 'VIG', 'VYM'
  ];
  if (fundSymbols.includes(clean)) return true;
  if (clean.includes('FUND') || clean.includes('ETF') || clean.includes('TRUST') || clean.includes('INDEX') || clean.includes('MUTUAL')) return true;
  return false;
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly orchestrator: OrchestratorAgent,
    private readonly prisma: PrismaService,
    private readonly videoJobService: VideoJobService,
  ) {}

  async analyze(symbol: string, user?: any, bypassCache = false, ip?: string) {
    const clean = sanitizeSymbol(symbol);
    let userId = user?.id;
    let role = user?.role || 'BASIC';

    // 1. Log search activity
    try {
      let city = 'Unknown';
      let state = 'Unknown';
      if (ip) {
        const geo = await this.geolocateIp(ip);
        city = geo.city;
        state = geo.state;
      }

      if (!userId) {
        let systemAdmin = await this.prisma.user.findUnique({
          where: { username: 'systemadmin' },
        });
        if (!systemAdmin) {
          const salt = crypto.randomBytes(16).toString('hex');
          const hash = crypto.scryptSync('systemadmin123', salt, 64).toString('hex');
          const passwordHash = `${salt}:${hash}`;
          systemAdmin = await this.prisma.user.create({
            data: {
              username: 'systemadmin',
              passwordHash,
              role: 'SUPERUSER',
            },
          });
        }
        userId = systemAdmin.id;
        role = 'SUPERUSER';
      }

      await this.prisma.searchLog.create({
        data: {
          userId,
          symbol: clean,
          ipAddress: ip || 'Unknown',
          city,
          state,
        },
      });
      this.logger.log(`Logged search for user ${userId} symbol ${clean} from IP ${ip || 'unknown'} (${city}, ${state})`);
    } catch (err: any) {
      this.logger.error(`Failed to create search log for symbol ${clean}`, err?.stack);
    }

    // 2. Determine cache duration limit based on user role
    const cacheLimitMins = role === 'SUPERUSER' ? 5 : 15;

    // Intercept if it is a Fund Symbol
    const isFund = isFundSymbol(clean);
    if (isFund) {
      // Check cache for existing completed fund report
      try {
        const latestReport = bypassCache ? null : await this.prisma.agentReport.findFirst({
          where: { symbol: clean, status: 'completed' },
          orderBy: { createdAt: 'desc' },
        });

        if (latestReport && (latestReport.reportJson as any)?.isFund === true) {
          const now = new Date();
          const ageInMs = now.getTime() - latestReport.createdAt.getTime();
          const ageInMins = ageInMs / (1000 * 60);

          if (ageInMins < cacheLimitMins) {
            this.logger.log(`Cache hit for fund ${clean}. Age: ${ageInMins.toFixed(1)} mins. Returning cached report.`);
            const generatedXMinutesAgo = Math.round(ageInMins);
            const regenerateInYMinutes = Math.max(0, Math.ceil(cacheLimitMins - ageInMins));
            const todayStr = new Date().toISOString().split('T')[0];

            return {
              symbol: clean,
              ticker: clean,
              analysisDate: todayStr,
              reportId: latestReport.id,
              progress: [
                { step: 'Market Data', status: 'skipped', message: 'Not needed for fund analysis' },
                { step: 'Historical Data', status: 'skipped', message: 'Not needed for fund analysis' },
                { step: 'Technical Analysis', status: 'skipped', message: 'Not needed for fund analysis' },
                { step: 'Fundamental Data', status: 'skipped', message: 'Not needed for fund analysis' },
                { step: 'News & Events', status: 'skipped', message: 'Not needed for fund analysis' },
                { step: 'Institutional Flow Proxy', status: 'skipped', message: 'Not needed for fund analysis' },
                { step: 'Ecosystem Insights', status: 'skipped', message: 'Not needed for fund analysis' },
                { step: 'Daily Trend Analyst', status: 'skipped', message: 'Not needed for fund analysis' },
                { step: 'Trend Story Analyst', status: 'skipped', message: 'Not needed for fund analysis' },
                { step: 'Fund Review', status: 'done', message: 'Loaded cached fund review' }
              ] as any,
              report: {
                ...(latestReport.reportJson as any),
                id: latestReport.id,
                createdAt: latestReport.createdAt,
                processingTimeMs: latestReport.processingTime,
              },
              analysisReport: {
                ...(latestReport.reportJson as any),
                id: latestReport.id,
                createdAt: latestReport.createdAt,
                processingTimeMs: latestReport.processingTime,
              },
              video: { status: 'SKIPPED', message: 'Video not generated for funds.' },
              processingTimeMs: latestReport.processingTime || 0,
              cache: {
                cached: true,
                role,
                cacheLimitMins,
                generatedXMinutesAgo,
                regenerateInYMinutes,
              }
            };
          }
        }
      } catch (cacheErr: any) {
        this.logger.error(`Error checking cache for fund ${clean}:`, cacheErr?.stack);
      }

      // Run separate fund analysis pipeline
      this.logger.log(`Cache miss or expired for fund ${clean}. Running separate fund analysis pipeline.`);
      const result = await this.orchestrator.runFundAnalysis(clean);
      return {
        ...result,
        cache: {
          cached: false,
          role,
          cacheLimitMins,
          generatedXMinutesAgo: 0,
          regenerateInYMinutes: cacheLimitMins,
        }
      };
    }

    // 3. Check for existing completed report (skip if bypassCache is true)
    try {
      const latestReport = bypassCache ? null : await this.prisma.agentReport.findFirst({
        where: { symbol: clean, status: 'completed' },
        orderBy: { createdAt: 'desc' },
      });

      if (latestReport) {
        const now = new Date();
        const ageInMs = now.getTime() - latestReport.createdAt.getTime();
        const ageInMins = ageInMs / (1000 * 60);

        if (ageInMins < cacheLimitMins) {
          this.logger.log(`Cache hit for ${clean}. Age: ${ageInMins.toFixed(1)} mins (limit: ${cacheLimitMins} mins). Returning cached report.`);

          // Query latest snapshots to construct full response format
          const [marketData, technicalIndicator, prevTechnicalIndicator, fundamentalSnapshot, newsEvents, flow] = await Promise.all([
            this.prisma.marketSnapshot.findFirst({
              where: { symbol: clean },
              orderBy: { timestamp: 'desc' },
            }),
            this.prisma.technicalIndicator.findFirst({
              where: { symbol: clean },
              orderBy: { timestamp: 'desc' },
            }),
            this.prisma.technicalIndicator.findMany({
              where: { symbol: clean },
              orderBy: { timestamp: 'desc' },
              skip: 1,
              take: 1,
            }).then(rows => rows[0] || null),
            this.prisma.fundamentalSnapshot.findFirst({
              where: { symbol: clean },
              orderBy: { timestamp: 'desc' },
            }),
            this.prisma.newsEvent.findMany({
              where: { symbol: clean },
              orderBy: { createdAt: 'desc' },
              take: 10,
            }),
            this.prisma.institutionalFlow.findFirst({
              where: { symbol: clean },
              orderBy: { timestamp: 'desc' },
            }),
          ]);

          const liveMarketData = marketData ? {
            available: true,
            price: marketData.price,
            open: marketData.open,
            high: marketData.high,
            low: marketData.low,
            close: marketData.close,
            volume: marketData.volume ? Number(marketData.volume) : null,
            vwap: marketData.vwap,
            bid: marketData.bid,
            ask: marketData.ask,
            bidSize: marketData.bidSize,
            askSize: marketData.askSize,
            spread: marketData.spread,
            raw: marketData.raw,
          } : { available: false, price: latestReport.currentPrice };

          const liveTechnicals = technicalIndicator ? {
            available: true,
            primary: {
              ...technicalIndicator,
              obv: technicalIndicator.obv ? Number(technicalIndicator.obv) : null,
              rsi14Prev: prevTechnicalIndicator ? prevTechnicalIndicator.rsi14 : null,
            },
            timeframes: ['1Day'],
          } : { available: false, primary: null, timeframes: [] };

          const liveFundamentals = fundamentalSnapshot ? {
            available: fundamentalSnapshot.available,
            source: fundamentalSnapshot.source,
            marketCap: fundamentalSnapshot.marketCap,
            peRatio: fundamentalSnapshot.peRatio,
            pbRatio: fundamentalSnapshot.pbRatio,
            epsTrailing: fundamentalSnapshot.epsTrailing,
            epsForward: fundamentalSnapshot.epsForward,
            revenue: fundamentalSnapshot.revenue,
            debtToEquity: fundamentalSnapshot.debtToEquity,
            dividendYield: fundamentalSnapshot.dividendYield,
            beta: fundamentalSnapshot.beta,
            week52High: fundamentalSnapshot.week52High,
            week52Low: fundamentalSnapshot.week52Low,
            sector: fundamentalSnapshot.sector,
            industry: fundamentalSnapshot.industry,
            description: fundamentalSnapshot.description,
            raw: fundamentalSnapshot.raw,
          } : { available: false };

          const overallSentiment = newsEvents.length > 0
            ? (newsEvents[0].sentiment || 'NEUTRAL')
            : 'NEUTRAL';

          const liveNews = {
            available: newsEvents.length > 0,
            sentiment: overallSentiment,
            items: newsEvents.map(n => ({
              id: n.id,
              symbol: n.symbol,
              headline: n.headline,
              summary: n.summary,
              source: n.source,
              url: n.url,
              sentiment: n.sentiment,
              publishedAt: n.publishedAt,
            })),
          };

          const liveFlow = flow ? {
            proxyScore: flow.proxyScore,
            interpretation: flow.interpretation || 'NEUTRAL',
            signals: flow.signals,
            disclaimer: flow.disclaimer,
          } : { proxyScore: 50, interpretation: 'NEUTRAL', signals: [], disclaimer: '' };

          const generatedXMinutesAgo = Math.round(ageInMins);
          const regenerateInYMinutes = Math.max(0, Math.ceil(cacheLimitMins - ageInMins));

          const todayStr = new Date().toISOString().split('T')[0];
          // Check DB for existing video job status
          const videoJob = await this.prisma.videoGenerationJob.findUnique({
            where: {
              ticker_reportDate: {
                ticker: clean,
                reportDate: todayStr,
              },
            },
          });

          let videoResult: any = {};
          if (videoJob) {
            videoResult = {
              status: videoJob.status,
              jobId: videoJob.jobId || undefined,
              ...(videoJob.status === 'GENERATED' || videoJob.status === 'COMPLETED'
                ? { filePath: videoJob.finalVideoPath, message: `Video already generated today for ${clean}.` }
                : {}),
              ...(videoJob.status === 'NOT_ELIGIBLE'
                ? { message: videoJob.eligibilityNote || 'Not eligible for video generation.' }
                : {}),
              ...(videoJob.status === 'ERROR' || videoJob.status === 'FAILED'
                ? { error: videoJob.errorMessage }
                : {}),
            };
          } else {
            // No video job yet — fire-and-forget for the cached report
            this.logger.log(`Cache hit for ${clean} but no video job for today. Firing video request (fire-and-forget).`);
            this.videoJobService.fireAndForget(clean, todayStr, latestReport.id, latestReport.reportJson, false);
            videoResult = { status: 'RECEIVED', message: 'Video job submitted to video agent service (fire-and-forget).' };
          }

          const analysisReportObj = {
            ...(latestReport.reportJson as any),
            id: latestReport.id,
            createdAt: latestReport.createdAt,
            processingTimeMs: latestReport.processingTime,
            marketData: liveMarketData,
            technicals: liveTechnicals,
            fundamentals: liveFundamentals,
            news: liveNews,
            institutionalFlow: liveFlow,
          };

          return {
            symbol: clean,
            ticker: clean,
            analysisDate: todayStr,
            reportId: latestReport.id,
            progress: [
              { step: 'Market Data', status: 'done', message: `Price: $${liveMarketData.price || 'N/A'}` },
              { step: 'Historical Data', status: 'done', message: 'Loaded multi-timeframe candles' },
              { step: 'Technical Analysis', status: 'done', message: `Bias: ${liveTechnicals.primary?.overallBias || 'NEUTRAL'}, RSI: ${liveTechnicals.primary?.rsi14?.toFixed(1) || 'N/A'}` },
              { step: 'Fundamental Data', status: 'done', message: `Source: ${liveFundamentals.source || 'N/A'}` },
              { step: 'News & Events', status: 'done', message: `${liveNews.items.length} articles, sentiment: ${liveNews.sentiment}` },
              { step: 'Institutional Flow Proxy', status: 'done', message: `Proxy Score: ${liveFlow.proxyScore}/100 (${liveFlow.interpretation})` }
            ] as any,
            report: analysisReportObj,
            analysisReport: analysisReportObj,
            video: videoResult,
            processingTimeMs: latestReport.processingTime || 0,
            cache: {
              cached: true,
              role,
              cacheLimitMins,
              generatedXMinutesAgo,
              regenerateInYMinutes,
            }
          };

        }
      }
    } catch (cacheErr: any) {
      this.logger.error(`Error checking cache for ${clean}:`, cacheErr?.stack);
    }

    // 4. Cache miss: Run full analysis pipeline
    this.logger.log(`Cache miss or expired for ${clean}. Running full analysis pipeline.`);
    const result = await this.orchestrator.runFullAnalysis(clean);

    return {
      ...result,
      cache: {
        cached: false,
        role,
        cacheLimitMins,
        generatedXMinutesAgo: 0,
        regenerateInYMinutes: cacheLimitMins,
      }
    };
  }

  private async geolocateIp(ip: string): Promise<{ city: string; state: string }> {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      return { city: 'Local', state: 'Local' };
    }
    // Check if it's a private IP block (RFC 1918)
    if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) {
      return { city: 'Local Network', state: 'Local Network' };
    }
    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 1500 });
      if (response.data && response.data.status === 'success') {
        return {
          city: response.data.city || 'Unknown',
          state: response.data.regionName || response.data.region || 'Unknown',
        };
      }
    } catch (err: any) {
      this.logger.warn(`Failed to geolocate IP ${ip}: ${err.message}`);
    }
    return { city: 'Unknown', state: 'Unknown' };
  }
}


