import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. DB Indexes
  const indexes = await prisma.$queryRaw<any[]>`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `;
  console.log('\n── DB INDEXES ──');
  indexes.forEach(i => console.log(`  ${i.tablename.padEnd(35)} ${i.indexname}`));

  // 2. Table row counts & sizes
  const sizes = await prisma.$queryRaw<any[]>`
    SELECT 
      t.relname as table_name,
      t.n_live_tup as row_count,
      pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
    FROM pg_stat_user_tables t
    JOIN pg_class c ON c.relname = t.relname AND c.relkind = 'r'
    ORDER BY t.n_live_tup DESC
  `;
  console.log('\n── TABLE SIZES & ROW COUNTS ──');
  sizes.forEach(s => console.log(`  ${s.table_name.padEnd(35)} rows=${String(s.row_count).padStart(8)}  size=${s.total_size}`));

  // 3. Slow/heavy queries — look for sequential scans
  const seqScans = await prisma.$queryRaw<any[]>`
    SELECT relname, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
    FROM pg_stat_user_tables
    WHERE seq_scan > 0
    ORDER BY seq_scan DESC
    LIMIT 15
  `;
  console.log('\n── SEQUENTIAL SCANS (no index being used) ──');
  seqScans.forEach(s => console.log(`  ${s.relname.padEnd(35)} seq_scans=${String(s.seq_scan).padStart(8)}  seq_rows_read=${String(s.seq_tup_read).padStart(10)}  idx_scans=${String(s.idx_scan).padStart(8)}`));

  // 4. Missing index candidates — tables with lots of seq scans but no/few idx scans
  console.log('\n── MISSING INDEX CANDIDATES (high seq_scan, low idx_scan) ──');
  seqScans.filter(s => Number(s.seq_scan) > 10 && Number(s.idx_scan) < Number(s.seq_scan)).forEach(s => {
    console.log(`  ⚠️  ${s.relname}: ${s.seq_scan} seq scans vs ${s.idx_scan} index scans`);
  });

  // 5. ip_request_logs — check for potential bottleneck (logging every request)
  const logCount = await prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt FROM ip_request_logs`;
  const agentReportCount = await prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt FROM agent_reports`;
  const clientLogCount = await prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt FROM client_logs`;
  const searchLogCount = await prisma.$queryRaw<any[]>`SELECT COUNT(*) as cnt FROM search_logs`;
  console.log('\n── LOG TABLE ROW COUNTS ──');
  console.log(`  ip_request_logs: ${logCount[0].cnt}`);
  console.log(`  client_logs:     ${clientLogCount[0].cnt}`);
  console.log(`  search_logs:     ${searchLogCount[0].cnt}`);
  console.log(`  agent_reports:   ${agentReportCount[0].cnt}`);

  // 6. Cache hit rate  
  const cacheHit = await prisma.$queryRaw<any[]>`
    SELECT 
      sum(heap_blks_hit) as heap_hit,
      sum(heap_blks_read) as heap_read,
      ROUND(sum(heap_blks_hit)::numeric / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read),0) * 100, 2) as hit_rate
    FROM pg_statio_user_tables
  `;
  console.log('\n── POSTGRES BUFFER CACHE HIT RATE ──');
  console.log(`  Cache hit rate: ${cacheHit[0].hit_rate}%  (heap_hit=${cacheHit[0].heap_hit} heap_read=${cacheHit[0].heap_read})`);
  console.log(`  Target: >99%. Below 95% means you need more shared_buffers.\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
