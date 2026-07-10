import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TrendingScraperService } from './services/trending-scraper.service';
import { AnalysisService } from './modules/analysis/analysis.service';
import { PrismaService } from './prisma/prisma.service';
import { getNYDateString } from './utils/date';
import axios from 'axios';

// Globally support BigInt serialization
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const YOUTUBE_SERVICE_URL = 'http://localhost:8095';
const YOUTUBE_API_KEY = 'investingatti-youtube-key-dev';

async function run() {
  console.log('Initializing NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const trendingScraper = app.get(TrendingScraperService);
  const analysisService = app.get(AnalysisService);
  const prisma = app.get(PrismaService);

  const todayStr = getNYDateString();
  console.log(`Today's date (NY time): ${todayStr}`);

  // 1. Fetch today's already analyzed tickers from the database to exclude them
  const todayJobs = await prisma.videoGenerationJob.findMany({
    where: { reportDate: todayStr },
    select: { ticker: true }
  });
  const excludedTickers = new Set(todayJobs.map(j => j.ticker.toUpperCase()));
  console.log(`Tickers already processed today:`, Array.from(excludedTickers));

  // 2. Fetch top trending tickers from scraper
  console.log('Fetching trending tickers from Yahoo Finance...');
  const trendingCandidates = await trendingScraper.fetchTrendingTickers(30);
  console.log('Trending candidates:', trendingCandidates);

  // 3. Filter candidates
  const selectedTickers: string[] = [];
  for (const s of trendingCandidates) {
    const cleanSym = s.toUpperCase().trim();
    if (!excludedTickers.has(cleanSym)) {
      selectedTickers.push(cleanSym);
    }
    if (selectedTickers.length === 5) {
      break;
    }
  }

  console.log(`\n========================================`);
  console.log(`SELECTED TOP 5 TRENDING TICKERS FOR FLOW:`, selectedTickers);
  console.log(`========================================\n`);

  if (selectedTickers.length < 5) {
    console.warn(`Warning: Only found ${selectedTickers.length} eligible trending tickers.`);
  }

  if (selectedTickers.length === 0) {
    console.log('No new tickers to process today. Exiting.');
    await app.close();
    return;
  }

  // 4. Get System Admin User
  let systemAdmin = await prisma.user.findUnique({
    where: { username: 'systemadmin' },
  });

  if (!systemAdmin) {
    console.log('Creating systemadmin user...');
    const crypto = require('crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync('systemadmin123', salt, 64).toString('hex');
    const passwordHash = `${salt}:${hash}`;
    systemAdmin = await prisma.user.create({
      data: {
        username: 'systemadmin',
        passwordHash,
        role: 'SUPERUSER',
      },
    });
  }

  // 5. Run analysis sequentially
  const activeJobIds: { ticker: string; dbJobId: string }[] = [];
  for (const symbol of selectedTickers) {
    try {
      console.log(`[Flow] Starting full analysis for ${symbol}...`);
      // analyze will automatically fire-and-forget to video agents service
      await analysisService.analyze(symbol, systemAdmin, true, '127.0.0.1');
      
      // Look up the created video job
      await new Promise(resolve => setTimeout(resolve, 2000)); // wait brief moment for DB write
      const dbJob = await prisma.videoGenerationJob.findFirst({
        where: { ticker: symbol, reportDate: todayStr },
        orderBy: { createdAt: 'desc' }
      });

      if (dbJob) {
        console.log(`[Flow] ✅ Analysis enqueued. Video Job ID: ${dbJob.id}, status: ${dbJob.status}`);
        activeJobIds.push({ ticker: symbol, dbJobId: dbJob.id });
      } else {
        console.warn(`[Flow] Warning: Video job not found in DB for ${symbol}`);
      }

      // Video generation (script + storyboard) fires in the background right after analysis
      // and shares the same OpenAI TPM budget as the next ticker's analysis calls. A short
      // gap here was causing 429 rate-limit errors once those overlap. 90s gives the previous
      // ticker's video-generation OpenAI calls time to clear before the next ticker starts.
      const gapSeconds = 90;
      console.log(`[Flow] Waiting ${gapSeconds} seconds before next ticker...`);
      await new Promise(resolve => setTimeout(resolve, gapSeconds * 1000));
    } catch (err: any) {
      console.error(`[Flow] ❌ Failed to analyze ${symbol}:`, err.message);
    }
  }

  // 6. Check YouTube Service Login Status
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

  // 7. Poll video jobs and trigger YouTube upload
  console.log('\nMonitoring video generation progress...');
  const uploadedSet = new Set<string>();
  const failedSet = new Set<string>();

  while (uploadedSet.size + failedSet.size < activeJobIds.length) {
    console.log(`\n[${new Date().toLocaleTimeString()}] Checking status...`);
    for (const item of activeJobIds) {
      if (uploadedSet.has(item.ticker) || failedSet.has(item.ticker)) {
        continue;
      }

      const job = await prisma.videoGenerationJob.findUnique({
        where: { id: item.dbJobId }
      });

      if (!job) {
        console.warn(`[Flow] Job not found for ${item.ticker}`);
        continue;
      }

      console.log(`  [${item.ticker}] Video status: ${job.status} | YT Upload: ${job.youtubeUploadStatus || 'PENDING'}`);

      if (job.status === 'GENERATED' && job.finalVideoPath) {
        // Trigger YouTube upload!
        if (job.youtubeUploadStatus === 'UPLOADED') {
          console.log(`  [${item.ticker}] Already UPLOADED successfully.`);
          uploadedSet.add(item.ticker);
          continue;
        }
        if (job.youtubeUploadStatus === 'UPLOADING') {
          console.log(`  [${item.ticker}] Currently uploading...`);
          continue;
        }
        if (job.youtubeUploadStatus === 'FAILED') {
          console.log(`  [${item.ticker}] Upload previously failed.`);
          failedSet.add(item.ticker);
          continue;
        }

        console.log(`  [${item.ticker}] Triggering YouTube upload for path: ${job.finalVideoPath}`);
        try {
          const payload = {
            jobId: `upload-${job.ticker}-${todayStr}-${Date.now()}`,
            ticker: job.ticker,
            reportDate: todayStr,
            videoPath: job.finalVideoPath,
            reportData: {},
            visibility: 'public',
          };

          const res = await axios.post(`${YOUTUBE_SERVICE_URL}/upload`, payload, {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': YOUTUBE_API_KEY,
            },
            timeout: 15000,
          });
          console.log(`  [${item.ticker}] ✅ YouTube upload queued successfully:`, res.data);
        } catch (uploadErr: any) {
          console.error(`  [${item.ticker}] ❌ Failed to trigger upload:`, uploadErr.response?.data || uploadErr.message);
          failedSet.add(item.ticker);
        }
      } else if (['FAILED', 'ERROR', 'NOT_ELIGIBLE'].includes(job.status)) {
        console.error(`  [${item.ticker}] Video generation failed with status: ${job.status}`);
        failedSet.add(item.ticker);
      }
    }

    // Now check if any upload is still in progress
    for (const item of activeJobIds) {
      if (uploadedSet.has(item.ticker) || failedSet.has(item.ticker)) continue;
      
      const job = await prisma.videoGenerationJob.findUnique({
        where: { id: item.dbJobId }
      });
      if (job && job.youtubeUploadStatus === 'UPLOADED') {
        console.log(`  [${item.ticker}] 🎉 YouTube upload confirmed! URL: ${job.youtubeUrl}`);
        uploadedSet.add(item.ticker);
      } else if (job && job.youtubeUploadStatus === 'FAILED') {
        console.error(`  [${item.ticker}] ❌ YouTube upload failed: ${job.youtubeUploadError}`);
        failedSet.add(item.ticker);
      }
    }

    if (uploadedSet.size + failedSet.size < activeJobIds.length) {
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }

  console.log(`\n========================================`);
  console.log(`FLOW FINISHED.`);
  console.log(`Uploaded successfully:`, Array.from(uploadedSet));
  console.log(`Failed / Skipped:`, Array.from(failedSet));
  console.log(`========================================\n`);

  await app.close();
}

run().catch((err) => {
  console.error('Fatal error in trigger-top5-flow:', err);
  process.exit(1);
});
