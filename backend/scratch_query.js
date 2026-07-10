const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check both 2026-06-30 and 2026-07-01
  for (const date of ['2026-06-30', '2026-07-01']) {
    const jobs = await prisma.videoGenerationJob.findMany({
      where: { reportDate: date },
      orderBy: { ticker: 'asc' },
      select: { ticker: true, status: true, youtubeUploadStatus: true, finalVideoPath: true }
    });
    if (jobs.length === 0) continue;
    console.log(`\n=== ${date} Video Jobs (${jobs.length} total) ===`);
    const grouped = {};
    jobs.forEach(j => {
      grouped[j.status] = grouped[j.status] || [];
      grouped[j.status].push(j.ticker);
    });
    Object.entries(grouped).forEach(([status, tickers]) => {
      console.log(`  ${status.padEnd(25)} (${tickers.length}) ${tickers.join(', ')}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
