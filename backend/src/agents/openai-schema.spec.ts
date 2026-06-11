import { AnalystReportSchema } from '../agents/openai-analyst.agent';

describe('OpenAI Response Schema Validation', () => {
  const validReport = {
    symbol: 'AAPL',
    analysisDateTime: '2026-05-31T20:00:00Z',
    currentPrice: 185.5,

    dataQuality: {
      rating: 'HIGH',
      missingFields: [],
      staleDataWarning: null,
      decisionAllowed: true,
      reason: 'Data is complete'
    },

    finalDecision: {
      finalRating: 'BUY',
      decisionType: 'TRADE',
      confidenceScore: 85,
      decisionSummary: 'Buy signal confirmed',
      shouldBuyNow: true,
      buyNowReason: 'Breakout confirmed',
      bestActionNow: 'Buy standard position'
    },

    preDecisionChecklist: {
      trendConfirmed: true,
      momentumConfirmed: true,
      volumeConfirmed: true,
      entryNotExtended: true,
      riskRewardAcceptable: true,
      stopLossDefined: true,
      nearResistanceRisk: false,
      earningsRisk: false,
      newsRiskAcceptable: true,
      liquidityAcceptable: true,
      finalChecklistPass: true
    },

    executiveSummary: {
      summary: 'Apple shows strong technical momentum...',
      bullishFactors: ['Product launch'],
      bearishFactors: ['Valuation premium'],
      neutralFactors: []
    },

    technicalAnalysis: {
      overallBias: 'BULLISH',
      trendStage: 'MARKUP',
      setupType: 'BREAKOUT',
      technicalScore: 85,
      keySignals: ['RSI rising'],
      supportLevels: [180.0, 175.0],
      resistanceLevels: [190.0, 195.0],
      vwapAnalysis: 'Price above VWAP',
      movingAverageAnalysis: 'MA bullish',
      rsiAnalysis: 'RSI 55',
      macdAnalysis: 'MACD cross',
      volumeAnalysis: 'Above average volume',
      volumeTrendStatus: 'GROWING_STRONGER',
      atrVolatilityAnalysis: 'ATR is 3.5',
      adxTrendStrengthAnalysis: 'ADX is 22',
      bollingerBandAnalysis: 'Price at upper band'
    },

    entryExitPlan: {
      preferredEntryStyle: 'BUY_NOW',
      buyNowZone: { low: 184, high: 186, valid: true, description: 'Buy now' },
      pullbackEntryZone: { low: 180, high: 182, description: 'Pullback' },
      breakoutEntryLevel: { price: 188.0, confirmationRule: 'Daily close' },
      accumulationZone: { low: 178, high: 183, description: 'Accumulate' },
      invalidationLevel: { price: 175.0, reason: 'Trend break' },
      stopLoss: { price: 178.0, stopType: 'TECHNICAL', description: 'Below support' },
      targets: [
        { label: 'T1', price: 195.0, reason: 'Resistance' },
        { label: 'T2', price: 205.0, reason: 'Target' }
      ],
      exitRules: ['Close below EMA20']
    },

    riskRewardAnalysis: {
      entryReferencePrice: 185.5,
      riskPerShare: 7.5,
      rewardToTarget1: 9.5,
      rewardToTarget2: 19.5,
      rewardToTarget3: null,
      riskRewardToTarget1: '1:1.27',
      riskRewardToTarget2: '1:2.6',
      riskRewardToTarget3: null,
      riskRewardVerdict: 'GOOD',
      positionSizingNote: 'Risk-based'
    },

    shortTermView: {
      horizon: '1-5 days',
      bias: 'BULLISH',
      tradeQuality: 'A',
      entryZone: { low: 184.0, high: 186.0, description: 'Immediate buy' },
      stopLoss: { price: 182.0, description: 'Below support' },
      targets: [{ price: 190.0, label: 'T1' }],
      exitRules: ['Take profit']
    },

    swingTradeView: {
      horizon: '2-6 weeks',
      bias: 'BULLISH',
      entryZone: { low: 180.0, high: 184.0, description: 'Swing entry' },
      accumulationZone: { low: 178.0, high: 182.0, description: 'Accumulation' },
      stopLoss: { price: 175.0, description: 'Below EMA' },
      targets: [{ price: 200.0, label: 'T1' }],
      riskReward: '1:2.5',
      swingVerdict: 'BUY'
    },

    tacticalHorizonView: {
      horizon: '5-15 days',
      bias: 'BULLISH',
      dailyTrend: {
        trend: 'Bullish Markup',
        barCount: 252,
        analysis: 'Price is trending higher above key moving averages with daily bars.',
        laymanExplanation: 'Buyers are consistently willing to pay higher prices, creating higher highs and higher lows. This suggests strong bullish momentum.'
      },
      swingSetup: {
        setup: 'Bull flag breakout',
        analysis: 'A consolidation flag on 4H/1H timeframes indicating strong swing continuation.'
      },
      entryTiming: {
        trigger: '15M VWAP pullback reclaim',
        analysis: 'Buying pullbacks near VWAP on the 15M and 5M chart.'
      },
      supportLevels: [
        { price: 182.0, tests: 3 },
        { price: 180.0, tests: 5 },
        { price: 178.0, tests: 2 },
        { price: 175.0, tests: 4 },
        { price: 172.0, tests: 1 }
      ],
      resistanceLevels: [
        { price: 188.0, tests: 2 },
        { price: 190.0, tests: 4 },
        { price: 192.0, tests: 1 },
        { price: 195.0, tests: 6 },
        { price: 198.0, tests: 2 }
      ],
      suggestedEntryPrice: 184.5,
      suggestedExitPrice: 195.0,
      stopLossPrice: 178.0,
      riskMetrics: {
        atr: 3.5,
        atrAnalysis: 'Moderate volatility',
        vwap: 183.2,
        vwapAnalysis: 'Current price is just above 15M VWAP',
        volumeAnalysis: 'Growing volume support',
        supportResistanceAnalysis: 'Levels are strong and well tested'
      },
      catalysts: {
        news: 'Positive sentiment from earnings pre-announcement',
        earnings: 'Next earnings date is in 45 days',
        secFilings: 'No dilutive offerings registered recently'
      },
      shortFilter: {
        borrowFee: '1.2% rate',
        shortInterest: '3.5%',
        ssrStatus: 'SSR not active',
        squeezeRisk: 'LOW'
      },
      horizonDetails: 'A strong pullback entry setup'
    },

    longTermView: {
      horizon: '6-24 months',
      bias: 'BULLISH',
      investmentQuality: 'STRONG',
      fairValueRange: { low: 190.0, high: 220.0, method: 'DCF' },
      bullCase: 'Bull',
      baseCase: 'Base',
      bearCase: 'Bear',
      longTermVerdict: 'ACCUMULATE'
    },

    fundamentalAnalysis: {
      fundamentalScore: 80,
      rating: 'STRONG',
      revenueTrend: 'Up',
      epsTrend: 'Up',
      profitability: 'High',
      debtRisk: 'Low',
      cashFlowQuality: 'Strong',
      valuationCommentary: 'Fair'
    },

    valuationAnalysis: {
      valuationRating: 'FAIRLY_VALUED',
      valuationScore: 70,
      peerComparisonAvailable: true,
      fairValueRange: { low: 180.0, high: 200.0 },
      marginOfSafetyBuyZone: { low: 160.0, high: 175.0 },
      commentary: 'Fairly valued'
    },

    newsAndCatalysts: {
      newsCatalystScore: 75,
      overallSentiment: 'POSITIVE',
      keyCatalysts: ['Earnings upgrade'],
      keyRisksFromNews: ['Supply chain'],
      earningsRisk: 'Low',
      catalystVerdict: 'SUPPORTIVE'
    },

    institutionalFlowProxy: {
      institutionalFlowProxyScore: 80,
      interpretation: 'ACCUMULATION',
      institutionalFlowSummary: 'PROXY SCORE ONLY — NOT OFFICIAL INSTITUTIONAL DATA.',
      signals: ['Buy volume'],
      limitations: ['Proxy only']
    },

    multibaggerProbability: {
      rating: 'LOW',
      probabilityScore: 10,
      reason: 'Large cap',
      requiredConditions: [],
      majorBlockers: []
    },

    riskAnalysis: {
      overallRiskLevel: 'LOW',
      technicalRisk: 'Low',
      fundamentalRisk: 'Low',
      valuationRisk: 'Low',
      newsRisk: 'Low',
      liquidityRisk: 'Low',
      eventRisk: 'Low',
      topRisks: ['Macro']
    },

    scenarioAnalysis: {
      bullCase: { condition: 'C1', pricePath: 'P1', probability: 'MEDIUM' },
      baseCase: { condition: 'C2', pricePath: 'P2', probability: 'HIGH' },
      bearCase: { condition: 'C3', pricePath: 'P3', probability: 'LOW' }
    },

    finalActionPlan: ['Action'],
    doNotTradeConditions: ['Avoid'],

    alertLevels: {
      buyAlert: 185.0,
      breakoutAlert: 190.0,
      stopLossAlert: 178.0,
      target1Alert: 195.0,
      target2Alert: 205.0,
      riskAlert: 175.0
    },

    companyInsights: {
      investedCompanies: [
        {
          name: 'SpaceX',
          ownershipPct: '10%',
          performance: 'Growing operational capabilities',
          upcomingEvents: ['Starship Launch'],
          impactPotential: 'Positive impact'
        }
      ],
      dependencies: {
        suppliers: [
          {
            name: 'TSMC',
            role: 'Supplier',
            description: 'Semiconductors',
            riskExposure: 'Medium exposure'
          }
        ],
        outsourcePartners: [],
        marketingPartners: [],
        customers: []
      },
      strategicOutlook: 'Healthy ecosystem outlook'
    },

    disclaimer: 'Disclaimer'
  };

  it('should validate a correct report', () => {
    const result = AnalystReportSchema.safeParse(validReport);
    expect(result.success).toBe(true);
  });

  it('should reject invalid finalRating', () => {
    const invalid = {
      ...validReport,
      finalDecision: { ...validReport.finalDecision, finalRating: 'STRONG_BUY' }
    };
    const result = AnalystReportSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject confidenceScore > 100', () => {
    const invalid = {
      ...validReport,
      finalDecision: { ...validReport.finalDecision, confidenceScore: 150 }
    };
    const result = AnalystReportSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject confidenceScore < 0', () => {
    const invalid = {
      ...validReport,
      finalDecision: { ...validReport.finalDecision, confidenceScore: -5 }
    };
    const result = AnalystReportSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject technicalScore > 100', () => {
    const invalid = {
      ...validReport,
      technicalAnalysis: { ...validReport.technicalAnalysis, technicalScore: 200 }
    };
    const result = AnalystReportSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should accept null for fundamentalScore when unavailable', () => {
    const withNull = {
      ...validReport,
      fundamentalAnalysis: { ...validReport.fundamentalAnalysis, fundamentalScore: null }
    };
    const result = AnalystReportSchema.safeParse(withNull);
    expect(result.success).toBe(true);
  });

  it('should reject invalid multibaggerProbability rating', () => {
    const invalid = {
      ...validReport,
      multibaggerProbability: { ...validReport.multibaggerProbability, rating: 'EXTREME' }
    };
    const result = AnalystReportSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should require symbol field', () => {
    const { symbol, ...withoutSymbol } = validReport;
    const result = AnalystReportSchema.safeParse(withoutSymbol);
    expect(result.success).toBe(false);
  });

  it('should require executiveSummary', () => {
    const { executiveSummary, ...without } = validReport;
    const result = AnalystReportSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it('should validate SELL rating', () => {
    const sell = {
      ...validReport,
      finalDecision: { ...validReport.finalDecision, finalRating: 'SELL' }
    };
    expect(AnalystReportSchema.safeParse(sell).success).toBe(true);
  });

  it('should validate all valid rating values', () => {
    const ratings = ['BUY', 'HOLD', 'SELL', 'WATCHLIST', 'AVOID'];
    ratings.forEach((rating) => {
      const result = AnalystReportSchema.safeParse({
        ...validReport,
        finalDecision: { ...validReport.finalDecision, finalRating: rating }
      });
      expect(result.success).toBe(true);
    });
  });
});
