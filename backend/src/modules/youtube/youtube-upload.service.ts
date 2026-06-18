import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import OpenAI from 'openai';

// ─── Types ───────────────────────────────────────────────────────────────────

interface YouTubeMetadata {
  title: string;
  description: string;
  tags: string[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class YoutubeUploadService {
  private readonly logger = new Logger(YoutubeUploadService.name);
  private readonly openai: OpenAI;

  // Refresh token → access token cache
  private accessToken: string | null = null;
  private accessTokenExpiry: Date | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // ─── Cron: runs every 15 minutes ─────────────────────────────────────────

  @Cron('*/15 * * * *')
  async runBatch(): Promise<void> {
    if (process.env.YOUTUBE_UPLOAD_ENABLED !== 'true') {
      return; // Feature flag — disabled by default until credentials are set
    }

    this.logger.log('[YouTube Batch] Starting upload scan...');

    // Find completed videos not yet uploaded
    const pending = await this.prisma.videoGenerationJob.findMany({
      where: {
        status: 'GENERATED',
        finalVideoPath: { not: null },
        youtubeUploadStatus: null, // not yet attempted
      },
      orderBy: { completedAt: 'asc' },
      take: 5, // Process max 5 per run to avoid rate limits
    });

    if (pending.length === 0) {
      this.logger.log('[YouTube Batch] No pending videos to upload.');
      return;
    }

    this.logger.log(`[YouTube Batch] Found ${pending.length} video(s) to upload.`);

    for (const job of pending) {
      await this.processJob(job);
    }
  }

  // ─── Process a single video job ─────────────────────────────────────────

  private async processJob(job: any): Promise<void> {
    const { id, ticker, reportDate, reportId, finalVideoPath } = job;
    this.logger.log(`[YouTube Batch] Processing ${ticker}/${reportDate} (job: ${id})`);

    // 1. Mark as UPLOADING
    await this.prisma.videoGenerationJob.update({
      where: { id },
      data: { youtubeUploadStatus: 'UPLOADING' },
    });

    try {
      // 2. Resolve video file path
      const resolvedPath = this.resolveVideoPath(finalVideoPath);
      if (!resolvedPath || !fs.existsSync(resolvedPath)) {
        throw new Error(`Video file not found at path: ${finalVideoPath}`);
      }

      // 3. Load report JSON for metadata generation
      let reportJson: any = null;
      if (reportId) {
        const report = await this.prisma.agentReport.findUnique({
          where: { id: reportId },
          select: { reportJson: true, finalRating: true, executiveSummary: true, currentPrice: true },
        });
        reportJson = report;
      }

      // 4. Generate title + description via GPT-4o
      const metadata = await this.generateMetadata(ticker, reportDate, reportJson);
      this.logger.log(`[YouTube Batch] Generated title: "${metadata.title}"`);

      // 5. Upload to YouTube
      const youtubeVideoId = await this.uploadToYouTube(resolvedPath, metadata);
      const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;

      // 6. Save result
      await this.prisma.videoGenerationJob.update({
        where: { id },
        data: {
          youtubeVideoId,
          youtubeUrl,
          youtubeTitle: metadata.title,
          youtubeDescription: metadata.description,
          youtubeUploadStatus: 'UPLOADED',
          youtubeUploadedAt: new Date(),
          youtubeUploadError: null,
        },
      });

      this.logger.log(`[YouTube Batch] ✅ Uploaded ${ticker}/${reportDate} → ${youtubeUrl}`);
    } catch (err: any) {
      this.logger.error(`[YouTube Batch] ❌ Failed to upload ${ticker}/${reportDate}: ${err.message}`);
      await this.prisma.videoGenerationJob.update({
        where: { id },
        data: {
          youtubeUploadStatus: 'FAILED',
          youtubeUploadError: err.message?.slice(0, 500),
        },
      });
    }
  }

  // ─── Resolve the video file path ────────────────────────────────────────

  private resolveVideoPath(rawPath: string): string {
    if (!rawPath) return '';
    // If it's already absolute, use as-is
    if (path.isAbsolute(rawPath)) return rawPath;
    // If it's a relative path, resolve from backend root
    return path.resolve(process.cwd(), rawPath);
  }

  // ─── Generate SEO metadata via GPT-4o ──────────────────────────────────

  async generateMetadata(ticker: string, reportDate: string, reportData: any): Promise<YouTubeMetadata> {
    const date = new Date(reportDate);
    const formattedDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const rating = reportData?.finalRating || 'ANALYZED';
    const summary = reportData?.executiveSummary || `AI-powered stock analysis for ${ticker}`;
    const price = reportData?.currentPrice ? `$${Number(reportData.currentPrice).toFixed(2)}` : '';
    const reportJson = reportData?.reportJson as any;
    const bias = reportJson?.technicals?.primary?.overallBias || reportJson?.overallBias || '';
    const rsi = reportJson?.technicals?.primary?.rsi14 ? `RSI: ${Number(reportJson.technicals.primary.rsi14).toFixed(1)}` : '';
    const sector = reportJson?.fundamentals?.sector || '';

    const prompt = `You are writing YouTube metadata for an AI stock analysis video for ${ticker} (${formattedDate}).

Report data:
- Rating: ${rating}
- Price: ${price}
- Bias: ${bias}
- ${rsi}
- Sector: ${sector}
- Summary: ${summary}

Generate a YouTube title and description. Rules:
- Title: max 90 characters, include ticker, rating, and date. Format: "$TICKER Stock Analysis — [Rating] | [Key Signal] | ${formattedDate}"
- Description: 3-5 paragraphs covering: (1) what was analyzed, (2) key technicals, (3) key catalysts, (4) disclaimer, (5) hashtags
- Tags: 10-15 relevant tags as array
- Keep description professional, informative, SEO-friendly

Respond in valid JSON:
{
  "title": "...",
  "description": "...",
  "tags": ["tag1", "tag2", ...]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 800,
      });

      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      return {
        title: parsed.title || `${ticker} Stock Analysis — ${rating} | ${formattedDate}`,
        description: parsed.description || summary,
        tags: parsed.tags || [ticker, 'stocks', 'investing', 'stockanalysis', 'AI'],
      };
    } catch (err: any) {
      this.logger.warn(`[YouTube Batch] GPT-4o metadata generation failed, using fallback: ${err.message}`);
      return {
        title: `${ticker} Stock Analysis — ${rating} | ${formattedDate}`,
        description: `${ticker} AI Stock Analysis for ${formattedDate}.\n\n${summary}\n\n⚠️ Disclaimer: This is for educational purposes only. Not financial advice.\n\n#${ticker} #stocks #investing #stockanalysis #AIstocks`,
        tags: [ticker, 'stocks', 'investing', 'stockanalysis', 'AI', 'wallstreet', 'trading'],
      };
    }
  }

