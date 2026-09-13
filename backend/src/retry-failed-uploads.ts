import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { getNYDateString } from './utils/date';
import { isYoutubeAuthorized, triggerYoutubeUpload } from './utils/youtube-upload.client';

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const POLL_TIMEOUT_MS = Number(process.env.RETRY_POLL_TIMEOUT_MS || 45 * 60 * 1000);

async function run() {
  console.log('Initializing NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  const todayStr = process.env.TARGET_DATE || getNYDateString();
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
  if (!(await isYoutubeAuthorized())) {
    await app.close();
    process.exitCode = 1;
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

    const queued = await triggerYoutubeUpload({
      jobId: job.jobId,
      ticker: job.ticker,
      reportDate: job.reportDate,
      videoPath: job.finalVideoPath!,
    });
    if (queued) {
      activeJobs.push(job.ticker);
      await new Promise(r => setTimeout(r, 3000)); // gap between triggers
    }
  }

  // Poll progress
  console.log('\nMonitoring upload progress...');
  const completed = new Set<string>();
  const failed = new Set<string>();

  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (completed.size + failed.size < activeJobs.length) {
    if (Date.now() > deadline) {
      for (const ticker of activeJobs) {
        if (!completed.has(ticker) && !failed.has(ticker)) {
          console.error(`  [${ticker}] ⏱️ Timed out waiting for upload callback — giving up.`);
          failed.add(ticker);
        }
      }
      break;
    }
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

  if (failed.size) process.exitCode = 1;

  await app.close();
}

run().catch((err) => {
  console.error('Fatal error in retry-failed-uploads:', err);
  process.exit(1);
});
