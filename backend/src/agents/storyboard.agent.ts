import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { VideoScript } from './video-script.agent';

export const StoryboardSceneSchema = z.object({
  sceneNumber: z.number().int().min(1).max(10),
  durationSeconds: z.number(),
  voiceover: z.string(),
  textOverlay: z.string(),
  visualInstruction: z.string(),
  animationType: z.string(),
});

export const StoryboardSchema = z.object({
  ticker: z.string(),
  videoTitle: z.string(),
  format: z.literal('vertical_9_16'),
  durationSeconds: z.number(),
  scenes: z.array(StoryboardSceneSchema),
});

export type Storyboard = z.infer<typeof StoryboardSchema>;

export interface StoryboardInput {
  videoScript: VideoScript;
  ticker: string;
  analysisReportSummary: string;
}

const SYSTEM_PROMPT = `Act as an expert storyboard designer for stock analysis vertical (9:16) videos for Investingatti.
Your job is to generate a scene-by-scene storyboard JSON mapping to the provided voiceover script.

CRITICAL RULES:
1. You must create exactly 7 scenes, following this exact progression:
   Scene 1: Hook
   Scene 2: What happened
   Scene 3: Why it happened
   Scene 4: Technical setup
   Scene 5: Trade plan (Show entry, target, stop-loss if available)
   Scene 6: Final view
   Scene 7: CTA + disclaimer (Must show investingatti.com and include the educational disclaimer)
2. Use short, punchy text overlays.
3. Use animated chart-style visual instructions (e.g. "Zoom in on daily stock chart", "Draw resistance level at $X", "Highlight entry zone").
4. Show support, resistance, entry zone, target, and stop-loss where available.
5. Use Investingatti branding (colors: dark premium theme, orange/gold highlights, etc.).
6. The final scene must show "investingatti.com" and the educational disclaimer.
7. Return ONLY valid JSON matching this exact structure:
{
  "ticker": "<symbol>",
  "videoTitle": "<title>",
  "format": "vertical_9_16",
  "durationSeconds": 60,
  "scenes": [
    {
      "sceneNumber": 1,
      "durationSeconds": 6,
      "voiceover": "<voiceover text corresponding to this scene>",
      "textOverlay": "<text overlay description>",
      "visualInstruction": "<visual instruction or animated chart description>",
      "animationType": "<animation transition or type>"
    }
  ]
}`;

@Injectable()
export class StoryboardAgent {
  private readonly logger = new Logger(StoryboardAgent.name);
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

  async generate(input: StoryboardInput): Promise<Storyboard> {
    this.logger.log(`Generating storyboard for ${input.ticker}`);

    const prompt = `
Ticker: ${input.ticker}
Video Script:
Title: ${input.videoScript.title}
Hook: ${input.videoScript.hook}
Narration Script: ${input.videoScript.narrationScript}
Duration: ${input.videoScript.durationSeconds} seconds
Tone: ${input.videoScript.tone}
Disclaimer: ${input.videoScript.disclaimer}

Analysis Report Summary:
${input.analysisReportSummary}
`;

    let attempt = 0;
    const maxAttempts = 2;

    const systemPrompt = this.getPromptTemplate('storyboard.system.md', SYSTEM_PROMPT);

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
          temperature: 0.5,
          max_tokens: 2000,
        });

        const rawContent = completion.choices[0]?.message?.content;
        if (!rawContent) throw new Error('Empty response from OpenAI');

        const parsed = JSON.parse(rawContent);
        const validated = StoryboardSchema.parse(parsed);

        return validated;
      } catch (error) {
        this.logger.warn(`StoryboardAgent attempt ${attempt} failed: ${error.message}`);
        if (attempt >= maxAttempts) throw error;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
}
