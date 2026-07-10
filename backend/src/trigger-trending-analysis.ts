import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AdminService } from './modules/admin/admin.service';

// Globally support BigInt serialization to prevent JSON.stringify failures
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

// ── Yesterday's analyzed tickers — excluded from today's run ──────────────────
const YESTERDAY_TICKERS = [
  'AMD', 'AMZN', 'ARM', 'AVGO', 'BABA', 'COIN', 'GOOGL',
  'MARA', 'META', 'MSFT', 'MSTR', 'MU', 'NFLX', 'NIO',
  'NVDA', 'PLTR', 'RIOT', 'SOFI', 'TSLA',
];

async function run() {
  console.log('Initializing NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const adminService = app.get(AdminService);

  console.log(`\n----------------------------------------`);
  console.log(`Triggering trending stocks analysis (excluding ${YESTERDAY_TICKERS.length} yesterday tickers)...`);
  console.log(`Excluded: ${YESTERDAY_TICKERS.join(', ')}`);
  console.log(`----------------------------------------`);
  try {
    const result = await adminService.triggerTrendingAnalysis(YESTERDAY_TICKERS);
    console.log(`✅ Completed:`, result.message);
    console.log(`Analyzed symbols:`, result.symbols.join(', '));
    console.log(`Excluded symbols:`, result.excluded.join(', '));
  } catch (err: any) {
    console.error(`❌ Trending analysis trigger failed:`, err.message);
  }

  console.log('\nAll actions finished.');
  await app.close();
}

run().catch((err) => {
  console.error('Failed to trigger trending analysis:', err);
  process.exit(1);
});
