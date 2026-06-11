import { Module, Global } from '@nestjs/common';
import { MarketDataAgent } from './market-data.agent';
import { HistoricalDataAgent } from './historical-data.agent';
import { TechnicalAgent } from './technical.agent';
import { FundamentalAgent } from './fundamental.agent';
import { NewsAgent } from './news.agent';
import { InstitutionalFlowAgent } from './institutional-flow.agent';
import { OpenAIAnalystAgent } from './openai-analyst.agent';
import { DailyTrendAnalystAgent } from './daily-trend-analyst.agent';
import { TrendStoryAgent } from './trend-story.agent';
import { SignalCorrelationAgent } from './signal-correlation.agent';
import { AlertAgent } from './alert.agent';
import { DocumentBuilderAgent } from './document-builder.agent';
import { OrchestratorAgent } from './orchestrator.agent';
import { VideoScriptAgent } from './video-script.agent';
import { StoryboardAgent } from './storyboard.agent';
import { AlpacaService } from '../services/alpaca.service';

@Global()
@Module({
  providers: [
    AlpacaService,
    MarketDataAgent,
    HistoricalDataAgent,
    TechnicalAgent,
    FundamentalAgent,
    NewsAgent,
    InstitutionalFlowAgent,
    OpenAIAnalystAgent,
    DailyTrendAnalystAgent,
    TrendStoryAgent,
    SignalCorrelationAgent,
    AlertAgent,
    DocumentBuilderAgent,
    OrchestratorAgent,
    VideoScriptAgent,
    StoryboardAgent,
  ],
  exports: [
    AlpacaService,
    MarketDataAgent,
    HistoricalDataAgent,
    TechnicalAgent,
    FundamentalAgent,
    NewsAgent,
    InstitutionalFlowAgent,
    OpenAIAnalystAgent,
    DailyTrendAnalystAgent,
    TrendStoryAgent,
    SignalCorrelationAgent,
    AlertAgent,
    DocumentBuilderAgent,
    OrchestratorAgent,
    VideoScriptAgent,
    StoryboardAgent,
  ],
})
export class AgentsModule {}
