// ── Analysis & Reports ────────────────────────────────────────────
export type FinalRating = 'BUY' | 'HOLD' | 'SELL' | 'WATCHLIST' | 'AVOID';
export type MultibaggerRating = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type TrendBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface PriceRange {
  low?: number | null;
  high?: number | null;
  price?: number | null;
  description?: string;
}

export interface TradeTarget {
  price: number;
  label: string;
}

export interface ShortTermView {
  horizon: string;
  bias: string;
  entryZone?: PriceRange;
  stopLoss?: PriceRange;
  targets?: TradeTarget[];
  exitRules?: string[];
}

export interface SwingTradeView {
  horizon: string;
  bias: string;
  entryZone?: PriceRange;
  accumulationZone?: PriceRange;
  stopLoss?: PriceRange;
  targets?: TradeTarget[];
  riskReward?: string;
}

export interface LevelWithStrength {
  price: number;
  tests: number;
}

export interface TacticalHorizonView {
  horizon: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED';
  dailyTrend: {
    trend: string;
    barCount: number;
    analysis: string;
    laymanExplanation?: string;
  };
  swingSetup: {
    setup: string;
    analysis: string;
  };
  entryTiming: {
    trigger: string;
    analysis: string;
  };
  supportLevels: LevelWithStrength[];
  resistanceLevels: LevelWithStrength[];
  suggestedEntryPrice?: number | null;
  suggestedExitPrice?: number | null;
  stopLossPrice?: number | null;
  riskMetrics: {
    atr?: number | null;
    atrAnalysis: string;
    vwap?: number | null;
    vwapAnalysis: string;
    volumeAnalysis: string;
    supportResistanceAnalysis: string;
  };
  catalysts: {
    news: string;
    earnings: string;
    secFilings: string;
  };
  shortFilter: {
    borrowFee: string;
    shortInterest: string;
    ssrStatus: string;
    squeezeRisk: string;
  };
  horizonDetails: string;
}

export interface LongTermView {
  horizon: string;
  bias: string;
  fairValueRange?: PriceRange;
  bullCase?: string;
  baseCase?: string;
  bearCase?: string;
}

export interface MultibaggerProbability {
  rating: MultibaggerRating;
  reason: string;
  requiredConditions?: string[];
}

export interface TechnicalAnalysisReport {
  overallBias: string;
  trendStage: string;
  setupType: string;
  technicalScore: number;
  keySignals: string[];
  supportLevels: number[];
  resistanceLevels: number[];
  vwapAnalysis: string;
  movingAverageAnalysis: string;
  rsiAnalysis: string;
  macdAnalysis: string;
  volumeAnalysis: string;
  volumeTrendStatus: 'GROWING_STRONGER' | 'FADING' | 'STABLE' | 'UNUSUAL_SPIKE' | 'INSUFFICIENT_DATA';
  atrVolatilityAnalysis: string;
  adxTrendStrengthAnalysis: string;
  bollingerBandAnalysis: string;
}

export interface InvestedCompany {
  name: string;
  ownershipPct?: string | null;
  performance: string;
  upcomingEvents: string[];
  impactPotential: string;
}

export interface DependencyPartner {
  name: string;
  role: string;
  description: string;
  riskExposure: string;
}

export interface CompanyInsights {
  investedCompanies: InvestedCompany[];
  dependencies: {
    suppliers: DependencyPartner[];
    outsourcePartners: DependencyPartner[];
    marketingPartners: DependencyPartner[];
    customers: DependencyPartner[];
  };
  strategicOutlook: string;
}

export interface AnalystReport {
  technicalAnalysis?: TechnicalAnalysisReport;
  symbol: string;
  finalRating: FinalRating;
  currentPrice: number | null;
  executiveSummary: string;
  shortTermView: ShortTermView;
  swingTradeView: SwingTradeView;
  tacticalHorizonView?: TacticalHorizonView;
  longTermView: LongTermView;
  technicalScore: number;
  fundamentalScore: number | null;
  companyInsights?: CompanyInsights;
  newsCatalystScore: number | null;
  institutionalFlowProxyScore: number;
  institutionalFlowSummary: string;
  multibaggerProbability: MultibaggerProbability;
  keyCatalysts: string[];
  keyRisks: string[];
  finalActionPlan: string[];
  confidenceScore: number;
  disclaimer: string;
  trendStory?: TrendStoryResult;
}

