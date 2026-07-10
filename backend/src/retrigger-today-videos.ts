import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { VideoGenerationClient } from './modules/video/video-generation.client';

(BigInt.prototype as any).toJSON = function () { return Number(this); };

async function run() {
  console.log('Initializing NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const videoClient = app.get(VideoGenerationClient);

  const today = '2026-06-28';
  const startOfDay = new Date(`${today}T00:00:00.000Z`);
  const endOfDay   = new Date(`${today}T23:59:59.999Z`);

  // Find all video jobs for today
  const jobs = await prisma.videoGenerationJob.findMany({
    where: {
      reportDate: today,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\nFound ${jobs.length} video job(s) for ${today}:\n`);

  const toRetry: typeof jobs = [];

  for (const job of jobs) {
    const symbol = `[${job.ticker}]`.padEnd(8);
    console.log(`  ${symbol} status=${job.status.padEnd(12)} jobId=${job.jobId || 'none'}`);

    // Retry any job that never completed successfully
    const doneStatuses = ['GENERATED', 'COMPLETED', 'NOT_ELIGIBLE'];
    if (!doneStatuses.includes(job.status)) {
      toRetry.push(job);
    }
  }

  if (toRetry.length === 0) {
    console.log('\n✅ All jobs already completed — nothing to retry.');
    await app.close();
    return;
  }

  console.log(`\n🔄 Retriggering video generation for ${toRetry.length} job(s)...\n`);

  for (const job of toRetry) {
    // Get the associated report to grab reportJson
    const report = job.reportId
      ? await prisma.agentReport.findUnique({ where: { id: job.reportId } })
      : await prisma.agentReport.findFirst({
          where: { symbol: job.ticker, createdAt: { gte: startOfDay, lte: endOfDay } },
          orderBy: { createdAt: 'desc' },
        });

    if (!report) {
      console.log(`  [${job.ticker}] ⚠️  No report found — skipping`);
      continue;
    }

    // Reset job status to RECEIVED in DB
    await prisma.videoGenerationJob.update({
      where: { id: job.id },
      data: {
        status: 'RECEIVED',
        errorMessage: null,
        completedAt: null,
        updatedAt: new Date(),
        jobId: job.jobId || `retry-${job.ticker}-${today}`,
      },
    });

    // Fire to video service
    videoClient.triggerVideoJobFireAndForget({
      ticker: job.ticker,
      reportDate: today,
      reportId: report.id,
      reportJson: report.reportJson,
      forceRegenerate: true,
    });

    console.log(`  [${job.ticker}] ✅ Triggered`);
    await new Promise(r => setTimeout(r, 500)); // small delay between triggers
  }

  console.log(`\n🎬 Done! ${toRetry.length} video job(s) queued.`);
  console.log('Videos will appear in: video_agents_service/outputs/videos/2026-06-28/');
  await app.close();
}

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
