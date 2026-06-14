import { Controller, Post, Get, Param, Body, Headers, Res, HttpCode, HttpStatus, UnauthorizedException, NotFoundException, BadRequestException, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { VideoJobService } from './video-job.service';
import { VideoGenerationClient } from './video-generation.client';
import { AuthGuard } from '../auth/auth.guard';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class VideoCallbackController {
  constructor(private readonly videoJobService: VideoJobService) {}

  /**
   * Private server-to-server callback from Python video agent service.
   * Secured by x-api-key. Updates the local DB mirror with latest job status.
   */
  @Post('video-callback') // Maps to /api/video-callback
  @HttpCode(HttpStatus.OK)
  async handleCallback(
    @Body() payload: any,
    @Headers('x-api-key') apiKey: string,
  ) {
    const configuredKey = process.env.CURRENT_APP_CALLBACK_API_KEY || 'your-key';
    if (!apiKey || apiKey !== configuredKey) {
      throw new UnauthorizedException('Invalid callback API key');
    }

    await this.videoJobService.updateJobCallback(payload);
    return { success: true };
  }
}

@Controller('video-jobs')
export class VideoController {
  constructor(
    private readonly videoJobService: VideoJobService,
    private readonly videoClient: VideoGenerationClient,
  ) {}

  /**
   * Fetches latest video job status for a symbol and date.
   */
  @Get('ticker/:ticker/:date')
  @UseGuards(AuthGuard)
  async getJobStatus(
    @Param('ticker') ticker: string,
    @Param('date') date: string,
  ) {
    const job = await this.videoJobService.getJobByTickerAndDate(ticker, date);
    if (!job) {
      throw new NotFoundException(`No video job found for ${ticker} on ${date}`);
    }
    return job;
  }

  /**
   * Streams the generated MP4 file from disk.
   */
  @Get(':jobId/video')
  async streamVideo(
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    const job = await this.videoJobService.getJobById(jobId);
    if (!job || !job.finalVideoPath) {
      throw new NotFoundException('Video job not found or final video path is empty');
    }

    const resolvedPath = path.resolve(job.finalVideoPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new NotFoundException('Video file not found on disk');
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'inline; filename="report-video.mp4"');
    res.sendFile(resolvedPath);
  }

  /**
   * Triggers a retry for a failed/errored video job via the Python video agent service.
   */
  @Post(':jobId/retry')
  @UseGuards(AuthGuard)
  async retryJob(@Param('jobId') jobId: string) {
    if (process.env.DISABLE_VIDEO_PIPELINE === 'true') {
      throw new BadRequestException('Video generation pipeline is currently disabled.');
    }

    const job = await this.videoJobService.getJobById(jobId);
    if (!job) {
      throw new NotFoundException(`Video job ${jobId} not found`);
    }

    // Forward retry to Python video agent service
    const response = await this.videoClient.retryVideoJob(jobId);

    // Update local DB with response status
    await this.videoJobService.updateJobCallback({
      jobId: response.jobId || jobId,
      ticker: job.ticker,
      reportDate: job.reportDate,
      status: response.status || 'QUEUED',
      artifacts: response.artifacts || {},
    });

    return response;
  }
}
