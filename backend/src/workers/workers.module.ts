import { Module } from '@nestjs/common';
import { AlertWorker } from './alert.worker';
import { AgentsModule } from '../agents/agents.module';
import { AlertsModule } from '../modules/alerts/alerts.module';

@Module({
  imports: [AgentsModule, AlertsModule],
  providers: [AlertWorker],
})
export class WorkersModule {}
