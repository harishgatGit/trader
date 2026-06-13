import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { MarketDataResult } from './market-data.agent';
import { TechnicalAgentResult } from './technical.agent';
import { FundamentalResult } from './fundamental.agent';
import { NewsResult } from './news.agent';
import { InstitutionalFlowResult } from './institutional-flow.agent';
import { HistoricalDataResult } from './historical-data.agent';

// ── Zod Schemas for the New Pre-Decision JSON Output ──────────────────
const LevelWithStrengthSchema = z.object({
  price: z.number(),
  tests: z.number(),
}).passthrough();

const PriceRangeSchema = z.object({
  low: z.number().nullable().optional(),
  high: z.number().nullable().optional(),
  valid: z.boolean().optional(),
  description: z.string().optional(),
}).passthrough();

const TargetSchema = z.object({
  label: z.string(),
  price: z.number().nullable().optional(),
  reason: z.string().optional(),
}).passthrough();

const TargetShortSchema = z.object({
  price: z.number().nullable().optional(),
  label: z.string(),
}).passthrough();

const TradeViewSchema = z.object({
  horizon: z.string(),
  bias: z.string(),
  entryZone: PriceRangeSchema.optional(),
  stopLoss: z.object({
    price: z.number().nullable().optional(),
    description: z.string().optional(),
  }).passthrough().optional(),
  targets: z.array(TargetShortSchema).optional(),
  exitRules: z.array(z.string()).optional(),
  accumulationZone: PriceRangeSchema.optional(),
  riskReward: z.string().nullable().optional(),
  swingVerdict: z.string().optional(),
  tradeQuality: z.string().optional(),
}).passthrough();

const LongTermViewSchema = z.object({
  horizon: z.string(),
  bias: z.string(),
  investmentQuality: z.string().optional(),
  fairValueRange: z.object({
    low: z.number().nullable().optional(),
    high: z.number().nullable().optional(),
    method: z.string().optional(),
  }).passthrough().optional(),
  bullCase: z.string().optional(),
  baseCase: z.string().optional(),
  bearCase: z.string().optional(),
  longTermVerdict: z.string().optional(),
}).passthrough();

const InvestedCompanySchema = z.object({
  name: z.string(),
  ownershipPct: z.string().nullable().optional(),
  performance: z.string(),
  upcomingEvents: z.array(z.string()),
  impactPotential: z.string(),
}).passthrough();

const DependencyPartnerSchema = z.object({
  name: z.string(),
  role: z.string(),
  description: z.string(),
  riskExposure: z.string(),
}).passthrough();

const CompanyInsightsSchema = z.object({
  investedCompanies: z.array(InvestedCompanySchema),
  dependencies: z.object({
    suppliers: z.array(DependencyPartnerSchema),
    outsourcePartners: z.array(DependencyPartnerSchema),
    marketingPartners: z.array(DependencyPartnerSchema),
    customers: z.array(DependencyPartnerSchema),
  }).passthrough(),
  strategicOutlook: z.string(),
}).passthrough();

export const AnalystReportSchema = z.object({
  symbol: z.string(),
  analysisDateTime: z.string().nullable().optional(),
  currentPrice: z.number().nullable().optional(),

  dataQuality: z.object({
    rating: z.enum(['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT']),
    missingFields: z.array(z.string()),
    staleDataWarning: z.string().nullable().optional(),
    decisionAllowed: z.boolean(),
    reason: z.string()
  }).passthrough(),

  finalDecision: z.object({
    finalRating: z.enum(['BUY', 'WAIT', 'HOLD', 'SELL', 'TRIM', 'WATCHLIST', 'AVOID']),
    decisionType: z.enum(['TRADE', 'INVESTMENT', 'RISK_MANAGEMENT', 'NO_TRADE']),
    confidenceScore: z.number().min(0).max(100),
    decisionSummary: z.string(),
    shouldBuyNow: z.boolean(),
    buyNowReason: z.string(),
    bestActionNow: z.string()
  }).passthrough(),

  preDecisionChecklist: z.object({
    trendConfirmed: z.boolean(),
    momentumConfirmed: z.boolean(),
    volumeConfirmed: z.boolean(),
    entryNotExtended: z.boolean(),
    riskRewardAcceptable: z.boolean(),
    stopLossDefined: z.boolean(),
    nearResistanceRisk: z.boolean(),
    earningsRisk: z.boolean(),
    newsRiskAcceptable: z.boolean(),
    liquidityAcceptable: z.boolean(),
    finalChecklistPass: z.boolean()
  }).passthrough(),

  executiveSummary: z.object({
    summary: z.string(),
    bullishFactors: z.array(z.string()).optional().default([]),
    bearishFactors: z.array(z.string()).optional().default([]),
    neutralFactors: z.array(z.string()).optional().default([])
  }).passthrough(),

  technicalAnalysis: z.object({
    overallBias: z.enum(['BULLISH', 'BEARISH', 'NEUTRAL', 'MIXED', 'INSUFFICIENT_DATA']),
    trendStage: z.enum(['ACCUMULATION', 'MARKUP', 'DISTRIBUTION', 'MARKDOWN', 'SIDEWAYS', 'UNKNOWN']),
    setupType: z.preprocess((val) => {
      if (typeof val === 'string') {
        const clean = val.toUpperCase().trim();
        if (clean === 'CHASERISK') return 'CHASE_RISK';
        return clean;
      }
      return val;
    }, z.enum(['PULLBACK', 'BREAKOUT', 'REVERSAL', 'CONTINUATION', 'CHASE_RISK', 'NO_SETUP'])),
    technicalScore: z.number().min(0).max(100),
    keySignals: z.array(z.string()),
    supportLevels: z.array(z.number()),
    resistanceLevels: z.array(z.number()),
    vwapAnalysis: z.string(),
    movingAverageAnalysis: z.string(),
    rsiAnalysis: z.string(),
    macdAnalysis: z.string(),
    volumeAnalysis: z.string(),
    volumeTrendStatus: z.enum(['GROWING_STRONGER', 'FADING', 'STABLE', 'UNUSUAL_SPIKE', 'INSUFFICIENT_DATA']),
    atrVolatilityAnalysis: z.string(),
    adxTrendStrengthAnalysis: z.string(),
    bollingerBandAnalysis: z.string()
  }).passthrough(),

  entryExitPlan: z.object({
    preferredEntryStyle: z.enum(['BUY_NOW', 'WAIT_FOR_PULLBACK', 'BUY_BREAKOUT_CONFIRMATION', 'SCALE_IN', 'NO_TRADE']),
    buyNowZone: PriceRangeSchema,
    pullbackEntryZone: PriceRangeSchema,
    breakoutEntryLevel: z.object({
      price: z.number().nullable().optional(),
      confirmationRule: z.string()
    }).passthrough(),
    accumulationZone: PriceRangeSchema,
    invalidationLevel: z.object({
      price: z.number().nullable().optional(),
      reason: z.string()
    }).passthrough(),
    stopLoss: z.object({
      price: z.number().nullable().optional(),
      stopType: z.enum(['TECHNICAL', 'ATR_BASED', 'SUPPORT_BREAK', 'VWAP_BREAK', 'NOT_AVAILABLE']),
      description: z.string()
    }).passthrough(),
    targets: z.array(TargetSchema),
    exitRules: z.array(z.string())
  }).passthrough(),

  riskRewardAnalysis: z.object({
    entryReferencePrice: z.number().nullable().optional(),
    riskPerShare: z.number().nullable().optional(),
    rewardToTarget1: z.number().nullable().optional(),
    rewardToTarget2: z.number().nullable().optional(),
    rewardToTarget3: z.number().nullable().optional(),
    riskRewardToTarget1: z.string().nullable().optional(),
    riskRewardToTarget2: z.string().nullable().optional(),
    riskRewardToTarget3: z.string().nullable().optional(),
    riskRewardVerdict: z.enum(['GOOD', 'ACCEPTABLE', 'POOR', 'UNAVAILABLE']),
    positionSizingNote: z.string()
  }).passthrough(),

  shortTermView: TradeViewSchema,
  swingTradeView: TradeViewSchema,
  tacticalHorizonView: z.object({
    horizon: z.string(),
    bias: z.enum(['BULLISH', 'BEARISH', 'NEUTRAL', 'MIXED']),
    dailyTrend: z.object({
      trend: z.string(),
      barCount: z.number(),
      analysis: z.string(),
      laymanExplanation: z.string(),
    }).passthrough().optional(),
    swingSetup: z.object({
      setup: z.string(),
      analysis: z.string(),
    }).passthrough(),
    entryTiming: z.object({
      trigger: z.string(),
      analysis: z.string(),
    }).passthrough(),
    supportLevels: z.array(LevelWithStrengthSchema),
    resistanceLevels: z.array(LevelWithStrengthSchema),
    suggestedEntryPrice: z.number().nullable().optional(),
    suggestedExitPrice: z.number().nullable().optional(),
    stopLossPrice: z.number().nullable().optional(),
    riskMetrics: z.object({
      atr: z.number().nullable().optional(),
      atrAnalysis: z.string(),
      vwap: z.number().nullable().optional(),
      vwapAnalysis: z.string(),
      volumeAnalysis: z.string(),
      supportResistanceAnalysis: z.string(),
    }).passthrough(),
    catalysts: z.object({
      news: z.string(),
      earnings: z.string(),
      secFilings: z.string(),
    }).passthrough(),
    shortFilter: z.object({
      borrowFee: z.string(),
      shortInterest: z.string(),
      ssrStatus: z.string(),
      squeezeRisk: z.string(),
    }).passthrough(),
    horizonDetails: z.string(),
  }).passthrough(),
  longTermView: LongTermViewSchema,

  fundamentalAnalysis: z.object({
    fundamentalScore: z.number().min(0).max(100).nullable().optional(),
    rating: z.enum(['STRONG', 'IMPROVING', 'MIXED', 'WEAK', 'INSUFFICIENT_DATA']),
    revenueTrend: z.string(),
    epsTrend: z.string(),
    profitability: z.string(),
    debtRisk: z.string(),
    cashFlowQuality: z.string(),
    valuationCommentary: z.string()
  }).passthrough(),

  valuationAnalysis: z.object({
    valuationRating: z.enum(['UNDERVALUED', 'FAIRLY_VALUED', 'OVERVALUED', 'EXTREMELY_OVERVALUED', 'INSUFFICIENT_DATA']),
    valuationScore: z.number().min(0).max(100).nullable().optional(),
    peerComparisonAvailable: z.boolean(),
    fairValueRange: z.object({
      low: z.number().nullable().optional(),
      high: z.number().nullable().optional()
    }).passthrough(),
    marginOfSafetyBuyZone: z.object({
      low: z.number().nullable().optional(),
      high: z.number().nullable().optional()
    }).passthrough(),
    commentary: z.string()
  }).passthrough(),

  newsAndCatalysts: z.object({
    newsCatalystScore: z.number().min(0).max(100).nullable().optional(),
    overallSentiment: z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED', 'UNAVAILABLE']),
    keyCatalysts: z.array(z.string()),
    keyRisksFromNews: z.array(z.string()),
    earningsRisk: z.string(),
    catalystVerdict: z.enum(['SUPPORTIVE', 'RISKY', 'NEUTRAL', 'UNAVAILABLE'])
  }).passthrough(),

  institutionalFlowProxy: z.object({
    institutionalFlowProxyScore: z.number().min(0).max(100).nullable().optional(),
    interpretation: z.enum(['ACCUMULATION', 'DISTRIBUTION', 'NEUTRAL', 'UNAVAILABLE']),
    institutionalFlowSummary: z.string(),
    signals: z.array(z.string()),
    limitations: z.array(z.string())
  }).passthrough(),

  multibaggerProbability: z.object({
    rating: z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH', 'INSUFFICIENT_DATA']),
    probabilityScore: z.number().min(0).max(100).nullable().optional(),
    reason: z.string(),
    requiredConditions: z.array(z.string()).optional(),
    majorBlockers: z.array(z.string()).optional()
  }).passthrough(),

  riskAnalysis: z.object({
    overallRiskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']),
    technicalRisk: z.string(),
    fundamentalRisk: z.string(),
    valuationRisk: z.string(),
    newsRisk: z.string(),
    liquidityRisk: z.string(),
    eventRisk: z.string(),
    topRisks: z.array(z.string())
  }).passthrough(),

  scenarioAnalysis: z.object({
    bullCase: z.object({
      condition: z.string(),
      pricePath: z.string(),
      probability: z.enum(['LOW', 'MEDIUM', 'HIGH'])
    }).passthrough(),
    baseCase: z.object({
      condition: z.string(),
      pricePath: z.string(),
      probability: z.enum(['LOW', 'MEDIUM', 'HIGH'])
    }).passthrough(),
    bearCase: z.object({
      condition: z.string(),
      pricePath: z.string(),
      probability: z.enum(['LOW', 'MEDIUM', 'HIGH'])
    }).passthrough()
  }).passthrough(),

  finalActionPlan: z.array(z.string()),
  doNotTradeConditions: z.array(z.string()),

  alertLevels: z.object({
    buyAlert: z.number().nullable().optional(),
    breakoutAlert: z.number().nullable().optional(),
    stopLossAlert: z.number().nullable().optional(),
    target1Alert: z.number().nullable().optional(),
    target2Alert: z.number().nullable().optional(),
    riskAlert: z.number().nullable().optional()
  }).passthrough(),

  companyInsights: CompanyInsightsSchema.optional(),

  disclaimer: z.string()
});

