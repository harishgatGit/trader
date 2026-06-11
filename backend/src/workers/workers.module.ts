import { Module } from '@nestjs/common';
import { AlertWorker } from './alert.worker';
import { VideoQueueWorker } from './video-queue.worker';
import { AgentsModule } from '../agents/agents.module';
import { AlertsModule } from '../modules/alerts/alerts.module';

@Module({
  imports: [AgentsModule, AlertsModule],
  providers: [AlertWorker, VideoQueueWorker],
})
export class WorkersModule {}
