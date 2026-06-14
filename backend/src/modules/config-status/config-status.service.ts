import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlpacaService } from '../../services/alpaca.service';
import { PrismaService } from '../../prisma/prisma.service';
import OpenAI from 'openai';

@Injectable()
export class ConfigStatusService {
  constructor(
    private readonly config: ConfigService,
    private readonly alpaca: AlpacaService,
    private readonly prisma: PrismaService,
  ) {}

  async getStatus() {
    const [alpacaStatus, openaiStatus, dbSettings] = await Promise.all([
      this.checkAlpaca(),
      this.checkOpenAI(),
      this.prisma.riskSetting.findFirst({
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      timestamp: new Date().toISOString(),
      services: {
        openai: openaiStatus,
        alpacaData: alpacaStatus.data,
        database: { status: 'connected', note: 'PostgreSQL via Prisma' },
      },
      config: {
        openaiModel: this.config.get('OPENAI_MODEL', 'gpt-4o'),
        alpacaDataBaseUrl: this.config.get('ALPACA_DATA_BASE_URL'),
        maxPositionSizePct: dbSettings?.maxPositionSizePct ?? parseFloat(this.config.get('MAX_POSITION_SIZE_PERCENT', '5')),
        maxLossPerTradePct: dbSettings?.maxLossPerTradePct ?? parseFloat(this.config.get('MAX_LOSS_PER_TRADE_PERCENT', '2')),
        minRiskReward: dbSettings?.minRiskReward ?? parseFloat(this.config.get('MIN_RISK_REWARD', '1.5')),
        emailConfigured: !!this.config.get('EMAIL_USER'),
      },
    };
  }

  private async checkAlpaca() {
    try {
      const start = Date.now();
      const connected = await this.alpaca.isConnected();
      const latency = Date.now() - start;
      return {
        data: { status: connected.data ? 'connected' : 'error', latencyMs: latency },
      };
    } catch {
      return {
        data: { status: 'error', message: 'Connection failed' },
      };
    }
  }

  private async checkOpenAI() {
    const apiKey = this.config.get('OPENAI_API_KEY');
    if (!apiKey || apiKey === 'sk-...') {
      return { status: 'unconfigured', message: 'OPENAI_API_KEY not set' };
    }

    try {
      const start = Date.now();
      const client = new OpenAI({ apiKey });
      await client.models.list();
      return { status: 'connected', latencyMs: Date.now() - start };
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  }
}
