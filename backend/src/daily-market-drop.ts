/**
 * Daily Market Drop
 *
 * The end-to-end daily content pipeline:
 *   1. Picks up to 5 trending tickers (diversified across sectors, ETFs excluded),
 *      skipping anything already processed today.
 *   2. Runs full analysis for each, which fires a SHORTS video + YouTube upload.
 *   3. Generates one MARKET_RECAP video summarizing the day's whole market and
 *      uploads it too (backfilling the WhatsForToday EOD report if needed).
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/daily-market-drop.ts
 *   npx ts-node -r tsconfig-paths/register src/daily-market-drop.ts --include=PSX,COIN
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TrendingScraperService } from './services/trending-scraper.service';
import { AnalysisService } from './modules/analysis/analysis.service';
import { PrismaService } from './prisma/prisma.service';
import { WhatsForTodayService } from './modules/whats-for-today/whats-for-today.service';
import { EODVideoWorkflowService } from './modules/whats-for-today/eod-video-workflow.service';
import { getNYDateString } from './utils/date';
import axios from 'axios';

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const YOUTUBE_SERVICE_URL = 'http://localhost:8095';
const YOUTUBE_API_KEY = 'investingatti-youtube-key-dev';
// Gap between ticker kickoffs. The previous ticker's video-generation OpenAI calls
// (script + storyboard) are still in flight when the next ticker's analysis starts,
// and both share the same OpenAI TPM budget — too short a gap causes 429s.
const TICKER_KICKOFF_GAP_SECONDS = 90;
// Upload retry-with-backoff: attempt 1 immediate, then retries after 30s, 60s, 120s.
const MAX_UPLOAD_ATTEMPTS = 4;
const UPLOAD_RETRY_BASE_DELAY_MS = 30000;

function parseIncludeArg(): string[] {
  const arg = process.argv.find((a) => a.startsWith('--include='));
  if (!arg) return [];
  return arg
    .slice('--include='.length)
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

async function uploadToYoutube(ticker: string, reportDate: string, finalVideoPath: string) {
  const payload = {
    jobId: `upload-${ticker}-${reportDate}-${Date.now()}`,
    ticker,
    reportDate,
    videoPath: finalVideoPath,
    reportData: {},
    visibility: 'public',
  };
  console.log(`  [${ticker}] Triggering YouTube upload for path: ${finalVideoPath}`);
  try {
    const res = await axios.post(`${YOUTUBE_SERVICE_URL}/upload`, payload, {
      headers: { 'Content-Type': 'application/json', 'x-api-key': YOUTUBE_API_KEY },
      timeout: 15000,
    });
    console.log(`  [${ticker}] ✅ YouTube upload queued successfully:`, res.data);
  } catch (err: any) {
    console.error(`  [${ticker}] ❌ Failed to trigger upload:`, err.response?.data || err.message);
  }
}

/** Polls videoGenerationJob rows to GENERATED, triggers upload, then waits for UPLOADED/FAILED. */
async function pollUntilDone(
  prisma: PrismaService,
  items: { ticker: string; dbJobId: string }[],
): Promise<{ uploaded: string[]; failed: string[] }> {
  const uploaded = new Set<string>();
  const failed = new Set<string>();
  // Upload failures (e.g. transient ECONNRESET mid-upload) are retried with
  // exponential backoff instead of being treated as terminal on the first try.
  const uploadAttempts = new Map<string, number>();
  const retryNotBefore = new Map<string, number>();

  while (uploaded.size + failed.size < items.length) {
    console.log(`\n[${new Date().toLocaleTimeString()}] Checking status...`);
    for (const item of items) {
      if (uploaded.has(item.ticker) || failed.has(item.ticker)) continue;

      const job = await prisma.videoGenerationJob.findUnique({ where: { id: item.dbJobId } });
      if (!job) continue;

      console.log(`  [${item.ticker}] Video status: ${job.status} | YT Upload: ${job.youtubeUploadStatus || 'PENDING'}`);

      if (job.status === 'GENERATED' && job.finalVideoPath) {
        if (job.youtubeUploadStatus === 'UPLOADED') {
          console.log(`  [${item.ticker}] 🎉 Upload confirmed! URL: ${job.youtubeUrl}`);
          uploaded.add(item.ticker);
        } else if (job.youtubeUploadStatus === 'FAILED') {
          const attempts = uploadAttempts.get(item.ticker) ?? 1;
          if (attempts >= MAX_UPLOAD_ATTEMPTS) {
            console.error(`  [${item.ticker}] ❌ Upload failed after ${attempts} attempts: ${job.youtubeUploadError}`);
            failed.add(item.ticker);
          } else if (Date.now() >= (retryNotBefore.get(item.ticker) ?? 0)) {
            const delayMs = UPLOAD_RETRY_BASE_DELAY_MS * 2 ** (attempts - 1);
            console.warn(
              `  [${item.ticker}] ⚠️ Upload attempt ${attempts} failed (${job.youtubeUploadError}). Retrying (attempt ${attempts + 1}/${MAX_UPLOAD_ATTEMPTS}) after ${delayMs / 1000}s backoff...`,
            );
            await prisma.videoGenerationJob.update({
              where: { id: item.dbJobId },
              data: { youtubeUploadStatus: null, youtubeUploadError: null },
            });
            await uploadToYoutube(item.ticker, job.reportDate, job.finalVideoPath);
            uploadAttempts.set(item.ticker, attempts + 1);
            retryNotBefore.set(item.ticker, Date.now() + delayMs);
          }
        } else if (job.youtubeUploadStatus !== 'UPLOADING') {
          await uploadToYoutube(item.ticker, job.reportDate, job.finalVideoPath);
          uploadAttempts.set(item.ticker, (uploadAttempts.get(item.ticker) ?? 0) + 1);
        }
      } else if (['FAILED', 'ERROR', 'NOT_ELIGIBLE'].includes(job.status)) {
        console.error(`  [${item.ticker}] Video generation failed with status: ${job.status}`);
        failed.add(item.ticker);
      }
    }
    if (uploaded.size + failed.size < items.length) {
      await new Promise((r) => setTimeout(r, 15000));
    }
  }
  return { uploaded: [...uploaded], failed: [...failed] };
}

