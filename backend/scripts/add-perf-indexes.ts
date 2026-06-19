import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Adding missing performance indexes...\n');

  // video_generation_jobs — was doing 14,101 seq scans with 0 index hits
  // Actual column names: status, created_at, ticker, report_date
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS video_jobs_status_idx ON video_generation_jobs(status)`);
  console.log('✅ video_generation_jobs(status)');

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS video_jobs_status_created_idx ON video_generation_jobs(status, created_at DESC)`);
  console.log('✅ video_generation_jobs(status, created_at DESC)');

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS video_jobs_ticker_date_status_idx ON video_generation_jobs(ticker, report_date, status)`);
  console.log('✅ video_generation_jobs(ticker, report_date, status)');

  // alerts — 2,151 seq scans; add indexes on the actual columns used in queries
  // Column names: symbol, enabled, createdAt (no userId column — it's a global alerts table)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS alerts_enabled_idx ON alerts(enabled)`);
  console.log('✅ alerts(enabled)');

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS alerts_symbol_enabled_idx2 ON alerts(symbol, enabled)`);
  console.log('✅ alerts(symbol, enabled)');

  // user_sessions — updateMany on userId scans whole table
  // Actual column names: "userId" (camelCase), "isActive"
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS user_sessions_userId_active_idx ON user_sessions("userId", "isActive")`);
  console.log('✅ user_sessions(userId, isActive)');

  // search_logs — 93 seq scans, analytics queries group by symbol
  // Actual column names: symbol, timestamp, "userId"
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS search_logs_symbol_idx ON search_logs(symbol)`);
  console.log('✅ search_logs(symbol)');

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS search_logs_symbol_ts_idx ON search_logs(symbol, timestamp DESC)`);
  console.log('✅ search_logs(symbol, timestamp)');

  // VACUUM ANALYZE to update query planner stats
  console.log('\nRunning VACUUM ANALYZE on hot tables...');
  await prisma.$executeRawUnsafe(`VACUUM ANALYZE video_generation_jobs`);
  console.log('  ✅ video_generation_jobs');
  await prisma.$executeRawUnsafe(`VACUUM ANALYZE alerts`);
  console.log('  ✅ alerts');
  await prisma.$executeRawUnsafe(`VACUUM ANALYZE user_sessions`);
  console.log('  ✅ user_sessions');
  await prisma.$executeRawUnsafe(`VACUUM ANALYZE search_logs`);
  console.log('  ✅ search_logs');
  await prisma.$executeRawUnsafe(`VACUUM ANALYZE agent_reports`);
  console.log('  ✅ agent_reports');

  console.log('\n🎉 All done. Run perf-diag.ts again to verify seq_scan counts drop.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
