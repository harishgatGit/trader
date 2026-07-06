import { Module } from '@nestjs/common';
import { WhatsForTodayController } from './whats-for-today.controller';
import { WhatsForTodayService } from './whats-for-today.service';
import { WhatsForTodayScheduler } from './whats-for-today.scheduler';
import { EODVideoWorkflowService } from './eod-video-workflow.service';
import { TrendingScraperService } from '../../services/trending-scraper.service';

@Module({
  controllers: [WhatsForTodayController],
  providers: [WhatsForTodayService, WhatsForTodayScheduler, EODVideoWorkflowService, TrendingScraperService],
  exports: [WhatsForTodayService, EODVideoWorkflowService],
})
export class WhatsForTodayModule {}