export interface AgentReport {
  id: string;
  symbol: string;
  finalRating: FinalRating;
  confidenceScore: number | null;
  currentPrice: number | null;
  technicalScore: number | null;
  fundamentalScore: number | null;
  institutionalFlowProxyScore: number | null;
  executiveSummary: string | null;
  createdAt: string;
  status: string;
  reportJson: AnalystReport;
  openaiModel?: string;
  processingTime?: number;
}

// ── Analysis Progress ─────────────────────────────────────────────
export type ProgressStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export interface AnalysisProgress {
  step: string;
  status: ProgressStatus;
  message?: string;
}

export interface AnalysisResult {
  symbol: string;
  reportId: string;
  progress: AnalysisProgress[];
  report: any;
  processingTimeMs: number;
}

// ── Market Data ───────────────────────────────────────────────────
export interface MarketData {
  symbol: string;
  available: boolean;
  price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  vwap: number | null;
  bid: number | null;
  ask: number | null;
  spread: number | null;
  changePercent: number | null;
  timestamp: string | null;
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

// ── Technical Indicators ──────────────────────────────────────────
export interface TechnicalIndicators {
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  sma20: number | null;
  sma50: number | null;
  rsi14: number | null;
  macdLine: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  bbWidth: number | null;
  atr14: number | null;
  relVolume: number | null;
  vwap: number | null;
  adx14: number | null;
  plusDI: number | null;
  minusDI: number | null;
  supportLevels: number[];
  resistanceLevels: number[];
  overallBias: TrendBias;
  signals: string[];
}

// ── Watchlist ─────────────────────────────────────────────────────
export interface WatchlistItem {
  id: string;
  symbol: string;
  addedAt: string;
  lastAnalyzedAt: string | null;
  latestRating: FinalRating | null;
  latestPrice: number | null;
  latestSignal: string | null;
  notes: string | null;
}

// ── Alerts ────────────────────────────────────────────────────────
export type AlertType =
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

export interface Alert {
  id: string;
  symbol: string;
  name: string | null;
  type: AlertType;
  value: number | null;
  enabled: boolean;
  notifyEmail: boolean;
  notifyInApp: boolean;
  emailAddress: string | null;
  createdAt: string;
  lastTriggered: string | null;
  triggerCount: number;
  events?: AlertEvent[];
}

export interface AlertEvent {
  id: string;
  alertId: string;
  symbol: string;
  message: string;
  value: number | null;
  triggeredAt: string;
}


export interface OrderPreview {
  symbol: string;
  side: 'buy' | 'sell';
  orderType: string;
  qty: number | null;
  notional: number | null;
  limitPrice: number | null;
  stopLoss: number | null;
  target: number | null;
  estimatedCost: number | null;
  approved: boolean;
  requiresExplicitApproval: boolean;
  riskCheck: {
    approved: boolean;
    blockedReasons: string[];
    warnings: string[];
    positionSizePercent: number;
    maxAllowedNotional: number;
    riskRewardRatio: number | null;
    estimatedLossPercent: number | null;
    positionSizeDollars: number;
    riskSettings: {
      maxPositionSizePct: number;
      maxLossPerTradePct: number;
      minRiskReward: number;
      requireStopLoss: boolean;
    };
  };
}

// ── Risk Settings ─────────────────────────────────────────────────
export interface RiskSettings {
  id?: string;
  maxPositionSizePct: number;
  maxLossPerTradePct: number;
  minRiskReward: number;
  requireStopLoss: boolean;
  blockDuplicateWindow: number;
  maxDailyOrders: number;
}

// ── Health ────────────────────────────────────────────────────────
export interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string;
  version: string;
  services: {
    database: string;
    redis: string;
  };
  environment: string;
}

export interface ApiStatus {
  timestamp: string;
  services: {
    openai: { status: string; latencyMs?: number; message?: string };
    alpacaData: { status: string; latencyMs?: number };
    database: { status: string; note?: string };
  };
  config: {
    openaiModel: string;
    alpacaDataBaseUrl: string;
    maxPositionSizePct: string;
    maxLossPerTradePct: string;
    minRiskReward: string;
    emailConfigured: boolean;
  };
}


