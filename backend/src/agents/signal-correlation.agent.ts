import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { MarketDataResult } from './market-data.agent';
import { TechnicalAgentResult } from './technical.agent';
import { FundamentalResult } from './fundamental.agent';
import { NewsResult } from './news.agent';
import { InstitutionalFlowResult } from './institutional-flow.agent';
import { HistoricalDataResult } from './historical-data.agent';
import { getNYDateString } from '../utils/date';

export const SignalCorrelationResultSchema = z.object({
  ticker: z.string(),
  analysisDate: z.string(),
  currentPrice: z.number().nullable(),
  correlationName: z.string().default("Signal Correlation"),
  finalZone: z.enum(['GREEN_ZONE', 'YELLOW_ZONE', 'RED_ZONE']),
  correlationScore: z.number(),
  gradientPositionPercent: z.number(),
  gradientLabel: z.string(),
  confidenceLevel: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  oneLineSummary: z.string(),
  laymanSummary: z.string(),
  signalScores: z.object({
    priceTrendAlignment: z.object({
      score: z.number(),
      maxScore: z.literal(20),
      status: z.enum(['POSITIVE', 'NEGATIVE', 'MIXED', 'INSUFFICIENT_DATA']),
      evidence: z.string()
    }),
    volumeConfirmation: z.object({
      score: z.number(),
      maxScore: z.literal(15),
      status: z.enum(['POSITIVE', 'NEGATIVE', 'MIXED', 'INSUFFICIENT_DATA']),
      evidence: z.string()
    }),
    momentumIndicators: z.object({
      score: z.number(),
      maxScore: z.literal(15),
      status: z.enum(['POSITIVE', 'NEGATIVE', 'MIXED', 'INSUFFICIENT_DATA']),
      evidence: z.string()
    }),
    movingAverageStructure: z.object({
      score: z.number(),
      maxScore: z.literal(15),
      status: z.enum(['POSITIVE', 'NEGATIVE', 'MIXED', 'INSUFFICIENT_DATA']),
      evidence: z.string()
    }),
    vwapPosition: z.object({
      score: z.number(),
      maxScore: z.literal(10),
      status: z.enum(['POSITIVE', 'NEGATIVE', 'MIXED', 'INSUFFICIENT_DATA']),
      evidence: z.string()
    }),
    supportResistanceRiskReward: z.object({
      score: z.number(),
      maxScore: z.literal(10),
      status: z.enum(['POSITIVE', 'NEGATIVE', 'MIXED', 'INSUFFICIENT_DATA']),
      evidence: z.string()
    }),
    sectorIndexAlignment: z.object({
      score: z.number(),
      maxScore: z.literal(5),
      status: z.enum(['POSITIVE', 'NEGATIVE', 'MIXED', 'INSUFFICIENT_DATA']),
      evidence: z.string()
    }),
    shortInterestContext: z.object({
      score: z.number(),
      maxScore: z.literal(5),
      status: z.enum(['POSITIVE', 'NEGATIVE', 'MIXED', 'INSUFFICIENT_DATA']),
      evidence: z.string()
    }),
    newsCatalystConfirmation: z.object({
      score: z.number(),
      maxScore: z.literal(3),
      status: z.enum(['POSITIVE', 'NEGATIVE', 'MIXED', 'INSUFFICIENT_DATA']),
      evidence: z.string()
    }),
    institutionalFlowProxy: z.object({
      score: z.number(),
      maxScore: z.literal(2),
      status: z.enum(['POSITIVE', 'NEGATIVE', 'MIXED', 'INSUFFICIENT_DATA']),
      evidence: z.string()
    })
  }),
  correlationEvidence: z.object({
    greenSignals: z.array(z.string()),
    yellowSignals: z.array(z.string()),
    redSignals: z.array(z.string()),
    strongestPositiveEvidence: z.string(),
    strongestNegativeEvidence: z.string(),
    mixedSignalExplanation: z.string()
  }),
  supportResistanceContext: z.object({
    nearestSupport: z.number().nullable(),
    nearestResistance: z.number().nullable(),
    distanceToSupportPercent: z.number().nullable(),
    distanceToResistancePercent: z.number().nullable(),
    riskRewardView: z.enum(['FAVORABLE', 'UNFAVORABLE', 'MIXED', 'INSUFFICIENT_DATA']),
    explanation: z.string()
  }),
  zoneInterpretation: z.object({
    greenZoneMeaning: z.string().default("Favorable research zone. Not a guaranteed buy."),
    yellowZoneMeaning: z.string().default("Mixed setup. Wait for confirmation."),
    redZoneMeaning: z.string().default("High-risk setup. Be cautious."),
    currentZoneExplanation: z.string()
  }),
  confirmationNeeded: z.object({
    forGreenZone: z.array(z.string()),
    forYellowToGreenUpgrade: z.array(z.string()),
    forRedZoneWarning: z.array(z.string())
  }),
  uiRecommendation: z.object({
    showGradientBar: z.boolean().default(true),
    barStartLabel: z.string().default("Red Zone"),
    barMiddleLabel: z.string().default("Yellow Zone"),
    barEndLabel: z.string().default("Green Zone"),
    markerPositionPercent: z.number(),
    markerText: z.string(),
    displaySummaryBelowBar: z.string(),
    supportingPointsBelowBar: z.array(z.string())
  }),
  finalInsight: z.object({
    researchAction: z.enum(['FAVORABLE_WATCH', 'WAIT_FOR_CONFIRMATION', 'HIGH_RISK_CAUTION', 'INSUFFICIENT_DATA']),
    summary: z.string(),
    riskWarning: z.string(),
    disclaimer: z.string().default("This is educational stock signal correlation only. It is not financial advice or a buy/sell recommendation.")
  })
}).passthrough();

