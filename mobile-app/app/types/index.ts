export type UserRole = 'BASIC' | 'PRO' | 'MAX' | 'ADMIN' | 'SUPERUSER';

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  addedAt: string;
  lastAnalyzedAt: string | null;
  latestRating: string | null; // BUY, HOLD, SELL, WATCHLIST, AVOID
  latestPrice: number | null;
  latestSignal: string | null;
  notes: string | null;
}

export interface Alert {
  id: string;
  symbol: string;
  name: string | null;
  type: 
    | 'price_above'
    | 'price_below'
    | 'rsi_above'
    | 'rsi_below'
    | 'macd_bullish'
    | 'macd_bearish'
    | 'signal_buy'
    | 'signal_sell'
    | 'accumulation_zone'
    | 'stop_loss_hit'
    | 'target_hit';
  value: number | null;
  enabled: boolean;
  notifyEmail: boolean;
  notifyInApp: boolean;
  emailAddress: string | null;
  createdAt: string;
  updatedAt: string;
  lastTriggered: string | null;
  triggerCount: number;
}

export interface TechnicalIndicator {
  symbol: string;
  timeframe: string;
  timestamp: string;
  rsi14: number | null;
  macdLine: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  supportLevels: number[];
  resistanceLevels: number[];
  overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null;
}

export interface MarketData {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number; // calculated pct change
  changePercent: number;
  bid: number;
  ask: number;
}

export interface AgentReport {
  id: string;
  symbol: string;
  createdAt: string;
  finalRating: 'BUY' | 'HOLD' | 'SELL' | 'WATCHLIST' | 'AVOID';
  confidenceScore: number;
  currentPrice: number;
  technicalScore: number;
  fundamentalScore: number;
  newsCatalystScore: number;
  institutionalFlowProxyScore: number;
  executiveSummary: string;
  reportJson: {
    decisionHeader: {
      rating: string;
      confidenceScore: number;
      riskLevel: string;
      verdict: string;
    };
    actionZone: {
      entryZone: string;
      accumulationZone: string;
      stopLoss: number;
      targets: number[];
      riskRewardRatio: number;
    };
    analysisSections: {
      summary: string;
      movingReason: string;
      shortTermView: string;
      swingView: string;
      longTermView: string;
      technicalAnalysis: string;
      fundamentalAnalysis: string;
      institutionalFlow: string;
      newsCatalysts: string;
      multibaggerProbability: string;
      keyRisks: string;
      finalActionPlan: string;
    };
  };
}
