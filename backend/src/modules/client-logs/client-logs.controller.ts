import { Controller, Post, Get, Body, Req, Query, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ClientLogsService } from './client-logs.service';
import { ClientLogDto } from './dto/client-log.dto';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';
import { RoleGuard, Roles } from '../auth/role.guard';

@Controller('client-logs')
export class ClientLogsController {
  constructor(
    private readonly clientLogsService: ClientLogsService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  async logClientEvent(@Req() req: Request, @Body() dto: ClientLogDto) {
    let userId: string | undefined;
    let username: string | undefined;

    // Manually parse Authorization header if present.
    // We do NOT use AuthGuard here because if the token is expired/invalid,
    // we want to still successfully accept and save the log (anonymously)
    // rather than rejecting it with a 401 (which could cause a redirect loop).
    const authHeader = req.headers['authorization'];
    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts[0] === 'Bearer' && parts[1]) {
        try {
          const sessionUser = await this.authService.validateSession(parts[1]);
          if (sessionUser) {
            userId = sessionUser.id;
            username = sessionUser.username;
          }
        } catch (err) {
          // Suppress error so that logging continues
        }
      }
    }

    return this.clientLogsService.createLog(dto, userId, username);
  }

  @Get('admin')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('SUPERUSER')
  async getLogsAdmin(
    @Query('limit') limit?: number,
    @Query('level') level?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 200;
    return this.clientLogsService.getClientLogs(parsedLimit, level);
  }
}
