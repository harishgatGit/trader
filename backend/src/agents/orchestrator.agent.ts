import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataAgent } from './market-data.agent';
import { HistoricalDataAgent } from './historical-data.agent';
import { TechnicalAgent } from './technical.agent';
import { FundamentalAgent } from './fundamental.agent';
import { NewsAgent } from './news.agent';
import { InstitutionalFlowAgent } from './institutional-flow.agent';
import { OpenAIAnalystAgent } from './openai-analyst.agent';
import { DailyTrendAnalystAgent } from './daily-trend-analyst.agent';
import { TrendStoryAgent } from './trend-story.agent';
import { SignalCorrelationAgent } from './signal-correlation.agent';
import { DocumentBuilderAgent } from './document-builder.agent';
import { VideoJobService } from '../modules/video/video-job.service';
import { getNYDateString } from '../utils/date';

export interface AnalysisProgress {
  step: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  message?: string;
}

export interface AnalysisResult {
  symbol: string;
  ticker: string;
  analysisDate: string;
  reportId: string;
  progress: AnalysisProgress[];
  report: any;
  analysisReport: any;
  video: {
    status: string;
    filePath?: string;
    message?: string;
    error?: string;
    jobId?: string;
  };
  processingTimeMs: number;
}

// Sanitize ticker input
export function sanitizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/[^A-Z0-9.]/g, '').substring(0, 10);
}

@Injectable()
export class OrchestratorAgent {
  private readonly logger = new Logger(OrchestratorAgent.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataAgent: MarketDataAgent,
    private readonly historicalDataAgent: HistoricalDataAgent,
    private readonly technicalAgent: TechnicalAgent,
    private readonly fundamentalAgent: FundamentalAgent,
    private readonly newsAgent: NewsAgent,
    private readonly institutionalFlowAgent: InstitutionalFlowAgent,
    private readonly openAIAnalystAgent: OpenAIAnalystAgent,
    private readonly dailyTrendAnalystAgent: DailyTrendAnalystAgent,
    private readonly trendStoryAgent: TrendStoryAgent,
    private readonly signalCorrelationAgent: SignalCorrelationAgent,
    private readonly documentBuilderAgent: DocumentBuilderAgent,
    private readonly videoJobService: VideoJobService,
  ) {}

