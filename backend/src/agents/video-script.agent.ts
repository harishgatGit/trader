import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

export const VideoScriptSchema = z.object({
  ticker: z.string(),
  title: z.string(),
  hook: z.string(),
  narrationScript: z.string(),
  durationSeconds: z.number().int().min(80).max(180),
  tone: z.string(),
  disclaimer: z.string(),
});

export type VideoScript = z.infer<typeof VideoScriptSchema>;

export interface VideoScriptInput {
  ticker: string;
  analysisDate: string;
  analysisReport: string;
  currentPrice: number | string;
  trend: string;
  reasonForMove: string;
  technicalSummary: string;
  newsSummary: string;
  volumeSummary: string;
  entryZone: string;
  targetPrice: string;
  stopLoss: string;
  riskReward: string;
  confidenceScore: number | string;
  finalView: string;
}

const SYSTEM_PROMPT = `Act as an expert stock analysis video content creator for InvestingAtti.
Your job is to generate a beginner-friendly, educational FULL narrative script for a 120 to 180-second vertical walkthrough video.

The video has 10 scenes with animated charts (price chart, volume bars, RSI gauge, MACD). Your narration must walk the viewer through EVERY scene with rich detail so the spoken words match the visuals on screen.

NARRATION STRUCTURE — write one paragraph per scene:
1. STOCK OVERVIEW: Introduce the ticker, company, and the overall signal rating with confidence score.
2. PRICE ACTION: Walk through today's price, the open vs close, the intraday chart shape (did it spike then sell off? grind down all day?), and the day change percentage. Reference the visual chart on screen.
3. TREND REASON: Explain WHY the stock moved today in plain English. Sector move? Earnings? Macro news? Institution distribution?
4. EVIDENCE: Walk through the 10-day price trend chart visible on screen. Point out the volume bars — are they confirming or contradicting the move? A high-price move on low volume is weak. Say it clearly.
5. DAILY TREND: Describe the 30-day daily chart trend. Higher highs? Pullback to support? Near resistance? Point to the support and resistance lines drawn on screen.
6. TECHNICAL METRICS: Walk through the RSI gauge on screen — is it overbought, neutral, oversold? Then the MACD — bullish or bearish cross? Are moving averages aligned or crossed?
7. TACTICAL SETUP: State the exact entry zone, stop-loss price, and targets. Explain the risk-reward ratio. Be specific with dollar amounts. Say these are NOT guaranteed.
8. SHORT TRADE: Assess squeeze risk. Is the setup risky for shorts? What is the short interest signal?
9. ECOSYSTEM INSIGHT: Mention sector performance, related stocks, macro conditions affecting this ticker.
10. FINAL VERDICT: Summarize the overall signal (BUY/SELL/WAIT). Remind viewers to manage risk. Close with InvestingAtti CTA and disclaimer.

CRITICAL RULES:
1. Use simple English for beginner and intermediate traders. No jargon without explanation.
2. Reference charts by saying things like: "As you can see on the chart", "Look at the volume bars here", "The RSI gauge shows", "The red dashed line is resistance".
3. Make the narration CONVERSATIONAL — like a knowledgeable trader friend explaining it to you.
4. Each scene paragraph should be 2-4 sentences. Do NOT rush. The total script should feel like 120-180 seconds when read aloud.
5. Never promise returns. Never say "buy now". Use "watch for", "consider", "if confirmed".
6. Always end with the disclaimer and CTA.
7. Return ONLY valid JSON matching this exact structure:
{
  "ticker": "<symbol>",
  "title": "<video title>",
  "hook": "<strong hook text>",
  "narrationScript": "<the FULL voiceover script — all 10 scene paragraphs>",
  "durationSeconds": 100,
  "tone": "conversational, educational, confident",
  "disclaimer": "This is for educational purposes only, not financial advice."
}`;

@Injectable()
export class VideoScriptAgent {
  private readonly logger = new Logger(VideoScriptAgent.name);
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

  async generate(input: VideoScriptInput): Promise<VideoScript> {
    this.logger.log(`Generating video script for ${input.ticker}`);

    const prompt = `
Ticker: ${input.ticker}
Analysis Date: ${input.analysisDate}
Current Price: ${input.currentPrice}
Trend: ${input.trend}
Reason for Move: ${input.reasonForMove}
Technical Summary: ${input.technicalSummary}
News Summary: ${input.newsSummary}
Volume Summary: ${input.volumeSummary}
Entry Zone: ${input.entryZone}
Target Price: ${input.targetPrice}
Stop Loss: ${input.stopLoss}
Risk Reward: ${input.riskReward}
Confidence Score: ${input.confidenceScore}
Final View: ${input.finalView}

Full Analysis Report Context:
${input.analysisReport}
`;

    let attempt = 0;
    const maxAttempts = 2;

    const systemPrompt = this.getPromptTemplate('video-script.system.md', SYSTEM_PROMPT);

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
          temperature: 0.55,
          max_tokens: 3000,
        });

        const rawContent = completion.choices[0]?.message?.content;
        if (!rawContent) throw new Error('Empty response from OpenAI');

        const parsed = JSON.parse(rawContent);
        const validated = VideoScriptSchema.parse(parsed);

        return validated;
      } catch (error) {
        this.logger.warn(`VideoScriptAgent attempt ${attempt} failed: ${error.message}`);
        if (attempt >= maxAttempts) throw error;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
}
