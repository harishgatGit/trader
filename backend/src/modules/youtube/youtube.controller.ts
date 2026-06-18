import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { YoutubeUploadService } from './youtube-upload.service';
import { AuthGuard } from '../auth/auth.guard';
import { RoleGuard } from '../auth/role.guard';

@Controller('youtube')
@UseGuards(AuthGuard, RoleGuard)
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeUploadService) {}

  /**
   * GET /api/youtube/stats
   * Returns a summary of YouTube upload statuses.
   */
  @Get('stats')
  async getStats() {
    return this.youtubeService.getUploadStats();
  }

  /**
   * POST /api/youtube/upload/:jobId
   * Manually trigger a YouTube upload for a specific video job.
   */
  @Post('upload/:jobId')
  async triggerUpload(@Param('jobId') jobId: string) {
    return this.youtubeService.triggerUploadForJob(jobId);
  }

  /**
   * POST /api/youtube/batch
   * Manually trigger the full batch scan (useful for testing).
   */
  @Post('batch')
  async runBatch() {
    await this.youtubeService.runBatch();
    return { success: true, message: 'Batch scan triggered' };
  }
}
