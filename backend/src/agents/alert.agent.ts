import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataResult } from './market-data.agent';

export interface AlertCheckResult {
  triggered: boolean;
  alertId: string;
  message: string;
  value: number | null;
}

@Injectable()
export class AlertAgent {
  private readonly logger = new Logger(AlertAgent.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkAlerts(
    symbol: string,
    marketData: MarketDataResult,
    rsi?: number,
    macdHist?: number,
    macdSignal?: number,
    signal?: string,
  ): Promise<AlertCheckResult[]> {
    const alerts = await this.prisma.alert.findMany({
      where: { symbol, enabled: true },
    });

    const triggered: AlertCheckResult[] = [];
    const price = marketData.price;

    for (const alert of alerts) {
      let isTriggered = false;
      let message = '';
      let value: number | null = null;

      switch (alert.type) {
        case 'price_above':
          if (price != null && alert.value != null && price >= alert.value) {
            isTriggered = true;
            message = `${symbol} price $${price.toFixed(2)} crossed above $${alert.value}`;
            value = price;
          }
          break;

        case 'price_below':
          if (price != null && alert.value != null && price <= alert.value) {
            isTriggered = true;
            message = `${symbol} price $${price.toFixed(2)} dropped below $${alert.value}`;
            value = price;
          }
          break;

        case 'rsi_above':
          if (rsi != null && alert.value != null && rsi >= alert.value) {
            isTriggered = true;
            message = `${symbol} RSI ${rsi.toFixed(1)} crossed above ${alert.value}`;
            value = rsi;
          }
          break;

        case 'rsi_below':
          if (rsi != null && alert.value != null && rsi <= alert.value) {
            isTriggered = true;
            message = `${symbol} RSI ${rsi.toFixed(1)} dropped below ${alert.value}`;
            value = rsi;
          }
          break;

        case 'macd_bullish':
          if (macdHist != null && macdHist > 0 && (macdSignal == null || macdHist > macdSignal)) {
            isTriggered = true;
            message = `${symbol} MACD bullish crossover detected`;
            value = macdHist;
          }
          break;

        case 'macd_bearish':
          if (macdHist != null && macdHist < 0) {
            isTriggered = true;
            message = `${symbol} MACD bearish crossover detected`;
            value = macdHist;
          }
          break;

        case 'signal_buy':
          if (signal === 'BUY') {
            isTriggered = true;
            message = `${symbol} AI signal changed to BUY`;
            value = price;
          }
          break;

        case 'signal_sell':
          if (signal === 'SELL') {
            isTriggered = true;
            message = `${symbol} AI signal changed to SELL`;
            value = price;
          }
          break;

        case 'stop_loss_hit':
          if (price != null && alert.value != null && price <= alert.value) {
            isTriggered = true;
            message = `⚠️ ${symbol} hit stop loss at $${alert.value}! Current: $${price.toFixed(2)}`;
            value = price;
          }
          break;

        case 'target_hit':
          if (price != null && alert.value != null && price >= alert.value) {
            isTriggered = true;
            message = `🎯 ${symbol} reached target at $${alert.value}! Current: $${price.toFixed(2)}`;
            value = price;
          }
          break;
      }

      if (isTriggered) {
        // Record event
        await this.prisma.alertEvent.create({
          data: {
            alertId: alert.id,
            symbol,
            message,
            value,
          },
        });

        // Update alert trigger count
        await this.prisma.alert.update({
          where: { id: alert.id },
          data: {
            lastTriggered: new Date(),
            lastChecked: new Date(),
            triggerCount: { increment: 1 },
          },
        });

        triggered.push({ triggered: true, alertId: alert.id, message, value });
      } else {
        await this.prisma.alert.update({
          where: { id: alert.id },
          data: { lastChecked: new Date() },
        });
      }
    }

    return triggered;
  }
}
