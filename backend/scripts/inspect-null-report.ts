import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  // Look at a null-price report's full reportJson.currentPrice and marketData
  const r = await p.agentReport.findFirst({
    where: { status: 'completed', currentPrice: null, symbol: 'VERIZON' },
    select: { reportJson: true, symbol: true, finalRating: true },
  });

  if (!r) { console.log('no report found'); return; }

  const json = r.reportJson as any;
  console.log('\n── currentPrice field in reportJson ──');
  console.log('json.currentPrice:', json.currentPrice);
  console.log('json.marketData:', JSON.stringify(json.marketData, null, 2).slice(0, 600));
  console.log('\n── dataQuality ──');
  console.log(JSON.stringify(json.dataQuality, null, 2));
  console.log('\n── confidenceScore in json ──');
  console.log('json.confidenceScore:', json.confidenceScore);
  console.log('json.finalDecision?.confidenceScore:', json.finalDecision?.confidenceScore);
  console.log('json.finalRating:', json.finalRating);
  console.log('json.riskAnalysis?.confidenceScore:', json.riskAnalysis?.confidenceScore);
}

main().catch(console.error).finally(() => p.$disconnect());
