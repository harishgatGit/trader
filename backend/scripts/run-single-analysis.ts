import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AnalysisService } from '../src/modules/analysis/analysis.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const analysisService = app.get(AnalysisService);

  const systemAdmin = await prisma.user.findUnique({
    where: { username: 'systemadmin' },
  });

  console.log('Triggering fresh analysis for AAPL...');
  await analysisService.enqueueAnalysis('AAPL', systemAdmin, true, '127.0.0.1');
  console.log('AAPL analysis triggered.');

  await app.close();
}

run().catch(console.error);
