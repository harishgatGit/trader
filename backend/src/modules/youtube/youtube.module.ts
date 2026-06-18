import { Module } from '@nestjs/common';
import { YoutubeUploadService } from './youtube-upload.service';
import { YoutubeController } from './youtube.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [YoutubeUploadService],
  controllers: [YoutubeController],
  exports: [YoutubeUploadService],
})
export class YoutubeModule {}
