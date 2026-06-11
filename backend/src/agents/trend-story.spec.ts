import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TrendStoryAgent, TrendStoryResult } from './trend-story.agent';

// Mock OpenAI client
jest.mock('openai', () => {
  const mockOpenAI = jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };
  });
  return {
    __esModule: true,
    default: mockOpenAI,
    OpenAI: mockOpenAI,
  };
});

describe('TrendStoryAgent', () => {
  let agent: TrendStoryAgent;
  let configService: ConfigService;
  let mockOpenAIInstance: any;

  // Base mock data parameters
  const baseParams: any = {
    symbol: 'XYZ',
    marketData: {
      symbol: 'XYZ',
      available: true,
      price: 150.0,
      open: 145.0,
      high: 155.0,
      low: 144.0,
      close: 150.0,
      volume: 2500000,
      vwap: 149.5,
      bid: 149.8,
      ask: 150.2,
      spread: 0.4,
      changePercent: 3.45,
      timestamp: new Date().toISOString(),
    },
    technicals: {
      available: true,
      timeframes: ['1Day'],
      primary: {
        ema20: 142.5,
        ema50: 138.0,
        ema200: 125.0,
        sma20: 141.2,
        sma50: 137.5,
        rsi14: 65.0,
        macdLine: 1.5,
        macdSignal: 1.0,
        macdHist: 0.5,
        bbUpper: 153.0,
        bbMiddle: 141.2,
        bbLower: 129.4,
        bbWidth: 0.17,
        atr14: 4.5,
        relVolume: 2.2, // Strong volume (>1.5x)
        vwap: 149.5,
        adx14: 25.0,
        plusDI: 28.0,
        minusDI: 15.0,
        supportLevels: [140.0, 135.0],
        resistanceLevels: [153.0, 160.0],
        overallBias: 'BULLISH' as const,
        signals: ['RSI Bullish', 'MACD Crossover'],
      },
    },
    fundamentals: {
      available: true,
      source: 'YFinance',
      sector: 'Technology',
      peRatio: 25.0,
      marketCap: 50000000000,
      eps: 6.0,
    },
    news: {
      available: true,
      sentiment: 'POSITIVE' as const,
      items: [
        {
          headline: 'XYZ Corp beats Q2 earnings and raises revenue guidance',
          summary: 'XYZ reported earnings beat with strong cloud software sales.',
          source: 'Reuters',
          publishedAt: new Date().toISOString(),
          sentiment: 'POSITIVE' as const,
          url: 'https://example.com/xyz',
        },
      ],
    },
    institutionalFlow: {
      proxyScore: 78,
      interpretation: 'STRONG_ACCUMULATION',
      signals: ['Block buy prints noticed', 'Dark pool accumulation above average'],
      accumulationTrend: 'BULLISH',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrendStoryAgent,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'OPENAI_API_KEY') return 'mock-key';
              if (key === 'OPENAI_MODEL') return 'gpt-4o';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    agent = module.get<TrendStoryAgent>(TrendStoryAgent);
    configService = module.get<ConfigService>(ConfigService);
    
    // Grab the mock instance of OpenAI
    const { OpenAI } = require('openai');
    mockOpenAIInstance = new OpenAI();
    (agent as any).openai = mockOpenAIInstance; // Inject mocked OpenAI client
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(agent).toBeDefined();
  });

  describe('Normalize Helper Adapters', () => {
    it('should correctly normalize news lists', () => {
      const normalizedNews = agent['normalizeNews'](baseParams.news);
      expect(normalizedNews.length).toBe(1);
      expect(normalizedNews[0]).toEqual(
        expect.objectContaining({
          headline: 'XYZ Corp beats Q2 earnings and raises revenue guidance',
          source: 'Reuters',
          impact: 'positive',
          relevance_score: 90,
        }),
      );
    });

    it('should normalize earnings news catalysts', () => {
      const earnings = agent['normalizeEarnings'](baseParams.fundamentals, baseParams.news);
      expect(earnings.has_recent_earnings).toBe(true);
      expect(earnings.eps_surprise).toBe(8.5);
      expect(earnings.guidance_change).toBe('raised');
    });

    it('should normalize analyst rating keywords from news', () => {
      const analystNews = {
        available: true,
        sentiment: 'NEUTRAL' as const,
        items: [
          {
            headline: 'Goldman Sachs upgrades XYZ to Buy from Neutral with $175 target',
            summary: 'Goldman Sachs upgrades rating.',
            source: 'Goldman Sachs',
            publishedAt: new Date().toISOString(),
            sentiment: 'POSITIVE' as const,
            url: 'https://example.com/xyz',
          },
        ],
      };
      const analysts = agent['normalizeAnalysts'](analystNews as any);
      expect(analysts.length).toBe(1);
      expect(analysts[0].action).toBe('upgrade');
      expect(analysts[0].firm).toBe('Goldman Sachs');
    });
  });

  describe('OpenAI completions classifications scenarios', () => {
    const createMockOpenAIResponse = (data: Partial<TrendStoryResult>) => {
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                ticker: 'XYZ',
                analysis_date: '2026-06-03',
                price_summary: {
                  current_price: 150.0,
                  previous_close: 145.0,
                  day_change_percent: 3.45,
                  day_range: { high: 155.0, low: 144.0 },
                  volume: 2500000,
                  average_volume: 1136363,
                  relative_volume: 2.2,
                },
                move_classification: {
                  primary_reason: 'earnings-driven',
                  secondary_reasons: ['institutional-accumulation'],
                  confidence: 'high',
                  confidence_score: 95,
                  ...data.move_classification,
                },
                story_for_layman: {
                  headline: 'XYZ surges higher on blockbuster Q2 earnings report',
                  simple_explanation: 'XYZ stock rose today after releasing strong profits.',
                  why_it_moved: 'Earnings beats and guidance raised.',
                  who_may_be_buying_or_selling: 'institution',
                  is_move_sustainable: 'yes',
                  sustainability_reason: 'Strong earnings backing and volume confirmation.',
                  ...data.story_for_layman,
                },
                evidence: {
                  news_catalysts: [],
                  earnings_catalyst: {
                    has_recent_earnings: true,
                    eps_surprise: 8.5,
                    revenue_surprise: 2.1,
                    guidance_change: 'raised',
                    summary: 'Beat expectations',
                  },
                  analyst_actions: [],
                  sector_context: {
                    sector_name: 'Technology',
                    sector_change_percent: 1.2,
                    index_change_percent: 0.5,
                    is_stock_outperforming_sector: true,
                    summary: 'Tech outperforms broad index',
                  },
                  volume_context: {
                    relative_volume: 2.2,
                    volume_interpretation: 'above_average',
                    large_buyer_signal: 'strong',
                    summary: 'Volume is active',
                  },
                  technical_context: {
                    trend: 'uptrend',
                    breakout_level: 148.0,
                    support_level: 140.0,
                    resistance_level: 153.0,
                    rsi: 65,
                    macd_signal: 'bullish',
                    vwap_position: 'above',
                    summary: 'Technical setup positive',
                  },
                  short_context: {
                    short_interest_available: true,
                    short_interest_percent: 2.5,
                    days_to_cover: 1.5,
                    borrow_available: true,
                    short_squeeze_risk: 'low',
                    summary: 'Low risk of squeeze',
                  },
                  ...data.evidence,
                },
                swing_trade_view: {
                  trade_bias: 'buy',
                  entry_zone: { low: 146.0, high: 149.0 },
                  stop_loss: 143.0,
                  target_1: 158.0,
                  target_2: 165.0,
                  risk_reward: 2.5,
                  entry_reason: 'Buy pullback',
                  wait_for_confirmation: 'Hold above breakout support',
                  ...data.swing_trade_view,
                },
                short_trade_view: {
                  short_bias: 'avoid_short',
                  short_entry_trigger: 142.5,
                  short_stop_loss: 153.0,
                  short_target_1: 135.0,
                  short_target_2: 130.0,
                  reason: 'Too strong to short',
                  ...data.short_trade_view,
                },
                final_summary: {
                  one_line_story: 'XYZ leaps on earnings.',
                  layman_summary: 'XYZ rises on earnings beats.',
                  trader_action: 'Buy near support.',
                  risk_warning: 'Avoid chasing at resistance.',
                  ...data.final_summary,
                },
              }),
            },
          },
        ],
      };
    };

    it('should validate earnings-driven move scenario', async () => {
      const mockResult = createMockOpenAIResponse({
        move_classification: {
          primary_reason: 'earnings-driven',
          secondary_reasons: ['institutional-accumulation'],
          confidence: 'high',
          confidence_score: 95,
        },
      });

      mockOpenAIInstance.chat.completions.create.mockResolvedValueOnce(mockResult);

      const result = await agent.run(baseParams);

      expect(result.move_classification.primary_reason).toBe('earnings-driven');
      expect(result.move_classification.confidence).toBe('high');
      expect(result.story_for_layman.headline).toContain('blockbuster');
      expect(result.evidence.earnings_catalyst.has_recent_earnings).toBe(true);
    });

    it('should validate news-driven move scenario', async () => {
      const mockResult = createMockOpenAIResponse({
        move_classification: {
          primary_reason: 'news-driven',
          secondary_reasons: [],
          confidence: 'high',
          confidence_score: 90,
        },
        story_for_layman: {
          headline: 'XYZ leaps on partnership news with giant technology customer',
          simple_explanation: 'Shares rose after declaring a new marketing partner.',
          why_it_moved: 'Partnership press release catalyst.',
          who_may_be_buying_or_selling: 'retail',
          is_move_sustainable: 'uncertain',
          sustainability_reason: 'Partnership news can see profit taking.',
        },
      });

      mockOpenAIInstance.chat.completions.create.mockResolvedValueOnce(mockResult);

      const result = await agent.run(baseParams);

      expect(result.move_classification.primary_reason).toBe('news-driven');
      expect(result.story_for_layman.headline).toContain('partnership');
    });

    it('should validate high-volume technical breakout scenario', async () => {
      const mockResult = createMockOpenAIResponse({
        move_classification: {
          primary_reason: 'technical-breakout',
          secondary_reasons: ['institutional-accumulation'],
          confidence: 'medium',
          confidence_score: 75,
        },
        story_for_layman: {
          headline: 'XYZ breaks above resistance area on strong volume participation',
          simple_explanation: 'The stock pushed past a price area where sellers usually gather.',
          why_it_moved: 'Technical resistance level breakout.',
          who_may_be_buying_or_selling: 'institution',
          is_move_sustainable: 'yes',
          sustainability_reason: 'High relative volume supports breakout sustainability.',
        },
      });

      mockOpenAIInstance.chat.completions.create.mockResolvedValueOnce(mockResult);

      const result = await agent.run(baseParams);

      expect(result.move_classification.primary_reason).toBe('technical-breakout');
      expect(result.story_for_layman.simple_explanation).toContain('sellers usually gather');
      expect(result.evidence.volume_context.large_buyer_signal).toBe('strong');
    });

    it('should validate low-volume fake breakout scenario', async () => {
      const mockResult = createMockOpenAIResponse({
        price_summary: {
          current_price: 150.0,
          previous_close: 148.0,
          day_change_percent: 1.35,
          day_range: { high: 151.0, low: 147.5 },
          volume: 500000,
          average_volume: 1000000,
          relative_volume: 0.5, // Low relative volume
        },
        move_classification: {
          primary_reason: 'low-volume-fake-move',
          secondary_reasons: ['unknown-mixed'],
          confidence: 'low',
          confidence_score: 40,
        },
        story_for_layman: {
          headline: 'XYZ rises slightly but lack of volume suggests caution',
          simple_explanation: 'The stock moved up today but on very light trading interest.',
          why_it_moved: 'Light volume breakout.',
          who_may_be_buying_or_selling: 'retail',
          is_move_sustainable: 'no',
          sustainability_reason: 'Low volume rallies are easily reversed by sellers.',
        },
      });

      mockOpenAIInstance.chat.completions.create.mockResolvedValueOnce(mockResult);

      const result = await agent.run({
        ...baseParams,
        technicals: {
          ...baseParams.technicals,
          primary: {
            ...baseParams.technicals.primary,
            relVolume: 0.5,
          },
        },
      });

      expect(result.move_classification.primary_reason).toBe('low-volume-fake-move');
      expect(result.story_for_layman.is_move_sustainable).toBe('no');
    });

    it('should validate short squeeze risk scenario', async () => {
      const mockResult = createMockOpenAIResponse({
        move_classification: {
          primary_reason: 'short-covering',
          secondary_reasons: ['retail-momentum'],
          confidence: 'high',
          confidence_score: 85,
        },
        story_for_layman: {
          headline: 'XYZ leaps as high short interest triggers covering scramble',
          simple_explanation: 'Buying has been very aggressive as short sellers rush to close borrows.',
          why_it_moved: 'Short squeeze action.',
          who_may_be_buying_or_selling: 'shorts covering',
          is_move_sustainable: 'no',
          sustainability_reason: 'Short squeezes are temporary price spikes.',
        },
        evidence: {
          news_catalysts: [],
          earnings_catalyst: { has_recent_earnings: false, guidance_change: 'unknown', summary: '' },
          analyst_actions: [],
          sector_context: { sector_name: 'Technology', sector_change_percent: 0.5, index_change_percent: 0.2, is_stock_outperforming_sector: true, summary: '' },
          volume_context: { relative_volume: 4.5, volume_interpretation: 'extreme', large_buyer_signal: 'moderate', summary: '' },
          technical_context: { trend: 'reversal', rsi: 82, macd_signal: 'bullish', vwap_position: 'above', summary: '' },
          short_context: {
            short_interest_available: true,
            short_interest_percent: 22.5, // High SI
            days_to_cover: 6.5,
            borrow_available: false,
            short_squeeze_risk: 'high',
            summary: 'High short interest borrow unavailable squeeze alert',
          },
        },
        short_trade_view: {
          short_bias: 'squeeze_risk_high',
          short_entry_trigger: 138.0,
          short_stop_loss: 160.0,
          short_target_1: 125.0,
          short_target_2: 110.0,
          reason: 'Do not short immediately during squeeze peak',
        },
      });

      mockOpenAIInstance.chat.completions.create.mockResolvedValueOnce(mockResult);

      const result = await agent.run(baseParams);

      expect(result.move_classification.primary_reason).toBe('short-covering');
      expect(result.evidence.short_context.short_squeeze_risk).toBe('high');
      expect(result.short_trade_view.short_bias).toBe('squeeze_risk_high');
    });

    it('should validate sector sympathy move scenario', async () => {
      const mockResult = createMockOpenAIResponse({
        move_classification: {
          primary_reason: 'sector-sympathy',
          secondary_reasons: ['market-wide'],
          confidence: 'medium',
          confidence_score: 70,
        },
        story_for_layman: {
          headline: 'XYZ rallies along with semiconductor sector names',
          simple_explanation: 'XYZ stock rose today alongside its peer companies in the chip sector.',
          why_it_moved: 'Sector wide tailwinds after competitors reported earnings.',
          who_may_be_buying_or_selling: 'mixed',
          is_move_sustainable: 'uncertain',
          sustainability_reason: 'Sector sympathetic rallies need direct catalysts to hold.',
        },
      });

      mockOpenAIInstance.chat.completions.create.mockResolvedValueOnce(mockResult);

      const result = await agent.run(baseParams);

      expect(result.move_classification.primary_reason).toBe('sector-sympathy');
      expect(result.story_for_layman.headline).toContain('semiconductor');
    });

    it('should fallback gracefully when OpenAI API fails', async () => {
      mockOpenAIInstance.chat.completions.create.mockRejectedValueOnce(
        new Error('Rate limit exceeded or API error'),
      );

      const result = await agent.run(baseParams);

      expect(result).toBeDefined();
      expect(result.ticker).toBe('XYZ');
      expect(result.move_classification.primary_reason).toBe('unknown-mixed');
      expect(result.move_classification.confidence).toBe('low');
      expect(result.story_for_layman.simple_explanation).toContain('could not find a clear external reason');
    });
  });
});
