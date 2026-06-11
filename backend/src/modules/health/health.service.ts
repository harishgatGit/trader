import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const dbOk = await this.prisma.healthCheck();
    const redisOk = await this.checkRedis();

    return {
      status: dbOk && redisOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: dbOk ? 'connected' : 'error',
        redis: redisOk ? 'connected' : 'error',
      },
      environment: process.env.APP_ENV || 'local',
    };
  }

  private async checkRedis(): Promise<boolean> {
    let client: Redis | null = null;
    try {
      client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        connectTimeout: 3000,
        lazyConnect: true,
      });
      await client.connect();
      await client.ping();
      return true;
    } catch {
      return false;
    } finally {
      if (client) client.disconnect();
    }
  }
}