async function run() {
  console.log('=== Daily Market Drop ===');
  console.log('Initializing NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const trendingScraper = app.get(TrendingScraperService);
  const analysisService = app.get(AnalysisService);
  const prisma = app.get(PrismaService);
  const whatsForToday = app.get(WhatsForTodayService);
  const eodWorkflow = app.get(EODVideoWorkflowService);

  const todayStr = getNYDateString();
  console.log(`Today's date (NY time): ${todayStr}`);

  // ── Part 1: Top-5 diversified trending SHORTS ──────────────────────────────

  const todayJobs = await prisma.videoGenerationJob.findMany({
    where: { reportDate: todayStr },
    select: { ticker: true },
  });
  const excludedTickers = new Set(todayJobs.map((j) => j.ticker.toUpperCase()));
  console.log(`Tickers already processed today:`, Array.from(excludedTickers));

  const selectedTickers: string[] = [];
  for (const t of parseIncludeArg()) {
    if (!excludedTickers.has(t) && !selectedTickers.includes(t)) selectedTickers.push(t);
  }
  if (selectedTickers.length < 5) {
    console.log('Fetching trending tickers...');
    const trendingCandidates = await trendingScraper.fetchTrendingTickers(30);
    console.log('Trending candidates:', trendingCandidates);
    for (const s of trendingCandidates) {
      const cleanSym = s.toUpperCase().trim();
      if (!excludedTickers.has(cleanSym) && !selectedTickers.includes(cleanSym)) {
        selectedTickers.push(cleanSym);
      }
      if (selectedTickers.length === 5) break;
    }
  }

  console.log(`\n========================================`);
  console.log(`SELECTED TICKERS FOR TODAY'S DROP:`, selectedTickers);
  console.log(`========================================\n`);

  let systemAdmin = await prisma.user.findUnique({ where: { username: 'systemadmin' } });
  if (!systemAdmin) {
    console.log('Creating systemadmin user...');
    const crypto = require('crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync('systemadmin123', salt, 64).toString('hex');
    systemAdmin = await prisma.user.create({
      data: { username: 'systemadmin', passwordHash: `${salt}:${hash}`, role: 'SUPERUSER' },
    });
  }

  const stockJobs: { ticker: string; dbJobId: string }[] = [];
  for (const symbol of selectedTickers) {
    try {
      console.log(`[Drop] Starting full analysis for ${symbol}...`);
      await analysisService.analyze(symbol, systemAdmin, true, '127.0.0.1');

      await new Promise((r) => setTimeout(r, 2000));
      const dbJob = await prisma.videoGenerationJob.findFirst({
        where: { ticker: symbol, reportDate: todayStr },
        orderBy: { createdAt: 'desc' },
      });

      if (dbJob) {
        console.log(`[Drop] ✅ Analysis enqueued. Video Job ID: ${dbJob.id}, status: ${dbJob.status}`);
        stockJobs.push({ ticker: symbol, dbJobId: dbJob.id });
      } else {
        console.warn(`[Drop] Warning: Video job not found in DB for ${symbol} (fund/ETF symbols never get one).`);
      }

      console.log(`[Drop] Waiting ${TICKER_KICKOFF_GAP_SECONDS}s before next ticker...`);
      await new Promise((r) => setTimeout(r, TICKER_KICKOFF_GAP_SECONDS * 1000));
    } catch (err: any) {
      console.error(`[Drop] ❌ Failed to analyze ${symbol}:`, err.message);
    }
  }

  // ── 2. Verify YouTube service is authorized before any uploads ─────────────
  try {
    const ls = await axios.get(`${YOUTUBE_SERVICE_URL}/login-status`, { timeout: 5000 });
    if (!ls.data?.authorized) {
      console.error(`❌ YouTube service is NOT authorized. Visit ${YOUTUBE_SERVICE_URL}/login to log in first.`);
      await app.close();
      return;
    }
    console.log('✅ YouTube service is authorized.');
  } catch (e: any) {
    console.error(`❌ Cannot reach YouTube service at ${YOUTUBE_SERVICE_URL}: ${e.message}`);
    await app.close();
    return;
  }

  console.log('\nMonitoring stock SHORTS progress...');
  const stockResult = await pollUntilDone(prisma, stockJobs);

  // ── Part 2: MARKET_RECAP for the most recently completed trading day ───────

  console.log('\n=== Market Recap ===');
  let recapResult = { uploaded: [] as string[], failed: [] as string[] };
  const recentReport = await prisma.dailyMarketReport.findFirst({
    orderBy: { runTime: 'desc' },
    select: { date: true },
  });

  if (!recentReport) {
    console.warn('[Drop] No WhatsForToday report found in DB at all. Skipping market recap.');
  } else {
    const recapDate = recentReport.date;
    console.log(`[Drop] Using ${recapDate} as the market recap date.`);

    const run4 = await prisma.dailyMarketReport.findUnique({
      where: { date_runNumber: { date: recapDate, runNumber: 4 } },
    });
    if (!run4) {
      console.log(`[Drop] No Run 4 (EOD) report for ${recapDate} yet — generating it now...`);
      await whatsForToday.generateDailyReport(4, recapDate);
    }

    const fired = await eodWorkflow.fireMarketRecapVideo(recapDate);
    if (!fired) {
      console.warn('[Drop] Market recap could not be fired (see backend logs above for the reason).');
    } else {
      await new Promise((r) => setTimeout(r, 3000));
      const recapJob = await prisma.videoGenerationJob.findFirst({
        where: { ticker: 'MARKET_RECAP', reportDate: recapDate },
        orderBy: { createdAt: 'desc' },
      });
      if (recapJob) {
        console.log('Monitoring MARKET_RECAP progress...');
        recapResult = await pollUntilDone(prisma, [{ ticker: 'MARKET_RECAP', dbJobId: recapJob.id }]);
      } else {
        console.warn('[Drop] MARKET_RECAP video job not found in DB after firing.');
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`DAILY MARKET DROP FINISHED.`);
  console.log(`Stocks uploaded:`, stockResult.uploaded);
  console.log(`Stocks failed:`, stockResult.failed);
  console.log(`Market recap uploaded:`, recapResult.uploaded);
  console.log(`Market recap failed:`, recapResult.failed);
  console.log(`========================================\n`);

  await app.close();
}

run().catch((err) => {
  console.error('Fatal error in daily-market-drop:', err);
  process.exit(1);
});
