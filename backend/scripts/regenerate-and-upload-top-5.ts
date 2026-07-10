import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { VideoJobService } from '../src/modules/video/video-job.service';
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
const TICKERS = ['AAPL', 'NVDA', 'MSFT', 'AMZN', 'GOOGL'];

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
  console.log(`=== Regenerate Top 5 Videos & Upload Flow ===`);
  console.log(`Report Date: ${REPORT_DATE}`);

  console.log('Initializing NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const videoJobService = app.get(VideoJobService);

  // 1. Verify YouTube service is active
  try {
    const ls = await axios.get(`${SERVICE_URL}/login-status`, { timeout: 5000 });
    if (!ls.data?.authorized) {
      console.error(`❌ YouTube service NOT authorized. Visit ${SERVICE_URL}/login`);
      await app.close();
      return;
    }
    console.log('✅ YouTube service is authorized.');
  } catch (e: any) {
    console.error(`❌ Cannot reach YouTube service: ${e.message}`);
    await app.close();
    return;
  }

  // 2. Fetch the latest report for each ticker and trigger video generation
  const startOfDay = new Date(`${REPORT_DATE}T00:00:00.000Z`);
  const endOfDay = new Date(`${REPORT_DATE}T23:59:59.999Z`);

  const triggered: string[] = [];

  for (const ticker of TICKERS) {
    console.log(`Looking up AgentReport for ${ticker} on ${REPORT_DATE}...`);
    const report = await prisma.agentReport.findFirst({
      where: {
        symbol: ticker,
        createdAt: { gte: startOfDay, lte: endOfDay }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!report) {
      console.warn(`⚠️ No AgentReport found for ${ticker} on ${REPORT_DATE} — skipping.`);
      continue;
    }

    console.log(`Found report ${report.id}. Triggering video generation with forceRegenerate=true...`);

    // Reset upload status in DB first to allow clean re-upload status monitoring
    await prisma.videoGenerationJob.updateMany({
      where: { ticker, reportDate: REPORT_DATE },
      data: { youtubeUploadStatus: null }
    });

    await videoJobService.fireAndForget(
      ticker,
      REPORT_DATE,
      report.id,
      report.reportJson,
      true // forceRegenerate
    );
    triggered.push(ticker);
  }

  console.log(`\nTriggered video regeneration for: ${triggered.join(', ')}`);
  console.log('Waiting for video generation and uploading to YouTube...\n');

  // 3. Polling loop
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

      // If job is in a terminal state (finished rendering)
      // Note: we check if the job is completed or had error
      if (['GENERATED', 'FAILED', 'ERROR', 'NOT_ELIGIBLE'].includes(job.status)) {
        completedSet.add(symbol);
      }
    }

    if (completedSet.size < triggered.length) {
      await new Promise((resolve) => setTimeout(resolve, 15000)); // Poll every 15s
    }
  }

  console.log('\n=== All jobs completed ===');
  console.log(`Regenerated: ${Array.from(completedSet).join(', ')}`);
  console.log(`Re-uploaded to YouTube: ${Array.from(uploadedSet).join(', ')}`);

  await app.close();
}

run().catch((err) => {
  console.error('Fatal error running video regeneration/upload:', err);
  process.exit(1);
});
