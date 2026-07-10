import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as path from 'path';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  const REPORT_DATE = '2026-07-02';
  const videoPath = path.resolve(__dirname, '../../video_agents_service/outputs/videos', REPORT_DATE, 'AAPL', 'final-video.mp4');
  const sourceReportPath = path.resolve(__dirname, '../../video_agents_service/outputs/videos', REPORT_DATE, 'AAPL', 'source-report.json');

  console.log(`Updating AAPL job status in Prisma...`);
  await prisma.videoGenerationJob.update({
    where: {
      ticker_reportDate: {
        ticker: 'AAPL',
        reportDate: REPORT_DATE,
      }
    },
    data: {
      status: 'GENERATED',
      finalVideoPath: videoPath,
      sourceReportPath: sourceReportPath,
      youtubeUploadStatus: null, // Reset to allow upload
    }
  });

  console.log('AAPL job updated to GENERATED.');
  await app.close();
}

run().catch(console.error);
