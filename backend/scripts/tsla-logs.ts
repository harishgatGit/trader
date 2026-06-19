import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Client-side error logs mentioning TSLA
  const clientErrors = await prisma.clientLog.findMany({
    where: {
      level: 'error',
      OR: [
        { message: { contains: 'TSLA', mode: 'insensitive' } },
        { stack: { contains: 'TSLA', mode: 'insensitive' } },
        { url: { contains: 'TSLA', mode: 'insensitive' } },
      ],
    },
    orderBy: { timestamp: 'desc' },
    take: 20,
  });

  // 2. Agent reports for TSLA with any non-completed status or long processing time
  const tslaReports = await prisma.agentReport.findMany({
    where: { symbol: { equals: 'TSLA', mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true, symbol: true, status: true, processingTime: true,
      createdAt: true, finalRating: true, openaiModel: true,
      promptTokens: true, completionTokens: true,
    },
  });

  // 3. IP request logs for /tsla route (API hits)
  const apiLogs = await prisma.$queryRaw<any[]>`
    SELECT route, method, "statusCode", "durationMs", timestamp, "userAgent"
    FROM ip_request_logs
    WHERE LOWER(route) LIKE '%tsla%'
    ORDER BY timestamp DESC
    LIMIT 20
  `;

  // 4. Search logs for TSLA
  const searches = await prisma.$queryRaw<any[]>`
    SELECT s.symbol, s.timestamp, s."ipAddress", s.city, s.state, u.username
    FROM search_logs s
    LEFT JOIN users u ON s."userId" = u.id
    WHERE LOWER(s.symbol) = 'tsla'
    ORDER BY s.timestamp DESC
    LIMIT 15
  `;

  // 5. Video job status for TSLA
  const videoJobs = await prisma.videoGenerationJob.findMany({
    where: { ticker: 'TSLA' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true, ticker: true, reportDate: true, status: true,
      errorMessage: true, createdAt: true, completedAt: true,
    },
  });

  console.log('\n══════════════════════════════════════════════');
  console.log('   TSLA ERROR & ACTIVITY LOG REPORT');
  console.log('══════════════════════════════════════════════\n');

  console.log(`── CLIENT-SIDE ERROR LOGS (${clientErrors.length}) ──`);
  if (clientErrors.length === 0) {
    console.log('  ✅ No client-side errors referencing TSLA\n');
  } else {
    clientErrors.forEach(e => {
      console.log(`  [${e.timestamp.toISOString()}] ${e.level.toUpperCase()}`);
      console.log(`  User: ${e.username || 'anonymous'} | URL: ${e.url || 'N/A'}`);
      console.log(`  Message: ${e.message}`);
      if (e.stack) console.log(`  Stack: ${e.stack.slice(0, 200)}`);
      console.log('');
    });
  }

  console.log(`── AGENT REPORTS FOR TSLA (${tslaReports.length}) ──`);
  if (tslaReports.length === 0) {
    console.log('  No reports found for TSLA\n');
  } else {
    tslaReports.forEach(r => {
      const secs = r.processingTime ? (r.processingTime / 1000).toFixed(1) + 's' : 'N/A';
      const flag = r.processingTime && r.processingTime >= 89000 ? '⏱ TIMEOUT'
                 : r.status !== 'completed' ? '❌ FAIL' : '✅';
      console.log(`  [${r.createdAt.toISOString()}] ${r.symbol} | ${r.status} | ${secs} | ${r.finalRating} ${flag}`);
      console.log(`    Tokens: ${r.promptTokens || 0} prompt + ${r.completionTokens || 0} completion | Model: ${r.openaiModel || 'N/A'}`);
    });
    console.log('');
  }

  console.log(`── API REQUEST LOGS FOR TSLA (${apiLogs.length}) ──`);
  if (apiLogs.length === 0) {
    console.log('  No API logs found for TSLA\n');
  } else {
    apiLogs.forEach((l: any) => {
      const ts = new Date(l.timestamp).toISOString();
      const flag = l.statusCode >= 500 ? '🔴' : l.statusCode >= 400 ? '🟡' : '🟢';
      console.log(`  ${flag} [${ts}] ${l.method} ${l.route} → ${l.statusCode || '?'} (${l.durationMs || '?'}ms)`);
    });
    console.log('');
  }

  console.log(`── SEARCH ACTIVITY FOR TSLA (${searches.length} recent) ──`);
  if (searches.length === 0) {
    console.log('  No searches found\n');
  } else {
    searches.forEach((s: any) => {
      const ts = new Date(s.timestamp).toISOString();
      console.log(`  [${ts}] by ${s.username || 'anonymous'} from ${s.city || '?'}, ${s.state || '?'} (${s.ipAddress || '?'})`);
    });
    console.log('');
  }

  console.log(`── VIDEO JOBS FOR TSLA (${videoJobs.length}) ──`);
  if (videoJobs.length === 0) {
    console.log('  No video jobs found\n');
  } else {
    videoJobs.forEach(v => {
      const flag = v.status === 'ERROR' || v.status === 'FAILED' ? '❌' : v.status === 'GENERATED' ? '✅' : '⏳';
      console.log(`  ${flag} [${v.createdAt.toISOString()}] ${v.ticker} | ${v.reportDate} | ${v.status}`);
      if (v.errorMessage) console.log(`     Error: ${v.errorMessage}`);
    });
    console.log('');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