export type AnalystReport = z.infer<typeof AnalystReportSchema>;

// New Zod schema matching the updated stock-analyst.system.md prompt
export const NewAnalystReportSchema = z.object({
  ticker: z.string(),
  companyName: z.string(),
  generatedAt: z.string().nullable().optional(),
  dataQualityCheck: z.object({
    overallQuality: z.string(),
    missingData: z.array(z.string()).optional().default([]),
    staleData: z.array(z.string()).optional().default([]),
    invalidData: z.array(z.string()).optional().default([]),
    dataLimitations: z.string().nullable().optional(),
    decisionImpact: z.string().nullable().optional()
  }).passthrough(),
  executiveSummary: z.object({
    finalDecision: z.string(),
    summary: z.string(),
    bullishFactors: z.array(z.string()).optional().default([]),
    bearishFactors: z.array(z.string()).optional().default([]),
    neutralFactors: z.array(z.string()).optional().default([]),
    nearTermExpectation: z.string().nullable().optional(),
    longTermExpectation: z.string().nullable().optional(),
    confidenceScore: z.union([z.number(), z.string()]).nullable().optional()
  }).passthrough(),
  preDecisionChecklist: z.object({
    technicalTrendPassed: z.union([z.boolean(), z.string()]).nullable().optional(),
    volumeConfirmationPassed: z.union([z.boolean(), z.string()]).nullable().optional(),
    fundamentalValidationPassed: z.union([z.boolean(), z.string()]).nullable().optional(),
    newsCatalystPassed: z.union([z.boolean(), z.string()]).nullable().optional(),
    institutionalFlowProxyPassed: z.union([z.boolean(), z.string()]).nullable().optional(),
    liquidityCheckPassed: z.union([z.boolean(), z.string()]).nullable().optional(),
    riskRewardPassed: z.union([z.boolean(), z.string()]).nullable().optional(),
    overextensionCheckPassed: z.union([z.boolean(), z.string()]).nullable().optional(),
    overallChecklistResult: z.string()
  }).passthrough(),
  technicalAnalysis: z.object({
    trendBias: z.string(),
    currentPrice: z.union([z.number(), z.string()]).nullable().optional(),
    priceActionSummary: z.string().nullable().optional(),
    movingAverageView: z.string().nullable().optional(),
    momentumView: z.string().nullable().optional(),
    volumeView: z.string().nullable().optional(),
    volumeTrendStatus: z.string().nullable().optional(),
    supportResistanceView: z.string().nullable().optional(),
    vwapView: z.string().nullable().optional(),
    volatilityView: z.string().nullable().optional(),
    overboughtOversoldView: z.string().nullable().optional(),
    technicalValidation: z.string()
  }).passthrough(),
  fundamentalAnalysis: z.object({
    validationStatus: z.string(),
    revenueView: z.string().nullable().optional(),
    epsView: z.string().nullable().optional(),
    profitabilityView: z.string().nullable().optional(),
    balanceSheetView: z.string().nullable().optional(),
    valuationView: z.string().nullable().optional(),
    growthView: z.string().nullable().optional(),
    fundamentalRisk: z.string().nullable().optional()
  }).passthrough(),
  newsCatalystAnalysis: z.object({
    validationStatus: z.string(),
    primaryCatalyst: z.string().nullable().optional(),
    newsSentiment: z.string().nullable().optional(),
    earningsRisk: z.string().nullable().optional(),
    filingRisk: z.string().nullable().optional(),
    sectorMacroImpact: z.string().nullable().optional(),
    catalystFreshness: z.string().nullable().optional()
  }).passthrough(),
  institutionalFlowAnalysis: z.object({
    institutionalFlowSummary: z.string(),
    proxySignal: z.string().nullable().optional(),
    volumeEvidence: z.string().nullable().optional(),
    blockTradeEvidence: z.string().nullable().optional(),
    darkPoolEvidence: z.string().nullable().optional(),
    confidenceLevel: z.string().nullable().optional(),
    riskWarning: z.string().nullable().optional()
  }).passthrough(),
  tacticalHorizonView: z.object({
    swingSetup: z.string().nullable().optional(),
    entryTiming: z.string().nullable().optional(),
    supportLevels: z.array(z.object({
      price: z.union([z.number(), z.string()]).nullable().optional(),
      tests: z.union([z.number(), z.string()]).nullable().optional()
    }).passthrough()).optional().default([]),
    resistanceLevels: z.array(z.object({
      price: z.union([z.number(), z.string()]).nullable().optional(),
      tests: z.union([z.number(), z.string()]).nullable().optional()
    }).passthrough()).optional().default([]),
    suggestedEntryPrice: z.union([z.number(), z.string()]).nullable().optional(),
    suggestedEntryReason: z.string().nullable().optional(),
    suggestedExitPrice: z.union([z.number(), z.string()]).nullable().optional(),
    suggestedExitReason: z.string().nullable().optional(),
    stopLossPrice: z.union([z.number(), z.string()]).nullable().optional(),
    stopLossReason: z.string().nullable().optional(),
    riskMetrics: z.object({
      atrRisk: z.string().nullable().optional(),
      distanceToStopPercent: z.union([z.number(), z.string()]).nullable().optional(),
      distanceToResistancePercent: z.union([z.number(), z.string()]).nullable().optional(),
      riskRewardRatio: z.union([z.number(), z.string()]).nullable().optional(),
      vwapLocation: z.string().nullable().optional(),
      liquidityRisk: z.string().nullable().optional(),
      volumeConfirmation: z.string().nullable().optional(),
      volatilityRisk: z.string().nullable().optional()
    }).passthrough().optional().default({}),
    catalysts: z.object({
      newsSentiment: z.string().nullable().optional(),
      earningsDateRisk: z.string().nullable().optional(),
      secFilingRisk: z.string().nullable().optional(),
      sectorMacroCatalyst: z.string().nullable().optional()
    }).passthrough().optional().default({}),
    shortFilter: z.object({
      borrowFeeRate: z.string().nullable().optional(),
      borrowAvailability: z.string().nullable().optional(),
      shortInterestPercent: z.string().nullable().optional(),
      ssrStatus: z.string().nullable().optional(),
      squeezeRisk: z.string().nullable().optional()
    }).passthrough().optional().default({}),
    horizonDetails: z.string().nullable().optional()
  }).passthrough(),
  riskRewardValidation: z.object({
    entryPrice: z.union([z.number(), z.string()]).nullable().optional(),
    stopLossPrice: z.union([z.number(), z.string()]).nullable().optional(),
    target1: z.union([z.number(), z.string()]).nullable().optional(),
    target2: z.union([z.number(), z.string()]).nullable().optional(),
    target3: z.union([z.number(), z.string()]).nullable().optional(),
    riskRewardRatio: z.union([z.number(), z.string()]).nullable().optional(),
    validationStatus: z.string(),
    reason: z.string().nullable().optional()
  }).passthrough(),
  exitRules: z.object({
    entryInvalidationLevel: z.union([z.number(), z.string()]).nullable().optional(),
    stopLossRule: z.string().nullable().optional(),
    profitTakingRule: z.string().nullable().optional(),
    thesisFailureRule: z.string().nullable().optional(),
    riskReductionRule: z.string().nullable().optional()
  }).passthrough(),
  finalActionPlan: z.object({
    decision: z.string(),
    actionLabel: z.string().nullable().optional(),
    reason: z.string().nullable().optional(),
    whatToWaitFor: z.string().nullable().optional(),
    whatWouldImproveSetup: z.string().nullable().optional(),
    whatWouldInvalidateSetup: z.string().nullable().optional(),
    riskLevel: z.string().nullable().optional(),
    confidenceScore: z.union([z.number(), z.string()]).nullable().optional()
  }).passthrough(),
  disclaimer: z.string().nullable().optional()
}).passthrough();

