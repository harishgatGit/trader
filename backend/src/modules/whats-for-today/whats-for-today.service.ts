import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AlpacaService } from '../../services/alpaca.service';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// Zod schema for report output from OpenAI
export const MarketReportOutputSchema = z.object({
  title: z.string(),
  marketStorySummary: z.string(),
  mood: z.enum(['BULLISH', 'BEARISH', 'MIXED', 'CAUTIOUS', 'RISK_ON', 'RISK_OFF']),
  indexMovements: z.object({
    SPY: z.object({ price: z.number(), changePercent: z.number() }),
    QQQ: z.object({ price: z.number(), changePercent: z.number() }),
    DIA: z.object({ price: z.number(), changePercent: z.number() }),
    IWM: z.object({ price: z.number(), changePercent: z.number() }),
  }),
  catalystSummary: z.string(),
  economicEvents: z.array(z.string()).optional(),
  newsSentiment: z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED']),
  volumeBehavior: z.string(),
  volatilityLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  beginnerExplanation: z.string(),
  sectors: z.array(z.object({
    sectorName: z.string(),
    trend: z.enum(['STRONG', 'WEAK', 'NEUTRAL', 'REVERSING']),
    reasoning: z.string(),
    catalyst: z.string(),
    volumeStrength: z.enum(['High', 'Medium', 'Low']),
    riskLevel: z.enum(['Low', 'Medium', 'High']),
    topStocks: z.array(z.object({
      symbol: z.string(),
      companyName: z.string(),
      price: z.number(),
      changePercent: z.number(),
      catalyst: z.string(),
      watchReason: z.string(),
      explanation: z.string(),
      riskLevel: z.enum(['Low', 'Medium', 'High', 'Extremely High', 'Volatile, suitable only for high-risk traders', 'High Risk', 'Low Risk']),
      technicalSetup: z.string(),
      liquidityScore: z.enum(['Strong', 'Medium', 'Weak', 'High', 'Low']),
      heatmap: z.object({
        priceMomentum: z.enum(['Strong', 'Medium', 'Weak', 'Improving', 'Falling', 'Neutral', 'High', 'Low', 'Positive', 'Negative']),
        volumeStrength: z.enum(['Strong', 'Medium', 'Weak', 'Improving', 'Falling', 'Neutral', 'High', 'Low']),
        newsSentiment: z.enum(['Strong', 'Medium', 'Weak', 'Neutral', 'Positive', 'Negative', 'Mixed']),
        sectorStrength: z.enum(['Strong', 'Medium', 'Weak', 'Neutral', 'High', 'Low']),
        technicalTrend: z.enum(['Strong', 'Medium', 'Weak', 'Neutral', 'High', 'Low']),
        volatilityRisk: z.enum(['High Risk', 'Medium', 'Low', 'Neutral', 'High', 'Low Risk', 'High Risk']),
        liquidity: z.enum(['Strong', 'Medium', 'Weak', 'High', 'Low']),
        catalystImpact: z.enum(['Strong', 'Medium', 'Weak', 'Neutral', 'High', 'Low']),
        accDistSignal: z.enum(['Strong', 'Medium', 'Weak', 'Neutral', 'High', 'Low']),
        overallWatchScore: z.number()
      })
    }))
  }))
});

// Zod schema for EOD learning feedback log
export const EodFeedbackOutputSchema = z.object({
  expectedSectors: z.array(z.string()),
  actualSectors: z.array(z.string()),
  expectedStocks: z.array(z.string()),
  actualStocks: z.array(z.string()),
  failedInsights: z.array(z.string()),
  explanationOfFails: z.string(),
  missingDataNotes: z.string(),
  misleadingSignals: z.string(),
  promptImprovementNotes: z.string()
});

// Zod schema for Penny Stocks to Watch generator
export const PennyStockOutputSchema = z.object({
  pennyStocks: z.array(z.object({
    symbol: z.string(),
    companyName: z.string(),
    price: z.number(),
    changePercent: z.number(),
    volumeSpike: z.number(),
    catalyst: z.string(),
    riskLevel: z.enum(['High', 'Extremely High']),
    liquidityScore: z.enum(['Strong', 'Medium', 'Weak']),
    watchReason: z.string(),
    explanation: z.string()
  }))
});

// New Zod schema matching the updated market-story.system.md prompt
export const NewMarketReportOutputSchema = z.object({
  pageTitle: z.string(),
  marketPhase: z.string(),
  generatedAt: z.string(),
  disclaimer: z.string(),
  marketMood: z.string(),
  simpleMarketStory: z.string(),
  todayWatchTheme: z.string().nullable().optional(),
  indexSummary: z.array(z.object({
    indexName: z.string(),
    currentValue: z.string(),
    changePercent: z.string(),
    trend: z.string(),
    reason: z.string(),
    beginnerExplanation: z.string()
  })),
  keyDrivers: z.array(z.string()).optional(),
  riskFactors: z.array(z.string()).optional(),
  economicEvents: z.array(z.string()).optional(),
  earningsImpact: z.array(z.string()).optional(),
  newsImpact: z.array(z.string()).optional(),
  volumeBehavior: z.string(),
  volatilityView: z.string(),
  whatCouldGoWrong: z.string().nullable().optional(),
  whatNeedsConfirmation: z.string().nullable().optional(),
  sectorAnalysis: z.array(z.object({
    sectorName: z.string(),
    sectorTrend: z.string(),
    strengthScore: z.number(),
    riskLevel: z.string(),
    whyMoving: z.string(),
    catalyst: z.string(),
    volumeInsight: z.string(),
    technicalView: z.string(),
    sentimentView: z.string(),
    beginnerExplanation: z.string(),
    stocksToWatch: z.array(z.object({
      ticker: z.string(),
      companyName: z.string(),
      label: z.string(),
      currentPrice: z.union([z.string(), z.number()]),
      priceChangePercent: z.union([z.string(), z.number()]),
      watchReason: z.string(),
      catalyst: z.string(),
      technicalContext: z.string(),
      volumeContext: z.string(),
      riskLevel: z.string(),
      confidenceScore: z.number(),
      beginnerExplanation: z.string(),
      heatMap: z.object({
        priceMomentum: z.string(),
        volumeStrength: z.string(),
        sectorStrength: z.string(),
        newsSentiment: z.string(),
        technicalTrend: z.string(),
        volatilityRisk: z.string(),
        liquidityQuality: z.string(),
        catalystImpact: z.string(),
        accumulationSignal: z.string(),
        overallWatchScore: z.union([z.string(), z.number()]),
        overallScore: z.number()
      }).passthrough()
    })).optional().default([])
  })).optional().default([]),
  pennyStocksToWatch: z.array(z.object({
    ticker: z.string(),
    companyName: z.string(),
    currentPrice: z.union([z.string(), z.number()]),
    priceChangePercent: z.union([z.string(), z.number()]),
    label: z.string(),
    watchReason: z.string(),
    catalyst: z.string(),
    volumeContext: z.string(),
    liquidityRisk: z.string(),
    volatilityRisk: z.string(),
    riskLevel: z.string(),
    beginnerExplanation: z.string()
  })).optional().default([])
}).passthrough();