// ── User Management ───────────────────────────────────────────────
export type UserRole = 'BASIC' | 'SUPERUSER';

export interface User {
  id: string;
  username: string;
  email?: string | null;
  subscriptionPlan?: string;
  isActive?: boolean;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSession {
  id: string;
  userId: string;
  deviceInfo: string | null;
  isActive: boolean;
  createdAt: string;
  lastActiveAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  sessions: UserSession[];
  loading: boolean;
  error: string | null;
}

export interface TrendStoryResult {
  ticker: string;
  analysis_date: string;
  price_summary: {
    current_price: number;
    previous_close: number;
    day_change_percent: number;
    day_range: {
      high: number;
      low: number;
    };
    volume: number;
    average_volume: number;
    relative_volume: number;
  };
  move_classification: {
    primary_reason:
      | 'earnings-driven'
      | 'news-driven'
      | 'analyst-driven'
      | 'sector-sympathy'
      | 'market-wide'
      | 'institutional-accumulation'
      | 'retail-momentum'
      | 'short-covering'
      | 'technical-breakout'
      | 'technical-breakdown'
      | 'low-volume-fake-move'
      | 'unknown-mixed';
    secondary_reasons: string[];
    confidence: 'high' | 'medium' | 'low';
    confidence_score: number;
  };
  story_for_layman: {
    headline: string;
    simple_explanation: string;
    why_it_moved: string;
    who_may_be_buying_or_selling: 'retail' | 'institution' | 'shorts covering' | 'mixed' | 'unknown';
    is_move_sustainable: 'yes' | 'no' | 'uncertain';
    sustainability_reason: string;
  };
  evidence: {
    news_catalysts: Array<{
      headline: string;
      summary: string;
      source: string;
      published_at: string;
      impact: 'positive' | 'negative' | 'neutral';
      relevance_score: number;
    }>;
    earnings_catalyst: {
      has_recent_earnings: boolean;
      eps_surprise?: number | null;
      revenue_surprise?: number | null;
      guidance_change: 'raised' | 'lowered' | 'unchanged' | 'unknown';
      summary: string;
    };
    analyst_actions: Array<{
      firm: string;
      action: 'upgrade' | 'downgrade' | 'price_target_change' | 'initiation' | 'reiteration';
      old_target?: number | null;
      new_target?: number | null;
      summary: string;
    }>;
    sector_context: {
      sector_name: string;
      sector_change_percent: number;
      index_change_percent: number;
      is_stock_outperforming_sector: boolean;
      summary: string;
    };
    volume_context: {
      relative_volume: number;
      volume_interpretation: 'normal' | 'above_average' | 'unusual' | 'extreme';
      large_buyer_signal: 'strong' | 'moderate' | 'weak' | 'unknown';
      summary: string;
    };
    technical_context: {
      trend: 'uptrend' | 'downtrend' | 'sideways' | 'reversal';
      breakout_level?: number | null;
      support_level?: number | null;
      resistance_level?: number | null;
      rsi: number;
      macd_signal: 'bullish' | 'bearish' | 'neutral';
      vwap_position: 'above' | 'below' | 'near';
      summary: string;
    };
    short_context: {
      short_interest_available: boolean;
      short_interest_percent?: number | null;
      days_to_cover?: number | null;
      borrow_available: boolean;
      short_squeeze_risk: 'high' | 'medium' | 'low' | 'unknown';
      summary: string;
    };
  };
  swing_trade_view: {
    trade_bias: 'buy' | 'hold' | 'wait' | 'avoid' | 'take_profit' | 'short_watch';
    entry_zone: {
      low: number;
      high: number;
    };
    stop_loss: number;
    target_1: number;
    target_2: number;
    risk_reward: number;
    entry_reason: string;
    wait_for_confirmation: string;
  };
  short_trade_view: {
    short_bias: 'safe_to_short' | 'wait_for_breakdown' | 'avoid_short' | 'squeeze_risk_high';
    short_entry_trigger: number;
    short_stop_loss: number;
    short_target_1: number;
    short_target_2: number;
    reason: string;
  };
  final_summary: {
    one_line_story: string;
    layman_summary: string;
    trader_action: string;
    risk_warning: string;
  };
}