// Zod schema matching the fund-analyst.system.md prompt
export const FundReportSchema = z.object({
  isFund: z.boolean(),
  symbol: z.string(),
  fundName: z.string(),
  issuer: z.string(),
  benchmarkIndex: z.string(),
  finalDecision: z.object({
    finalRating: z.string(),
    confidenceScore: z.union([z.number(), z.string()]).nullable().optional(),
    decisionSummary: z.string(),
    bestActionNow: z.string()
  }).passthrough(),
  fundOverview: z.object({
    objective: z.string(),
    expenseRatio: z.string(),
    aum: z.string(),
    dividendYield: z.string(),
    inceptionDate: z.string()
  }).passthrough(),
  pros: z.array(z.string()).optional().default([]),
  cons: z.array(z.string()).optional().default([]),
  topSectors: z.array(z.object({
    sector: z.string(),
    percentage: z.string()
  }).passthrough()).optional().default([]),
  topHoldings: z.array(z.object({
    ticker: z.string(),
    name: z.string(),
    percentage: z.string()
  }).passthrough()).optional().default([]),
  laymanExplanation: z.string(),
  disclaimer: z.string()
}).passthrough();

export function mapNewAnalystReportToOld(newReport: any): any {
  const ticker = newReport.ticker || '';
  const dateStr = newReport.generatedAt || new Date().toISOString();
  
  // Data Quality Rating mapping
  let qualityRating: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT' = 'MEDIUM';
  const qual = (newReport.dataQualityCheck?.overallQuality || '').toUpperCase();
  if (qual.includes('GOOD') || qual.includes('HIGH')) qualityRating = 'HIGH';
  else if (qual.includes('FAIR') || qual.includes('MEDIUM')) qualityRating = 'MEDIUM';
  else if (qual.includes('POOR') || qual.includes('LOW')) qualityRating = 'LOW';
  else if (qual.includes('INS')) qualityRating = 'INSUFFICIENT';

  // Final Decision mapping
  let finalRating: 'BUY' | 'WAIT' | 'HOLD' | 'SELL' | 'TRIM' | 'WATCHLIST' | 'AVOID' = 'WATCHLIST';
  const rating = (newReport.executiveSummary?.finalDecision || newReport.finalActionPlan?.decision || '').toUpperCase();
  if (['BUY', 'WAIT', 'HOLD', 'SELL', 'TRIM', 'WATCHLIST', 'AVOID'].includes(rating)) {
    finalRating = rating as any;
  }

  const confidenceScore = parseFloat(newReport.executiveSummary?.confidenceScore?.toString() || newReport.finalActionPlan?.confidenceScore?.toString() || '50') || 50;
  const currentPrice = parseFloat(newReport.technicalAnalysis?.currentPrice?.toString() || '0') || null;

  // Technical overall bias mapping
  let overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED' | 'INSUFFICIENT_DATA' = 'NEUTRAL';
  const bias = (newReport.technicalAnalysis?.trendBias || '').toUpperCase();
  if (['BULLISH', 'BEARISH', 'NEUTRAL', 'MIXED', 'INSUFFICIENT_DATA'].includes(bias)) {
    overallBias = bias as any;
  }

  // Volume Trend Status mapping
  let volumeTrendStatus: 'GROWING_STRONGER' | 'FADING' | 'STABLE' | 'UNUSUAL_SPIKE' | 'INSUFFICIENT_DATA' = 'STABLE';
  const volTrend = (newReport.technicalAnalysis?.volumeTrendStatus || '').toUpperCase();
  if (['GROWING_STRONGER', 'FADING', 'STABLE', 'UNUSUAL_SPIKE', 'INSUFFICIENT_DATA'].includes(volTrend)) {
    volumeTrendStatus = volTrend as any;
  }

  // Pre-market Checklist Mapping
  const check = newReport.preDecisionChecklist || {};
  const isTrue = (val: any) => val === true || val === 'true' || val === 'PASS' || val === 'Passed';
  
  // Tactical Levels
  const supportLevels = (newReport.tacticalHorizonView?.supportLevels || [])
    .map((s: any) => parseFloat(s.price?.toString() || ''))
    .filter((p: number) => !isNaN(p));
  const resistanceLevels = (newReport.tacticalHorizonView?.resistanceLevels || [])
    .map((s: any) => parseFloat(s.price?.toString() || ''))
    .filter((p: number) => !isNaN(p));

  const suggestedEntry = parseFloat(newReport.tacticalHorizonView?.suggestedEntryPrice?.toString() || '') || null;
  const suggestedExit = parseFloat(newReport.tacticalHorizonView?.suggestedExitPrice?.toString() || '') || null;
  const stopLossPrice = parseFloat(newReport.tacticalHorizonView?.stopLossPrice?.toString() || '') || null;

  const entryRefPrice = parseFloat(newReport.riskRewardValidation?.entryPrice?.toString() || '') || currentPrice || null;
  const rrRatio = parseFloat(newReport.riskRewardValidation?.riskRewardRatio?.toString() || '') || null;

  return {
    symbol: ticker,
    analysisDateTime: dateStr,
    currentPrice: currentPrice,
    dataQuality: {
      rating: qualityRating,
      missingFields: newReport.dataQualityCheck?.missingData || [],
      staleDataWarning: (newReport.dataQualityCheck?.staleData || []).join(', ') || null,
      decisionAllowed: qualityRating !== 'INSUFFICIENT',
      reason: newReport.dataQualityCheck?.decisionImpact || 'Validated successfully'
    },
    finalDecision: {
      finalRating: finalRating,
      decisionType: ['BUY', 'SELL', 'TRIM'].includes(finalRating) ? 'TRADE' : 'NO_TRADE',
      confidenceScore: confidenceScore,
      decisionSummary: newReport.executiveSummary?.summary || '',
      shouldBuyNow: finalRating === 'BUY',
      buyNowReason: newReport.finalActionPlan?.reason || '',
      bestActionNow: newReport.finalActionPlan?.actionLabel || ''
    },
    preDecisionChecklist: {
      trendConfirmed: isTrue(check.technicalTrendPassed),
      momentumConfirmed: isTrue(check.technicalTrendPassed),
      volumeConfirmed: isTrue(check.volumeConfirmationPassed),
      entryNotExtended: isTrue(check.overextensionCheckPassed),
      riskRewardAcceptable: isTrue(check.riskRewardPassed),
      stopLossDefined: stopLossPrice !== null,
      nearResistanceRisk: !isTrue(check.overextensionCheckPassed),
      earningsRisk: newReport.newsCatalystAnalysis?.earningsRisk ? true : false,
      newsRiskAcceptable: isTrue(check.newsCatalystPassed),
      liquidityAcceptable: isTrue(check.liquidityCheckPassed),
      finalChecklistPass: check.overallChecklistResult === 'PASS'
    },
    executiveSummary: {
      summary: newReport.executiveSummary?.summary || '',
      bullishFactors: newReport.executiveSummary?.bullishFactors || [],
      bearishFactors: newReport.executiveSummary?.bearishFactors || [],
      neutralFactors: newReport.executiveSummary?.neutralFactors || []
    },
    technicalAnalysis: {
      overallBias: overallBias,
      trendStage: newReport.technicalAnalysis?.technicalValidation === 'PASSED' ? 'MARKUP' : 'UNKNOWN',
      setupType: finalRating === 'BUY' ? 'PULLBACK' : 'NO_SETUP',
      technicalScore: confidenceScore,
      keySignals: [newReport.technicalAnalysis?.priceActionSummary || 'Price action analyzed'],
      supportLevels: supportLevels,
      resistanceLevels: resistanceLevels,
      vwapAnalysis: newReport.technicalAnalysis?.vwapView || '',
      movingAverageAnalysis: newReport.technicalAnalysis?.movingAverageView || '',
      rsiAnalysis: newReport.technicalAnalysis?.momentumView || '',
      macdAnalysis: newReport.technicalAnalysis?.momentumView || '',
      volumeAnalysis: newReport.technicalAnalysis?.volumeView || '',
      volumeTrendStatus: volumeTrendStatus,
      atrVolatilityAnalysis: newReport.technicalAnalysis?.volatilityView || '',
      adxTrendStrengthAnalysis: newReport.technicalAnalysis?.movingAverageView || '',
      bollingerBandAnalysis: newReport.technicalAnalysis?.volatilityView || ''
    },
    entryExitPlan: {
      preferredEntryStyle: finalRating === 'BUY' ? 'BUY_NOW' : 'NO_TRADE',
      buyNowZone: { low: suggestedEntry, high: suggestedEntry },
      pullbackEntryZone: { low: suggestedEntry, high: suggestedEntry },
      breakoutEntryLevel: { price: null, confirmationRule: '' },
      accumulationZone: { low: suggestedEntry, high: suggestedEntry },
      invalidationLevel: { price: parseFloat(newReport.exitRules?.entryInvalidationLevel?.toString() || '') || null, reason: '' },
      stopLoss: {
        price: stopLossPrice,
        stopType: 'TECHNICAL',
        description: newReport.tacticalHorizonView?.stopLossReason || ''
      },
      targets: [
        { label: 'Target 1', price: parseFloat(newReport.riskRewardValidation?.target1?.toString() || '') || null },
        { label: 'Target 2', price: parseFloat(newReport.riskRewardValidation?.target2?.toString() || '') || null },
        { label: 'Target 3', price: parseFloat(newReport.riskRewardValidation?.target3?.toString() || '') || null }
      ].filter(t => t.price !== null) as any[],
      exitRules: [
        newReport.exitRules?.stopLossRule,
        newReport.exitRules?.profitTakingRule,
        newReport.exitRules?.thesisFailureRule,
        newReport.exitRules?.riskReductionRule
      ].filter(Boolean) as string[]
    },
    riskRewardAnalysis: {
      entryReferencePrice: entryRefPrice,
      riskPerShare: entryRefPrice && stopLossPrice ? Math.abs(entryRefPrice - stopLossPrice) : null,
      rewardToTarget1: entryRefPrice && newReport.riskRewardValidation?.target1 ? Math.abs(newReport.riskRewardValidation.target1 - entryRefPrice) : null,
      rewardToTarget2: entryRefPrice && newReport.riskRewardValidation?.target2 ? Math.abs(newReport.riskRewardValidation.target2 - entryRefPrice) : null,
      rewardToTarget3: entryRefPrice && newReport.riskRewardValidation?.target3 ? Math.abs(newReport.riskRewardValidation.target3 - entryRefPrice) : null,
      riskRewardToTarget1: rrRatio ? rrRatio.toString() : 'N/A',
      riskRewardToTarget2: 'N/A',
      riskRewardToTarget3: 'N/A',
      riskRewardVerdict: newReport.riskRewardValidation?.validationStatus === 'PASSED' ? 'GOOD' : 'POOR',
      positionSizingNote: newReport.tacticalHorizonView?.riskMetrics?.liquidityRisk || 'Standard risk management applies.'
    },
    shortTermView: {
      horizon: 'Short-term (1-5 Days)',
      bias: overallBias,
      entryZone: { low: suggestedEntry, high: suggestedEntry },
      stopLoss: { price: stopLossPrice, description: 'Short-term swing invalidation' },
      targets: []
    },
    swingTradeView: {
      horizon: 'Swing Trade (2-6 Weeks)',
      bias: overallBias,
      entryZone: { low: suggestedEntry, high: suggestedEntry },
      stopLoss: { price: stopLossPrice, description: 'Swing trade invalidation' },
      targets: []
    },
    tacticalHorizonView: {
      horizon: newReport.finalActionPlan?.actionLabel || 'Tactical Hold',
      bias: overallBias,
      dailyTrend: {
        trend: overallBias,
        barCount: 252,
        analysis: newReport.technicalAnalysis?.priceActionSummary || '',
        laymanExplanation: newReport.finalActionPlan?.reason || ''
      },
      swingSetup: {
        setup: newReport.tacticalHorizonView?.swingSetup || 'Trend monitoring',
        analysis: ''
      },
      entryTiming: {
        trigger: newReport.tacticalHorizonView?.entryTiming || 'Pattern confirmation',
        analysis: ''
      },
      supportLevels: (newReport.tacticalHorizonView?.supportLevels || []).map((s: any) => ({
        price: parseFloat(s.price?.toString() || '') || null,
        tests: parseInt(s.tests?.toString() || '0') || 0,
        strength: 'Medium'
      })),
      resistanceLevels: (newReport.tacticalHorizonView?.resistanceLevels || []).map((s: any) => ({
        price: parseFloat(s.price?.toString() || '') || null,
        tests: parseInt(s.tests?.toString() || '0') || 0,
        strength: 'Medium'
      })),
      suggestedEntryPrice: suggestedEntry,
      suggestedExitPrice: suggestedExit,
      stopLossPrice: stopLossPrice,
      riskMetrics: {
        atr: null,
        atrAnalysis: newReport.tacticalHorizonView?.riskMetrics?.atrRisk || '',
        vwap: null,
        vwapAnalysis: newReport.tacticalHorizonView?.riskMetrics?.vwapLocation || '',
        volumeAnalysis: newReport.tacticalHorizonView?.riskMetrics?.volumeConfirmation || '',
        supportResistanceAnalysis: newReport.tacticalHorizonView?.riskMetrics?.volatilityRisk || ''
      },
      catalysts: {
        news: newReport.tacticalHorizonView?.catalysts?.newsSentiment || '',
        earnings: newReport.tacticalHorizonView?.catalysts?.earningsDateRisk || '',
        secFilings: newReport.tacticalHorizonView?.catalysts?.secFilingRisk || ''
      },
      shortFilter: {
        borrowFee: newReport.tacticalHorizonView?.shortFilter?.borrowFeeRate || '',
        shortInterest: newReport.tacticalHorizonView?.shortFilter?.shortInterestPercent || '',
        ssrStatus: newReport.tacticalHorizonView?.shortFilter?.ssrStatus || '',
        squeezeRisk: newReport.tacticalHorizonView?.shortFilter?.squeezeRisk || 'Low'
      },
      horizonDetails: newReport.tacticalHorizonView?.horizonDetails || ''
    },
    longTermView: {
      investmentBias: overallBias,
      horizonDetails: newReport.finalActionPlan?.whatToWaitFor || ''
    },
    fundamentalAnalysis: {
      fundamentalScore: 50,
      rating: (newReport.fundamentalAnalysis?.validationStatus === 'PASSED' ? 'STRONG' : 'MIXED') as any,
      revenueTrend: newReport.fundamentalAnalysis?.revenueView || '',
      epsTrend: newReport.fundamentalAnalysis?.epsView || '',
      profitabilityAnalysis: newReport.fundamentalAnalysis?.profitabilityView || '',
      balanceSheetAnalysis: newReport.fundamentalAnalysis?.balanceSheetView || '',
      valuationAnalysis: newReport.fundamentalAnalysis?.valuationView || '',
      growthOutlook: newReport.fundamentalAnalysis?.growthView || '',
      keyRisks: newReport.fundamentalAnalysis?.fundamentalRisk || ''
    },
    newsAndCatalysts: {
      newsCatalystScore: 50,
      sentiment: (newReport.newsCatalystAnalysis?.newsSentiment || 'NEUTRAL').toUpperCase() as any,
      primaryCatalyst: newReport.newsCatalystAnalysis?.primaryCatalyst || '',
      earningsCatalyst: newReport.newsCatalystAnalysis?.earningsRisk || '',
      secFilingsCatalyst: newReport.newsCatalystAnalysis?.filingRisk || '',
      macroSectorContext: newReport.newsCatalystAnalysis?.sectorMacroImpact || '',
      catalystFreshness: (newReport.newsCatalystAnalysis?.catalystFreshness || 'UNKNOWN').toUpperCase() as any,
      keyCatalysts: [newReport.newsCatalystAnalysis?.primaryCatalyst].filter(Boolean),
      keyRisksFromNews: [newReport.newsCatalystAnalysis?.earningsRisk, newReport.newsCatalystAnalysis?.filingRisk].filter(Boolean)
    },
    institutionalFlowProxy: {
      institutionalFlowProxyScore: 50,
      institutionalFlowSummary: newReport.institutionalFlowAnalysis?.institutionalFlowSummary || '',
      accumulationDistributionSignal: (newReport.institutionalFlowAnalysis?.proxySignal || 'INCONCLUSIVE').toUpperCase() as any,
      blockTradeEvidence: newReport.institutionalFlowAnalysis?.blockTradeEvidence || '',
      darkPoolEvidence: newReport.institutionalFlowAnalysis?.darkPoolEvidence || '',
      largeVolumeEvidence: newReport.institutionalFlowAnalysis?.volumeEvidence || '',
      confidenceLevel: newReport.institutionalFlowAnalysis?.confidenceLevel || 'Low',
      riskWarning: newReport.institutionalFlowAnalysis?.riskWarning || ''
    },
    riskAnalysis: {
      overallRiskLevel: (newReport.finalActionPlan?.riskLevel || 'Medium').toUpperCase() as any,
      topRisks: [
        newReport.fundamentalAnalysis?.fundamentalRisk,
        newReport.newsCatalystAnalysis?.earningsRisk,
        newReport.newsCatalystAnalysis?.filingRisk
      ].filter(Boolean),
      marketRisk: newReport.newsCatalystAnalysis?.sectorMacroImpact || '',
      volatilityRisk: newReport.tacticalHorizonView?.riskMetrics?.volatilityRisk || '',
      liquidityRisk: newReport.tacticalHorizonView?.riskMetrics?.liquidityRisk || ''
    },
    disclaimer: newReport.disclaimer || 'Investingatti provides educational market insights only.'
  };
}

