import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigStatusService } from './config-status.service';
import { AuthGuard } from '../auth/auth.guard';
import { RoleGuard, Roles } from '../auth/role.guard';

@Controller('config/status')
@UseGuards(AuthGuard, RoleGuard)
@Roles('SUPERUSER')
export class ConfigStatusController {
  constructor(private readonly configStatusService: ConfigStatusService) {}

  @Get()
  async getStatus() {
    return this.configStatusService.getStatus();
  }
}