  async runFullAnalysis(rawSymbol: string): Promise<AnalysisResult> {
    const symbol = sanitizeSymbol(rawSymbol);
    if (!symbol) throw new Error('Invalid symbol provided');

    const startTime = Date.now();
    this.logger.log(`Starting full analysis for ${symbol}`);

    const progress: AnalysisProgress[] = [
      { step: 'Market Data', status: 'pending' },
      { step: 'Historical Data', status: 'pending' },
      { step: 'Technical Analysis', status: 'pending' },
      { step: 'Fundamental Data', status: 'pending' },
      { step: 'News & Events', status: 'pending' },
      { step: 'Institutional Flow Proxy', status: 'pending' },
      { step: 'Ecosystem Insights', status: 'pending' },
      { step: 'Daily Trend Analyst', status: 'pending' },
      { step: 'Trend Story Analyst', status: 'pending' },
      { step: 'Signal Correlation', status: 'pending' },
    ];

    const step = (name: string, status: AnalysisProgress['status'], msg?: string) => {
      const existing = progress.find((p) => p.step === name);
      if (existing) {
        existing.status = status;
        existing.message = msg;
      }
    };

    try {
      // Start Phase 1 Concurrent Processes
      step('Market Data', 'running');
      const marketDataPromise = this.marketDataAgent.run(symbol).then((data) => {
        step('Market Data', data.available ? 'done' : 'error', data.available ? `Price: $${data.price}` : 'Data unavailable');
        return data;
      }).catch((err) => {
        step('Market Data', 'error', err.message);
        throw err;
      });

      step('Historical Data', 'running');
      const historicalDataPromise = this.historicalDataAgent.run(symbol).then((data) => {
        const hasHistory = Object.values(data.timeframes).some((tf) => tf.available);
        step('Historical Data', hasHistory ? 'done' : 'error', hasHistory ? `Fetched multi-timeframe candles` : 'No historical data');
        return data;
      }).catch((err) => {
        step('Historical Data', 'error', err.message);
        throw err;
      });

      step('Fundamental Data', 'running');
      const fundamentalsPromise = this.fundamentalAgent.run(symbol).then((data) => {
        step('Fundamental Data', data.available ? 'done' : 'skipped',
          data.available ? `Source: ${data.source}` : (data.unavailableReason || 'Unavailable'));
        return data;
      }).catch((err) => {
        step('Fundamental Data', 'skipped', err.message);
        return { available: false, unavailableReason: err.message } as any;
      });

      step('News & Events', 'running');
      const newsPromise = this.newsAgent.run(symbol).then((data) => {
        step('News & Events', data.available ? 'done' : 'skipped',
          data.available ? `${data.items.length} articles, sentiment: ${data.sentiment}` : 'No news available');
        return data;
      }).catch((err) => {
        step('News & Events', 'skipped', err.message);
        return { available: false, items: [], sentiment: 'NEUTRAL' } as any;
      });

      // Step 3: Technical Analysis (dependent on Historical Data)
      const historicalData = await historicalDataPromise;
      step('Technical Analysis', 'running');
      const technicals = await this.technicalAgent.run(symbol, historicalData);
      step('Technical Analysis', technicals.available ? 'done' : 'error',
        technicals.primary ? `Bias: ${technicals.primary.overallBias}, RSI: ${technicals.primary.rsi14?.toFixed(1)}` : 'Insufficient data');

      // Step 6: Institutional Flow Proxy (dependent on Technical & Market Data)
      step('Institutional Flow Proxy', 'running');
      const marketData = await marketDataPromise;
      const candles = historicalData.timeframes['1Day']?.candles || historicalData.timeframes['1Hour']?.candles || [];
      const institutionalFlow = await this.institutionalFlowAgent.run(symbol, technicals.primary, marketData, candles);
      step('Institutional Flow Proxy', 'done', `Proxy Score: ${institutionalFlow.proxyScore}/100 (${institutionalFlow.interpretation})`);

      // Wait for news and fundamentals to finish (should be resolved by now)
      const fundamentals = await fundamentalsPromise;
      const news = await newsPromise;

      // Step 7: OpenAI Analyst + Ecosystem Insights + Daily Trend Analyst + Trend Story Analyst + Signal Correlation Analyst — run IN PARALLEL
      step('Ecosystem Insights', 'running');
      step('Daily Trend Analyst', 'running');
      step('Trend Story Analyst', 'running');
      step('Signal Correlation', 'running');

      const [{ report, promptTokens, completionTokens }, { companyInsights, insightTokens }, dailyTrend, trendStory, signalCorrelation] =
        await Promise.all([
          this.openAIAnalystAgent.run({
            symbol,
            marketData,
            technicals,
            fundamentals,
            news,
            institutionalFlow,
            historicalData,
          }),
          this.openAIAnalystAgent.runCompanyInsights(symbol),
          this.dailyTrendAnalystAgent.run({
            symbol,
            marketData,
            technicals,
            fundamentals,
            news,
            institutionalFlow,
            historicalData,
          }),
          this.trendStoryAgent.run({
            symbol,
            marketData,
            technicals,
            fundamentals,
            news,
            institutionalFlow,
            historicalData,
          }),
          this.signalCorrelationAgent.run({
            symbol,
            marketData,
            technicals,
            fundamentals,
            news,
            institutionalFlow,
            historicalData,
          }),
        ]);

      step('Ecosystem Insights', companyInsights ? 'done' : 'skipped',
        companyInsights
          ? `${companyInsights.investedCompanies.length} investments, ${companyInsights.dependencies.suppliers.length} suppliers`
          : 'Insights unavailable'
      );
      step('Daily Trend Analyst', 'done', `Trend: ${dailyTrend.trend} (${dailyTrend.barCount} Bars)`);
      step('Trend Story Analyst', 'done', `Reason: ${trendStory.move_classification.primary_reason} (${trendStory.move_classification.confidence} confidence)`);
      step('Signal Correlation', 'done', `Zone: ${signalCorrelation.finalZone} (${signalCorrelation.correlationScore}/100)`);

      // Merge dailyTrend, trendStory and companyInsights into the report
      if (report.tacticalHorizonView) {
        report.tacticalHorizonView.dailyTrend = dailyTrend;
      }
      const fullReport = companyInsights
        ? { ...report, companyInsights, trendStory, signalCorrelation }
        : { ...report, trendStory, signalCorrelation };

      const processingTime = Date.now() - startTime;
      const reportJsonWithCompat = {
        ...fullReport,
        trendStory,
        signalCorrelation,
        marketData,
        technicals: {
          primary: technicals.primary,
          timeframes: Object.keys(technicals.timeframes),
        },
        fundamentals,
        news,
        institutionalFlow,
        finalRating: fullReport.finalDecision.finalRating,
        technicalScore: fullReport.technicalAnalysis.technicalScore,
        fundamentalScore: fullReport.fundamentalAnalysis.fundamentalScore,
        newsCatalystScore: fullReport.newsAndCatalysts.newsCatalystScore,
        institutionalFlowProxyScore: fullReport.institutionalFlowProxy.institutionalFlowProxyScore,
        executiveSummary: fullReport.executiveSummary.summary,
        keyCatalysts: fullReport.newsAndCatalysts.keyCatalysts,
        keyRisks: fullReport.riskAnalysis.topRisks || fullReport.newsAndCatalysts.keyRisksFromNews,
        institutionalFlowSummary: fullReport.institutionalFlowProxy.institutionalFlowSummary,
      };

      const savedReport = await this.prisma.agentReport.create({
        data: {
          symbol,
          finalRating: fullReport.finalDecision.finalRating,
          confidenceScore: fullReport.finalDecision.confidenceScore,
          reportJson: reportJsonWithCompat as any,
          currentPrice: fullReport.currentPrice || marketData.price,
          technicalScore: fullReport.technicalAnalysis.technicalScore,
          fundamentalScore: fullReport.fundamentalAnalysis.fundamentalScore,
          newsCatalystScore: fullReport.newsAndCatalysts.newsCatalystScore,
          institutionalFlowProxyScore: fullReport.institutionalFlowProxy.institutionalFlowProxyScore,
          executiveSummary: fullReport.executiveSummary.summary,
          processingTime,
          openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
          promptTokens: promptTokens + insightTokens,
          completionTokens,
          status: 'completed',
        },
      });

      // Update watchlist if symbol is tracked
      await this.prisma.watchlist.updateMany({
        where: { symbol },
        data: {
          lastAnalyzedAt: new Date(),
          latestRating: fullReport.finalDecision.finalRating,
          latestPrice: fullReport.currentPrice || marketData.price,
          latestSignal: fullReport.finalDecision.finalRating,
        },
      });

      // Generate PDF Report as a safe background action (Temporarily disabled/skipped as per user request)
      /*
      try {
        await this.documentBuilderAgent.generatePdfReport(symbol, reportJsonWithCompat);
      } catch (err: any) {
        this.logger.error(`Failed to build PDF report for ${symbol}: ${err.message}`);
      }
      */

      this.logger.log(`Analysis complete for ${symbol} in ${processingTime}ms`);

      const today = getNYDateString();

      // Fire-and-forget to video agent service — backend never blocks or fails here
      this.videoJobService.fireAndForget(
        symbol,
        today,
        savedReport.id,
        reportJsonWithCompat,
        false,
      );

      return {
        symbol,
        ticker: symbol,
        analysisDate: today,
        reportId: savedReport.id,
        progress,
        report: {
          ...reportJsonWithCompat,
          id: savedReport.id,
          createdAt: savedReport.createdAt,
          processingTimeMs: processingTime,
          marketData,
          technicals: {
            primary: technicals.primary,
            timeframes: Object.keys(technicals.timeframes),
          },
          fundamentals,
          news,
          institutionalFlow,
        },
        analysisReport: {
          ...reportJsonWithCompat,
          id: savedReport.id,
          createdAt: savedReport.createdAt,
          processingTimeMs: processingTime,
          marketData,
          technicals: {
            primary: technicals.primary,
            timeframes: Object.keys(technicals.timeframes),
          },
          fundamentals,
          news,
          institutionalFlow,
        },
        video: { status: 'RECEIVED', message: 'Video job submitted to video agent service (fire-and-forget).' },
        processingTimeMs: processingTime,
      };

    } catch (error) {
      this.logger.error(`Analysis failed for ${symbol}: ${error.message}`);
      const lastStep = progress[progress.length - 1];
      if (lastStep && lastStep.status === 'running') {
        lastStep.status = 'error';
        lastStep.message = error.message;
      }
      throw error;
    }
  }

