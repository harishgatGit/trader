import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VideoGenerationClient } from './video-generation.client';

@Injectable()
export class VideoJobService {
  private readonly logger = new Logger(VideoJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly videoClient: VideoGenerationClient,
  ) {}

  /**
   * Fire-and-forget: logs the video request to DB (status=RECEIVED) then
   * calls the Python video agent service without blocking the caller.
   * Backend analysis result is never delayed or failed by video service issues.
   */
  async fireAndForget(
    ticker: string,
    reportDate: string,
    reportId: string,
    reportJson: any,
    forceRegenerate = false,
  ): Promise<void> {
    if (process.env.DISABLE_VIDEO_PIPELINE === 'true') {
      this.logger.log(`Video pipeline disabled (DISABLE_VIDEO_PIPELINE=true). Skipping for ${ticker}.`);
      return;
    }

    const uppercaseTicker = ticker.toUpperCase();

    // 1. Log to DB with RECEIVED status (upsert: reset if FAILED, otherwise skip)
    let job: any;
    try {
      const existing = await this.prisma.videoGenerationJob.findUnique({
        where: { ticker_reportDate: { ticker: uppercaseTicker, reportDate } },
      });

      if (existing) {
        if (!forceRegenerate && existing.status !== 'ERROR' && existing.status !== 'FAILED') {
          this.logger.log(`Video job for ${uppercaseTicker}/${reportDate} already in state ${existing.status}. Skipping.`);
          return;
        }
        // Reset for retry/force regenerate
        job = await this.prisma.videoGenerationJob.update({
          where: { id: existing.id },
          data: {
            status: 'RECEIVED',
            reportId,
            eligibilityNote: null,
            errorMessage: null,
            completedAt: null,
            forceRegenerate,
            updatedAt: new Date(),
          },
        });
        this.logger.log(`Reset video job for ${uppercaseTicker}/${reportDate} to RECEIVED.`);
      } else {
        job = await this.prisma.videoGenerationJob.create({
          data: {
            ticker: uppercaseTicker,
            reportDate,
            reportId,
            status: 'RECEIVED',
            forceRegenerate,
          },
        });
        this.logger.log(`Created video job for ${uppercaseTicker}/${reportDate} with status RECEIVED.`);
      }
    } catch (dbErr: any) {
      if (dbErr.code === 'P2002') {
        // Race condition: another process created it — that's fine, skip
        this.logger.warn(`Video job for ${uppercaseTicker}/${reportDate} already created by parallel process. Skipping.`);
        return;
      }
      this.logger.error(`Failed to log video job to DB for ${uppercaseTicker}: ${dbErr.message}`);
      return; // Don't let DB error propagate to analysis result
    }

    // 2. Fire-and-forget HTTP call to Python video agent service (do NOT await)
    this.videoClient.triggerVideoJobFireAndForget({
      ticker: uppercaseTicker,
      reportDate,
      reportId,
      reportJson,
      forceRegenerate,
    });
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

  /**
   * Called by the Python video agent service callback to update job status.
   */
  async updateJobCallback(payload: {
    jobId: string;
    reportId?: string;
    ticker: string;
    reportDate: string;
    status: string;
    videoUrl?: string;
    eligibilityNote?: string;
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

    const isTerminal = ['NOT_ELIGIBLE', 'GENERATED', 'ERROR', 'COMPLETED', 'FAILED'].includes(payload.status);

    await this.prisma.videoGenerationJob.update({
      where: { id: job.id },
      data: {
        jobId: payload.jobId,
        status: payload.status,
        videoUrl: payload.videoUrl || null,
        eligibilityNote: payload.eligibilityNote || null,
        sourceReportPath: payload.artifacts?.sourceReport || null,
        normalizedInputPath: payload.artifacts?.normalizedInput || null,
        scriptPath: payload.artifacts?.script || null,
        storyboardPath: payload.artifacts?.storyboard || null,
        audioPath: payload.artifacts?.audio || null,
        finalVideoPath: payload.artifacts?.finalVideo || null,
        validationPath: payload.artifacts?.validation || null,
        errorMessage: payload.errorMessage || null,
        completedAt: isTerminal ? new Date() : null,
      },
    });

    this.logger.log(`Updated video job ${job.id} → ${payload.status}`);
  }
}
