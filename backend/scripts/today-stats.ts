import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Reports today via Prisma ORM
  const reports = await prisma.agentReport.findMany({
    where: { createdAt: { gte: today } },
    select: { symbol: true, status: true, processingTime: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  // Search logs — uses 'timestamp' column (not created_at)
  const searchResult = await prisma.$queryRaw<{ total: bigint }[]>`
    SELECT COUNT(*) as total FROM search_logs WHERE "timestamp" >= ${today}
  `;
  const totalSearches = Number(searchResult[0]?.total ?? 0);

  const topSymbols = await prisma.$queryRaw<{ symbol: string; cnt: bigint }[]>`
    SELECT symbol, COUNT(*) as cnt FROM search_logs
    WHERE "timestamp" >= ${today}
    GROUP BY symbol ORDER BY cnt DESC LIMIT 10
  `;

  // Breakdown
  const slow = reports.filter(r => r.processingTime && r.processingTime > 60000);
  const timedOut = reports.filter(r => r.processingTime && r.processingTime >= 89000);
  const failed = reports.filter(r => r.status !== 'completed');
  const times = reports.filter(r => r.processingTime).map(r => r.processingTime!);
  const avg = times.length ? (times.reduce((a, b) => a + b, 0) / times.length / 1000).toFixed(1) : 'N/A';
  const max = times.length ? (Math.max(...times) / 1000).toFixed(1) : 'N/A';
  const min = times.length ? (Math.min(...times) / 1000).toFixed(1) : 'N/A';

  console.log('=== TODAY\'S ANALYSIS STATS ===');
  console.log('Total user searches:         ', totalSearches);
  console.log('Total reports generated:     ', reports.length);
  console.log('Failed / incomplete:         ', failed.length);
  console.log('Slow (>60s):                 ', slow.length);
  console.log('Likely timed out (>=89s):    ', timedOut.length);
  console.log('Avg processing time:         ', avg + 's');
  console.log('Min processing time:         ', min + 's');
  console.log('Max processing time:         ', max + 's');

  console.log('\n--- ALL REPORTS TODAY (newest first) ---');
  for (const r of reports) {
    const secs = r.processingTime ? (r.processingTime / 1000).toFixed(1) + 's' : '  N/A';
    const flag = r.processingTime && r.processingTime >= 89000 ? '⏱ TIMEOUT'
               : r.status !== 'completed' ? '❌ FAIL'
               : r.processingTime && r.processingTime > 60000 ? '🐢 SLOW'
               : '✅';
    console.log(
      r.createdAt.toLocaleTimeString('en-US', { hour12: false }),
      '|', r.symbol.padEnd(8),
      '|', r.status.padEnd(12),
      '|', secs.padStart(8),
      '|', flag,
    );
  }

  console.log('\n--- TOP SEARCHED SYMBOLS TODAY ---');
  for (const s of topSymbols) {
    console.log(' ', s.symbol.padEnd(8), ':', Number(s.cnt), 'searches');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