  // ─── Get valid YouTube access token (refresh if expired) ───────────────

  private async getAccessToken(): Promise<string> {
    const now = new Date();
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && this.accessTokenExpiry && this.accessTokenExpiry > new Date(now.getTime() + 60000)) {
      return this.accessToken;
    }

    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('YouTube OAuth credentials not configured. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN in .env');
    }

    const res = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    this.accessToken = res.data.access_token;
    this.accessTokenExpiry = new Date(now.getTime() + (res.data.expires_in - 60) * 1000);
    return this.accessToken!;
  }

  // ─── Upload video to YouTube via resumable upload ───────────────────────

  private async uploadToYouTube(filePath: string, metadata: YouTubeMetadata): Promise<string> {
    const accessToken = await this.getAccessToken();
    const channelId = process.env.YOUTUBE_CHANNEL_ID;
    const visibility = process.env.YOUTUBE_UPLOAD_VISIBILITY || 'private'; // private by default

    const fileSize = fs.statSync(filePath).size;
    const fileStream = fs.createReadStream(filePath);

    // Step 1: Initiate resumable upload session
    const initRes = await axios.post(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        snippet: {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          categoryId: '25', // News & Politics (suitable for finance)
          defaultLanguage: 'en',
          ...(channelId ? { channelId } : {}),
        },
        status: {
          privacyStatus: visibility, // 'private' | 'unlisted' | 'public'
          selfDeclaredMadeForKids: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Length': fileSize,
          'X-Upload-Content-Type': 'video/mp4',
        },
      },
    );

    const uploadUrl = initRes.headers['location'];
    if (!uploadUrl) throw new Error('YouTube did not return a resumable upload URL');

    // Step 2: Upload file content
    const uploadRes = await axios.put(uploadUrl, fileStream, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': fileSize,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 600000, // 10 min for large files
    });

    const videoId = uploadRes.data?.id;
    if (!videoId) throw new Error(`YouTube upload succeeded but no video ID returned. Response: ${JSON.stringify(uploadRes.data)}`);

    return videoId;
  }

  // ─── Manual trigger (for admin API endpoint) ────────────────────────────

  async triggerUploadForJob(jobId: string): Promise<{ success: boolean; message: string }> {
    const job = await this.prisma.videoGenerationJob.findUnique({ where: { id: jobId } });
    if (!job) return { success: false, message: 'Job not found' };
    if (job.status !== 'GENERATED') return { success: false, message: `Job status is ${job.status}, not GENERATED` };
    await this.processJob(job);
    return { success: true, message: `Upload initiated for ${job.ticker}/${job.reportDate}` };
  }

  // ─── Get YouTube upload status summary ─────────────────────────────────

  async getUploadStats(): Promise<any> {
    const [total, uploaded, failed, pending] = await Promise.all([
      this.prisma.videoGenerationJob.count({ where: { status: 'GENERATED' } }),
      this.prisma.videoGenerationJob.count({ where: { youtubeUploadStatus: 'UPLOADED' } }),
      this.prisma.videoGenerationJob.count({ where: { youtubeUploadStatus: 'FAILED' } }),
      this.prisma.videoGenerationJob.count({ where: { status: 'GENERATED', youtubeUploadStatus: null } }),
    ]);
    return { total, uploaded, failed, pending };
  }
}
