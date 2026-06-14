import { Module, Global } from '@nestjs/common';
import { VideoJobService } from './video-job.service';
import { VideoController, VideoCallbackController } from './video.controller';
import { VideoGenerationClient } from './video-generation.client';

@Global()
@Module({
  controllers: [VideoController, VideoCallbackController],
  providers: [VideoJobService, VideoGenerationClient],
  exports: [VideoJobService, VideoGenerationClient],
})
export class VideoModule {}
