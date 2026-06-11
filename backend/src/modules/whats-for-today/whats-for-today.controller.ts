import { Controller, Get, Post, Param, Body, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { WhatsForTodayService } from './whats-for-today.service';
import { AuthGuard, CurrentUser } from '../auth/auth.guard';
import { RoleGuard, Roles } from '../auth/role.guard';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

class InteractDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsString()
  @IsNotEmpty()
  action: string; // "click", "watchlist_add"
}

@Controller('whats-for-today')
@UseGuards(AuthGuard, RoleGuard)
@Roles('BASIC', 'PRO', 'MAX', 'ADMIN', 'SUPERUSER')
export class WhatsForTodayController {
  constructor(private readonly service: WhatsForTodayService) {}

  @Get('latest')
  async getLatest() {
    return this.service.getLatestReport();
  }

  @Get('report/:id')
  async getReportDetail(@Param('id') id: string) {
    return this.service.getReportDetail(id);
  }

  @Get('phase/:run')
  async getReportByPhase(@Param('run') run: string, @Query('date') date?: string) {
    const runNum = parseInt(run);
    if (isNaN(runNum) || runNum < 1 || runNum > 4) {
      throw new Error('Invalid run number. Must be between 1 and 4.');
    }
    const today = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    const todayStr = date || new Date(today).toISOString().split('T')[0];
    
    return this.service.getReportByPhaseAndDate(runNum, todayStr);
  }

  @Get('penny-stocks')
  async getPennyStocks(@Query('search') search?: string) {
    const scanResult = await this.service.scanPennyStocks(false);
    
    let filteredStocks = scanResult.pennyStocks;
    if (search && search.trim().length > 0) {
      const q = search.toUpperCase().trim();
      filteredStocks = filteredStocks.filter(
        item => item.symbol.toUpperCase().includes(q) || item.companyName.toUpperCase().includes(q)
      );
    }
    return {
      pennyStocks: filteredStocks,
      generatedAt: scanResult.generatedAt,
      nextRefreshAt: scanResult.nextRefreshAt,
    };
  }

  @Post('penny-stocks/scan')
  @Roles('ADMIN', 'SUPERUSER')
  async triggerPennyStockScan() {
    const scanResult = await this.service.scanPennyStocks(true);
    return {
      pennyStocks: scanResult.pennyStocks,
      generatedAt: scanResult.generatedAt,
      nextRefreshAt: scanResult.nextRefreshAt,
    };
  }


  @Post('interact')
  @HttpCode(HttpStatus.OK)
  async interact(@Body() dto: InteractDto, @CurrentUser() user: any) {
    const userId = user?.id || null;
    return this.service.trackInteraction(userId, dto.symbol, dto.action);
  }

  @Get('feedback')
  async getFeedbackLogs() {
    return this.service.getFeedbackLogs();
  }

  @Post('trigger/:run')
  @Roles('ADMIN', 'SUPERUSER')
  async manualTrigger(@Param('run') run: string, @Query('date') date?: string) {
    const runNum = parseInt(run);
    if (isNaN(runNum) || runNum < 1 || runNum > 4) {
      throw new Error('Invalid run number. Must be between 1 and 4.');
    }
    return this.service.generateDailyReport(runNum, date);
  }
}
