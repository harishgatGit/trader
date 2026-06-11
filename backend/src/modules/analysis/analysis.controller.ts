import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalyzeDto } from './dto/analyze.dto';
import { AuthGuard, CurrentUser } from '../auth/auth.guard';
import { RoleGuard } from '../auth/role.guard';

@Controller('analyze')
@UseGuards(AuthGuard, RoleGuard)
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async analyze(@Body() dto: AnalyzeDto, @CurrentUser() user: any, @Req() req: any) {
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '';
    const ip = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '';
    return this.analysisService.analyze(dto.symbol, user, dto.bypassCache, ip);
  }
}

