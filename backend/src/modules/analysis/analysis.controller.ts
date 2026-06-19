import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalyzeDto } from './dto/analyze.dto';
import { AuthGuard, CurrentUser } from '../auth/auth.guard';
import { RoleGuard } from '../auth/role.guard';

@Controller('analyze')
@UseGuards(AuthGuard, RoleGuard)
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  /**
   * POST /analyze
   * Immediately returns { jobId, status: 'queued' }.
   * The actual analysis runs in the background — client must poll GET /analyze/status/:jobId.
   * This prevents Cloudflare's 120s proxy timeout (Error 524).
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async analyze(@Body() dto: AnalyzeDto, @CurrentUser() user: any, @Req() req: any) {
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '';
    const ip = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '';
    return this.analysisService.enqueueAnalysis(dto.symbol, user, dto.bypassCache, ip);
  }

  /**
   * GET /analyze/status/:jobId
   * Returns current job status, live progress steps, and full result when done.
   */
  @Get('status/:jobId')
  async getStatus(@Param('jobId') jobId: string) {
    const job = this.analysisService.getJob(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    return job;
  }
}
