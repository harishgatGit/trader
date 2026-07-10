import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AdminService } from '../src/modules/admin/admin.service';

// Polyfill BigInt serialization
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function run() {
  console.log('Initializing NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const adminService = app.get(AdminService);

  // 1. Calculate the target dates for the last 2 days (today and yesterday)
  // Since today is 2026-06-29, let's include 2026-06-28 and 2026-06-29.
  // We also query reports created in the last 48 hours to be thorough.
  const targetDates = ['2026-06-29', '2026-06-30', '2026-07-01'];
  
  console.log(`Querying database for tickers analyzed or generated on dates: ${targetDates.join(', ')}...`);
  
  const recentJobs = await prisma.videoGenerationJob.findMany({
    where: {
      reportDate: { in: targetDates }
    },
    select: { ticker: true }
  });

  const fortyEightHoursAgo = new Date();
  fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

  const recentReports = await prisma.agentReport.findMany({
    where: {
      createdAt: { gte: fortyEightHoursAgo }
    },
    select: { symbol: true }
  });

  // Collect all unique tickers from both jobs and reports
  const excludedSet = new Set<string>();
  recentJobs.forEach(job => {
    if (job.ticker) {
      excludedSet.add(job.ticker.toUpperCase().trim());
    }
  });
  recentReports.forEach(report => {
    if (report.symbol) {
      excludedSet.add(report.symbol.toUpperCase().trim());
    }
  });

  const excludedList = Array.from(excludedSet).sort();
  console.log(`\nFound ${excludedList.length} unique symbols analyzed/generated in the last 2 days:`);
  console.log(excludedList.join(', ') || '(none)');

  console.log(`\nTriggering trending stocks analysis (excluding the last 2 days tickers)...`);
  try {
    const result = await adminService.triggerTrendingAnalysis(excludedList);
    console.log(`\n✅ Completed successfully!`);
    console.log(`Enqueued symbols for analysis & video generation:`, result.symbols.join(', ') || '(none)');
    console.log(`Total excluded symbols:`, result.excluded.length);
  } catch (err: any) {
    console.error(`❌ Trending analysis trigger failed:`, err.message);
  }

  await app.close();
}

run().catch((err) => {
  console.error('Failed to run custom trending analysis trigger:', err);
  process.exit(1);
});
