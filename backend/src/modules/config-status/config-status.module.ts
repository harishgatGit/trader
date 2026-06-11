import { Module } from '@nestjs/common';
import { ConfigStatusController } from './config-status.controller';
import { ConfigStatusService } from './config-status.service';
import { AgentsModule } from '../../agents/agents.module';

@Module({
  imports: [AgentsModule],
  controllers: [ConfigStatusController],
  providers: [ConfigStatusService],
})
export class ConfigStatusModule {}
