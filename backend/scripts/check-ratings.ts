import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // Check watchlist current ratings
  const watchlist = await prisma.watchlist.findMany({ select: { symbol: true, latestRating: true, latestSignal: true, lastAnalyzedAt: true } });
  console.log('\n── WATCHLIST RATINGS ──');
  watchlist.forEach(w => console.log(`  ${w.symbol.padEnd(10)} latestRating=${String(w.latestRating).padEnd(15)} latestSignal=${w.latestSignal}  updated=${w.lastAnalyzedAt}`));

  // Check latest agent reports' finalRating field
  const reports = await prisma.agentReport.findMany({
    where: { status: 'completed' },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: { symbol: true, finalRating: true, createdAt: true }
  });
  console.log('\n── LATEST AGENT REPORT RATINGS ──');
  reports.forEach(r => console.log(`  ${r.symbol.padEnd(10)} finalRating=${String(r.finalRating).padEnd(15)} at=${r.createdAt}`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
