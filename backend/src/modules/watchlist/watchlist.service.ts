import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { sanitizeSymbol } from '../../agents/orchestrator.agent';

@Injectable()
export class WatchlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.watchlist.findMany({
      orderBy: { addedAt: 'desc' },
    });
  }

  async add(rawSymbol: string) {
    const symbol = sanitizeSymbol(rawSymbol);
    const existing = await this.prisma.watchlist.findUnique({ where: { symbol } });
    if (existing) throw new ConflictException(`${symbol} is already in watchlist`);

    return this.prisma.watchlist.create({ data: { symbol } });
  }

  async remove(rawSymbol: string) {
    const symbol = sanitizeSymbol(rawSymbol);
    const existing = await this.prisma.watchlist.findUnique({ where: { symbol } });
    if (!existing) throw new NotFoundException(`${symbol} not found in watchlist`);

    await this.prisma.watchlist.delete({ where: { symbol } });
    return { message: `${symbol} removed from watchlist` };
  }
}
