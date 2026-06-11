import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClientLogsController } from './client-logs.controller';
import { ClientLogsService } from './client-logs.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClientLogsController],
  providers: [ClientLogsService],
  exports: [ClientLogsService],
})
export class ClientLogsModule {}
