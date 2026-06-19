import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const reports = await p.agentReport.findMany({
    where: { status: 'completed' },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: { id: true, symbol: true, finalRating: true, confidenceScore: true, currentPrice: true, technicalScore: true, fundamentalScore: true, createdAt: true }
  });
  console.log('\n── SAMPLE REPORTS ──');
  reports.forEach(r => console.log(JSON.stringify(r)));
  const total = await p.agentReport.count({ where: { status: 'completed' } });
  console.log(`\nTotal completed reports: ${total}`);
  const byRating = await p.agentReport.groupBy({ by: ['finalRating'], _count: true, where: { status: 'completed' } });
  console.log('\n── RATING DISTRIBUTION ──');
  byRating.forEach(r => console.log(`  ${r.finalRating}: ${r._count}`));
}
main().catch(console.error).finally(() => p.$disconnect());
