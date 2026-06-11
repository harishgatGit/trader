import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
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
import { DocumentBuilderAgent } from './document-builder.agent';
import { VideoJobService } from '../modules/video/video-job.service';
import { VideoGenerationClient } from '../modules/video/video-generation.client';
import { OrchestratorAgent } from './orchestrator.agent';
import * as fs from 'fs';

describe('Video Generation Pipeline Integration', () => {
  let orchestrator: OrchestratorAgent;
  let videoJobService: VideoJobService;
  let videoClient: VideoGenerationClient;
  let jobsStore: any[] = [];

  const mockPrismaService = {
    agentReport: {
      create: jest.fn().mockImplementation(async (args) => {
        return { id: 'report-id', createdAt: new Date() };
      }),
    },
    watchlist: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    videoGenerationJob: {
      findUnique: jest.fn().mockImplementation(async (args) => {
        const uppercaseTicker = args.where.ticker_reportDate?.ticker;
        const reportDate = args.where.ticker_reportDate?.reportDate;
        
        if (args.where.jobId) {
          return jobsStore.find(j => j.jobId === args.where.jobId) || null;
        }
        return jobsStore.find(j => j.ticker === uppercaseTicker && j.reportDate === reportDate) || null;
      }),
      create: jest.fn().mockImplementation(async (args) => {
        const { ticker, reportDate, status, reportId } = args.data;
        const exists = jobsStore.some(j => j.ticker === ticker && j.reportDate === reportDate);
        if (exists) {
          const err = new Error('Unique constraint failed');
          (err as any).code = 'P2002';
          throw err;
        }
        const newJob = {
          id: `db-job-${Math.random()}`,
          jobId: null,
          reportId,
          ticker,
          reportDate,
          status,
          finalVideoPath: null,
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        jobsStore.push(newJob);
        return newJob;
      }),
      update: jest.fn().mockImplementation(async (args) => {
        const { id, jobId } = args.where;
        const existing = jobsStore.find(j => j.id === id || j.jobId === jobId);
        if (existing) {
          Object.assign(existing, args.data);
          return existing;
        }
        throw new Error('Not found');
      }),
    },
  };

  const mockMarketDataAgent = { run: jest.fn().mockResolvedValue({ available: true, price: 150 }) };
  const mockHistoricalDataAgent = { run: jest.fn().mockResolvedValue({ timeframes: { '1Day': { available: true, candles: [] } } }) };
  const mockTechnicalAgent = { run: jest.fn().mockResolvedValue({ available: true, timeframes: { '1Day': {} }, primary: { overallBias: 'BULLISH', rsi14: 60 } }) };
  const mockFundamentalAgent = { run: jest.fn().mockResolvedValue({ available: true, source: 'test' }) };
  const mockNewsAgent = { run: jest.fn().mockResolvedValue({ available: true, items: [], sentiment: 'NEUTRAL' }) };
  const mockInstitutionalFlowAgent = { run: jest.fn().mockResolvedValue({ proxyScore: 50, interpretation: 'NEUTRAL' }) };
  
  const mockOpenAIAnalystAgent = {
    run: jest.fn().mockResolvedValue({
      report: {
        currentPrice: 150,
        finalDecision: { finalRating: 'BUY', confidenceScore: 80, decisionSummary: 'Bullish outlook.' },
        technicalAnalysis: { technicalScore: 75, overallBias: 'BULLISH', keySignals: [] },
        fundamentalAnalysis: { fundamentalScore: 70 },
        institutionalFlowProxy: { institutionalFlowProxyScore: 65, institutionalFlowSummary: 'Proxy score.' },
        newsAndCatalysts: { newsCatalystScore: 60, keyCatalysts: ['Earnings positive'], keyRisksFromNews: ['Competition'] },
        riskAnalysis: { topRisks: ['Market risk'] },
        entryExitPlan: { buyNowZone: { low: 140, high: 145 }, targets: [], stopLoss: { price: 135, description: 'Support break' } },
        riskRewardAnalysis: { riskRewardVerdict: 'GOOD' },
        executiveSummary: { summary: 'Strong stock structure' }
      },
      promptTokens: 10,
      completionTokens: 10
    }),
    runCompanyInsights: jest.fn().mockResolvedValue({
      companyInsights: { investedCompanies: [], dependencies: { suppliers: [], outsourcePartners: [], marketingPartners: [], customers: [] }, strategicOutlook: 'Positive' },
      insightTokens: 10
    })
  };

  const mockDailyTrendAnalystAgent = { run: jest.fn().mockResolvedValue({ trend: 'UPTREND', barCount: 5 }) };
  const mockTrendStoryAgent = { run: jest.fn().mockResolvedValue({ move_classification: { primary_reason: 'Earnings beat', confidence: 0.9 } }) };
  const mockDocumentBuilderAgent = { generatePdfReport: jest.fn() };

  const mockVideoClient = {
    triggerVideoJob: jest.fn().mockImplementation(async (payload) => {
      return {
        jobId: `job-${Math.random()}`,
        reportId: payload.reportId,
        ticker: payload.ticker,
        reportDate: payload.reportDate,
        status: 'PENDING',
        artifacts: {},
      };
    }),
    retryVideoJob: jest.fn(),
  };

  beforeEach(async () => {
    jobsStore = [];
    jest.clearAllMocks();

    jest.spyOn(fs, 'existsSync').mockImplementation((p: any) => {
      const pStr = p.toString();
      if (pStr.includes('output') || pStr.includes('tmp')) {
        return false;
      }
      return true;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorAgent,
        VideoJobService,
        ConfigService,
        { provide: VideoGenerationClient, useValue: mockVideoClient },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MarketDataAgent, useValue: mockMarketDataAgent },
        { provide: HistoricalDataAgent, useValue: mockHistoricalDataAgent },
        { provide: TechnicalAgent, useValue: mockTechnicalAgent },
        { provide: FundamentalAgent, useValue: mockFundamentalAgent },
        { provide: NewsAgent, useValue: mockNewsAgent },
        { provide: InstitutionalFlowAgent, useValue: mockInstitutionalFlowAgent },
        { provide: OpenAIAnalystAgent, useValue: mockOpenAIAnalystAgent },
        { provide: DailyTrendAnalystAgent, useValue: mockDailyTrendAnalystAgent },
        { provide: TrendStoryAgent, useValue: mockTrendStoryAgent },
        { provide: DocumentBuilderAgent, useValue: mockDocumentBuilderAgent },
      ],
    }).compile();

    orchestrator = module.get<OrchestratorAgent>(OrchestratorAgent);
    videoJobService = module.get<VideoJobService>(VideoJobService);
    videoClient = module.get<VideoGenerationClient>(VideoGenerationClient);
  });

  it('should trigger a video job on the first analysis of a ticker', async () => {
    const result = await orchestrator.runFullAnalysis('AMD');
    expect(result.video).toBeDefined();
    expect(result.video.status).toBe('PENDING');
    expect(result.video.jobId).toBeDefined();

    // Verify it did NOT call the microservice trigger synchronously
    expect(mockVideoClient.triggerVideoJob).not.toHaveBeenCalled();

    // Verify it created a job record in local db
    const job = jobsStore.find(j => j.ticker === 'AMD');
    expect(job).toBeDefined();
    expect(job.status).toBe('PENDING');
  });

  it('should skip video generation on subsequent analyses of the same ticker on the same day if one exists', async () => {
    // First run
    const result1 = await orchestrator.runFullAnalysis('AMD');
    expect(result1.video.status).toBe('PENDING');

    // Simulate callback marking it completed
    const job = jobsStore.find(j => j.ticker === 'AMD');
    job.status = 'COMPLETED';
    job.finalVideoPath = 'path/to/video.mp4';

    // Second run
    const result2 = await orchestrator.runFullAnalysis('AMD');
    expect(result2.video.status).toBe('COMPLETED');
    expect(result2.video.message).toContain('Video already generated today');

    // Verify only one job created in store
    const jobs = jobsStore.filter(j => j.ticker === 'AMD');
    expect(jobs.length).toBe(1);
  });

  it('should generate a new video for the same ticker on the next day', async () => {
    // First run (Day 1)
    const originalToISOString = Date.prototype.toISOString;
    Date.prototype.toISOString = () => '2026-06-04T12:00:00.000Z';

    const result1 = await orchestrator.runFullAnalysis('AMD');
    expect(result1.video.status).toBe('PENDING');
    
    // Simulate callback completion
    const job1 = jobsStore.find(j => j.ticker === 'AMD');
    job1.status = 'COMPLETED';
    job1.finalVideoPath = 'path/to/video1.mp4';

    // Second run (Day 2)
    Date.prototype.toISOString = () => '2026-06-05T12:00:00.000Z';
    const result2 = await orchestrator.runFullAnalysis('AMD');
    expect(result2.video.status).toBe('PENDING');

    Date.prototype.toISOString = originalToISOString; // restore

    const jobs = jobsStore.filter(j => j.ticker === 'AMD');
    expect(jobs.length).toBe(2);
  });
});
