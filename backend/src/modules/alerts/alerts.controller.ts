import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto, UpdateAlertDto } from './dto/alert.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RoleGuard, Roles } from '../auth/role.guard';

@Controller('alerts')
@UseGuards(AuthGuard, RoleGuard)
@Roles('BASIC', 'PRO', 'MAX', 'ADMIN', 'SUPERUSER')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async getAll() {
    return this.alertsService.getAll();
  }

  @Get('events')
  async getEvents(@Query('limit') limit?: number) {
    return this.alertsService.getRecentEvents(limit ? +limit : 50);
  }

  @Post()
  async create(@Body() dto: CreateAlertDto) {
    return this.alertsService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAlertDto) {
    return this.alertsService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.alertsService.delete(id);
  }
}
