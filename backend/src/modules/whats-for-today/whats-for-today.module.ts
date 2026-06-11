import { Module } from '@nestjs/common';
import { WhatsForTodayController } from './whats-for-today.controller';
import { WhatsForTodayService } from './whats-for-today.service';
import { WhatsForTodayScheduler } from './whats-for-today.scheduler';

@Module({
  controllers: [WhatsForTodayController],
  providers: [WhatsForTodayService, WhatsForTodayScheduler],
  exports: [WhatsForTodayService],
})
export class WhatsForTodayModule {}
