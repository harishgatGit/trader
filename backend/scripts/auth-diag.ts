import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Recent auth-related client errors
  const authErrors = await prisma.clientLog.findMany({
    where: {
      level: 'error',
      OR: [
        { message: { contains: 'auth', mode: 'insensitive' } },
        { message: { contains: '401', mode: 'insensitive' } },
        { message: { contains: 'session', mode: 'insensitive' } },
        { message: { contains: 'expired', mode: 'insensitive' } },
        { message: { contains: 'login', mode: 'insensitive' } },
        { message: { contains: 'Unauthorized', mode: 'insensitive' } },
      ],
    },
    orderBy: { timestamp: 'desc' },
    take: 30,
  });

  // 2. Session stats — how long sessions last
  const sessions = await prisma.$queryRaw<any[]>`
    SELECT 
      u.username,
      s."isActive",
      s."createdAt",
      s."lastActiveAt",
      EXTRACT(EPOCH FROM (s."lastActiveAt" - s."createdAt")) / 3600 as "lifetimeHours"
    FROM user_sessions s
    JOIN users u ON s."userId" = u.id
    ORDER BY s."createdAt" DESC
    LIMIT 30
  `;

  // 3. Sessions created per day (spikes = frequent forced re-logins)
  const sessionsByDay = await prisma.$queryRaw<any[]>`
    SELECT 
      DATE(s."createdAt") as day,
      COUNT(*) as session_count,
      COUNT(DISTINCT s."userId") as unique_users
    FROM user_sessions s
    GROUP BY DATE(s."createdAt")
    ORDER BY day DESC
    LIMIT 14
  `;

  // 4. Active vs inactive session counts
  const sessionCounts = await prisma.$queryRaw<any[]>`
    SELECT "isActive", COUNT(*) as count
    FROM user_sessions
    GROUP BY "isActive"
  `;

  // 5. 401 API hits from ip_request_logs
  const api401s = await prisma.$queryRaw<any[]>`
    SELECT route, method, "statusCode", "durationMs", timestamp, username
    FROM ip_request_logs
    WHERE "statusCode" = 401
    ORDER BY timestamp DESC
    LIMIT 20
  `;

  console.log('\n══════════════════════════════════════════════');
  console.log('   AUTH / SESSION DIAGNOSTIC REPORT');
  console.log('══════════════════════════════════════════════\n');

  console.log(`── RECENT AUTH CLIENT ERRORS (${authErrors.length}) ──`);
  if (authErrors.length === 0) console.log('  ✅ No auth errors in client logs\n');
  authErrors.forEach(e => {
    console.log(`  [${e.timestamp.toISOString()}] ${e.username || 'anon'} | ${e.url}`);
    console.log(`  → ${e.message.slice(0, 200)}\n`);
  });

  console.log(`── SESSION ACTIVE/INACTIVE COUNTS ──`);
  sessionCounts.forEach((s: any) => {
    console.log(`  isActive=${s.isActive}: ${s.count} sessions`);
  });
  console.log('');

  console.log(`── SESSIONS BY DAY (new logins created each day) ──`);
  sessionsByDay.forEach((r: any) => {
    console.log(`  ${r.day} → ${r.session_count} sessions created | ${r.unique_users} users`);
  });
  console.log('');

  console.log(`── RECENT 30 SESSIONS (lifetime = how long session stayed valid) ──`);
  sessions.forEach((s: any) => {
    const hours = s.lifetimeHours ? Number(s.lifetimeHours).toFixed(2) : '0';
    const flag = Number(hours) < 0.05 ? '🔴 INSTANT EXPIRE' : Number(hours) < 1 ? '🟡 <1hr' : '✅';
    console.log(`  ${flag} ${s.username} | active=${s.isActive} | created=${new Date(s.createdAt).toISOString().slice(0,19)} | lifetime=${hours}h | lastActive=${new Date(s.lastActiveAt).toISOString().slice(0,19)}`);
  });
  console.log('');

  console.log(`── 401 BACKEND API HITS (${api401s.length} recent) ──`);
  if (api401s.length === 0) console.log('  ✅ No 401s recorded in ip_request_logs\n');
  api401s.forEach((l: any) => {
    console.log(`  [${new Date(l.timestamp).toISOString().slice(0,19)}] ${l.username || 'anon'} | ${l.method} ${l.route} → 401 (${l.durationMs || '?'}ms)`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
