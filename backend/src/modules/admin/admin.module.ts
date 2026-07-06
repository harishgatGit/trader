import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DataQualityService } from './data-quality.service';
import { TrendingScraperService } from '../../services/trending-scraper.service';
import { AnalysisModule } from '../analysis/analysis.module';
import { WhatsForTodayModule } from '../whats-for-today/whats-for-today.module';

@Module({
  imports: [AnalysisModule, WhatsForTodayModule],
  controllers: [AdminController],
  providers: [AdminService, DataQualityService, TrendingScraperService],
  exports: [AdminService, DataQualityService, TrendingScraperService],
})
export class AdminModule {}
