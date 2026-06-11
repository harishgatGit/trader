import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { AuthGuard } from '../auth/auth.guard';
import { RoleGuard } from '../auth/role.guard';

@Controller('stocks')
@UseGuards(AuthGuard, RoleGuard)
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get('search')
  async search(@Query('q') query: string) {
    return this.stocksService.searchAssets(query);
  }

  @Get(':symbol/report/latest')
  async getLatestReport(@Param('symbol') symbol: string) {
    return this.stocksService.getLatestReport(symbol);
  }

  @Get(':symbol/reports')
  async getReports(@Param('symbol') symbol: string) {
    return this.stocksService.getReports(symbol);
  }

  @Get(':symbol/market-data')
  async getMarketData(@Param('symbol') symbol: string) {
    return this.stocksService.getMarketData(symbol);
  }

  @Get(':symbol/technicals')
  async getTechnicals(@Param('symbol') symbol: string) {
    return this.stocksService.getTechnicals(symbol);
  }
}
