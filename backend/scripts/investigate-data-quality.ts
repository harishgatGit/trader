import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  // --- 1. Null currentPrice analysis ---
  const nullPrice = await p.agentReport.findMany({
    where: { status: 'completed', currentPrice: null },
    select: { id: true, symbol: true, finalRating: true, confidenceScore: true, processingTime: true, createdAt: true, reportJson: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`\n── NULL currentPrice reports (${nullPrice.length} shown, total much more) ──`);
  for (const r of nullPrice) {
    const json = r.reportJson as any;
    const hasPrice = !!json?.currentPrice || !!json?.marketData?.currentPrice || !!json?.report?.currentPrice;
    console.log(JSON.stringify({
      symbol: r.symbol,
      finalRating: r.finalRating,
      confidenceScore: r.confidenceScore,
      processingMs: r.processingTime,
      reportJsonHasPrice: hasPrice,
      jsonTopKeys: Object.keys(json || {}).slice(0, 12),
    }));
  }

  // --- 2. Zero confidenceScore analysis ---
  const zeroConf = await p.agentReport.findMany({
    where: { status: 'completed', confidenceScore: 0 },
    select: { id: true, symbol: true, finalRating: true, processingTime: true, reportJson: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log(`\n── ZERO confidenceScore reports ──`);
  for (const r of zeroConf) {
    const json = r.reportJson as any;
    const confInJson = json?.confidenceScore ?? json?.report?.confidenceScore ?? json?.finalReport?.confidenceScore ?? 'NOT_FOUND';
    console.log(JSON.stringify({
      symbol: r.symbol,
      finalRating: r.finalRating,
      processingMs: r.processingTime,
      confInJson: confInJson,
      topKeys: Object.keys(json || {}).slice(0, 15),
    }));
  }

  // --- 3. Count breakdown ---
  const total     = await p.agentReport.count({ where: { status: 'completed' } });
  const nullPriceCount = await p.agentReport.count({ where: { status: 'completed', currentPrice: null } });
  const zeroConfCount  = await p.agentReport.count({ where: { status: 'completed', confidenceScore: 0 } });
  const zeroTechCount  = await p.agentReport.count({ where: { status: 'completed', technicalScore: 0 } });

  console.log(`\n── DATA QUALITY SUMMARY ──`);
  console.log(`Total completed: ${total}`);
  console.log(`currentPrice null: ${nullPriceCount} (${Math.round(100*nullPriceCount/total)}%)`);
  console.log(`confidenceScore = 0: ${zeroConfCount} (${Math.round(100*zeroConfCount/total)}%)`);
  console.log(`technicalScore = 0: ${zeroTechCount} (${Math.round(100*zeroTechCount/total)}%)`);
}

main().catch(console.error).finally(() => p.$disconnect());
