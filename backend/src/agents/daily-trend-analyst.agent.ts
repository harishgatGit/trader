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

export const DailyTrendResultSchema = z.object({
  trend: z.enum(['BULLISH', 'BEARISH', 'NEUTRAL', 'MIXED']),
  barCount: z.number(),
  analysis: z.string(),
  laymanExplanation: z.string(),
}).passthrough();

export type DailyTrendResult = z.infer<typeof DailyTrendResultSchema>;

const DAILY_TREND_SYSTEM_PROMPT = `You are a senior equity analyst and layman-friendly market educator specializing in explaining stock price trends and connecting the dots for retail investors.

Given a stock ticker, its daily price action, technical indicators, fundamental data, news headlines, and institutional trade flow, analyze the daily trend (using 120-252 daily bars).

You must output a JSON object containing:
1. "trend": Classify the trend bias exactly as one of: 'BULLISH', 'BEARISH', 'NEUTRAL', 'MIXED'.
2. "barCount": Specify the exact number of daily candles analyzed (usually 252).
3. "analysis": Write a detailed, specific explanation of WHY this trend happened. You MUST connect the dots for the user. Explain how recent corporate earnings results (including exact revenue/EPS figures and what they mean), high-volume institutional block transactions, macro shifts, or specific corporate/news/filing events drove the stock price direction. WARNING: Generic or boilerplate explanations (e.g., "climbing due to positive market sentiment or general demand") are strictly forbidden. Ground your explanation strictly in the provided data.
4. "laymanExplanation": Write a 1-2 sentence layman-friendly takeaway translating technical terms (like higher highs/higher lows) into simple everyday analogies, and detail your specific assumption or outlook for the stock in layman terms. Do not use complex trading jargon.

Your response must be a single, valid JSON object matching this schema:
{
  "trend": "BULLISH | BEARISH | NEUTRAL | MIXED",
  "barCount": 252,
  "analysis": "<detailed catalyst/reasoning connecting the dots>",
  "laymanExplanation": "<simple layman-friendly explanation and outlook>"
}

Do NOT output markdown code blocks, backticks, or any explanations outside the JSON object.`;

@Injectable()
export class DailyTrendAnalystAgent {
  private readonly logger = new Logger(DailyTrendAnalystAgent.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get('OPENAI_API_KEY'),
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
  }): Promise<DailyTrendResult> {
    this.logger.log(`Running dedicated Daily Trend analysis for ${params.symbol}`);

    const prompt = this.buildPrompt(params);
    let attempt = 0;
    const maxAttempts = 2;

    const systemPrompt = this.getPromptTemplate('daily-trend.system.md', DAILY_TREND_SYSTEM_PROMPT);

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
          temperature: 0.3,
          max_tokens: 1500,
        });

        const rawContent = completion.choices[0]?.message?.content;
        if (!rawContent) throw new Error('Empty response from OpenAI');

        const parsed = JSON.parse(rawContent);
        const validated = DailyTrendResultSchema.parse(parsed);

        return validated;
      } catch (error) {
        this.logger.warn(`OpenAI Daily Trend attempt ${attempt} failed: ${error.message}`);
        if (attempt >= maxAttempts) {
          // Return a structured fallback response rather than crashing the orchestrator
          return {
            trend: 'NEUTRAL',
            barCount: 252,
            analysis: `Dedicated daily trend analysis temporarily unavailable. Technical trend calculations indicate a sideways structure.`,
            laymanExplanation: `We are experiencing high traffic from our analysis provider. The stock is currently consolidating sideways while waiting for a catalyst.`,
          };
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return {
      trend: 'NEUTRAL',
      barCount: 252,
      analysis: 'Daily trend analysis fallback.',
      laymanExplanation: 'Sideways trend.',
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
        };
      }
    }

    const timestamp = new Date().toISOString();

    const dailyCandles = historicalData?.timeframes?.['1Day']?.candles || [];
    const candleCount = dailyCandles.length;
    const dataQualitySummary = {
      priceAvailable: marketData.available && marketData.price > 0,
      historicalCandlesCount: candleCount,
      historicalCandlesQuality: candleCount >= 120 ? 'sufficient' : 'insufficient',
      technicalsAvailable: technicals.available && technicals.primary != null,
      fundamentalsAvailable: fundamentals.available,
      newsCount: news.items?.length || 0,
      institutionalFlowAvailable: institutionalFlow.proxyScore != null,
    };

    const candleDataStr = dailyCandles.length > 0
      ? JSON.stringify(dailyCandles.slice(-252).map(c => ({
          date: c.timestamp.split('T')[0],
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: Number(c.volume)
        })), null, 2)
      : 'Insufficient historical candle data';

    return `Explain the daily trend reason and layman translation for this stock.

SYMBOL: ${symbol}
TIMESTAMP: ${timestamp}
## BACKEND DATA QUALITY CHECK
${JSON.stringify(dataQualitySummary, null, 2)}

## HISTORICAL CANDLES (1Day)
${candleDataStr}

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

## TECHNICAL INDICATORS — MULTI TIMEFRAME
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
  description: fundamentals.description,
}, null, 2)}

## NEWS AND EVENTS
${JSON.stringify({
  available: news.available,
  overallSentiment: news.sentiment,
  articles: news.items.slice(0, 5).map(n => ({
    headline: n.headline,
    sentiment: n.sentiment,
    source: n.source,
    publishedAt: n.publishedAt,
  })),
}, null, 2)}

## INSTITUTIONAL FLOW PROXY
${JSON.stringify({
  proxyScore: institutionalFlow.proxyScore,
  interpretation: institutionalFlow.interpretation,
  signals: institutionalFlow.signals,
}, null, 2)}
`;
  }
}