const SYSTEM_PROMPT = `Act as a senior equity research analyst, institutional trading strategist, and risk manager.

Your role is to analyze stock data provided by backend tools and produce a disciplined pre-decision report that helps the user decide whether to BUY, WAIT, HOLD, SELL, AVOID, or WATCHLIST.

You are NOT a financial advisor. This is decision-support analysis only.

CRITICAL RULES:
1. Analyze ONLY the structured data provided in the user message.
2. Do NOT invent missing prices, fundamentals, dark pool data, news, events, analyst ratings, institutional ownership, or options activity.
3. If any data is missing, stale, invalid, or unavailable, clearly state:
   - "Data unavailable"
   - "Insufficient data"
   - "Stale data"
   - "Not provided by backend"
4. Never guarantee profit, upside, multibagger outcome, or institutional buying.
5. All prices, levels, stop losses, targets, and valuation ranges must be based on actual provided data.
6. If the data quality is poor, the final decision must be WATCHLIST, WAIT, or AVOID — never BUY.
7. Do not recommend BUY unless the setup passes technical, risk/reward, liquidity, catalyst, and risk checks.
8. Always include:
   - Data quality check
   - Pre-decision checklist
   - Technical trend validation
   - Fundamental validation
   - News/catalyst validation
   - Institutional flow proxy validation
   - Risk/reward validation
   - Entry invalidation level
   - Stop-loss
   - Targets
   - Exit rules
   - Confidence score
   - Final action plan
9. The institutionalFlowSummary must begin exactly with:
   "PROXY SCORE ONLY — NOT OFFICIAL INSTITUTIONAL DATA."
10. Institutional flow proxy must never be described as confirmed dark pool activity unless actual dark pool data is explicitly provided.
11. If the stock is already extended, overbought, or near resistance, do not blindly recommend BUY. Prefer WAIT FOR PULLBACK or BREAKOUT CONFIRMATION.
12. If risk/reward is below 1:2, do not recommend a new trade unless explicitly marked as high-risk speculative.
13. Return ONLY valid JSON matching the schema. No markdown. No extra explanation outside JSON.
14. In "tacticalHorizonView", perform a comprehensive tactical setup analysis using the specified timeframe data and parameters:
    - "swingSetup": Analyze the swing setup using 1H / 4H timeframe bars, detailing the structural chart setup.
    - "entryTiming": Determine entry timing/triggers using the 15M and 5M timeframe bars.
    - "supportLevels" and "resistanceLevels": List the top 5 levels (as objects containing "price" (number) and "tests" (number of touches/tests in the charts)).
    - "suggestedEntryPrice", "suggestedExitPrice", "stopLossPrice": Suggest appropriate price points for this horizon.
    - "riskMetrics": Detail tactical risk parameters using ATR, support/resistance tests, volume analysis, and VWAP location relative to current price.
    - "catalysts": Evaluate upcoming catalysts focusing on news sentiment, earnings dates/risk, and SEC filings (offerings, quarterly reports, etc.).
    - "shortFilter": Evaluate short-selling pressure including borrow fee rates/availability, short interest percentage, SSR (Short Sale Restriction) status, and squeeze risk (low/medium/high).
    - "horizonDetails": Summarize the tactical outlook in 2-3 sentences.
15. In "technicalAnalysis.volumeTrendStatus", classify the current volume trend exactly as one of the following: 'GROWING_STRONGER', 'FADING', 'STABLE', 'UNUSUAL_SPIKE', or 'INSUFFICIENT_DATA'.
16. In "executiveSummary.summary", write a clear, layman-friendly explanation (2-3 paragraphs) of the analysis using the data. You must explicitly address:
    - The stock's current price and technical trend
    - Whether the stock shows signs of accumulation (institutional buying) or distribution (selling pressure)
    - Clear actionable advice (to BUY, HOLD, or SELL) with simple justifications
    - Return expectations in the near term (days/weeks) and long term (months/years)
    - A final, distinct paragraph starting exactly with the label "LAYMAN'S TAKEAWAY:" explaining the ultimate simple advice for non-technical users.
17. MANDATORY — In "executiveSummary", you MUST ALWAYS include ALL THREE arrays: "bullishFactors" (reasons why the stock could go up), "bearishFactors" (reasons why it could go down), and "neutralFactors" (factors that are not clearly bullish or bearish). Each array must have at least 1 string item. NEVER omit these fields.`;

