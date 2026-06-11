import { Module } from '@nestjs/common';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';
import { AgentsModule } from '../../agents/agents.module';

@Module({
  imports: [AgentsModule],
  controllers: [StocksController],
  providers: [StocksService],
})
export class StocksModule {}
