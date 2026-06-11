import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createReport(userId: string, classification: string, summary: string) {
    this.logger.log(`User ${userId} reporting problem: [${classification}]`);
    return this.prisma.problemReport.create({
      data: {
        userId,
        classification,
        summary,
      },
    });
  }
}