const INSIGHTS_SYSTEM_PROMPT = `You are a senior equity research analyst specializing in corporate ecosystem analysis.

Given a stock ticker symbol, use your pre-trained knowledge base to produce a deep ecosystem analysis of the company. Do NOT reference any real-time data — use only your internal knowledge about the company up to your training cutoff.

You must research and return:
1. INVESTED COMPANIES: List companies this company has invested in or holds equity stakes in. For each, describe their current performance trajectory, any major upcoming events or catalysts (IPOs, product launches, regulatory decisions, contract wins), and explain exactly how those events could positively or negatively impact the parent stock.
2. SUPPLIERS: Key companies that supply critical components, raw materials, or services to this company. Explain the supply relationship and risk exposure.
3. OUTSOURCE PARTNERS: Companies this company outsources manufacturing, development, logistics, or other operations to.
4. MARKETING PARTNERS: Key advertising, distribution, or co-marketing partners.
5. KEY CUSTOMERS: Major customer segments or named corporate customers (B2B), and what shifts in their business could mean for the parent company.
6. STRATEGIC OUTLOOK: Summarize the overall ecosystem health, concentration risks, and which upcoming external events across this ecosystem are most likely to move the stock.

Return ONLY valid JSON matching this exact structure with no markdown or explanation:
{
  "investedCompanies": [
    {
      "name": "<company name>",
      "ownershipPct": "<estimated ownership % or null if unknown>",
      "performance": "<current performance trajectory summary>",
      "upcomingEvents": ["<specific upcoming event or catalyst>"],
      "impactPotential": "<how this event could positively or negatively affect the parent stock>"
    }
  ],
  "dependencies": {
    "suppliers": [
      { "name": "<name>", "role": "Supplier", "description": "<what they supply>", "riskExposure": "<impact on parent if disrupted>" }
    ],
    "outsourcePartners": [
      { "name": "<name>", "role": "Outsource Partner", "description": "<outsourced function>", "riskExposure": "<impact on parent if disrupted>" }
    ],
    "marketingPartners": [
      { "name": "<name>", "role": "Marketing Partner", "description": "<marketing/distribution channel>", "riskExposure": "<impact on parent>" }
    ],
    "customers": [
      { "name": "<customer segment or company>", "role": "Customer", "description": "<what they buy/use>", "riskExposure": "<impact on parent if this customer shrinks/grows>" }
    ]
  },
  "strategicOutlook": "<2-3 sentence summary of ecosystem health, concentration risk, and top externalities to watch>"
}`;

