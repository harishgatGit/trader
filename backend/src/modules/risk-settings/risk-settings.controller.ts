import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { RiskSettingsService } from './risk-settings.service';
import { IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { RoleGuard, Roles } from '../auth/role.guard';

class UpdateRiskSettingsDto {
  @IsNumber() @IsOptional() @Min(1) @Max(100) maxPositionSizePct?: number;
  @IsNumber() @IsOptional() @Min(0.5) @Max(20) maxLossPerTradePct?: number;
  @IsNumber() @IsOptional() @Min(1) @Max(10) minRiskReward?: number;
  @IsBoolean() @IsOptional() requireStopLoss?: boolean;
  @IsNumber() @IsOptional() @Min(1) @Max(168) blockDuplicateWindow?: number;
  @IsNumber() @IsOptional() @Min(1) @Max(100) maxDailyOrders?: number;
}

@Controller('risk-settings')
@UseGuards(AuthGuard, RoleGuard)
@Roles('SUPERUSER')
export class RiskSettingsController {
  constructor(private readonly riskSettingsService: RiskSettingsService) {}

  @Get()
  async get() {
    return this.riskSettingsService.get();
  }

  @Put()
  async update(@Body() dto: UpdateRiskSettingsDto) {
    return this.riskSettingsService.update(dto);
  }
}
