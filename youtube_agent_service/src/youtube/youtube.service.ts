import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

const COMPANY_NAMES: Record<string, string> = {
  AAPL: 'Apple', MSFT: 'Microsoft', NVDA: 'NVIDIA', AMZN: 'Amazon',
  GOOGL: 'Alphabet', GOOG: 'Alphabet', META: 'Meta', TSLA: 'Tesla',
  NFLX: 'Netflix', AMD: 'AMD', AVGO: 'Broadcom', QCOM: 'Qualcomm',
  TXN: 'Texas Instruments', INTC: 'Intel', CRM: 'Salesforce',
  ADBE: 'Adobe', CSCO: 'Cisco', ORCL: 'Oracle', IBM: 'IBM',
  PLTR: 'Palantir', SNOW: 'Snowflake', PANW: 'Palo Alto Networks',
  ARM: 'Arm Holdings', COIN: 'Coinbase', MSTR: 'MicroStrategy',
  MARA: 'MARA Holdings', RIOT: 'Riot Platforms', SOFI: 'SoFi',
  NIO: 'NIO', BABA: 'Alibaba', MU: 'Micron', SMCI: 'Super Micro',
  SHOP: 'Shopify', SQ: 'Block', PYPL: 'PayPal', UBER: 'Uber',
  LYFT: 'Lyft', SNAP: 'Snap', SPOT: 'Spotify', HOOD: 'Robinhood',
  RIVN: 'Rivian', LCID: 'Lucid Motors', F: 'Ford', GM: 'General Motors',
  BA: 'Boeing', CAT: 'Caterpillar', GE: 'GE Aerospace',
  JPM: 'JPMorgan Chase', BAC: 'Bank of America', GS: 'Goldman Sachs',
  MS: 'Morgan Stanley', WFC: 'Wells Fargo', C: 'Citigroup',
  V: 'Visa', MA: 'Mastercard', AMGN: 'Amgen', PFE: 'Pfizer',
  JNJ: 'Johnson & Johnson', UNH: 'UnitedHealth', LLY: 'Eli Lilly',
  XOM: 'ExxonMobil', CVX: 'Chevron', SPY: 'S&P 500 ETF',
  QQQ: 'Nasdaq-100 ETF', IWM: 'Russell 2000 ETF',
};

function fmtDate(dateStr: string): string {
  try {
    const parts = dateStr.trim().split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
  } catch {}
  return dateStr;
}

