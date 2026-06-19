/**
 * Backfill script: creates ReportOutcome rows for all existing completed reports.
 * Safe to run multiple times (upsert by reportId).
 */
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const reports = await p.agentReport.findMany({
    where: { status: 'completed' },
    select: {
      id: true, symbol: true, finalRating: true, currentPrice: true,
      confidenceScore: true, technicalScore: true, reportJson: true, createdAt: true,
    },
  });

  console.log(`Backfilling ${reports.length} reports...`);
  let created = 0, skipped = 0;

  for (const r of reports) {
    const json = r.reportJson as any;
    const targetPrice = json?.entryExitPlan?.targets?.[0]?.price
      ?? json?.alertLevels?.targetLevels?.[0]
      ?? json?.finalDecision?.targetPrice
      ?? null;
    const stopPrice  = json?.entryExitPlan?.stopLoss?.price
      ?? json?.alertLevels?.stopLoss
      ?? json?.finalDecision?.stopLoss
      ?? null;

    try {
      await p.reportOutcome.upsert({
        where: { reportId: r.id },
        create: {
          reportId: r.id,
          symbol: r.symbol,
          ratingAtTime: r.finalRating,
          priceAtReport: r.currentPrice ?? null,
          confidenceAtTime: r.confidenceScore ?? null,
          technicalScore: r.technicalScore ?? null,
          targetPrice,
          stopLossPrice: stopPrice,
          overallVerdict: 'PENDING',
          reportCreatedAt: r.createdAt,
        },
        update: {}, // already exists — skip
      });
      created++;
    } catch (e: any) {
      console.error(`Failed for ${r.id}: ${e.message}`);
      skipped++;
    }
  }

  console.log(`Done. Created/confirmed: ${created}, Skipped: ${skipped}`);
}

main().catch(console.error).finally(() => p.$disconnect());
