import { Module, Global } from '@nestjs/common';
import { VideoJobService } from './video-job.service';
import { VoiceAnimationGenerator } from './voice-animation-generator.service';
import { VideoController, VideoCallbackController } from './video.controller';
import { VideoGenerationClient } from './video-generation.client';

@Global()
@Module({
  controllers: [VideoController, VideoCallbackController],
  providers: [VideoJobService, VoiceAnimationGenerator, VideoGenerationClient],
  exports: [VideoJobService, VoiceAnimationGenerator, VideoGenerationClient],
})
export class VideoModule {}