// New Zod schema matching the updated eod-evaluation.system.md prompt
export const NewEodFeedbackOutputSchema = z.object({
  auditDate: z.string(),
  overallAuditStatus: z.string(),
  overallAccuracyScore: z.number(),
  summary: z.string(),
  simpleStoryExplanation: z.string(),
  marketMoodAudit: z.object({
    expectedMood: z.string(),
    actualMood: z.string(),
    status: z.string(),
    reason: z.string(),
    beginnerExplanation: z.string()
  }).passthrough(),
  indexAudit: z.array(z.object({
    indexName: z.string(),
    expectedDirection: z.string(),
    actualDirection: z.string(),
    expectedReason: z.string(),
    actualReason: z.string(),
    status: z.string(),
    failureReasonType: z.array(z.string()),
    improvementNeeded: z.string()
  }).passthrough()),
  sectorAudit: z.array(z.object({
    sectorName: z.string(),
    expectedTrend: z.string(),
    actualTrend: z.string(),
    expectedCatalyst: z.string(),
    actualDriver: z.string(),
    expectedStrengthScore: z.number(),
    actualStrengthScore: z.number(),
    status: z.string(),
    whatMatched: z.string(),
    whatFailed: z.string(),
    failureReasonType: z.array(z.string()),
    beginnerExplanation: z.string(),
    improvementNeeded: z.string(),
    stockAudit: z.array(z.object({
      ticker: z.string(),
      companyName: z.string(),
      expectedLabel: z.string(),
      actualOutcome: z.string(),
      expectedWatchReason: z.string(),
      actualDriver: z.string(),
      priceMoveResult: z.string(),
      volumeResult: z.string(),
      catalystResult: z.string(),
      preMarketConfidenceScore: z.number(),
      closeConfidenceScore: z.number(),
      status: z.string(),
      failureReasonType: z.array(z.string()),
      lessonLearned: z.string()
    }).passthrough()).optional().default([])
  }).passthrough()),
  topCorrectInsights: z.array(z.object({
    area: z.string(),
    insight: z.string(),
    whyItWorked: z.string()
  })).optional().default([]),
  topFailedInsights: z.array(z.object({
    area: z.string(),
    insight: z.string(),
    whyItFailed: z.string(),
    failureReasonType: z.array(z.string())
  })).optional().default([]),
  dataQualityIssues: z.array(z.object({
    issue: z.string(),
    impact: z.string(),
    fixSuggestion: z.string()
  })).optional().default([]),
  promptImprovementSuggestions: z.array(z.object({
    priority: z.string(),
    currentWeakness: z.string(),
    suggestedPromptRule: z.string(),
    expectedBenefit: z.string()
  })).optional().default([]),
  scoringModelAdjustments: z.array(z.object({
    signalName: z.string(),
    currentIssue: z.string(),
    adjustment: z.string(),
    reason: z.string()
  })).optional().default([]),
  nextDayLearning: z.string(),
  feedbackLoop: z.object({
    shouldUpdatePrompt: z.boolean(),
    mainFailurePattern: z.string(),
    missingData: z.array(z.string()),
    misleadingSignals: z.array(z.string()),
    newRuleSuggestion: z.string(),
    confidenceAdjustmentRule: z.string().optional()
  }).passthrough()
}).passthrough();

