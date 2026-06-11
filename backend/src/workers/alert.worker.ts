import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataAgent } from '../agents/market-data.agent';
import { TechnicalAgent } from '../agents/technical.agent';
import { AlertAgent } from '../agents/alert.agent';
import { AlertsService } from '../modules/alerts/alerts.service';
import { HistoricalDataAgent } from '../agents/historical-data.agent';

@Injectable()
export class AlertWorker {
  private readonly logger = new Logger(AlertWorker.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataAgent: MarketDataAgent,
    private readonly historicalDataAgent: HistoricalDataAgent,
    private readonly technicalAgent: TechnicalAgent,
    private readonly alertAgent: AlertAgent,
    private readonly alertsService: AlertsService,
  ) {}

  // Run every 5 minutes during market hours
  @Cron('*/5 * * * *')
  async checkAlerts() {
    if (this.isRunning) {
      this.logger.debug('Alert check already running, skipping');
      return;
    }

    this.isRunning = true;
    try {
      // Get all enabled alerts with unique symbols
      const alerts = await this.prisma.alert.findMany({
        where: { enabled: true },
        select: { symbol: true },
        distinct: ['symbol'],
      });

      if (alerts.length === 0) return;

      this.logger.debug(`Checking alerts for ${alerts.length} symbols`);

      for (const { symbol } of alerts) {
        try {
          const marketData = await this.marketDataAgent.run(symbol);
          const historicalData = await this.historicalDataAgent.run(symbol);
          const technicals = await this.technicalAgent.run(symbol, historicalData);

          const triggered = await this.alertAgent.checkAlerts(
            symbol,
            marketData,
            technicals.primary?.rsi14,
            technicals.primary?.macdHist,
            technicals.primary?.macdSignal,
            undefined,
          );

          // Send email for triggered alerts that have email enabled
          for (const t of triggered) {
            const alert = await this.prisma.alert.findUnique({ where: { id: t.alertId } });
            if (alert?.notifyEmail && alert?.emailAddress) {
              await this.alertsService.sendEmailAlert(
                alert.emailAddress,
                `Alert: ${symbol} — ${alert.name || alert.type}`,
                t.message,
              );
            }
          }

          if (triggered.length > 0) {
            this.logger.log(`${triggered.length} alerts triggered for ${symbol}`);
          }
        } catch (e) {
          this.logger.warn(`Alert check failed for ${symbol}: ${e.message}`);
        }
      }
    } finally {
      this.isRunning = false;
    }
  }
}
