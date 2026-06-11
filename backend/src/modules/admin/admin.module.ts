import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DataQualityService } from './data-quality.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, DataQualityService],
  exports: [AdminService, DataQualityService],
})
export class AdminModule {}
