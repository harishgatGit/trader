import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { getNYDateString } from './utils/date';
import axios from 'axios';

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const YOUTUBE_SERVICE_URL = 'http://localhost:8095';
const YOUTUBE_API_KEY = 'investingatti-youtube-key-dev';

async function run() {
  console.log('Initializing NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  const todayStr = process.env.TARGET_DATE || '2026-07-02';
  console.log(`Target date for retrying failed uploads: ${todayStr}`);

  // Fetch failed upload jobs for the target date
  const failedJobs = await prisma.videoGenerationJob.findMany({
    where: {
      reportDate: todayStr,
      status: 'GENERATED',
      youtubeUploadStatus: 'FAILED'
    }
  });

  console.log(`Found ${failedJobs.length} failed uploads to retry:`, failedJobs.map(j => j.ticker));

  if (failedJobs.length === 0) {
    console.log('No failed upload jobs to retry today. Exiting.');
    await app.close();
    return;
  }

  // Verify YouTube service auth
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

  // Trigger uploads
  const activeJobs: string[] = [];
  for (const job of failedJobs) {
    console.log(`\n[Retry] Triggering upload for ${job.ticker} (Video: ${job.finalVideoPath})`);
    
    // Reset status in DB first so the callback updates it correctly
    await prisma.videoGenerationJob.update({
      where: { id: job.id },
      data: {
        youtubeUploadStatus: null,
        youtubeUploadError: null
      }
    });

    const payload = {
      jobId: `upload-${job.ticker}-${todayStr}-${Date.now()}`,
      ticker: job.ticker,
      reportDate: todayStr,
      videoPath: job.finalVideoPath,
      reportData: {},
      visibility: 'public',
    };

    try {
      const res = await axios.post(`${YOUTUBE_SERVICE_URL}/upload`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': YOUTUBE_API_KEY,
        },
        timeout: 15000,
      });
      console.log(`[Retry] ✅ Queued ${job.ticker}:`, res.data);
      activeJobs.push(job.ticker);
      await new Promise(r => setTimeout(r, 3000)); // gap between triggers
    } catch (err: any) {
      console.error(`[Retry] ❌ Failed to queue ${job.ticker}:`, err.response?.data || err.message);
    }
  }

  // Poll progress
  console.log('\nMonitoring upload progress...');
  const completed = new Set<string>();
  const failed = new Set<string>();

  while (completed.size + failed.size < activeJobs.length) {
    console.log(`\n[${new Date().toLocaleTimeString()}] Checking status...`);
    
    for (const ticker of activeJobs) {
      if (completed.has(ticker) || failed.has(ticker)) continue;

      const job = await prisma.videoGenerationJob.findFirst({
        where: { ticker, reportDate: todayStr }
      });

      if (!job) continue;

      console.log(`  [${ticker}] Status: ${job.status} | YT Upload: ${job.youtubeUploadStatus || 'PENDING'}`);

      if (job.youtubeUploadStatus === 'UPLOADED') {
        console.log(`  [${ticker}] 🎉 Upload succeeded! URL: ${job.youtubeUrl}`);
        completed.add(ticker);
      } else if (job.youtubeUploadStatus === 'FAILED') {
        console.error(`  [${ticker}] ❌ Upload failed: ${job.youtubeUploadError}`);
        failed.add(ticker);
      }
    }

    if (completed.size + failed.size < activeJobs.length) {
      await new Promise(r => setTimeout(r, 15000));
    }
  }

  console.log(`\n========================================`);
  console.log(`RETRY FLOW FINISHED.`);
  console.log(`Succeeded:`, Array.from(completed));
  console.log(`Failed:`, Array.from(failed));
  console.log(`========================================\n`);

  await app.close();
}

run().catch((err) => {
  console.error('Fatal error in retry-failed-uploads:', err);
  process.exit(1);
});
