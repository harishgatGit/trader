import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WhatsForTodayService } from './modules/whats-for-today/whats-for-today.service';

// Globally support BigInt serialization to prevent JSON.stringify failures
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function run() {
  console.log('Initializing NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(WhatsForTodayService);

  const phases = [1, 2, 3, 4];
  for (const phase of phases) {
    console.log(`\n----------------------------------------`);
    console.log(`Triggering daily report generation for phase ${phase}...`);
    console.log(`----------------------------------------`);
    try {
      await service.generateDailyReport(phase);
      console.log(`✅ Phase ${phase} generated successfully.`);
    } catch (err: any) {
      console.error(`❌ Phase ${phase} failed to generate:`, err.message);
    }
  }

  console.log(`\n----------------------------------------`);
  console.log('Triggering Micro-Cap Catalysts scan...');
  console.log(`----------------------------------------`);
  try {
    await service.scanPennyStocks(true);
    console.log('✅ Micro-Cap Catalysts scan completed successfully.');
  } catch (err: any) {
    console.error('❌ Micro-Cap Catalysts scan failed:', err.message);
  }

  console.log('\nAll reports and scans completed successfully for today!');
  await app.close();
}

run().catch((err) => {
  console.error('Failed to trigger daily reports:', err);
  process.exit(1);
});