// Adapter/Mapper function for Market Report
export function mapNewReportToOld(newReport: any): any {
  const indexMovements: any = {
    SPY: { price: 0, changePercent: 0 },
    QQQ: { price: 0, changePercent: 0 },
    DIA: { price: 0, changePercent: 0 },
    IWM: { price: 0, changePercent: 0 }
  };
  
  if (Array.isArray(newReport.indexSummary)) {
    for (const idx of newReport.indexSummary) {
      const name = idx.indexName.toUpperCase();
      const valNum = parseFloat(idx.currentValue.replace(/[^0-9.]/g, '')) || 0;
      const chgNum = parseFloat(idx.changePercent.replace(/[^0-9.-]/g, '')) || 0;
      
      if (name.includes('S&P') || name.includes('SPY')) {
        indexMovements.SPY = { price: valNum, changePercent: chgNum };
      } else if (name.includes('NASDAQ') || name.includes('QQQ')) {
        indexMovements.QQQ = { price: valNum, changePercent: chgNum };
      } else if (name.includes('DOW') || name.includes('DIA') || name.includes('INDUSTRIAL')) {
        indexMovements.DIA = { price: valNum, changePercent: chgNum };
      } else if (name.includes('RUSSELL') || name.includes('IWM') || name.includes('SMALL')) {
        indexMovements.IWM = { price: valNum, changePercent: chgNum };
      }
    }
  }

  const sectors = (newReport.sectorAnalysis || []).map((sec: any) => {
    let trend = 'NEUTRAL';
    const t = sec.sectorTrend.toUpperCase();
    if (t.includes('STRONG') || t.includes('BULL') || t.includes('UP')) trend = 'STRONG';
    else if (t.includes('WEAK') || t.includes('BEAR') || t.includes('DOWN')) trend = 'WEAK';
    else if (t.includes('REVERS')) trend = 'REVERSING';

    let volumeStrength = 'Medium';
    const v = sec.volumeInsight.toLowerCase();
    if (v.includes('high') || v.includes('strong')) volumeStrength = 'High';
    else if (v.includes('low') || v.includes('weak')) volumeStrength = 'Low';

    let riskLevel = 'Medium';
    const r = sec.riskLevel.toLowerCase();
    if (r.includes('high')) riskLevel = 'High';
    else if (r.includes('low')) riskLevel = 'Low';

    const topStocks = (sec.stocksToWatch || []).map((st: any) => {
      let stockRisk = 'Medium';
      const sr = st.riskLevel.toLowerCase();
      if (sr.includes('ex') || sr.includes('very') || sr.includes('critical')) stockRisk = 'Extremely High';
      else if (sr.includes('high')) stockRisk = 'High';
      else if (sr.includes('low')) stockRisk = 'Low';

      const priceVal = typeof st.currentPrice === 'number' ? st.currentPrice : parseFloat(st.currentPrice.toString().replace(/[^0-9.]/g, '')) || 0;
      const chgVal = typeof st.priceChangePercent === 'number' ? st.priceChangePercent : parseFloat(st.priceChangePercent.toString().replace(/[^0-9.-]/g, '')) || 0;
      const scoreVal = typeof st.heatMap.overallWatchScore === 'number' ? st.heatMap.overallWatchScore : parseFloat(st.heatMap.overallWatchScore.toString().replace(/[^0-9]/g, '')) || 50;

      const mapEnum = (val: string, defaults: string[]) => {
        if (!val) return defaults[0];
        const match = defaults.find(d => d.toLowerCase() === val.toLowerCase().trim());
        return match || defaults[0];
      };

      return {
        symbol: st.ticker,
        companyName: st.companyName,
        price: priceVal,
        changePercent: chgVal,
        catalyst: st.catalyst,
        watchReason: st.watchReason,
        explanation: st.beginnerExplanation,
        riskLevel: stockRisk,
        technicalSetup: st.technicalContext,
        liquidityScore: mapEnum(st.volumeContext, ['Strong', 'Medium', 'Weak', 'High', 'Low']),
        heatmap: {
          priceMomentum: mapEnum(st.heatMap.priceMomentum, ['Strong', 'Medium', 'Weak', 'Improving', 'Falling', 'Neutral']),
          volumeStrength: mapEnum(st.heatMap.volumeStrength, ['Strong', 'Medium', 'Weak', 'Improving', 'Falling', 'Neutral']),
          newsSentiment: mapEnum(st.heatMap.newsSentiment, ['Strong', 'Medium', 'Weak', 'Neutral']),
          sectorStrength: mapEnum(st.heatMap.sectorStrength, ['Strong', 'Medium', 'Weak', 'Neutral']),
          technicalTrend: mapEnum(st.heatMap.technicalTrend, ['Strong', 'Medium', 'Weak', 'Neutral']),
          volatilityRisk: mapEnum(st.heatMap.volatilityRisk, ['High Risk', 'Medium', 'Low', 'Neutral']),
          liquidity: mapEnum(st.heatMap.liquidityQuality, ['Strong', 'Medium', 'Weak']),
          catalystImpact: mapEnum(st.heatMap.catalystImpact, ['Strong', 'Medium', 'Weak', 'Neutral']),
          accDistSignal: mapEnum(st.heatMap.accumulationSignal, ['Strong', 'Medium', 'Weak', 'Neutral']),
          overallWatchScore: scoreVal
        }
      };
    });

    return {
      sectorName: sec.sectorName,
      trend: trend,
      reasoning: sec.whyMoving,
      catalyst: sec.catalyst,
      volumeStrength: volumeStrength,
      riskLevel: riskLevel,
      topStocks: topStocks
    };
  });

  let newsSentiment = 'NEUTRAL';
  if (newReport.newsImpact && Array.isArray(newReport.newsImpact)) {
    const combinedNews = newReport.newsImpact.join(' ').toLowerCase();
    if (combinedNews.includes('positive') || combinedNews.includes('bullish')) newsSentiment = 'POSITIVE';
    else if (combinedNews.includes('negative') || combinedNews.includes('bearish')) newsSentiment = 'NEGATIVE';
    else if (combinedNews.includes('mixed')) newsSentiment = 'MIXED';
  }

  let volatilityLevel = 'MEDIUM';
  if (newReport.volatilityView) {
    const vol = newReport.volatilityView.toLowerCase();
    if (vol.includes('low')) volatilityLevel = 'LOW';
    else if (vol.includes('high')) volatilityLevel = 'HIGH';
  }

  let mood = 'MIXED';
  if (newReport.marketMood) {
    const md = newReport.marketMood.toUpperCase();
    if (md.includes('BULL') || md.includes('ON')) mood = 'BULLISH';
    else if (md.includes('BEAR') || md.includes('OFF')) mood = 'BEARISH';
    else if (md.includes('CAUT')) mood = 'CAUTIOUS';
  }

  return {
    title: newReport.pageTitle,
    marketStorySummary: newReport.simpleMarketStory,
    mood: mood,
    indexMovements: indexMovements,
    catalystSummary: newReport.todayWatchTheme || newReport.newsImpact?.join('; ') || 'News driven market movement',
    economicEvents: newReport.economicEvents || [],
    newsSentiment: newsSentiment,
    volumeBehavior: newReport.volumeBehavior,
    volatilityLevel: volatilityLevel,
    riskLevel: 'MEDIUM',
    beginnerExplanation: newReport.beginnerExplanation,
    sectors: sectors
  };
}

// Adapter/Mapper function for EOD Feedback
export function mapNewFeedbackToOld(newFeedback: any): any {
  const expectedSectors: string[] = [];
  const actualSectors: string[] = [];
  const expectedStocks: string[] = [];
  const actualStocks: string[] = [];
  const failedInsights: string[] = [];

  if (Array.isArray(newFeedback.sectorAudit)) {
    for (const sec of newFeedback.sectorAudit) {
      expectedSectors.push(`${sec.sectorName} (${sec.expectedTrend})`);
      actualSectors.push(`${sec.sectorName} (${sec.actualTrend})`);
      
      if (Array.isArray(sec.stockAudit)) {
        for (const st of sec.stockAudit) {
          expectedStocks.push(`${st.ticker} (${st.expectedLabel})`);
          actualStocks.push(`${st.ticker} (${st.priceMoveResult})`);
          if (st.status === 'Failed') {
            failedInsights.push(`${st.ticker}: ${st.lessonLearned}`);
          }
        }
      }
      if (sec.status === 'Failed') {
        failedInsights.push(`${sec.sectorName}: ${sec.whatFailed}`);
      }
    }
  }

  return {
    expectedSectors: expectedSectors,
    actualSectors: actualSectors,
    expectedStocks: expectedStocks,
    actualStocks: actualStocks,
    failedInsights: failedInsights.length > 0 ? failedInsights : (newFeedback.topFailedInsights?.map((f: any) => `${f.area}: ${f.insight}`) || []),
    explanationOfFails: newFeedback.simpleStoryExplanation || newFeedback.summary,
    missingDataNotes: newFeedback.dataQualityIssues?.map((d: any) => `${d.issue}: ${d.impact}`).join('; ') || 'None',
    misleadingSignals: newFeedback.feedbackLoop?.misleadingSignals?.join('; ') || 'None',
    promptImprovementNotes: newFeedback.promptImprovementSuggestions?.map((s: any) => `[${s.priority}] ${s.currentWeakness} -> ${s.suggestedPromptRule}`).join('\n') || 'None'
  };
}