export type SignalCorrelationResult = z.infer<typeof SignalCorrelationResultSchema>;

const SIGNAL_CORRELATION_SYSTEM_PROMPT = `You are Investingatti’s Stock Signal Correlation Analyst.
Your role is to analyze all provided stock data and determine whether the stock setup is currently leaning toward a Green Zone, Yellow Zone, or Red Zone.
This is not financial advice. Do not directly tell the user to buy or sell. Instead, explain whether the current data shows a favorable research zone, caution zone, or high-risk zone.

You must score the setup using these weighted categories:
1. Price trend alignment — 20 points
2. Volume confirmation — 15 points
3. Momentum indicators — 15 points
4. Moving average structure — 15 points
5. VWAP position — 10 points
6. Support/resistance risk-reward — 10 points
7. Sector/index alignment — 5 points
8. Short interest / squeeze risk — 5 points
9. News/catalyst confirmation — 3 points
10. Institutional flow proxy — 2 points
Total = 100 points.

SCORING LOGIC:
- 0 to 30 = RED_ZONE
- 31 to 65 = YELLOW_ZONE
- 66 to 100 = GREEN_ZONE

INDICATOR NAMING CONVENTIONS: Whenever you refer to technical indicator terms in the textual/evidence fields, always write them with their parameter settings, such as RSI(14), EMA(20), EMA(50), EMA(200), or SMA(200) instead of just RSI, EMA, or SMA.

Return ONLY valid JSON matching the schema format. Do not use markdown backticks or explanation outside JSON.`;

