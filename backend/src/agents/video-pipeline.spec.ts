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
import { SignalCorrelationAgent } from './signal-correlation.agent';
import * as fs from 'fs';
import * as dateUtils from '../utils/date';

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
  const mockSignalCorrelationAgent = { run: jest.fn().mockResolvedValue({ finalZone: 'BULLISH', correlationScore: 80 }) };
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
    triggerVideoJobFireAndForget: jest.fn().mockImplementation((payload) => {
      // fire and forget, non-blocking
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
        { provide: SignalCorrelationAgent, useValue: mockSignalCorrelationAgent },
        { provide: DocumentBuilderAgent, useValue: mockDocumentBuilderAgent },
      ],
    }).compile();

    orchestrator = module.get<OrchestratorAgent>(OrchestratorAgent);
    videoJobService = module.get<VideoJobService>(VideoJobService);
    videoClient = module.get<VideoGenerationClient>(VideoGenerationClient);
  });

  it('should trigger a video job on the first analysis of a ticker', async () => {
    const fireAndForgetSpy = jest.spyOn(videoJobService, 'fireAndForget');
    const result = await orchestrator.runFullAnalysis('AMD');
    await fireAndForgetSpy.mock.results[0].value;

    expect(result.video).toBeDefined();
    expect(result.video.status).toBe('RECEIVED');

    // Verify it did NOT call the microservice trigger synchronously
    expect(mockVideoClient.triggerVideoJob).not.toHaveBeenCalled();

    // Verify it created a job record in local db
    const job = jobsStore.find(j => j.ticker === 'AMD');
    expect(job).toBeDefined();
    expect(job.status).toBe('RECEIVED');
  });

  it('should skip video generation on subsequent analyses of the same ticker on the same day if one exists', async () => {
    const fireAndForgetSpy = jest.spyOn(videoJobService, 'fireAndForget');

    // First run
    const result1 = await orchestrator.runFullAnalysis('AMD');
    await fireAndForgetSpy.mock.results[0].value;
    expect(result1.video.status).toBe('RECEIVED');

    // Simulate callback marking it completed (GENERATED status in decoupled setup)
    const job = jobsStore.find(j => j.ticker === 'AMD');
    job.status = 'GENERATED';
    job.finalVideoPath = 'path/to/video.mp4';

    (videoClient.triggerVideoJobFireAndForget as jest.Mock).mockClear();
    (mockVideoClient.triggerVideoJobFireAndForget as jest.Mock).mockClear();

    // Second run
    const result2 = await orchestrator.runFullAnalysis('AMD');
    await fireAndForgetSpy.mock.results[1].value;
    expect(result2.video.status).toBe('RECEIVED');

    // Verify it did NOT call the microservice trigger because it was skipped
    expect(videoClient.triggerVideoJobFireAndForget).not.toHaveBeenCalled();
    expect(mockVideoClient.triggerVideoJobFireAndForget).not.toHaveBeenCalled();

    // Verify only one job created in store
    const jobs = jobsStore.filter(j => j.ticker === 'AMD');
    expect(jobs.length).toBe(1);
  });

  it('should generate a new video for the same ticker on the next day', async () => {
    const fireAndForgetSpy = jest.spyOn(videoJobService, 'fireAndForget');

    // Mock getNYDateString for Day 1
    const dateSpy = jest.spyOn(dateUtils, 'getNYDateString').mockReturnValue('2026-06-04');

    const result1 = await orchestrator.runFullAnalysis('AMD');
    await fireAndForgetSpy.mock.results[0].value;
    expect(result1.video.status).toBe('RECEIVED');
    
    // Simulate callback completion
    const job1 = jobsStore.find(j => j.ticker === 'AMD');
    job1.status = 'GENERATED';
    job1.finalVideoPath = 'path/to/video1.mp4';

    // Mock getNYDateString for Day 2
    dateSpy.mockReturnValue('2026-06-05');
    const result2 = await orchestrator.runFullAnalysis('AMD');
    await fireAndForgetSpy.mock.results[1].value;
    expect(result2.video.status).toBe('RECEIVED');

    dateSpy.mockRestore(); // restore

    const jobs = jobsStore.filter(j => j.ticker === 'AMD');
    expect(jobs.length).toBe(2);
  });
});
