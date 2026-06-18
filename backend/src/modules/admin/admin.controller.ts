import { Controller, Get, Post, Patch, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { DataQualityService } from './data-quality.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RoleGuard, Roles } from '../auth/role.guard';

@Controller('admin')
@UseGuards(AuthGuard, RoleGuard)
@Roles('SUPERUSER')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly dataQualityService: DataQualityService,
  ) {}

  @Get('users')
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Get('analytics')
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  // ── Data Quality Endpoints ─────────────────────────────────────

  @Get('data-quality/probe')
  async probeSymbol(@Query('symbol') symbol: string) {
    if (!symbol) return { error: 'symbol query param is required' };
    return this.dataQualityService.probeSymbol(symbol.toUpperCase().trim());
  }

  @Get('data-quality/consistency')
  async getConsistency() {
    return this.dataQualityService.getHistoricalConsistency();
  }

  @Get('data-quality/gaps')
  async getDataGaps() {
    return this.dataQualityService.getDataGapReport();
  }

  @Get('feedback')
  async getFeedback() {
    return this.adminService.getFeedback();
  }

  @Patch('users/:id/status')
  async toggleUserStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.adminService.toggleUserStatus(id, isActive);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}