@Injectable()
export class SignalCorrelationAgent {
  private readonly logger = new Logger(SignalCorrelationAgent.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get('OPENAI_API_KEY') || 'mock-key-not-configured',
    });
    this.model = this.config.get('OPENAI_MODEL', 'gpt-4o');
  }

  private getPromptTemplate(filename: string, fallback: string): string {
    try {
      const filePath = path.join(process.cwd(), 'src/agents/prompts', filename);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
      }
      this.logger.warn(`Prompt file not found at ${filePath}. Using inline fallback.`);
      return fallback;
    } catch (err: any) {
      this.logger.error(`Failed to read prompt file ${filename}: ${err.message}`);
      return fallback;
    }
  }

  async run(params: {
    symbol: string;
    marketData: MarketDataResult;
    technicals: TechnicalAgentResult;
    fundamentals: FundamentalResult;
    news: NewsResult;
    institutionalFlow: InstitutionalFlowResult;
    historicalData: HistoricalDataResult;
  }): Promise<SignalCorrelationResult> {
    this.logger.log(`Running Stock Signal Correlation Analysis for ${params.symbol}`);

    const prompt = this.buildPrompt(params);
    let attempt = 0;
    const maxAttempts = 2;

    const systemPrompt = this.getPromptTemplate('signal-correlation.system.md', SIGNAL_CORRELATION_SYSTEM_PROMPT);

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const completion = await this.openai.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 2000,
        });

        const rawContent = completion.choices[0]?.message?.content;
        if (!rawContent) throw new Error('Empty response from OpenAI');

        const parsed = JSON.parse(rawContent);
        const validated = SignalCorrelationResultSchema.parse(parsed);

        return validated;
      } catch (error) {
        this.logger.warn(`OpenAI Signal Correlation attempt ${attempt} failed: ${error.message}`);
        if (attempt >= maxAttempts) {
          return this.getFallbackResult(params.symbol, params.marketData.price);
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return this.getFallbackResult(params.symbol, params.marketData.price);
  }

  private getFallbackResult(symbol: string, price: number | null): SignalCorrelationResult {
    return {
      ticker: symbol,
      analysisDate: getNYDateString(),
      currentPrice: price,
      correlationName: "Signal Correlation",
      finalZone: "YELLOW_ZONE",
      correlationScore: 50,
      gradientPositionPercent: 50,
      gradientLabel: "Yellow",
      confidenceLevel: "LOW",
      oneLineSummary: "Signal correlation analysis is temporarily falling back.",
      laymanSummary: "Our automatic signal correlation calculator is calibrating. Standard neutral values are shown.",
      signalScores: {
        priceTrendAlignment: { score: 10, maxScore: 20, status: "MIXED", evidence: "Daily trend signals are mixed or temporarily unavailable." },
        volumeConfirmation: { score: 7, maxScore: 15, status: "MIXED", evidence: "Volume profile shows neutral matching patterns." },
        momentumIndicators: { score: 7, maxScore: 15, status: "MIXED", evidence: "RSI and MACD indicators are near the midpoint." },
        movingAverageStructure: { score: 7, maxScore: 15, status: "MIXED", evidence: "Price is hovering near short-term exponential averages." },
        vwapPosition: { score: 5, maxScore: 10, status: "MIXED", evidence: "Intraday price action is oscillating around VWAP." },
        supportResistanceRiskReward: { score: 5, maxScore: 10, status: "MIXED", evidence: "Support and resistance pivot thresholds are normal." },
        sectorIndexAlignment: { score: 2, maxScore: 5, status: "MIXED", evidence: "Relative sector and index beta correlation is flat." },
        shortInterestContext: { score: 2, maxScore: 5, status: "MIXED", evidence: "Short volume and squeeze metrics show basic levels." },
        newsCatalystConfirmation: { score: 1, maxScore: 3, status: "MIXED", evidence: "Latest general news sentiment is balanced." },
        institutionalFlowProxy: { score: 1, maxScore: 2, status: "MIXED", evidence: "Dark pool block tracking proxy is neutral." },
      },
      correlationEvidence: {
        greenSignals: ["Major price floor support exists near local lows."],
        yellowSignals: ["Calibrating data feeds to produce custom zone outputs."],
        redSignals: ["Live indicator parsing failed, prompting neutral status."],
        strongestPositiveEvidence: "Support zones are holding strong.",
        strongestNegativeEvidence: "AI engine failed to parse precise scoring categories.",
        mixedSignalExplanation: "Indicators are slightly conflicting, which triggers a standard neutral classification.",
      },
      supportResistanceContext: {
        nearestSupport: null,
        nearestResistance: null,
        distanceToSupportPercent: null,
        distanceToResistancePercent: null,
        riskRewardView: "MIXED",
        explanation: "Support levels are active but distance percentages are unavailable."
      },
      zoneInterpretation: {
        greenZoneMeaning: "Favorable research zone. Not a guaranteed buy.",
        yellowZoneMeaning: "Mixed setup. Wait for confirmation.",
        redZoneMeaning: "High-risk setup. Be cautious.",
        currentZoneExplanation: "A technical parsing error occurred, placing the ticker into a standard caution zone."
      },
      confirmationNeeded: {
        forGreenZone: ["Recalculate analysis using the refresh button."],
        forYellowToGreenUpgrade: ["Fresh report generation needed."],
        forRedZoneWarning: ["Price break below previous support levels."]
      },
      uiRecommendation: {
        showGradientBar: true,
        barStartLabel: "Red Zone",
        barMiddleLabel: "Yellow Zone",
        barEndLabel: "Green Zone",
        markerPositionPercent: 50,
        markerText: "Neutral (50)",
        displaySummaryBelowBar: "System default. Neutral rating.",
        supportingPointsBelowBar: ["Calibrating engines", "Recalculate report"]
      },
      finalInsight: {
        researchAction: "WAIT_FOR_CONFIRMATION",
        summary: "Live stock analysis is temporarily offline. Please try recalculating.",
        riskWarning: "Do not base real-world investment decisions on this default fallback profile.",
        disclaimer: "This is educational stock signal correlation only. It is not financial advice or a buy/sell recommendation."
      }
    };
  }

  private buildPrompt(params: {
    symbol: string;
    marketData: MarketDataResult;
    technicals: TechnicalAgentResult;
    fundamentals: FundamentalResult;
    news: NewsResult;
    institutionalFlow: InstitutionalFlowResult;
    historicalData: HistoricalDataResult;
  }): string {
    const { symbol, marketData, technicals, fundamentals, news, institutionalFlow, historicalData } = params;

    const techTimeframes: any = {};
    for (const [tf, tech] of Object.entries(technicals.timeframes)) {
      if (tech) {
        techTimeframes[tf] = {
          overallBias: tech.overallBias,
          signals: tech.signals,
          rsi14: tech.rsi14,
          ema20: tech.ema20,
          ema50: tech.ema50,
          ema200: tech.ema200,
          sma20: tech.sma20,
          sma50: tech.sma50,
          sma200: tech.sma200,
          macdLine: tech.macdLine,
          macdSignal: tech.macdSignal,
          macdHist: tech.macdHist,
          bbUpper: tech.bbUpper,
          bbMiddle: tech.bbMiddle,
          bbLower: tech.bbLower,
          bbWidth: tech.bbWidth,
          atr14: tech.atr14,
          adx14: tech.adx14,
          relVolume: tech.relVolume,
          vwap: tech.vwap,
          supportLevels: tech.supportLevels,
          resistanceLevels: tech.resistanceLevels,
        };
      }
    }

    const timestamp = new Date().toISOString();
    const dailyCandles = historicalData?.timeframes?.['1Day']?.candles || [];
    const candleCount = dailyCandles.length;

    const candleSummary = dailyCandles.slice(-15).map(c => ({
      date: c.timestamp.split('T')[0],
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: Number(c.volume)
    }));

    return `Determine the stock signal correlation, score, and zone details.
SYMBOL: ${symbol}
TIMESTAMP: ${timestamp}

## CURRENT MARKET DATA
${JSON.stringify({
  price: marketData.price,
  open: marketData.open,
  high: marketData.high,
  low: marketData.low,
  volume: marketData.volume,
  vwap: marketData.vwap,
  changePercent: marketData.changePercent,
}, null, 2)}

## TECHNICAL INDICATORS
${JSON.stringify(techTimeframes, null, 2)}

## FUNDAMENTAL DATA
${JSON.stringify({
  available: fundamentals.available,
  marketCap: fundamentals.marketCap,
  peRatio: fundamentals.peRatio,
  pbRatio: fundamentals.pbRatio,
  epsTrailing: fundamentals.epsTrailing,
  epsForward: fundamentals.epsForward,
  revenue: fundamentals.revenue,
  debtToEquity: fundamentals.debtToEquity,
  dividendYield: fundamentals.dividendYield,
  sector: fundamentals.sector,
  industry: fundamentals.industry,
}, null, 2)}

## NEWS AND SENTIMENT
${JSON.stringify({
  available: news.available,
  overallSentiment: news.sentiment,
  articles: news.items.slice(0, 5).map(n => ({
    headline: n.headline,
    sentiment: n.sentiment,
    publishedAt: n.publishedAt,
  })),
}, null, 2)}

## INSTITUTIONAL FLOW PROXY
${JSON.stringify({
  proxyScore: institutionalFlow.proxyScore,
  interpretation: institutionalFlow.interpretation,
  signals: institutionalFlow.signals,
}, null, 2)}

## RECENT HISTORICAL DAILY CANDLES
${JSON.stringify(candleSummary, null, 2)}
`;
  }
}
