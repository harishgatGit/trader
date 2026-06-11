import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VideoJobService {
  private readonly logger = new Logger(VideoJobService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks if a completed successful video exists for this symbol and date.
   */
  async shouldGenerateVideo(ticker: string, dateStr: string, forceRegenerate = false): Promise<boolean> {
    if (process.env.DISABLE_VIDEO_PIPELINE === 'true') {
      this.logger.log(`Video pipeline is disabled via environment configuration (DISABLE_VIDEO_PIPELINE=true). Skipping video generation for ${ticker}.`);
      return false;
    }
    if (forceRegenerate) return true;

    const uppercaseTicker = ticker.toUpperCase();
    const job = await this.prisma.videoGenerationJob.findUnique({
      where: {
        ticker_reportDate: {
          ticker: uppercaseTicker,
          reportDate: dateStr,
        },
      },
    });

    if (job) {
      if (job.status === 'COMPLETED' && job.finalVideoPath) {
        if (fs.existsSync(job.finalVideoPath)) {
          return false; // Successful video exists
        }
      }
      if (job.status === 'PROCESSING' || job.status === 'PENDING') {
        return false; // Already working on it
      }
    }

    return true;
  }

  /**
   * Creates or resets a video job in the database.
   */
  async createOrResetJob(ticker: string, dateStr: string, reportId: string, forceRegenerate = false): Promise<any> {
    const uppercaseTicker = ticker.toUpperCase();
    
    // Check if job already exists
    const existing = await this.prisma.videoGenerationJob.findUnique({
      where: {
        ticker_reportDate: {
          ticker: uppercaseTicker,
          reportDate: dateStr,
        },
      },
    });

    if (existing) {
      // If we are force regenerating or if the previous job failed, reset it
      if (forceRegenerate || existing.status === 'FAILED') {
        this.logger.log(`Resetting existing video job for ${uppercaseTicker} on ${dateStr} for retry/regeneration.`);
        return await this.prisma.videoGenerationJob.update({
          where: { id: existing.id },
          data: {
            status: 'PENDING',
            reportId,
            errorMessage: null,
            completedAt: null,
            forceRegenerate,
            updatedAt: new Date(),
          },
        });
      }
      return existing;
    }

    // Otherwise, create a new one
    try {
      return await this.prisma.videoGenerationJob.create({
        data: {
          ticker: uppercaseTicker,
          reportDate: dateStr,
          reportId,
          status: 'PENDING',
          forceRegenerate,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        // Parallel execution safety
        return await this.prisma.videoGenerationJob.findUnique({
          where: {
            ticker_reportDate: {
              ticker: uppercaseTicker,
              reportDate: dateStr,
            },
          },
        });
      }
      throw err;
    }
  }

  async getJobById(jobId: string): Promise<any> {
    return await this.prisma.videoGenerationJob.findUnique({
      where: { jobId },
    });
  }

  async getJobByTickerAndDate(ticker: string, dateStr: string): Promise<any> {
    return await this.prisma.videoGenerationJob.findUnique({
      where: {
        ticker_reportDate: {
          ticker: ticker.toUpperCase(),
          reportDate: dateStr,
        },
      },
    });
  }

  async updateJobCallback(payload: {
    jobId: string;
    reportId?: string;
    ticker: string;
    reportDate: string;
    status: string;
    videoUrl?: string;
    artifacts: {
      sourceReport?: string;
      normalizedInput?: string;
      script?: string;
      storyboard?: string;
      audio?: string;
      ffprobe?: string;
      validation?: string;
      finalVideo?: string;
    };
    errorMessage?: string;
  }): Promise<void> {
    const uppercaseTicker = payload.ticker.toUpperCase();
    
    // Find job by jobId first, fallback to ticker + date
    let job = await this.prisma.videoGenerationJob.findUnique({
      where: { jobId: payload.jobId },
    });

    if (!job) {
      job = await this.prisma.videoGenerationJob.findUnique({
        where: {
          ticker_reportDate: {
            ticker: uppercaseTicker,
            reportDate: payload.reportDate,
          },
        },
      });
    }

    if (!job) {
      this.logger.warn(`Callback received for unknown job: ${payload.jobId} (${uppercaseTicker}/${payload.reportDate})`);
      return;
    }

    // Update job
    await this.prisma.videoGenerationJob.update({
      where: { id: job.id },
      data: {
        jobId: payload.jobId,
        status: payload.status,
        videoUrl: payload.videoUrl || null,
        sourceReportPath: payload.artifacts?.sourceReport || null,
        normalizedInputPath: payload.artifacts?.normalizedInput || null,
        scriptPath: payload.artifacts?.script || null,
        storyboardPath: payload.artifacts?.storyboard || null,
        audioPath: payload.artifacts?.audio || null,
        finalVideoPath: payload.artifacts?.finalVideo || null,
        validationPath: payload.artifacts?.validation || null,
        errorMessage: payload.errorMessage || null,
        completedAt: payload.status === 'COMPLETED' || payload.status === 'FAILED' ? new Date() : null,
      },
    });

    this.logger.log(`Successfully updated video job ${job.id} state to ${payload.status}`);
  }
}
