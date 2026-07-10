import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AnalysisService } from '../src/modules/analysis/analysis.service';
import { TrendingScraperService } from '../src/services/trending-scraper.service';
import axios from 'axios';

// Polyfill BigInt serialization
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const getNYDateString = (dateInput: Date = new Date()): string => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(dateInput);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
};

const REPORT_DATE = getNYDateString();
const SERVICE_URL = 'http://localhost:8095';
const API_KEY = 'investingatti-youtube-key-dev';

async function uploadToYoutube(job: any) {
  const payload = {
    jobId: `upload-${job.ticker}-${REPORT_DATE}-${Date.now()}`,
    ticker: job.ticker,
    reportDate: REPORT_DATE,
    videoPath: job.finalVideoPath,
    reportData: {},
    visibility: 'public',
  };

  console.log(`  [${job.ticker}] Queuing YouTube upload...`);
  try {
    const res = await axios.post(`${SERVICE_URL}/upload`, payload, {
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      timeout: 15000,
    });
    console.log(`  [${job.ticker}] ✅ Queued for upload → ${JSON.stringify(res.data)}`);
    return true;
  } catch (err: any) {
    console.error(`  [${job.ticker}] ❌ Failed to queue upload: ${JSON.stringify(err.response?.data || err.message)}`);
    return false;
  }
}

async function run() {
  console.log(`=== Top 5 Trending Stock Analysis & YouTube Upload Flow ===`);
  console.log(`Report Date: ${REPORT_DATE}`);

  console.log('Initializing NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const analysisService = app.get(AnalysisService);
  const trendingScraper = app.get(TrendingScraperService);

  // 1. Check YouTube service is authorized
  try {
    const ls = await axios.get(`${SERVICE_URL}/login-status`, { timeout: 5000 });
    if (!ls.data?.authorized) {
      console.error(`❌ YouTube service NOT authorized. Please visit ${SERVICE_URL}/login`);
      await app.close();
      return;
    }
    console.log('✅ YouTube service is authorized.');
  } catch (e: any) {
    console.error(`❌ Cannot reach YouTube service: ${e.message}`);
    await app.close();
    return;
  }

  // 2. Fetch top 5 trending tickers
  console.log('Fetching top 5 trending stock symbols...');
  const candidates = await trendingScraper.fetchTrendingTickers(5);
  console.log(`Top 5 trending tickers: ${candidates.join(', ')}`);

  if (candidates.length === 0) {
    console.error('No trending tickers found. Exiting.');
    await app.close();
    return;
  }

  // Find systemadmin user
  const systemAdmin = await prisma.user.findUnique({
    where: { username: 'systemadmin' },
  });
  if (!systemAdmin) {
    console.error('systemadmin user not found in database. Exiting.');
    await app.close();
    return;
  }

  // 3. Clear existing video jobs for today for these tickers to ensure fresh run
  console.log('Clearing existing video generation jobs for today for these symbols...');
  await prisma.videoGenerationJob.deleteMany({
    where: {
      ticker: { in: candidates },
      reportDate: REPORT_DATE,
    },
  });

  // 4. Trigger analysis for each
  console.log('Triggering analysis sequentially with 5s delay...');
  const triggered: string[] = [];
  for (const symbol of candidates) {
    try {
      console.log(`Starting analysis for ${symbol}...`);
      await analysisService.enqueueAnalysis(symbol, systemAdmin, true, '127.0.0.1');
      triggered.push(symbol);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (err: any) {
      console.error(`❌ Failed to trigger analysis for ${symbol}:`, err.message);
    }
  }

  console.log(`\nTriggered analysis for: ${triggered.join(', ')}`);
  console.log('Waiting for video generation and uploading to YouTube...\n');

  // 5. Polling loop
  const uploadedSet = new Set<string>();
  const completedSet = new Set<string>();

  while (completedSet.size < triggered.length) {
    const jobs = await prisma.videoGenerationJob.findMany({
      where: {
        ticker: { in: triggered },
        reportDate: REPORT_DATE,
      },
    });

    console.log(`[${new Date().toLocaleTimeString()}] Status Summary:`);
    for (const symbol of triggered) {
      const job = jobs.find((j) => j.ticker.toUpperCase() === symbol.toUpperCase());
      if (!job) {
        console.log(`  ${symbol.padEnd(8)}: NOT_YET_RECEIVED`);
        continue;
      }

      console.log(`  ${symbol.padEnd(8)}: ${job.status.padEnd(20)} | YT Upload: ${(job.youtubeUploadStatus || 'NONE').padEnd(10)}`);

      // If job is finished and generated, upload it
      if (job.status === 'GENERATED' && !uploadedSet.has(symbol) && job.finalVideoPath) {
        uploadedSet.add(symbol);
        const success = await uploadToYoutube(job);
        if (!success) {
          uploadedSet.delete(symbol); // retry next iteration if queue failed
        }
      }

      // If job is in a terminal state
      if (['GENERATED', 'FAILED', 'ERROR', 'NOT_ELIGIBLE'].includes(job.status)) {
        completedSet.add(symbol);
      }
    }

    if (completedSet.size < triggered.length) {
      await new Promise((resolve) => setTimeout(resolve, 15000)); // Poll every 15s
    }
  }

  console.log('\n=== All jobs reached terminal status ===');
  console.log(`Processed: ${Array.from(completedSet).join(', ')}`);
  console.log(`Uploaded to YouTube: ${Array.from(uploadedSet).join(', ')}`);

  await app.close();
}

run().catch((err) => {
  console.error('Fatal error running top 5 analysis/upload:', err);
  process.exit(1);
});