  async runFundAnalysis(rawSymbol: string): Promise<AnalysisResult> {
    const symbol = sanitizeSymbol(rawSymbol);
    if (!symbol) throw new Error('Invalid symbol provided');

    const startTime = Date.now();
    this.logger.log(`Starting fund analysis for ${symbol}`);

    const progress: AnalysisProgress[] = [
      { step: 'Market Data', status: 'skipped', message: 'Not needed for fund analysis' },
      { step: 'Historical Data', status: 'skipped', message: 'Not needed for fund analysis' },
      { step: 'Technical Analysis', status: 'skipped', message: 'Not needed for fund analysis' },
      { step: 'Fundamental Data', status: 'skipped', message: 'Not needed for fund analysis' },
      { step: 'News & Events', status: 'skipped', message: 'Not needed for fund analysis' },
      { step: 'Institutional Flow Proxy', status: 'skipped', message: 'Not needed for fund analysis' },
      { step: 'Ecosystem Insights', status: 'skipped', message: 'Not needed for fund analysis' },
      { step: 'Daily Trend Analyst', status: 'skipped', message: 'Not needed for fund analysis' },
      { step: 'Trend Story Analyst', status: 'skipped', message: 'Not needed for fund analysis' },
      { step: 'Fund Review', status: 'running' },
    ];

    try {
      const { report, promptTokens, completionTokens } = await this.openAIAnalystAgent.runFundAnalysis(symbol);
      const processingTime = Date.now() - startTime;

      const savedReport = await this.prisma.agentReport.create({
        data: {
          symbol,
          finalRating: report.finalDecision.finalRating,
          confidenceScore: report.finalDecision.confidenceScore,
          reportJson: report as any,
          currentPrice: null,
          technicalScore: null,
          fundamentalScore: null,
          newsCatalystScore: null,
          institutionalFlowProxyScore: null,
          executiveSummary: report.finalDecision.decisionSummary,
          processingTime,
          openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
          promptTokens,
          completionTokens,
          status: 'completed',
        },
      });

      // Update watchlist if symbol is tracked
      await this.prisma.watchlist.updateMany({
        where: { symbol },
        data: {
          lastAnalyzedAt: new Date(),
          latestRating: report.finalDecision.finalRating,
          latestPrice: null,
          latestSignal: report.finalDecision.finalRating,
        },
      });

      const step = progress.find(p => p.step === 'Fund Review');
      if (step) {
        step.status = 'done';
        step.message = `Generated fund review for ${report.fundName}`;
      }

      const today = getNYDateString();

      return {
        symbol,
        ticker: symbol,
        analysisDate: today,
        reportId: savedReport.id,
        progress,
        report: {
          ...report,
          id: savedReport.id,
          createdAt: savedReport.createdAt,
          processingTimeMs: processingTime,
        },
        analysisReport: {
          ...report,
          id: savedReport.id,
          createdAt: savedReport.createdAt,
          processingTimeMs: processingTime,
        },
        video: { status: 'SKIPPED', message: 'Video not generated for funds.' },
        processingTimeMs: processingTime,
      };
    } catch (error) {
      this.logger.error(`Fund analysis failed for ${symbol}: ${error.message}`);
      const step = progress.find(p => p.step === 'Fund Review');
      if (step) {
        step.status = 'error';
        step.message = error.message;
      }
      throw error;
    }
  }
}
