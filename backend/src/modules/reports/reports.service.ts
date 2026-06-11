import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { sanitizeSymbol } from '../../agents/orchestrator.agent';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(params: { symbol?: string; rating?: string; limit: number }) {
    const where: any = {};
    if (params.symbol) where.symbol = sanitizeSymbol(params.symbol);
    if (params.rating) where.finalRating = params.rating.toUpperCase();

    return this.prisma.agentReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit,
      select: {
        id: true, symbol: true, finalRating: true,
        confidenceScore: true, currentPrice: true,
        technicalScore: true, fundamentalScore: true,
        institutionalFlowProxyScore: true,
        executiveSummary: true, createdAt: true,
        openaiModel: true, processingTime: true, status: true,
      },
    });
  }

  async getById(id: string) {
    const report = await this.prisma.agentReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }
}
