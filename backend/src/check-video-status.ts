import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { getNYDateString } from './utils/date';

(BigInt.prototype as any).toJSON = function () { return Number(this); };

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const today = process.env.TARGET_DATE || getNYDateString();

  const jobs = await prisma.videoGenerationJob.findMany({
    where: { reportDate: today },
    orderBy: { updatedAt: 'desc' },
  });

  console.log(`\n=== Video Generation Jobs for ${today} ===\n`);
  for (const j of jobs) {
    const ytStatus = j.youtubeUploadStatus || 'NOT_ATTEMPTED';
    const ytId = j.youtubeVideoId || 'none';
    console.log(`  [${j.ticker.padEnd(6)}] status=${j.status.padEnd(12)} ytStatus=${ytStatus.padEnd(12)} ytId=${ytId.padEnd(12)} updatedAt=${j.updatedAt.toISOString()}`);
  }
  await app.close();
}

run().catch(console.error);