function resolveCompany(ticker: string, companyName?: string | null): string {
  if (companyName && companyName.trim()) {
    return companyName.trim();
  }
  return COMPANY_NAMES[ticker.toUpperCase()] || ticker.toUpperCase();
}

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private readonly openai: OpenAI;

  // ─── In-memory lock: prevents concurrent duplicate uploads ───────
  // Key format: "TICKER|YYYY-MM-DD"
  private readonly uploadInFlight = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey') || '',
    });
  }

  // ─── OAuth Configuration ─────────────────────────────────────────

  private getOAuthClient() {
    const clientId = this.configService.get<string>('youtube.clientId');
    const clientSecret = this.configService.get<string>('youtube.clientSecret');
    const port = this.configService.get<number>('port') || 8095;

    if (!clientId || !clientSecret) {
      throw new Error('YouTube Client ID or Client Secret not configured in environment.');
    }

    return new google.auth.OAuth2(
      clientId,
      clientSecret,
      `http://localhost:${port}/oauth2callback`
    );
  }

  private getTokensFilePath(): string {
    return path.resolve(process.cwd(), 'tokens.json');
  }

  async getStoredRefreshToken(): Promise<string | null> {
    const envToken = this.configService.get<string>('YOUTUBE_REFRESH_TOKEN');
    if (envToken) {
      return envToken;
    }

    const tokensPath = this.getTokensFilePath();
    if (fs.existsSync(tokensPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        return data.refresh_token || null;
      } catch (e: any) {
        this.logger.error(`Error reading stored tokens from file: ${e.message}`);
      }
    }
    return null;
  }

  async storeTokens(refreshToken: string, accessToken?: string) {
    const tokensPath = this.getTokensFilePath();
    try {
      fs.writeFileSync(
        tokensPath,
        JSON.stringify({ refresh_token: refreshToken, access_token: accessToken }, null, 2),
        'utf8'
      );
      this.logger.log(`Tokens successfully saved to ${tokensPath}`);
    } catch (e: any) {
      this.logger.error(`Failed to store tokens: ${e.message}`);
    }
  }

  getAuthUrl(): string {
    const oauth2Client = this.getOAuthClient();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.upload',
      ],
      prompt: 'consent',
    });
  }

  async exchangeCodeForTokens(code: string): Promise<void> {
    const oauth2Client = this.getOAuthClient();
    this.logger.log('Exchanging auth code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (tokens.refresh_token) {
      await this.storeTokens(tokens.refresh_token, tokens.access_token || undefined);
    } else {
      this.logger.warn('OAuth callback succeeded but did not return a refresh token (user may have already authorized).');
      if (tokens.access_token) {
        await this.storeTokens('', tokens.access_token);
      }
    }
  }

  async isAuthorized(): Promise<boolean> {
    const token = await this.getStoredRefreshToken();
    return !!token;
  }

  async getCredentials(refreshTokenParam?: string): Promise<any> {
    const oauth2Client = this.getOAuthClient();
    const tokenToUse = refreshTokenParam || (await this.getStoredRefreshToken());
    
    if (tokenToUse) {
      oauth2Client.setCredentials({
        refresh_token: tokenToUse,
      });
      // Triggers token refresh if needed
      await oauth2Client.getAccessToken();
      return oauth2Client;
    }

    throw new Error('No authorization credentials available. Navigate to http://localhost:8095/login to authorize the service.');
  }

  // ─── Cron Job: Runs every 15 minutes ─────────────────────────────

  @Cron('*/15 * * * *')
  async runBatch() {
    const enabled = this.configService.get<string>('YOUTUBE_UPLOAD_ENABLED') === 'true';
    if (!enabled) {
      this.logger.debug('YouTube Upload is disabled (YOUTUBE_UPLOAD_ENABLED != true). Skipping scan.');
      return;
    }

    this.logger.log('[YouTube Batch] Starting upload scan...');

    // Find completed video generation jobs not yet uploaded
    // NOTE: FAILED jobs are intentionally excluded — no automatic retries.
    const pending = await this.prisma.videoGenerationJob.findMany({
      where: {
        status: 'GENERATED',
        finalVideoPath: { not: null },
        youtubeUploadStatus: null,   // only jobs never attempted
      },
      orderBy: { completedAt: 'asc' },
      take: 5, // Process max 5 per cron run to avoid rate limits
    });

    if (pending.length === 0) {
      this.logger.log('[YouTube Batch] No pending videos to upload.');
      return;
    }

    this.logger.log(`[YouTube Batch] Found ${pending.length} video(s) to upload.`);

    for (const job of pending) {
      this.processUploadTask({
        jobId: job.jobId || `youtube-upload-${job.ticker}-${job.reportDate}`,
        ticker: job.ticker,
        reportDate: job.reportDate,
        videoPath: job.finalVideoPath || '',
        reportId: job.reportId || undefined,
        reportData: {},
      }).catch((err) => {
        this.logger.error(`Error processing job ${job.id} in batch: ${err.message}`);
      });
    }
  }

  // ─── Upload Task Processor ───────────────────────────────────────

  async processUploadTask(req: {
    jobId: string;
    ticker: string;
    reportDate: string;
    videoPath: string;
    reportId?: string;
    reportData?: any;
    refreshToken?: string;
    visibility?: string;
  }) {
    const { jobId, ticker, reportDate, videoPath, reportId, reportData, refreshToken, visibility } = req;
    const lockKey = `${ticker.toUpperCase()}|${reportDate}`;

    this.logger.log(`[YouTube Process] Starting task for ticker=${ticker}, date=${reportDate}, jobId=${jobId}`);

    // ── Gap fix 1: In-memory lock — prevents concurrent duplicate uploads ──
    if (this.uploadInFlight.has(lockKey)) {
      this.logger.warn(`[YouTube Process] Upload already in-flight for ${ticker} (${reportDate}). Skipping duplicate.`);
      return;
    }
    this.uploadInFlight.add(lockKey);

    try {
      await this._doUpload({ jobId, ticker, reportDate, videoPath, reportId, reportData, refreshToken, visibility });
    } finally {
      // Always release the lock — even if the upload fails
      this.uploadInFlight.delete(lockKey);
    }
  }

  private async _doUpload(req: {
    jobId: string;
    ticker: string;
    reportDate: string;
    videoPath: string;
    reportId?: string;
    reportData?: any;
    refreshToken?: string;
    visibility?: string;
  }) {
    const { jobId, ticker, reportDate, videoPath, reportId, reportData, refreshToken, visibility } = req;

    // Find the DB record to sync status
    let dbJob = await this.prisma.videoGenerationJob.findUnique({
      where: { ticker_reportDate: { ticker: ticker.toUpperCase(), reportDate } },
    });

    // ── Gap fix 2: DB-level guard — UPLOADED or UPLOADING means skip ──
    if (dbJob && (dbJob.youtubeUploadStatus === 'UPLOADED' || dbJob.youtubeUploadStatus === 'UPLOADING')) {
      this.logger.warn(`[YouTube Process] Ticker ${ticker} (${reportDate}) already '${dbJob.youtubeUploadStatus}' in DB. Skipping.`);
      return;
    }

    // Mark as UPLOADING immediately
    if (dbJob) {
      dbJob = await this.prisma.videoGenerationJob.update({
        where: { id: dbJob.id },
        data: { youtubeUploadStatus: 'UPLOADING' },
      });
    }

    try {
      // Resolve path and check existence
      const resolvedPath = this.resolveVideoPath(videoPath);
      if (!resolvedPath || !fs.existsSync(resolvedPath)) {
        throw new Error(`Video file not found at path: ${videoPath} (Resolved to: ${resolvedPath})`);
      }

      // Fetch report details if needed
      let finalRating = reportData?.finalRating || 'ANALYZED';
      let executiveSummary = reportData?.executiveSummary || 'AI stock analysis report';
      let reportJson: any = reportData?.reportJson || {};
      let companyName: string | undefined = undefined;

      const reportIdToUse = reportId || dbJob?.reportId;
      if (reportIdToUse) {
        const report = await this.prisma.agentReport.findUnique({
          where: { id: reportIdToUse },
        });
        if (report) {
          finalRating = report.finalRating;
          executiveSummary = report.executiveSummary || executiveSummary;
          reportJson = report.reportJson || {};
          const rJson = report.reportJson as any;
          companyName = rJson?.companyName || rJson?.fundName || rJson?.tacticalHorizonView?.dailyTrend?.companyName || reportData?.companyName || undefined;
        }
      }

      // Generate SEO metadata
      const bias = reportJson?.technicals?.primary?.overallBias || '';
      const rsi = reportJson?.technicals?.primary?.rsi14 ? String(reportJson.technicals.primary.rsi14) : '';
      const sector = reportJson?.fundamentals?.sector || '';

      this.logger.log(`[YouTube Process] Generating metadata for ${ticker}...`);
      const meta = await this.generateMetadata(ticker, reportDate, finalRating, executiveSummary, bias, rsi, sector, companyName);

      // Authenticate with Google
      const oauth2Client = await this.getCredentials(refreshToken);

      // Upload to YouTube
      this.logger.log(`[YouTube Process] Uploading video for ${ticker} from ${resolvedPath}...`);
      const videoId = await this.uploadToYouTube(resolvedPath, {
        title: meta.title,
        description: meta.description,
        tags: meta.tags,
      }, oauth2Client, visibility);

      // Save upload results to database
      if (dbJob) {
        await this.prisma.videoGenerationJob.update({
          where: { id: dbJob.id },
          data: {
            youtubeVideoId: videoId,
            youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
            youtubeTitle: meta.title,
            youtubeDescription: meta.description,
            youtubeUploadStatus: 'UPLOADED',
            youtubeUploadedAt: new Date(),
            youtubeUploadError: null,
          },
        });
      }

      this.logger.log(`[YouTube Process] ✅ Successfully uploaded video for ${ticker}. Video ID: ${videoId}`);
    } catch (err: any) {
      this.logger.error(`[YouTube Process] ❌ Failed to upload video for ${ticker}: ${err.message}`);
      if (dbJob) {
        await this.prisma.videoGenerationJob.update({
          where: { id: dbJob.id },
          data: {
            youtubeUploadStatus: 'FAILED',
            youtubeUploadError: err.message?.slice(0, 500),
          },
        });
      }
      throw err;
    }
  }

  // ─── Resolve Video Path ──────────────────────────────────────────

  private resolveVideoPath(rawPath: string): string {
    if (!rawPath) return '';
    if (path.isAbsolute(rawPath)) {
      if (fs.existsSync(rawPath)) return rawPath;
    }

    // Try resolving relative to youtube_agent_service
    let resolved = path.resolve(process.cwd(), rawPath);
    if (fs.existsSync(resolved)) return resolved;

    // Try resolving relative to workspace root (one level up)
    resolved = path.resolve(process.cwd(), '..', rawPath);
    if (fs.existsSync(resolved)) return resolved;

    // Try resolving relative to video_agents_service
    resolved = path.resolve(process.cwd(), '../video_agents_service', rawPath);
    if (fs.existsSync(resolved)) return resolved;

    // Try resolving by replacing docker root paths like '/app/...'
    if (rawPath.startsWith('/app/')) {
      const relativePart = rawPath.substring(5);
      resolved = path.resolve(process.cwd(), '..', relativePart);
      if (fs.existsSync(resolved)) return resolved;

      resolved = path.resolve(process.cwd(), '../video_agents_service', relativePart);
      if (fs.existsSync(resolved)) return resolved;
    }

    return path.resolve(process.cwd(), rawPath);
  }

  // ─── Metadata Generation ─────────────────────────────────────────

  async generateMetadata(
    ticker: string,
    reportDate: string,
    rating: string,
    summary: string,
    bias: string,
    rsi: string = '',
    sector: string = '',
    companyName?: string,
  ): Promise<{ title: string; description: string; tags: string[] }> {
    const formattedDate = fmtDate(reportDate);
    const company = resolveCompany(ticker, companyName);
    const model = this.configService.get<string>('openai.model') || 'gpt-4o-mini';

    const prompt = `You are writing YouTube SEO metadata for an AI-generated stock analysis video.
Details:
- Ticker: ${ticker}
- Company Name: ${company}
- Date: ${formattedDate}
- Rating: ${rating}
- Executive Summary: ${summary}
- Bias: ${bias}
- RSI: ${rsi}
- Sector: ${sector}

Generate a YouTube title, description, and tags.
Rules:
- Title: max 95 characters. MUST START WITH THE DATE in MM/DD/YYYY format (no brackets). Use the company name (not $ticker). Format: "MM/DD/YYYY — Company Name Stock Analysis | Rating | Key Signal"
- Description: 3-5 short paragraphs. Paragraph 1 covers what was analyzed and current price zone; Paragraph 2 explains technical/momentum bias (e.g. RSI, trend support); Paragraph 3 explains key sector/macro catalysts; Paragraph 4 contains educational disclaimer; Paragraph 5 contains relevant hashtags (e.g., #${ticker} #stockmarket #investing).
- Tags: A list of 10-15 relevant keywords/tags.

Respond strictly in valid JSON:
{
  "title": "...",
  "description": "...",
  "tags": ["...", "...", ...]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 800,
      });

      const parsed = JSON.parse(response.choices[0].message.content?.trim() || '{}');
      const rawTitle = parsed.title || '';
      
      const parts = rawTitle.split('|').map((p: string) => p.trim());
      const ratingVal = parts[1] || rating;
      const signalVal = parts[2] || '';

      let basePart = '';
      if (parts[0]) {
        basePart = parts[0];
        // Strip dates
        basePart = basePart.replace(/\[?\d{2}\/\d{2}\/\d{4}\]?/g, '');
        // Strip tickers
        basePart = basePart.replace(/\$\w+/g, '');
        // Strip leading/trailing dashes, slashes, spaces
        basePart = basePart.replace(/^[\s—\-//|]+|[\s—\-//|]+$/g, '').trim();
      } else {
        basePart = `${company} Stock Analysis`;
      }

      if (!basePart.includes('Stock Analysis')) {
        basePart = `${company} Stock Analysis`;
      } else {
        basePart = basePart.replace(new RegExp(`\\b${ticker}\\b`, 'gi'), company);
      }

      let suffix = '';
      if (ratingVal) {
        suffix += ` | ${ratingVal}`;
      }
      if (signalVal) {
        suffix += ` | ${signalVal}`;
      }

      const finalTitle = `${formattedDate} — ${basePart}${suffix} #${ticker.toLowerCase()}`;

      return {
        title: finalTitle.slice(0, 95),
        description: parsed.description || summary,
        tags: parsed.tags || [ticker, company, 'stocks', 'investing', 'stockanalysis', 'tradeidea', 'finance', 'AI'],
      };
    } catch (e: any) {
      this.logger.error(`GPT metadata generation failed, using fallback: ${e.message}`);
      return {
        title: `${formattedDate} — ${company} Stock Analysis | ${rating} | AI Trade Setup #${ticker.toLowerCase()}`,
        description: `${company} ($${ticker}) AI Stock analysis for ${formattedDate}.\n\nRating: ${rating}\nExecutive Summary: ${summary}\n\n⚠️ Disclaimer: Educational purposes only. Stock trading carries high risk. This is not financial advice.\n\n#${ticker} #stockmarket #investing #tradeidea #AIPortfolio`,
        tags: [ticker, company, 'stocks', 'investing', 'stockanalysis', 'tradeidea', 'finance', 'AI'],
      };
    }
  }

  // ─── Google API Upload ────────────────────────────────────────────

  private async uploadToYouTube(
    filePath: string,
    metadata: { title: string; description: string; tags: string[] },
    oauth2Client: any,
    visibilityParam?: string,
  ): Promise<string> {
    const visibility = visibilityParam || this.configService.get<string>('youtube.uploadVisibility') || 'private';
    const channelId = this.configService.get<string>('youtube.channelId');

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    const fileSize = fs.statSync(filePath).size;
    const media = {
      body: fs.createReadStream(filePath),
    };

    const requestBody: any = {
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: '25',
        defaultLanguage: 'en',
      },
      status: {
        privacyStatus: visibility,
        selfDeclaredMadeForKids: false,
      },
    };

    if (channelId) {
      requestBody.snippet.channelId = channelId;
    }

    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody,
      media,
    });

    const videoId = res.data.id;
    if (!videoId) {
      throw new Error(`YouTube upload succeeded but no video ID was returned: ${JSON.stringify(res.data)}`);
    }

    // Add video to the 'Daily Analysis Narration' playlist
    await this.addVideoToPlaylist(youtube, videoId);

    return videoId;
  }

  private async addVideoToPlaylist(youtube: any, videoId: string): Promise<void> {
    try {
      const playlistName = 'Daily Analysis Narration';
      this.logger.log(`Checking for playlist: "${playlistName}"...`);
      
      const playlistsRes = await youtube.playlists.list({
        part: ['snippet'],
        mine: true,
        maxResults: 50,
      });

      let playlistId = playlistsRes.data.items?.find(
        (item: any) => item.snippet?.title === playlistName
      )?.id;

      if (!playlistId) {
        this.logger.log(`Playlist "${playlistName}" not found. Creating it...`);
        const createRes = await youtube.playlists.insert({
          part: ['snippet', 'status'],
          requestBody: {
            snippet: {
              title: playlistName,
              description: 'Daily stock market technical and fundamental analysis reports.',
            },
            status: {
              privacyStatus: 'public',
            },
          },
        });
        playlistId = createRes.data.id;
        this.logger.log(`Successfully created playlist "${playlistName}" with ID: ${playlistId}`);
      } else {
        this.logger.log(`Found existing playlist "${playlistName}" with ID: ${playlistId}`);
      }

      if (playlistId) {
        this.logger.log(`Adding video ${videoId} to playlist "${playlistName}" (${playlistId})...`);
        await youtube.playlistItems.insert({
          part: ['snippet'],
          requestBody: {
            snippet: {
              playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId,
              },
            },
          },
        });
        this.logger.log(`Video ${videoId} successfully added to playlist "${playlistName}".`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to add video to playlist: ${err.message}`);
    }
  }
}
