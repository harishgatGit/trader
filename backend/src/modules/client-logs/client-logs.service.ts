import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientLogDto } from './dto/client-log.dto';

@Injectable()
export class ClientLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async createLog(dto: ClientLogDto, userId?: string, username?: string) {
    const timestamp = dto.timestamp ? new Date(dto.timestamp) : new Date();
    
    return this.prisma.clientLog.create({
      data: {
        level: dto.level,
        message: dto.message,
        stack: dto.stack || null,
        url: dto.url || null,
        userAgent: dto.userAgent || null,
        userId: userId || null,
        username: username || null,
        timestamp,
      },
    });
  }

  async getClientLogs(limit: number = 200, level?: string) {
    return this.prisma.clientLog.findMany({
      where: level && level !== 'All' ? { level } : {},
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