@Injectable()
export class WhatsForTodayService {
  private readonly logger = new Logger(WhatsForTodayService.name);
  private readonly openai: OpenAI;
  private readonly openaiModel: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly alpaca: AlpacaService,
    private readonly config: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.get('OPENAI_API_KEY') || 'mock-key-not-configured',
    });
    this.openaiModel = this.config.get('OPENAI_MODEL', 'gpt-4o');
  }

  private getPromptTemplate(filename: string): string {
    try {
      const filePath = path.join(process.cwd(), 'src/modules/whats-for-today/prompts', filename);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
      }
      this.logger.warn(`Prompt file not found at ${filePath}. Using inline fallback.`);
      return '';
    } catch (err: any) {
      this.logger.error(`Failed to read prompt file ${filename}: ${err.message}`);
      return '';
    }
  }

  // Helper to format date in YYYY-MM-DD
  private getTodayDateString(): string {
    const d = new Date();
    // Convert to US Eastern Time to align with stock market trading days
    const estDate = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const year = estDate.getFullYear();
    const month = String(estDate.getMonth() + 1).padStart(2, '0');
    const day = String(estDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Generates the "What's for Today?" market intelligence report for one of the 4 daily phases.
   * runNumber: 1 (Pre-Market), 2 (Open), 3 (Mid-Market), 4 (Close)
   */
  async generateDailyReport(runNumber: number, forceDate?: string): Promise<any> {
    const dateStr = forceDate || this.getTodayDateString();
    this.logger.log(`Starting Daily Report generation. Date: ${dateStr}, Run: ${runNumber}`);

    // 1. Gather indices snapshots (SPY, QQQ, DIA, IWM)
    const indices = ['SPY', 'QQQ', 'DIA', 'IWM'];
    const indexData: Record<string, any> = {};
    for (const ticker of indices) {
      const snap = await this.alpaca.getSnapshot(ticker);
      if (snap) {
        const currentPrice = snap.latestTrade?.p || snap.minuteBar?.c || 0;
        let changePercent = 0;
        if (snap.dailyBar && snap.prevDailyBar) {
          const prevClose = snap.prevDailyBar.c;
          changePercent = prevClose > 0 ? +((snap.dailyBar.c - prevClose) / prevClose * 100).toFixed(2) : 0;
        }
        indexData[ticker] = { price: currentPrice, changePercent };
      } else {
        indexData[ticker] = { price: 0, changePercent: 0 };
      }
    }

    // 2. Gather news feed (for market sentiment context)
    const marketNews = await this.alpaca.getNews('SPY', 10);
    const parsedNews = marketNews.map(n => ({
      headline: n.headline,
      summary: n.summary,
      source: n.source,
      publishedAt: n.created_at,
    }));

    // 3. Gather sector details
    const sectorEtfs = {
      'Technology': 'XLK',
      'Semiconductors': 'SMH',
      'AI': 'AIQ',
      'Healthcare': 'XLV',
      'Energy': 'XLE',
      'Financials': 'XLF',
      'Consumer Discretionary': 'XLY',
      'EV': 'DRIV',
      'Small Caps': 'IWM',
      'Communication Services': 'XLC',
      'Consumer Staples': 'XLP',
      'Industrials': 'XLI',
      'Utilities': 'XLU',
      'Real Estate': 'XLRE',
      'Materials': 'XLB'
    };
    const sectorData: Record<string, any> = {};
    for (const [name, ticker] of Object.entries(sectorEtfs)) {
      const snap = await this.alpaca.getSnapshot(ticker);
      if (snap) {
        const price = snap.latestTrade?.p || snap.minuteBar?.c || 0;
        let changePercent = 0;
        if (snap.dailyBar && snap.prevDailyBar) {
          const prevClose = snap.prevDailyBar.c;
          changePercent = prevClose > 0 ? +((snap.dailyBar.c - prevClose) / prevClose * 100).toFixed(2) : 0;
        }
        sectorData[name] = { ticker, price, changePercent };
      } else {
        sectorData[name] = { ticker, price: 0, changePercent: 0 };
      }
    }

    // 3b. Gather representative watchlist stock details for each sector
    const sectorStocks: Record<string, string[]> = {
      'Technology': ['AAPL', 'MSFT', 'GOOGL', 'META', 'AVGO'],
      'Semiconductors': ['NVDA', 'AMD', 'AVGO', 'INTC', 'TSM'],
      'AI': ['PLTR', 'MSFT', 'NVDA', 'GOOGL', 'AMZN'],
      'Healthcare': ['LLY', 'UNH', 'JNJ', 'ABBV', 'MRK'],
      'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG'],
      'Financials': ['JPM', 'BAC', 'WFC', 'MS', 'GS'],
      'Consumer Discretionary': ['AMZN', 'TSLA', 'HD', 'NKE', 'MCD'],
      'EV': ['TSLA', 'RIVN', 'LCID', 'NIO', 'F'],
      'Small Caps': ['SOFI', 'PLUG', 'RUN', 'MARA', 'RIOT'],
      'Communication Services': ['META', 'GOOGL', 'NFLX', 'DIS', 'TMUS'],
      'Consumer Staples': ['PG', 'KO', 'PEP', 'COST', 'WMT'],
      'Industrials': ['CAT', 'GE', 'UNP', 'HON', 'LMT'],
      'Utilities': ['NEE', 'SO', 'DUK', 'D', 'AEP'],
      'Real Estate': ['PLD', 'AMT', 'EQIX', 'CCI', 'WY'],
      'Materials': ['LIN', 'APD', 'SHW', 'FCX', 'NEM']
    };

    const allStockSymbols = Array.from(new Set(Object.values(sectorStocks).flat()));
    const snapshots = await this.alpaca.getSnapshots(allStockSymbols);
    const watchlistStockData: Record<string, any> = {};

    for (const [sectorName, tickers] of Object.entries(sectorStocks)) {
      watchlistStockData[sectorName] = tickers.map(ticker => {
        const snap = snapshots[ticker];
        if (snap) {
          const currentPrice = snap.latestTrade?.p || snap.minuteBar?.c || 0;
          let changePercent = 0;
          if (snap.dailyBar && snap.prevDailyBar) {
            const prevClose = snap.prevDailyBar.c;
            changePercent = prevClose > 0 ? +((snap.dailyBar.c - prevClose) / prevClose * 100).toFixed(2) : 0;
          }
          return { ticker, currentPrice, priceChangePercent: changePercent };
        }
        return { ticker, currentPrice: 0, priceChangePercent: 0 };
      });
    }

    // 4. Create OpenAI System and User prompt
    const loadedSectorCount = Object.keys(sectorData).filter(k => sectorData[k].price > 0).length;
    const expectedSectorCount = Object.keys(sectorEtfs).length;
    const loadedStocks = Object.values(watchlistStockData).flat().filter((s: any) => s.currentPrice > 0).length;
    const expectedStocks = allStockSymbols.length;
    const newsCount = parsedNews.length;

    const dataQualitySummary = {
      indexDataLoaded: Object.keys(indexData).filter(k => indexData[k].price > 0).length === indices.length,
      sectorDataQuality: `${loadedSectorCount} of ${expectedSectorCount} sectors loaded successfully`,
      watchlistDataQuality: `${loadedStocks} of ${expectedStocks} stocks loaded successfully`,
      newsDataQuality: `${newsCount} articles loaded`,
      hasDataGaps: loadedSectorCount < expectedSectorCount || loadedStocks < expectedStocks || newsCount === 0
    };

    const phaseTitles = {
      1: "Early Morning / Pre-Market: What's Going to Happen Today?",
      2: "After Market Open: What Is Happening Now?",
      3: "Mid-Market: What Is Changing Today?",
      4: "Market Close / End of Day: What Happened Today?",
    };
    const phaseName = phaseTitles[runNumber as keyof typeof phaseTitles] || phaseTitles[1];
    const marketPhases = {
      1: 'PRE_MARKET',
      2: 'MARKET_OPEN',
      3: 'MID_MARKET',
      4: 'MARKET_CLOSE',
    };
    const marketPhase = marketPhases[runNumber as keyof typeof marketPhases] || 'PRE_MARKET';

    const systemPromptTemplate = this.getPromptTemplate('market-story.system.md');
    const systemPrompt = systemPromptTemplate || `You are Investingatti’s market research storyteller. Your task is to analyze the provided index snapshots, news, and sector data, and explain the current market story in a simple layman language suitable for beginner/intermediate investors.
    
CRITICAL RULE:
1. Do NOT provide financial advice. Do NOT say buy, sell, hold, guaranteed, sure profit, or must enter. 
2. Only provide educational insights, watchlists, scenarios, risks, and analysis to guide users' research.
3. Use a storytelling style with simple analogies. For example: "Think of the market like traffic in the morning..."
4. Generate analysis for a minimum of 6 to 12 sectors. For each sector, recommend at least 5 top stocks to watch (between 5 and 10 stocks per sector) using non-direct labels like "Worth watching", "Needs confirmation", "Momentum building", "High risk". Do NOT use direct buy/sell recommendations. Keep all descriptions, explanations, catalysts, and reasoning fields extremely concise (under 12 words per field) to fit within context limits.
5. Provide a detailed 10-point heat map score for each watchlist stock using classifications: "Strong", "Medium", "Weak", "High Risk", "Neutral", "Improving", "Falling".
6. Output raw JSON matching the required Zod schema. Do NOT wrap inside markdown blocks.`;

    const userPrompt = `Generate a daily market report for phase: "${phaseName}" (Run ${runNumber} of 4) for date: ${dateStr}.

Here is the market data context:
- marketPhase: "${marketPhase}"
- Index Snapshots: ${JSON.stringify(indexData, null, 2)}
- Sector snapshots: ${JSON.stringify(sectorData, null, 2)}
- Real-time stock data per sector to use for watchlist (fill prices/change percents exactly from this context):
${JSON.stringify(watchlistStockData, null, 2)}
- Recent Market News: ${JSON.stringify(parsedNews, null, 2)}
- Data Quality Check: ${JSON.stringify(dataQualitySummary, null, 2)}

Ensure the JSON output strictly matches the following Zod schema:
{
  "title": "A layman-friendly title corresponding to phase: ${phaseName}",
  "marketStorySummary": "Layman storytelling summary (2-3 paragraphs)",
  "mood": "BULLISH | BEARISH | MIXED | CAUTIOUS | RISK_ON | RISK_OFF",
  "indexMovements": {
    "SPY": { "price": number, "changePercent": number },
    "QQQ": { "price": number, "changePercent": number },
    "DIA": { "price": number, "changePercent": number },
    "IWM": { "price": number, "changePercent": number }
  },
  "catalystSummary": "Explanation of major catalyst stories moving the market",
  "economicEvents": ["List of key economic reports/events affecting today"],
  "newsSentiment": "POSITIVE | NEGATIVE | NEUTRAL | MIXED",
  "volumeBehavior": "Layman description of volume (e.g. higher than normal, calm, heavy selling)",
  "volatilityLevel": "LOW | MEDIUM | HIGH",
  "riskLevel": "LOW | MEDIUM | HIGH",
  "beginnerExplanation": "A short, simple take-home lesson/analogy for beginner investors explaining the current market state",
  "sectors": [
    {
      "sectorName": "Sector name (e.g. Technology, Semiconductors, Healthcare...)",
      "trend": "STRONG | WEAK | NEUTRAL | REVERSING",
      "reasoning": "Layman explanation of why this sector is moving",
      "catalyst": "Important sector catalyst",
      "volumeStrength": "High | Medium | Low",
      "riskLevel": "Low | Medium | High",
      "topStocks": [
        {
          "symbol": "Ticker symbol (e.g. AAPL)",
          "companyName": "Company name (e.g. Apple Inc.)",
          "price": number,
          "changePercent": number,
          "catalyst": "News or technical catalyst detail",
          "watchReason": "Why we are watching it",
          "explanation": "Beginner-friendly explanation of why it is on the watchlist",
          "riskLevel": "Low | Medium | High | Extremely High | Volatile, suitable only for high-risk traders",
          "technicalSetup": "Needs confirmation | Momentum building | Showing strength | High risk | Possible breakout area | Needs more research",
          "liquidityScore": "Strong | Medium | Weak",
          "heatmap": {
            "priceMomentum": "Strong | Medium | Weak | Improving | Falling | Neutral",
            "volumeStrength": "Strong | Medium | Weak | Improving | Falling | Neutral",
            "newsSentiment": "Strong | Medium | Weak | Neutral",
            "sectorStrength": "Strong | Medium | Weak | Neutral",
            "technicalTrend": "Strong | Medium | Weak | Neutral",
            "volatilityRisk": "High Risk | Medium | Low | Neutral",
            "liquidity": "Strong | Medium | Weak",
            "catalystImpact": "Strong | Medium | Weak | Neutral",
            "accDistSignal": "Strong | Medium | Weak | Neutral",
            "overallWatchScore": number (0 to 100)
          }
        }
      ]
    }
  ]
}`;

    let parsedReport: any = null;
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 8000,
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty response from OpenAI");
      
      const parsed = JSON.parse(raw);
      try {
        const newValidated = NewMarketReportOutputSchema.parse(parsed);
        const adapted = mapNewReportToOld(newValidated);
        parsedReport = MarketReportOutputSchema.parse(adapted);
      } catch (parseErr: any) {
        this.logger.warn(`Failed to parse with NewMarketReportOutputSchema, trying old format parser: ${parseErr.message}`);
        parsedReport = MarketReportOutputSchema.parse(parsed);
      }
    } catch (err: any) {
      this.logger.error(`Failed to generate daily report using OpenAI: ${err.message}`);
      throw err;
    }

    // Save to Database
    const report = await this.prisma.dailyMarketReport.upsert({
      where: {
        date_runNumber: {
          date: dateStr,
          runNumber,
        },
      },
      update: {
        title: parsedReport.title,
        marketStorySummary: parsedReport.marketStorySummary,
        mood: parsedReport.mood,
        indexMovements: parsedReport.indexMovements,
        catalystSummary: parsedReport.catalystSummary,
        economicEvents: parsedReport.economicEvents || [],
        newsSentiment: parsedReport.newsSentiment,
        volumeBehavior: parsedReport.volumeBehavior,
        volatilityLevel: parsedReport.volatilityLevel,
        riskLevel: parsedReport.riskLevel,
        beginnerExplanation: parsedReport.beginnerExplanation,
        rawOpenAiResponse: parsedReport,
      },
      create: {
        date: dateStr,
        runNumber,
        title: parsedReport.title,
        marketStorySummary: parsedReport.marketStorySummary,
        mood: parsedReport.mood,
        indexMovements: parsedReport.indexMovements,
        catalystSummary: parsedReport.catalystSummary,
        economicEvents: parsedReport.economicEvents || [],
        newsSentiment: parsedReport.newsSentiment,
        volumeBehavior: parsedReport.volumeBehavior,
        volatilityLevel: parsedReport.volatilityLevel,
        riskLevel: parsedReport.riskLevel,
        beginnerExplanation: parsedReport.beginnerExplanation,
        rawOpenAiResponse: parsedReport,
      },
    });

    // Delete existing sector items for this report to allow overwrite
    await this.prisma.sectorWatchItem.deleteMany({
      where: { reportId: report.id },
    });

    // Insert new sector watch items
    for (const sec of parsedReport.sectors) {
      await this.prisma.sectorWatchItem.create({
        data: {
          reportId: report.id,
          sectorName: sec.sectorName,
          trend: sec.trend,
          reasoning: sec.reasoning,
          catalyst: sec.catalyst,
          volumeStrength: sec.volumeStrength,
          riskLevel: sec.riskLevel,
          topStocks: sec.topStocks,
        },
      });
    }

    // Run EOD evaluation if this is Run 4 (Market Close)
    if (runNumber === 4) {
      try {
        await this.runEodEvaluation(dateStr);
      } catch (err: any) {
        this.logger.error(`EOD evaluation failed: ${err.message}`);
      }
    }

    return this.getReportDetail(report.id);
  }

  /**
   * Evaluates the EOD predictions against Pre-Market expectations for a given date
   */
  async runEodEvaluation(dateStr: string): Promise<any> {
    this.logger.log(`Running EOD Evaluation for ${dateStr}`);
    const preMarket = await this.prisma.dailyMarketReport.findUnique({
      where: { date_runNumber: { date: dateStr, runNumber: 1 } },
      include: { sectors: true },
    });
    const marketClose = await this.prisma.dailyMarketReport.findUnique({
      where: { date_runNumber: { date: dateStr, runNumber: 4 } },
      include: { sectors: true },
    });

    if (!preMarket || !marketClose) {
      this.logger.warn(`Could not run EOD evaluation: Pre-Market or Close report is missing for ${dateStr}`);
      return null;
    }

    const systemPromptTemplate = this.getPromptTemplate('eod-evaluation.system.md');
    const systemPrompt = systemPromptTemplate || `You are Investingatti’s market research auditor. Compare the pre-market expectation report against the market close actual report for the same day. 
Identify which sector trends and stock watchlists panned out as expected, and which ones failed. Explain the failure logic clearly in simple terms. Suggest concrete improvements for future prompt iterations. Output raw JSON matching the schema.`;

    const userPrompt = `Compare:
1. Pre-Market expectations (Run 1):
- Summary: ${preMarket.marketStorySummary}
- Expected mood: ${preMarket.mood}
- Sectors watched: ${JSON.stringify(preMarket.sectors.map(s => ({ name: s.sectorName, trend: s.trend, catalyst: s.catalyst })), null, 2)}

2. Market Close actuals (Run 4):
- Summary: ${marketClose.marketStorySummary}
- Actual mood: ${marketClose.mood}
- Sectors actual: ${JSON.stringify(marketClose.sectors.map(s => ({ name: s.sectorName, trend: s.trend, catalyst: s.catalyst })), null, 2)}

Output raw JSON matching this structure:
{
  "expectedSectors": ["List of sector names expected to perform in pre-market"],
  "actualSectors": ["List of sector names that actually performed at close"],
  "expectedStocks": ["Expected momentum stocks from pre-market"],
  "actualStocks": ["Actual momentum stocks seen at close"],
  "failedInsights": ["List of insights or predictions that did not materialize"],
  "explanationOfFails": "A beginner friendly story explanation of why the predictions failed (e.g. macro yield spike was stronger than micro catalyst)",
  "missingDataNotes": "What data could have helped avoid this wrong call (e.g. live interest rates, bond yields)",
  "misleadingSignals": "Which pre-market indicator was a fake-out",
  "promptImprovementNotes": "Suggested prompt adjustments for the AI model to improve tomorrow's analysis"
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 2500,
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty OpenAI response during evaluation");

      const parsed = JSON.parse(raw);
      let validated: any = null;
      try {
        const newValidated = NewEodFeedbackOutputSchema.parse(parsed);
        validated = mapNewFeedbackToOld(newValidated);
      } catch (parseErr: any) {
        this.logger.warn(`Failed to parse with NewEodFeedbackOutputSchema, trying old format: ${parseErr.message}`);
        validated = EodFeedbackOutputSchema.parse(parsed);
      }

      // Save to feedback logs
      const log = await this.prisma.whatsForTodayFeedbackLog.upsert({
        where: { date: dateStr },
        update: {
          expectedSectors: validated.expectedSectors,
          actualSectors: validated.actualSectors,
          expectedStocks: validated.expectedStocks,
          actualStocks: validated.actualStocks,
          failedInsights: validated.failedInsights,
          explanationOfFails: validated.explanationOfFails,
          missingDataNotes: validated.missingDataNotes,
          misleadingSignals: validated.misleadingSignals,
          promptImprovementNotes: validated.promptImprovementNotes,
        },
        create: {
          date: dateStr,
          expectedSectors: validated.expectedSectors,
          actualSectors: validated.actualSectors,
          expectedStocks: validated.expectedStocks,
          actualStocks: validated.actualStocks,
          failedInsights: validated.failedInsights,
          explanationOfFails: validated.explanationOfFails,
          missingDataNotes: validated.missingDataNotes,
          misleadingSignals: validated.misleadingSignals,
          promptImprovementNotes: validated.promptImprovementNotes,
        },
      });

      // Save a separate PromptImprovementNote for history
      if (validated.promptImprovementNotes && validated.promptImprovementNotes.trim().length > 0) {
        await this.prisma.promptImprovementNote.create({
          data: {
            date: dateStr,
            note: validated.promptImprovementNotes,
          },
        });
      }

      return log;
    } catch (err: any) {
      this.logger.error(`EOD evaluation parser failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Scans small-cap / penny stocks, filters for price < $5.00 and high volume,
   * then uses OpenAI to generate beginner-friendly watch reasons.
   */
  async scanPennyStocks(forceRefresh = false): Promise<{
    pennyStocks: any[];
    generatedAt: Date;
    nextRefreshAt: Date;
  }> {
    const today = this.getTodayDateString();

    // Check if we already have penny stocks generated in the last 2 hours
    if (!forceRefresh) {
      const latest = await this.prisma.pennyStockWatchItem.findFirst({
        orderBy: { timestamp: 'desc' },
      });

      if (latest && (Date.now() - new Date(latest.timestamp).getTime() < 2 * 60 * 60 * 1000)) {
        // Return existing items created in the same batch (within 30 seconds of the latest timestamp)
        const existing = await this.prisma.pennyStockWatchItem.findMany({
          where: {
            timestamp: {
              gte: new Date(new Date(latest.timestamp).getTime() - 30 * 1000),
              lte: new Date(new Date(latest.timestamp).getTime() + 30 * 1000),
            }
          },
          orderBy: { changePercent: 'desc' },
        });
        if (existing.length > 0) {
          return {
            pennyStocks: existing,
            generatedAt: latest.timestamp,
            nextRefreshAt: new Date(new Date(latest.timestamp).getTime() + 2 * 60 * 60 * 1000),
          };
        }
      }
    }


    this.logger.log(`Scanning penny stocks for date: ${today}`);

    // Standard list of popular active small-cap/penny stock tickers to scan
    // This avoids fetching 10000+ assets live and preserves rate-limits.
    const symbolsToScan = [
      'SNDL', 'TLRY', 'SOUN', 'BBAI', 'SOFI', 'GRNY', 'GME', 'AMC', 'CEI', 'MULN',
      'NKLA', 'PLUG', 'FCEL', 'IDEX', 'SPWR', 'BB', 'ZOM', 'CTRM', 'SENS', 'HEXO'
    ];

    const matchingStocks: Array<{
      symbol: string;
      companyName: string;
      price: number;
      changePercent: number;
      volumeSpike: number;
      recentNewsHeadlines: string;
    }> = [];

    // Get snapshots for symbols
    for (const symbol of symbolsToScan) {
      try {
        const snap = await this.alpaca.getSnapshot(symbol);
        if (snap) {
          const price = snap.latestTrade?.p || snap.minuteBar?.c || 0;
          let changePercent = 0;
          if (snap.dailyBar && snap.prevDailyBar) {
            const prevClose = snap.prevDailyBar.c;
            changePercent = prevClose > 0 ? +((snap.dailyBar.c - prevClose) / prevClose * 100).toFixed(2) : 0;
          }

          const dailyVol = snap.dailyBar?.v || 0;
          const prevDailyVol = snap.prevDailyBar?.v || 1;
          const volumeSpike = prevDailyVol > 0 ? +(dailyVol / prevDailyVol).toFixed(2) : 1.0;

          // Filter: Price < $5.00 and volumeSpike >= 1.5x (or volume > 500,000 as momentum filter)
          if (price > 0 && price < 5.0 && (volumeSpike >= 1.5 || dailyVol > 500000)) {
            // Fetch news context (simulating scraping / multi-source influence)
            let newsHeadlines = 'No recent news catalysts.';
            try {
              const newsList = await this.alpaca.getNews(symbol, 3);
              if (newsList && newsList.length > 0) {
                newsHeadlines = newsList.map(n => n.headline).join(' | ');
              }
            } catch (err: any) {
              this.logger.warn(`Failed to fetch news for penny stock ${symbol}: ${err.message}`);
            }

            matchingStocks.push({
              symbol,
              companyName: `${symbol} Corp`, // Will be enriched by OpenAI
              price,
              changePercent,
              volumeSpike,
              recentNewsHeadlines: newsHeadlines,
            });
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to probe ${symbol} for penny stock scan: ${err.message}`);
      }
    }

    // If no matching live stocks found, use fallback mock list for variety
    if (matchingStocks.length === 0) {
      matchingStocks.push(
        { symbol: 'SNDL', companyName: 'SNDL Inc.', price: 2.14, changePercent: 5.4, volumeSpike: 2.3, recentNewsHeadlines: 'SNDL Announces Strategic Investment Partnership | SNDL Expansion Updates' },
        { symbol: 'SOUN', companyName: 'SoundHound AI Inc.', price: 4.82, changePercent: 12.1, volumeSpike: 3.1, recentNewsHeadlines: 'SoundHound AI Expands Auto Segment Partnerships | AI chip stocks rally' },
        { symbol: 'BBAI', companyName: 'BigBear.ai Holdings Inc.', price: 1.95, changePercent: -2.3, volumeSpike: 2.0, recentNewsHeadlines: 'BigBear.ai Secures New Federal Defense Contract | Earnings Review' },
        { symbol: 'PLUG', companyName: 'Plug Power Inc.', price: 3.12, changePercent: 8.9, volumeSpike: 2.7, recentNewsHeadlines: 'Plug Power Starts Liquid Hydrogen Delivery | Clean Energy Funding News' }
      );
    }

    const systemPromptTemplate = this.getPromptTemplate('penny-stock.system.md');
    const systemPrompt = systemPromptTemplate || `You are Investingatti's penny stock intelligence agent. Generate educational catalysts, watch reasons, and beginner friendly explanations for the provided penny stocks. Do NOT give financial advice. Do NOT say buy/sell. Include a strict high-risk warning.`;

    const userPrompt = `Generate Micro-Cap Catalyst Details for the following symbols, based on their recent news headlines and trading activity:
    ${JSON.stringify(matchingStocks, null, 2)}
    
    Output RAW JSON matching the PennyStockOutputSchema:
    {
      "pennyStocks": [
        {
          "symbol": "Ticker",
          "companyName": "Real company name",
          "price": number,
          "changePercent": number,
          "volumeSpike": number,
          "catalyst": "A professional explanation of the news catalyst and how it influences this stock, referencing the provided recent news headlines. Explain the stock influence clearly in layman terms.",
          "riskLevel": "High | Extremely High",
          "liquidityScore": "Strong | Medium | Weak",
          "watchReason": "Why the scanner picked it up today, referencing recent news catalysts and volume spikes.",
          "explanation": "Beginner friendly layman description of what the company does, its main product/service, and its current situation."
        }
      ]
    }`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 3000,
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty OpenAI response for penny stocks");

      const parsed = JSON.parse(raw);
      const validated = PennyStockOutputSchema.parse(parsed);

      // Save to database
      const now = new Date();
      const savedItems = [];
      for (const item of validated.pennyStocks) {
        const dbItem = await this.prisma.pennyStockWatchItem.create({
          data: {
            date: today,
            symbol: item.symbol,
            companyName: item.companyName,
            price: item.price,
            changePercent: item.changePercent,
            volumeSpike: item.volumeSpike,
            catalyst: item.catalyst,
            riskLevel: item.riskLevel,
            liquidityScore: item.liquidityScore,
            watchReason: item.watchReason,
            explanation: item.explanation,
            timestamp: now,
          },
        });
        savedItems.push(dbItem);
      }

      return {
        pennyStocks: savedItems,
        generatedAt: now,
        nextRefreshAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      };
    } catch (err: any) {
      this.logger.error(`Failed to parse/generate penny stocks watchlist: ${err.message}`);
      // Fallback: Save simple records directly if OpenAI fails
      const now = new Date();
      const fallbacks = [];
      for (const ms of matchingStocks) {
        const dbItem = await this.prisma.pennyStockWatchItem.create({
          data: {
            date: today,
            symbol: ms.symbol,
            companyName: ms.companyName,
            price: ms.price,
            changePercent: ms.changePercent,
            volumeSpike: ms.volumeSpike,
            catalyst: 'Unusual trading volume spike detected.',
            riskLevel: 'High',
            liquidityScore: 'Strong',
            watchReason: 'Relative volume is exceeding 2.0x.',
            explanation: 'This company is trading at low price levels with increased public retail activity.',
            timestamp: now,
          },
        });
        fallbacks.push(dbItem);
      }
      return {
        pennyStocks: fallbacks,
        generatedAt: now,
        nextRefreshAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      };
    }
  }

  // Get the latest generated report (defaults to today's latest phase, or falls back to most recent report overall)
  async getLatestReport(): Promise<any> {
    const today = this.getTodayDateString();
    
    // Find highest runNumber for today
    const latestToday = await this.prisma.dailyMarketReport.findFirst({
      where: { date: today },
      orderBy: { runNumber: 'desc' },
      include: { sectors: true },
    });

    if (latestToday) {
      return latestToday;
    }

    // Fallback to most recent report overall
    return this.prisma.dailyMarketReport.findFirst({
      orderBy: [
        { date: 'desc' },
        { runNumber: 'desc' },
      ],
      include: { sectors: true },
    });
  }

  // Get a specific report by runNumber and date
  async getReportByPhaseAndDate(runNumber: number, dateStr: string): Promise<any> {
    return this.prisma.dailyMarketReport.findUnique({
      where: {
        date_runNumber: {
          date: dateStr,
          runNumber,
        },
      },
      include: { sectors: true },
    });
  }

  // Get a specific report by ID
  async getReportDetail(id: string): Promise<any> {
    return this.prisma.dailyMarketReport.findUnique({
      where: { id },
      include: { sectors: true },
    });
  }

  // Get report history/feedback logs
  async getFeedbackLogs(): Promise<any[]> {
    return this.prisma.whatsForTodayFeedbackLog.findMany({
      orderBy: { date: 'desc' },
      take: 20,
    });
  }

  // Track user click interactions
  async trackInteraction(userId: string | null, symbol: string, action: string): Promise<any> {
    return this.prisma.whatsForTodayInteraction.create({
      data: {
        userId,
        symbol,
        action,
      },
    });
  }
}
