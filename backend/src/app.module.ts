import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { ConfigStatusModule } from './modules/config-status/config-status.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { WatchlistModule } from './modules/watchlist/watchlist.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RiskSettingsModule } from './modules/risk-settings/risk-settings.module';
import { StocksModule } from './modules/stocks/stocks.module';
import { WorkersModule } from './workers/workers.module';
import { AuthModule } from './modules/auth/auth.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { AdminModule } from './modules/admin/admin.module';
import { ClientLogsModule } from './modules/client-logs/client-logs.module';
import { VideoModule } from './modules/video/video.module';
import { WhatsForTodayModule } from './modules/whats-for-today/whats-for-today.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Bull/BullMQ queues
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_URL?.includes('redis://')
          ? process.env.REDIS_URL.split('://')[1]?.split(':')[0] || 'localhost'
          : 'localhost',
        port: parseInt(
          process.env.REDIS_URL?.split(':').pop() || '6379',
        ),
      },
    }),

    // Core modules
    PrismaModule,

    // Auth module
    AuthModule,

    // Feature modules
    HealthModule,
    ConfigStatusModule,
    AnalysisModule,
    StocksModule,
    WatchlistModule,
    AlertsModule,
    ReportsModule,
    RiskSettingsModule,
    WorkersModule,
    FeedbackModule,
    AdminModule,
    ClientLogsModule,
    VideoModule,
    WhatsForTodayModule,
  ],
})
export class AppModule {}