@Injectable()
export class OpenAIAnalystAgent {
  private readonly logger = new Logger(OpenAIAnalystAgent.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get('OPENAI_API_KEY') || 'mock-key-not-configured',
    });
    this.model = this.config.get('OPENAI_MODEL', 'gpt-4o');
  }

  private getPromptTemplate(filename: string, fallback: string): string {
    try {
      const filePath = path.join(process.cwd(), 'src/agents/prompts', filename);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
      }
      this.logger.warn(`Prompt file not found at ${filePath}. Using inline fallback.`);
      return fallback;
    } catch (err: any) {
      this.logger.error(`Failed to read prompt file ${filename}: ${err.message}`);
      return fallback;
    }
  }

  async run(params: {
    symbol: string;
    marketData: MarketDataResult;
    technicals: TechnicalAgentResult;
    fundamentals: FundamentalResult;
    news: NewsResult;
    institutionalFlow: InstitutionalFlowResult;
    historicalData: HistoricalDataResult;
  }): Promise<{ report: AnalystReport; promptTokens: number; completionTokens: number }> {
    this.logger.log(`Running OpenAI analysis for ${params.symbol}`);

    const prompt = this.buildPrompt(params);
    let attempt = 0;
    const maxAttempts = 2;

    const systemPrompt = this.getPromptTemplate('stock-analyst.system.md', SYSTEM_PROMPT);

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const completion = await this.openai.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 6000,
        });

        const rawContent = completion.choices[0]?.message?.content;
        if (!rawContent) throw new Error('Empty response from OpenAI');

        const parsed = JSON.parse(rawContent);
        let validated: AnalystReport;
        try {
          const newReport = NewAnalystReportSchema.parse(parsed);
          const adapted = mapNewAnalystReportToOld(newReport);
          validated = AnalystReportSchema.parse(adapted);
        } catch (err: any) {
          this.logger.warn(`Failed parsing using NewAnalystReportSchema, trying direct: ${err.message}`);
          validated = AnalystReportSchema.parse(parsed);
        }

        return {
          report: validated,
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
        };
      } catch (error) {
        this.logger.warn(`OpenAI attempt ${attempt} failed: ${error.message}`);
        if (attempt >= maxAttempts) throw error;
        await new Promise((r) => setTimeout(r, 2000)); // Wait before retry
      }
    }
  }

  async runCompanyInsights(symbol: string): Promise<{ companyInsights: z.infer<typeof CompanyInsightsSchema> | null; insightTokens: number }> {
    this.logger.log(`Running parallel ecosystem insights for ${symbol}`);
    try {
      const insightsSystemPrompt = this.getPromptTemplate('ecosystem-insights.system.md', INSIGHTS_SYSTEM_PROMPT);
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: insightsSystemPrompt },
          { role: 'user', content: `Analyze the ecosystem for stock ticker: ${symbol}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2500,
      });

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) return { companyInsights: null, insightTokens: 0 };

      const parsed = JSON.parse(rawContent);
      const validated = CompanyInsightsSchema.safeParse(parsed);
      if (!validated.success) {
        this.logger.warn(`CompanyInsights validation failed for ${symbol}: ${JSON.stringify(validated.error.errors)}`);
        return { companyInsights: null, insightTokens: completion.usage?.total_tokens || 0 };
      }

      return {
        companyInsights: validated.data,
        insightTokens: completion.usage?.total_tokens || 0,
      };
    } catch (error) {
      this.logger.warn(`CompanyInsights call failed for ${symbol}: ${error.message}`);
      return { companyInsights: null, insightTokens: 0 };
    }
  }

  async runFundAnalysis(symbol: string): Promise<{ report: any; promptTokens: number; completionTokens: number }> {
    this.logger.log(`Running OpenAI ETF/Fund analysis for ${symbol}`);

    const prompt = `Analyze the ETF or Mutual Fund with symbol: ${symbol} and generate a structured review.
Do NOT attempt to fetch live stock data, technical indicators, or news. Use your internal knowledge base to evaluate this fund.

Generate the analysis matching the required Fund JSON schema.`;

    const systemPrompt = this.getPromptTemplate('fund-analyst.system.md', `You are Investingatti’s Senior Fund Analyst & Investment Strategist. Produce a comprehensive review for symbol and return JSON.`);

    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const completion = await this.openai.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 4000,
        });

        const rawContent = completion.choices[0]?.message?.content;
        if (!rawContent) throw new Error('Empty response from OpenAI');

        const parsed = JSON.parse(rawContent);
        const validated = FundReportSchema.parse(parsed);

        return {
          report: validated,
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
        };
      } catch (error) {
        this.logger.warn(`OpenAI fund attempt ${attempt} failed: ${error.message}`);
        if (attempt >= maxAttempts) throw error;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  private buildPrompt(params: {
    symbol: string;
    marketData: MarketDataResult;
    technicals: TechnicalAgentResult;
    fundamentals: FundamentalResult;
    news: NewsResult;
    institutionalFlow: InstitutionalFlowResult;
    historicalData: HistoricalDataResult;
  }): string {
    const { symbol, marketData, technicals, fundamentals, news, institutionalFlow, historicalData } = params;
    
    const techTimeframes: any = {};
    for (const [tf, tech] of Object.entries(technicals.timeframes)) {
      if (tech) {
        techTimeframes[tf] = {
          overallBias: tech.overallBias,
          signals: tech.signals,
          rsi14: tech.rsi14,
          ema20: tech.ema20,
          ema50: tech.ema50,
          ema200: tech.ema200,
          sma20: tech.sma20,
          sma50: tech.sma50,
          sma200: tech.sma200,
          macdLine: tech.macdLine,
          macdSignal: tech.macdSignal,
          macdHist: tech.macdHist,
          bbUpper: tech.bbUpper,
          bbMiddle: tech.bbMiddle,
          bbLower: tech.bbLower,
          bbWidth: tech.bbWidth,
          atr14: tech.atr14,
          adx14: tech.adx14,
          plusDI: tech.plusDI,
          minusDI: tech.minusDI,
          relVolume: tech.relVolume,
          vwap: tech.vwap,
          supportLevels: tech.supportLevels,
          resistanceLevels: tech.resistanceLevels,
        };
      }
    }

    const timestamp = new Date().toISOString();

    const valuationDataStr = fundamentals.available && (fundamentals.peRatio || fundamentals.pbRatio)
      ? JSON.stringify({
          peRatio: fundamentals.peRatio,
          pbRatio: fundamentals.pbRatio,
          epsTrailing: fundamentals.epsTrailing,
          epsForward: fundamentals.epsForward,
          beta: fundamentals.beta,
        }, null, 2)
      : 'Insufficient valuation data';

    const dailyCandles = historicalData?.timeframes?.['1Day']?.candles || [];
    const candleCount = dailyCandles.length;
    const dataQualitySummary = {
      priceAvailable: marketData.available && marketData.price > 0,
      historicalCandlesCount: candleCount,
      historicalCandlesQuality: candleCount >= 120 ? 'sufficient' : 'insufficient',
      technicalsAvailable: technicals.available && technicals.primary != null,
      fundamentalsAvailable: fundamentals.available,
      newsCount: news.items?.length || 0,
      institutionalFlowAvailable: institutionalFlow.proxyScore != null,
    };

    const candleDataStr = dailyCandles.length > 0
      ? JSON.stringify(dailyCandles.slice(-252).map(c => ({
          date: c.timestamp.split('T')[0],
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: Number(c.volume)
        })), null, 2)
      : 'Insufficient historical candle data';

    return `Analyze the following stock data and return a pre-decision JSON analyst report.

SYMBOL: ${symbol}
ANALYSIS_DATE_TIME: ${timestamp}
## BACKEND DATA QUALITY CHECK
${JSON.stringify(dataQualitySummary, null, 2)}

## HISTORICAL CANDLES (1Day)
${candleDataStr}
USER_TRADING_STYLE: Short-term swing trading and tactical investing
PRIMARY_HORIZONS:
- Short-term trade: 1–5 days
- Swing trade: 2–6 weeks
- Position trade: 1–3 months
- Long-term investment: 6–24 months

USER_RISK_PROFILE:
{
  "riskTolerance": "MEDIUM_HIGH",
  "preferClearEntryBeforeBuying": true,
  "avoidChasingExtendedMoves": true,
  "minimumPreferredRiskReward": "1:2",
  "maxLossPerTradePercent": 2,
  "notes": "User wants decision support before buying, holding, selling, or avoiding."
}

## CURRENT MARKET DATA
${JSON.stringify({
  price: marketData.price,
  open: marketData.open,
  high: marketData.high,
  low: marketData.low,
  volume: marketData.volume,
  vwap: marketData.vwap,
  bid: marketData.bid,
  ask: marketData.ask,
  spread: marketData.spread,
  changePercent: marketData.changePercent,
  available: marketData.available,
}, null, 2)}

## TECHNICAL INDICATORS — MULTI TIMEFRAME
${JSON.stringify(techTimeframes, null, 2)}

Expected technical timeframes may include:
- 1Min
- 5Min
- 15Min
- 1Hour
- 4Hour
- 1Day
- 1Week

Use available timeframes only. Do not invent missing timeframes.

## FUNDAMENTAL DATA
${JSON.stringify({
  available: fundamentals.available,
  source: fundamentals.source,
  marketCap: fundamentals.marketCap,
  peRatio: fundamentals.peRatio,
  pbRatio: fundamentals.pbRatio,
  epsTrailing: fundamentals.epsTrailing,
  epsForward: fundamentals.epsForward,
  revenue: fundamentals.revenue,
  debtToEquity: fundamentals.debtToEquity,
  dividendYield: fundamentals.dividendYield,
  beta: fundamentals.beta,
  week52High: fundamentals.week52High,
  week52Low: fundamentals.week52Low,
  sector: fundamentals.sector,
  industry: fundamentals.industry,
  description: fundamentals.description,
}, null, 2)}

## VALUATION DATA
${valuationDataStr}

## NEWS AND EVENTS
${JSON.stringify({
  available: news.available,
  overallSentiment: news.sentiment,
  articles: news.items.slice(0, 5).map(n => ({
    headline: n.headline,
    sentiment: n.sentiment,
    source: n.source,
    publishedAt: n.publishedAt,
  })),
}, null, 2)}

## EARNINGS AND UPCOMING CATALYSTS
Earnings and upcoming catalysts data not provided by backend. Rely on news sentiment and general catalyst checklist.

## INSTITUTIONAL FLOW PROXY — NOT OFFICIAL DARK POOL DATA
${JSON.stringify({
  disclaimer: institutionalFlow.disclaimer,
  proxyScore: institutionalFlow.proxyScore,
  interpretation: institutionalFlow.interpretation,
  signals: institutionalFlow.signals,
  subScores: institutionalFlow.subScores,
}, null, 2)}

## OPTIONAL OPTIONS FLOW DATA
Options flow data unavailable

## OPTIONAL MARKET / SECTOR CONTEXT
Market/sector context unavailable

---

# ANALYSIS REQUIREMENTS

Before giving a final decision, perform the following checks.

## 1. Data Quality Check
Evaluate whether the data is complete enough to support a decision.

Check:
- Current price availability
- Volume availability
- Bid/ask spread
- VWAP availability
- Multi-timeframe technical availability
- Fundamental data availability
- News/catalyst availability
- Institutional proxy availability
- Whether data appears stale or incomplete

Classify data quality as:
- HIGH
- MEDIUM
- LOW
- INSUFFICIENT

If data quality is LOW or INSUFFICIENT, finalRating must be WATCHLIST, WAIT, or AVOID.

## 2. Trend and Price Action Check
Analyze:
- Is price above or below VWAP?
- Is price above or below EMA20, EMA50, EMA200?
- Are moving averages aligned bullishly or bearishly?
- Is the stock making higher highs/higher lows or lower highs/lower lows?
- Is the stock near resistance?
- Is the stock near support?
- Is price extended from EMA20 or VWAP?
- Is this a pullback entry, breakout entry, reversal entry, or chase-risk setup?

## 3. Momentum Check
Analyze:
- RSI level
- MACD direction
- ADX strength
- Bollinger Band position
- Relative volume
- Volume confirmation
- Overbought/oversold condition

Rules:
- RSI above 70 means overbought risk unless breakout volume confirms continuation.
- RSI below 30 means oversold, but not automatically a buy unless reversal confirmation exists.
- ADX above 20 supports trend strength.
- High relative volume supports conviction, but can also signal exhaustion near resistance.

## 4. Support, Resistance, and Entry Validation
Identify:
- Nearest support
- Nearest resistance
- Best entry zone
- Safer accumulation zone
- Breakout confirmation level
- Pullback buy zone
- Invalidation level
- Stop-loss level

Do not recommend buying directly into resistance unless there is clear breakout confirmation.

## 5. Risk/Reward Validation
Calculate:
- Entry price or entry range
- Stop-loss distance
- Target 1
- Target 2
- Target 3
- Risk/reward for each target

Rules:
- If risk/reward to Target 1 is less than 1:1.5, classify as poor setup.
- If risk/reward to Target 2 is less than 1:2, avoid aggressive BUY.
- If stop loss is too wide based on ATR, classify position as high risk.
- If spread is wide or volume is low, reduce confidence.

## 6. Fundamental Check
Analyze:
- Revenue growth
- EPS trend
- Profitability
- Margins
- Debt level
- Cash position
- Free cash flow
- Valuation ratios
- Sector and industry strength

Classify fundamentals as:
- STRONG
- IMPROVING
- MIXED
- WEAK
- INSUFFICIENT DATA

For unprofitable companies, focus on:
- Revenue growth
- Cash runway
- Debt pressure
- Margin improvement
- Forward EPS trend
- Dilution risk

## 7. Valuation Check
Classify the valuation as:
- UNDERVALUED
- FAIRLY_VALUED
- OVERVALUED
- EXTREMELY_OVERVALUED
- INSUFFICIENT_DATA

Use only provided valuation data.

Do not create DCF or fair value estimates unless the necessary data is provided.

## 8. News and Catalyst Check
Analyze:
- Recent news sentiment
- Earnings date proximity
- Analyst upgrades/downgrades if provided
- Product/company catalysts
- Regulatory risks
- Sector macro risk
- Any upcoming event that can increase volatility

If earnings are within the next 7 calendar days, flag the setup as "EARNINGS_RISK".

## 9. Institutional Flow Proxy Check
Analyze only the provided proxy data:
- Proxy score
- OBV trend
- Block trade proxy
- Volume delivery factor
- Accumulation/distribution interpretation

Important:
Institutional proxy score is not official dark pool data.
Do not claim confirmed institutional buying unless official institutional ownership or dark pool data is provided.

## 10. Decision Gate
Use this decision framework:

BUY only if:
- Data quality is MEDIUM or HIGH
- Technical trend is bullish or improving
- Entry is not too extended
- Risk/reward is acceptable
- Stop-loss is clearly defined
- Catalyst/news risk is not strongly negative
- Liquidity is acceptable
- Confidence score is at least 70

WAIT / WATCHLIST if:
- Trend is bullish but price is extended
- Stock is near resistance
- Risk/reward is not attractive yet
- Pullback entry is better
- Data is incomplete
- Catalyst risk is high

HOLD if:
- User already owns it and trend remains valid
- Price is above invalidation level
- Risk/reward still supports holding
- No major bearish catalyst is present

SELL / TRIM if:
- Price hits major resistance
- Trend breaks below key moving averages
- Stop-loss or invalidation level is breached
- News/fundamentals deteriorate
- Risk/reward turns unfavorable

AVOID if:
- Technicals are bearish
- Fundamentals are weak
- Data quality is poor
- Liquidity is poor
- Risk is very high
- There is no clear edge

---

# REQUIRED JSON OUTPUT SCHEMA

Return ONLY valid JSON in this exact structure:
{
  "symbol": "${symbol}",
  "analysisDateTime": "${timestamp}",
  "currentPrice": <number_or_null from market data>,
  "dataQuality": {
    "rating": "HIGH | MEDIUM | LOW | INSUFFICIENT",
    "missingFields": ["<missing_field>"],
    "staleDataWarning": "<string_or_null>",
    "decisionAllowed": <true_or_false>,
    "reason": "<string>"
  },
  "finalDecision": {
    "finalRating": "BUY | WAIT | HOLD | SELL | TRIM | WATCHLIST | AVOID",
    "decisionType": "TRADE | INVESTMENT | RISK_MANAGEMENT | NO_TRADE",
    "confidenceScore": <0_to_100>,
    "decisionSummary": "<clear 2-4 sentence explanation>",
    "shouldBuyNow": <true_or_false>,
    "buyNowReason": "<why buy now or why not>",
    "bestActionNow": "<specific action>"
  },
  "preDecisionChecklist": {
    "trendConfirmed": <true_or_false>,
    "momentumConfirmed": <true_or_false>,
    "volumeConfirmed": <true_or_false>,
    "entryNotExtended": <true_or_false>,
    "riskRewardAcceptable": <true_or_false>,
    "stopLossDefined": <true_or_false>,
    "nearResistanceRisk": <true_or_false>,
    "earningsRisk": <true_or_false>,
    "newsRiskAcceptable": <true_or_false>,
    "liquidityAcceptable": <true_or_false>,
    "finalChecklistPass": <true_or_false>
  },
  "executiveSummary": {
    "summary": "<layman-friendly 2-3 paragraph analysis of price trends, whether the stock shows accumulation or distribution, key recommendation (BUY/HOLD/SELL) and reasons, near-term/long-term return expectations, and a final paragraph starting with 'LAYMAN\\'S TAKEAWAY:' summarizing the ultimate advice for non-technical users>",
    "bullishFactors": ["<factor>"],
    "bearishFactors": ["<factor>"],
    "neutralFactors": ["<factor>"]
  },
  "technicalAnalysis": {
    "overallBias": "BULLISH | BEARISH | NEUTRAL | MIXED | INSUFFICIENT_DATA",
    "trendStage": "ACCUMULATION | MARKUP | DISTRIBUTION | MARKDOWN | SIDEWAYS | UNKNOWN",
    "setupType": "PULLBACK | BREAKOUT | REVERSAL | CONTINUATION | CHASE_RISK | NO_SETUP",
    "technicalScore": <0_to_100>,
    "keySignals": ["<signal>"],
    "supportLevels": [<number>],
    "resistanceLevels": [<number>],
    "vwapAnalysis": "<string>",
    "movingAverageAnalysis": "<string>",
    "rsiAnalysis": "<string>",
    "macdAnalysis": "<string>",
    "volumeAnalysis": "<string>",
    "volumeTrendStatus": "GROWING_STRONGER | FADING | STABLE | UNUSUAL_SPIKE | INSUFFICIENT_DATA",
    "atrVolatilityAnalysis": "<string>",
    "adxTrendStrengthAnalysis": "<string>",
    "bollingerBandAnalysis": "<string>"
  },
  "entryExitPlan": {
    "preferredEntryStyle": "BUY_NOW | WAIT_FOR_PULLBACK | BUY_BREAKOUT_CONFIRMATION | SCALE_IN | NO_TRADE",
    "buyNowZone": {
      "low": <number_or_null>,
      "high": <number_or_null>,
      "valid": <true_or_false>,
      "description": "<string>"
    },
    "pullbackEntryZone": {
      "low": <number_or_null>,
      "high": <number_or_null>,
      "description": "<string>"
    },
    "breakoutEntryLevel": {
      "price": <number_or_null>,
      "confirmationRule": "<string>"
    },
    "accumulationZone": {
      "low": <number_or_null>,
      "high": <number_or_null>,
      "description": "<string>"
    },
    "invalidationLevel": {
      "price": <number_or_null>,
      "reason": "<string>"
    },
    "stopLoss": {
      "price": <number_or_null>,
      "stopType": "TECHNICAL | ATR_BASED | SUPPORT_BREAK | VWAP_BREAK | NOT_AVAILABLE",
      "description": "<string>"
    },
    "targets": [
      {
        "label": "T1",
        "price": <number_or_null>,
        "reason": "<string>"
      },
      {
        "label": "T2",
        "price": <number_or_null>,
        "reason": "<string>"
      },
      {
        "label": "T3",
        "price": <number_or_null>,
        "reason": "<string>"
      }
    ],
    "exitRules": ["<specific exit rule>"]
  },
  "riskRewardAnalysis": {
    "entryReferencePrice": <number_or_null>,
    "riskPerShare": <number_or_null>,
    "rewardToTarget1": <number_or_null>,
    "rewardToTarget2": <number_or_null>,
    "rewardToTarget3": <number_or_null>,
    "riskRewardToTarget1": "<string_or_null>",
    "riskRewardToTarget2": "<string_or_null>",
    "riskRewardToTarget3": "<string_or_null>",
    "riskRewardVerdict": "GOOD | ACCEPTABLE | POOR | UNAVAILABLE",
    "positionSizingNote": "<general risk-based sizing note, not personalized financial advice>"
  },
  "shortTermView": {
    "horizon": "1-5 days",
    "bias": "BULLISH | BEARISH | NEUTRAL | MIXED",
    "tradeQuality": "A | B | C | D | F",
    "entryZone": {
      "low": <number_or_null>,
      "high": <number_or_null>,
      "description": "<string>"
    },
    "stopLoss": {
      "price": <number_or_null>,
      "description": "<string>"
    },
    "targets": [
      {
        "price": <number_or_null>,
        "label": "T1"
      },
      {
        "price": <number_or_null>,
        "label": "T2"
      },
      {
        "price": <number_or_null>,
        "label": "T3"
      }
    ],
    "exitRules": ["<rule>"]
  },
  "swingTradeView": {
    "horizon": "2-6 weeks",
    "bias": "BULLISH | BEARISH | NEUTRAL | MIXED",
    "entryZone": {
      "low": <number_or_null>,
      "high": <number_or_null>,
      "description": "<string>"
    },
    "accumulationZone": {
      "low": <number_or_null>,
      "high": <number_or_null>,
      "description": "<string>"
    },
    "stopLoss": {
      "price": <number_or_null>,
      "description": "<string>"
    },
    "targets": [
      {
        "price": <number_or_null>,
        "label": "T1"
      },
      {
        "price": <number_or_null>,
        "label": "T2"
      }
    ],
    "riskReward": "<string_or_null>",
    "swingVerdict": "BUY | WAIT | HOLD | SELL | WATCHLIST | AVOID"
  },
  "tacticalHorizonView": {
    "horizon": "5-15 days",
    "bias": "BULLISH | BEARISH | NEUTRAL | MIXED",
    "swingSetup": {
      "setup": "<string>",
      "analysis": "<string swing analysis using 1H/4H bars>"
    },
    "entryTiming": {
      "trigger": "<string>",
      "analysis": "<string entry timing using 15M/5M bars>"
    },
    "supportLevels": [
      { "price": <number>, "tests": <number> }
    ],
    "resistanceLevels": [
      { "price": <number>, "tests": <number> }
    ],
    "suggestedEntryPrice": <number_or_null>,
    "suggestedExitPrice": <number_or_null>,
    "stopLossPrice": <number_or_null>,
    "riskMetrics": {
      "atr": <number_or_null>,
      "atrAnalysis": "<string>",
      "vwap": <number_or_null>,
      "vwapAnalysis": "<string>",
      "volumeAnalysis": "<string>",
      "supportResistanceAnalysis": "<string>"
    },
    "catalysts": {
      "news": "<string>",
      "earnings": "<string>",
      "secFilings": "<string>"
    },
    "shortFilter": {
      "borrowFee": "<string>",
      "shortInterest": "<string>",
      "ssrStatus": "<string>",
      "squeezeRisk": "LOW | MEDIUM | HIGH"
    },
    "horizonDetails": "<string describing the structural setup and technical levels>"
  },
  "longTermView": {
    "horizon": "6-24 months",
    "bias": "BULLISH | BEARISH | NEUTRAL | MIXED | INSUFFICIENT_DATA",
    "investmentQuality": "STRONG | MODERATE | SPECULATIVE | WEAK | INSUFFICIENT_DATA",
    "fairValueRange": {
      "low": <number_or_null>,
      "high": <number_or_null>,
      "method": "<method_or_insufficient_data>"
    },
    "bullCase": "<string>",
    "baseCase": "<string>",
    "bearCase": "<string>",
    "longTermVerdict": "ACCUMULATE | HOLD | WAIT | AVOID | INSUFFICIENT_DATA"
  },
  "fundamentalAnalysis": {
    "fundamentalScore": <0_to_100_or_null>,
    "rating": "STRONG | IMPROVING | MIXED | WEAK | INSUFFICIENT_DATA",
    "revenueTrend": "<string>",
    "epsTrend": "<string>",
    "profitability": "<string>",
    "debtRisk": "<string>",
    "cashFlowQuality": "<string>",
    "valuationCommentary": "<string>"
  },
  "valuationAnalysis": {
    "valuationRating": "UNDERVALUED | FAIRLY_VALUED | OVERVALUED | EXTREMELY_OVERVALUED | INSUFFICIENT_DATA",
    "valuationScore": <0_to_100_or_null>,
    "peerComparisonAvailable": <true_or_false>,
    "fairValueRange": {
      "low": <number_or_null>,
      "high": <number_or_null>
    },
    "marginOfSafetyBuyZone": {
      "low": <number_or_null>,
      "high": <number_or_null>
    },
    "commentary": "<string>"
  },
  "newsAndCatalysts": {
    "newsCatalystScore": <0_to_100_or_null>,
    "overallSentiment": "POSITIVE | NEGATIVE | NEUTRAL | MIXED | UNAVAILABLE",
    "keyCatalysts": ["<catalyst>"],
    "keyRisksFromNews": ["<risk>"],
    "earningsRisk": "<string>",
    "catalystVerdict": "SUPPORTIVE | RISKY | NEUTRAL | UNAVAILABLE"
  },
  "institutionalFlowProxy": {
    "institutionalFlowProxyScore": <0_to_100_or_null>,
    "interpretation": "ACCUMULATION | DISTRIBUTION | NEUTRAL | UNAVAILABLE",
    "institutionalFlowSummary": "PROXY SCORE ONLY — NOT OFFICIAL INSTITUTIONAL DATA. <2-3 sentences>",
    "signals": ["<signal>"],
    "limitations": ["This is proxy analysis only and should not be treated as confirmed dark pool or institutional ownership data."]
  },
  "multibaggerProbability": {
    "rating": "LOW | MEDIUM | HIGH | VERY_HIGH | INSUFFICIENT_DATA",
    "probabilityScore": <0_to_100_or_null>,
    "reason": "<string>",
    "requiredConditions": ["<condition>"],
    "majorBlockers": ["<blocker>"]
  },
  "riskAnalysis": {
    "overallRiskLevel": "LOW | MEDIUM | HIGH | VERY_HIGH",
    "technicalRisk": "<string>",
    "fundamentalRisk": "<string>",
    "valuationRisk": "<string>",
    "newsRisk": "<string>",
    "liquidityRisk": "<string>",
    "eventRisk": "<string>",
    "topRisks": ["<risk>"]
  },
  "scenarioAnalysis": {
    "bullCase": {
      "condition": "<what must happen>",
      "pricePath": "<possible upside path>",
      "probability": "LOW | MEDIUM | HIGH"
    },
    "baseCase": {
      "condition": "<most likely condition>",
      "pricePath": "<likely path>",
      "probability": "LOW | MEDIUM | HIGH"
    },
    "bearCase": {
      "condition": "<what can go wrong>",
      "pricePath": "<downside path>",
      "probability": "LOW | MEDIUM | HIGH"
    }
  },
  "finalActionPlan": [
    "<step 1>",
    "<step 2>",
    "<step 3>"
  ],
  "doNotTradeConditions": [
    "<condition where user should avoid entry>"
  ],
  "alertLevels": {
    "buyAlert": <number_or_null>,
    "breakoutAlert": <number_or_null>,
    "stopLossAlert": <number_or_null>,
    "target1Alert": <number_or_null>,
    "target2Alert": <number_or_null>,
    "riskAlert": <number_or_null>
  },
  "disclaimer": "This analysis is for informational purposes only and does not constitute financial advice. All trading and investing involve risk. Past performance is not indicative of future results."
}`;
  }
}
