const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const utcToday = new Date().toISOString().split('T')[0];

  const recentReports = await prisma.agentReport.groupBy({
    by: ['symbol'],
    where: { createdAt: { gte: new Date(Date.now() - 36 * 3600 * 1000) } },
    _max: { createdAt: true },
  });
  console.log('UTC "today" per EOD workflow logic:', utcToday);
  console.log('\nAgentReports in last 36h (symbol, latest createdAt):');
  console.table(recentReports.map(r => ({ symbol: r.symbol, latest: r._max.createdAt.toISOString() })));

  const wftReports = await prisma.dailyMarketReport.findMany({
    where: { runTime: { gte: new Date(Date.now() - 36 * 3600 * 1000) } },
    select: { date: true, runNumber: true, runTime: true },
    orderBy: { runTime: 'desc' },
  });
  console.log('\nDailyMarketReport (WhatsForToday) rows in last 36h:');
  console.table(wftReports.map(r => ({ date: r.date, runNumber: r.runNumber, runTime: r.runTime.toISOString() })));

  const videoJobs = await prisma.videoGenerationJob.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 36 * 3600 * 1000) } },
    select: { ticker: true, reportDate: true, status: true, videoFormat: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  console.log('\nVideoGenerationJob rows in last 36h:');
  console.table(videoJobs.map(j => ({ ...j, createdAt: j.createdAt.toISOString() })));

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
