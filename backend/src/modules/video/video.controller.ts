import { Controller, Post, Get, Param, Body, Headers, Res, HttpCode, HttpStatus, UnauthorizedException, NotFoundException, BadRequestException, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { VideoJobService } from './video-job.service';
import { VideoGenerationClient } from './video-generation.client';
import { AuthGuard } from '../auth/auth.guard';
import { RoleGuard } from '../auth/role.guard';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class VideoCallbackController {
  constructor(private readonly videoJobService: VideoJobService) {}

  /**
   * Private server-to-server callback from Python microservice.
   * Secured by x-api-key.
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
   * Triggers retry for a failed video job.
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

    // Set job back to PENDING first in local database
    await this.videoJobService.createOrResetJob(job.ticker, job.reportDate, job.reportId, true);

    // Call Python microservice retry endpoint
    const response = await this.videoClient.retryVideoJob(jobId);

    // Save returned jobId back to database if changed
    await this.videoJobService.updateJobCallback({
      jobId: response.jobId || jobId,
      ticker: job.ticker,
      reportDate: job.reportDate,
      status: response.status || 'PENDING',
      artifacts: response.artifacts || {},
    });

    return response;
  }
}
