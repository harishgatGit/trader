import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard } from '../auth/auth.guard';
import { RoleGuard, Roles } from '../auth/role.guard';

@Controller('reports')
@UseGuards(AuthGuard, RoleGuard)
@Roles('BASIC', 'PRO', 'MAX', 'ADMIN', 'SUPERUSER')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async getAll(
    @Query('symbol') symbol?: string,
    @Query('rating') rating?: string,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.getAll({ symbol, rating, limit: limit ? +limit : 20 });
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.reportsService.getById(id);
  }
}
