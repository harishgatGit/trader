import { Module } from '@nestjs/common';
import { RiskSettingsController } from './risk-settings.controller';
import { RiskSettingsService } from './risk-settings.service';

@Module({
  controllers: [RiskSettingsController],
  providers: [RiskSettingsService],
  exports: [RiskSettingsService],
})
export class RiskSettingsModule {}
