import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { VideoJobService } from '../src/modules/video/video-job.service';

// Globally support BigInt serialization to prevent JSON.stringify failures
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function run() {
  const args = process.argv.slice(2);
  const ticker = args[0]?.toUpperCase();
  const dateStr = args[1] || new Date().toISOString().slice(0, 10); // default to YYYY-MM-DD

  if (!ticker) {
    console.error('❌ Usage: npx ts-node scripts/trigger-video-generation.ts <TICKER> [DATE]');
    process.exit(1);
  }

  console.log(`Initializing NestJS application context...`);
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const videoJobService = app.get(VideoJobService);

  console.log(`\nLooking up AgentReport for ${ticker} on date ${dateStr}...`);
  // Find report for this ticker
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
  const report = await prisma.agentReport.findFirst({
    where: {
      symbol: ticker,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (!report) {
    console.error(`❌ No AgentReport found in database for ${ticker} on ${dateStr}`);
    await app.close();
    process.exit(1);
  }

  console.log(`Found report ID: ${report.id}. Current Price: $${report.currentPrice || 'N/A'}`);
  console.log(`Triggering video generation (forceRegenerate=true)...`);

  await videoJobService.fireAndForget(
    ticker,
    dateStr,
    report.id,
    report.reportJson,
    true // forceRegenerate
  );

  console.log(`\n✅ Video generation job fired successfully! Status logged as RECEIVED.`);
  console.log(`Monitor uvicorn server console logs for rendering progress.`);
  
  // Wait 2s to allow async HTTP call to dispatch
  await new Promise(resolve => setTimeout(resolve, 2000));
  await app.close();
}

run().catch((err) => {
  console.error('Failed to trigger video generation:', err);
  process.exit(1);
});
