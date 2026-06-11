import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { IsString, IsNotEmpty, Length, IsIn } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth.guard';

class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  @IsIn([
    'Incorrect data',
    'Data not available',
    'Fetching old data',
    'Good to have',
    'Must have',
  ])
  classification: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 4000)
  summary: string;
}

@Controller('feedback')
@UseGuards(AuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async submitReport(@CurrentUser() user: any, @Body() dto: CreateReportDto) {
    return this.feedbackService.createReport(
      user.id,
      dto.classification,
      dto.summary,
    );
  }
}
