import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RiskSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const settings = await this.prisma.riskSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    return settings || this.getDefaults();
  }

  async update(data: Partial<{
    maxPositionSizePct: number;
    maxLossPerTradePct: number;
    minRiskReward: number;
    requireStopLoss: boolean;
    blockDuplicateWindow: number;
    maxDailyOrders: number;
    maxTotalCapitalDeployed: number;
    maxConcurrentOpenPositions: number;
  }>) {
    const existing = await this.prisma.riskSetting.findFirst();

    if (existing) {
      return this.prisma.riskSetting.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.riskSetting.create({
      data: { ...this.getDefaults(), ...data },
    });
  }

  private getDefaults() {
    return {
      maxPositionSizePct: 5,
      maxLossPerTradePct: 2,
      minRiskReward: 1.5,
      requireStopLoss: true,
      blockDuplicateWindow: 24,
      paperTradingOnly: true,
      maxDailyOrders: 10,
      kellyFractionCap: 0.25,
      monteCarloMinTrades: 30,
      graduationMinClosedTrades: 20,
      graduationMinSharpe: 1.0,
      graduationMinWinRatePct: 45,
      graduationMinExpectancyR: 0,
      maxTotalCapitalDeployed: 1000,
      maxConcurrentOpenPositions: 6,
    };
  }
}
