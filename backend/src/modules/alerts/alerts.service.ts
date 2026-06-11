import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAlertDto, UpdateAlertDto } from './dto/alert.dto';
import { sanitizeSymbol } from '../../agents/orchestrator.agent';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlertsService {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('EMAIL_HOST'),
      port: parseInt(this.config.get('EMAIL_PORT', '587')),
      secure: false,
      auth: {
        user: this.config.get('EMAIL_USER'),
        pass: this.config.get('EMAIL_PASS'),
      },
    });
  }

  async getAll() {
    return this.prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        events: {
          orderBy: { triggeredAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  async create(dto: CreateAlertDto) {
    const symbol = sanitizeSymbol(dto.symbol);
    return this.prisma.alert.create({
      data: {
        symbol,
        name: dto.name || `${symbol} - ${dto.type}`,
        type: dto.type,
        value: dto.value || null,
        notifyEmail: dto.notifyEmail || false,
        notifyInApp: dto.notifyInApp !== false,
        emailAddress: dto.emailAddress || null,
      },
    });
  }

  async update(id: string, dto: UpdateAlertDto) {
    return this.prisma.alert.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    await this.prisma.alert.delete({ where: { id } });
    return { message: 'Alert deleted' };
  }

  async getRecentEvents(limit = 50) {
    return this.prisma.alertEvent.findMany({
      orderBy: { triggeredAt: 'desc' },
      take: limit,
      include: { alert: true },
    });
  }

  async sendEmailAlert(to: string, subject: string, message: string) {
    if (!this.config.get('EMAIL_USER')) return; // Skip if not configured

    try {
      await this.transporter.sendMail({
        from: this.config.get('EMAIL_FROM', 'AI Trader <noreply@trader.ai>'),
        to,
        subject,
        html: `
          <div style="font-family: Arial; padding: 20px; background: #1a1a1a; color: #fff; border-radius: 8px;">
            <h2 style="color: #00d4aa;">🤖 AI Stock Analyst Alert</h2>
            <p style="font-size: 16px;">${message}</p>
            <hr style="border-color: #333;">
            <p style="color: #888; font-size: 12px;">
              This is an automated alert from AI Stock Analyst.<br>
              Not financial advice.
            </p>
          </div>
        `,
      });
    } catch (e) {
      console.warn('Email send failed:', e.message);
    }
  }
}
