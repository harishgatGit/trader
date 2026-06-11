import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { VideoGenerationClient } from '../modules/video/video-generation.client';
import { VideoJobService } from '../modules/video/video-job.service';

@Injectable()
export class VideoQueueWorker {
  private readonly logger = new Logger(VideoQueueWorker.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly videoClient: VideoGenerationClient,
    private readonly videoJobService: VideoJobService,
  ) {}

  // Process the video generation queue every 15 seconds
  @Cron('*/15 * * * * *')
  async processQueue() {
    if (this.isProcessing) {
      this.logger.debug('Video queue worker already running, skipping');
      return;
    }

    if (process.env.DISABLE_VIDEO_PIPELINE === 'true') {
      this.logger.debug('Video pipeline is disabled globally. Skipping queue processing.');
      return;
    }

    this.isProcessing = true;
    try {
      // 1. Fetch all PENDING video generation jobs ordered by creation time
      const pendingJobs = await this.prisma.videoGenerationJob.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });

      if (pendingJobs.length === 0) {
        return;
      }

      this.logger.log(`Found ${pendingJobs.length} pending video jobs in queue.`);

      for (const job of pendingJobs) {
        const uppercaseTicker = job.ticker.toUpperCase();
        const dateStr = job.reportDate;

        // 2. Prevent duplication: check if a completed or active processing job already exists for this symbol and date
        const activeOrCompletedJob = await this.prisma.videoGenerationJob.findFirst({
          where: {
            ticker: uppercaseTicker,
            reportDate: dateStr,
            id: { not: job.id },
            status: { in: ['COMPLETED', 'PROCESSING', 'REPORT_RECEIVED', 'SCRIPT_GENERATED', 'STORYBOARD_GENERATED', 'VOICEOVER_GENERATED', 'ANIMATION_RENDERED', 'MP4_EXPORTED'] },
          },
        });

        if (activeOrCompletedJob) {
          this.logger.log(`Duplicate job detected for ${uppercaseTicker} on ${dateStr}. Rejecting pending job.`);
          await this.prisma.videoGenerationJob.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              errorMessage: 'Rejected by queue: duplicate video exists or is currently processing for this symbol/date.',
              completedAt: new Date(),
            },
          });
          continue;
        }

        // 3. Queue selection criteria with randomness:
        // Currently, we have a basic selection criteria:
        // - We roll a random number (80% chance to accept, 20% chance to reject).
        // - Going forward, we can improve these criteria (e.g. priority based, rating based, etc.)
        const randomRoll = Math.random();
        const acceptanceThreshold = 0.8; // 80% chance to run

        if (randomRoll > acceptanceThreshold) {
          this.logger.warn(`Job for ${uppercaseTicker} on ${dateStr} rejected by queue random selection filter (Roll: ${randomRoll.toFixed(2)} > ${acceptanceThreshold}).`);
          await this.prisma.videoGenerationJob.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              errorMessage: `Rejected by queue selection criteria filter (random selection).`,
              completedAt: new Date(),
            },
          });
          continue;
        }

        // 4. Retrieve associated AgentReport to get the report JSON
        if (!job.reportId) {
          this.logger.error(`Pending job ${job.id} for ${uppercaseTicker} has no associated reportId. Rejecting.`);
          await this.prisma.videoGenerationJob.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              errorMessage: 'Rejected by queue: no associated reportId found.',
              completedAt: new Date(),
            },
          });
          continue;
        }

        const report = await this.prisma.agentReport.findUnique({
          where: { id: job.reportId },
        });

        if (!report) {
          this.logger.error(`AgentReport ${job.reportId} not found in database. Rejecting.`);
          await this.prisma.videoGenerationJob.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              errorMessage: `Rejected by queue: AgentReport ${job.reportId} was not found.`,
              completedAt: new Date(),
            },
          });
          continue;
        }

        // 5. Trigger the Python video generation microservice (fire-and-forget request from queue worker)
        this.logger.log(`Queue worker accepted job for ${uppercaseTicker} on ${dateStr}. Triggering Python service...`);
        try {
          const jobResponse = await this.videoClient.triggerVideoJob({
            ticker: uppercaseTicker,
            reportDate: dateStr,
            reportId: job.reportId,
            reportJson: report.reportJson,
            outputFolder: `/outputs/videos/${dateStr}/${uppercaseTicker}`,
            forceRegenerate: job.forceRegenerate,
          });

          // 6. Update database state with returned microservice jobId and status
          await this.videoJobService.updateJobCallback({
            jobId: jobResponse.jobId,
            ticker: uppercaseTicker,
            reportDate: dateStr,
            status: jobResponse.status,
            artifacts: jobResponse.artifacts || {},
          });

          this.logger.log(`Queue job successfully triggered for ${uppercaseTicker} on ${dateStr}. Microservice jobId: ${jobResponse.jobId}`);
        } catch (err: any) {
          this.logger.error(`Failed to trigger microservice for queue job ${job.id}: ${err.message}`);
          await this.prisma.videoGenerationJob.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              errorMessage: `Failed to trigger Python microservice: ${err.message}`,
              completedAt: new Date(),
            },
          });
        }
      }
    } catch (err: any) {
      this.logger.error(`Error in VideoQueueWorker: ${err.message}`, err.stack);
    } finally {
      this.isProcessing = false;
    }
  }
}
