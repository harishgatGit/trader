-- CreateTable
CREATE TABLE "watchlists" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAnalyzedAt" TIMESTAMP(3),
    "latestRating" TEXT,
    "latestPrice" DOUBLE PRECISION,
    "latestSignal" TEXT,
    "notes" TEXT,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_snapshots" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" DOUBLE PRECISION,
    "open" DOUBLE PRECISION,
    "high" DOUBLE PRECISION,
    "low" DOUBLE PRECISION,
    "close" DOUBLE PRECISION,
    "volume" BIGINT,
    "vwap" DOUBLE PRECISION,
    "bid" DOUBLE PRECISION,
    "ask" DOUBLE PRECISION,
    "bidSize" INTEGER,
    "askSize" INTEGER,
    "spread" DOUBLE PRECISION,
    "raw" JSONB,

    CONSTRAINT "market_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historical_prices" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" BIGINT NOT NULL,
    "vwap" DOUBLE PRECISION,
    "tradeCount" INTEGER,

    CONSTRAINT "historical_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_indicators" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ema20" DOUBLE PRECISION,
    "ema50" DOUBLE PRECISION,
    "ema200" DOUBLE PRECISION,
    "sma20" DOUBLE PRECISION,
    "sma50" DOUBLE PRECISION,
    "sma200" DOUBLE PRECISION,
    "rsi14" DOUBLE PRECISION,
    "macdLine" DOUBLE PRECISION,
    "macdSignal" DOUBLE PRECISION,
    "macdHist" DOUBLE PRECISION,
    "bbUpper" DOUBLE PRECISION,
    "bbMiddle" DOUBLE PRECISION,
    "bbLower" DOUBLE PRECISION,
    "bbWidth" DOUBLE PRECISION,
    "atr14" DOUBLE PRECISION,
    "obv" BIGINT,
    "relVolume" DOUBLE PRECISION,
    "vwap" DOUBLE PRECISION,
    "adx14" DOUBLE PRECISION,
    "plusDI" DOUBLE PRECISION,
    "minusDI" DOUBLE PRECISION,
    "supportLevels" JSONB,
    "resistanceLevels" JSONB,
    "overallBias" TEXT,
    "signals" JSONB,

    CONSTRAINT "technical_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fundamental_snapshots" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "marketCap" DOUBLE PRECISION,
    "peRatio" DOUBLE PRECISION,
    "pbRatio" DOUBLE PRECISION,
    "epsTrailing" DOUBLE PRECISION,
    "epsForward" DOUBLE PRECISION,
    "revenue" DOUBLE PRECISION,
    "debtToEquity" DOUBLE PRECISION,
    "dividendYield" DOUBLE PRECISION,
    "beta" DOUBLE PRECISION,
    "week52High" DOUBLE PRECISION,
    "week52Low" DOUBLE PRECISION,
    "sector" TEXT,
    "industry" TEXT,
    "description" TEXT,
    "raw" JSONB,

    CONSTRAINT "fundamental_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_events" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT,
    "source" TEXT,
    "url" TEXT,
    "sentiment" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutional_flows" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proxyScore" DOUBLE PRECISION NOT NULL,
    "relVolumeScore" DOUBLE PRECISION,
    "obvTrendScore" DOUBLE PRECISION,
    "priceVwapScore" DOUBLE PRECISION,
    "pvDivergScore" DOUBLE PRECISION,
    "supportHoldScore" DOUBLE PRECISION,
    "breakoutVolScore" DOUBLE PRECISION,
    "largeBodyScore" DOUBLE PRECISION,
    "interpretation" TEXT,
    "signals" JSONB,
    "disclaimer" TEXT,

    CONSTRAINT "institutional_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_reports" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalRating" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "reportJson" JSONB NOT NULL,
    "currentPrice" DOUBLE PRECISION,
    "technicalScore" DOUBLE PRECISION,
    "fundamentalScore" DOUBLE PRECISION,
    "newsCatalystScore" DOUBLE PRECISION,
    "institutionalFlowProxyScore" DOUBLE PRECISION,
    "executiveSummary" TEXT,
    "processingTime" INTEGER,
    "openaiModel" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'completed',

    CONSTRAINT "agent_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT false,
    "notifyInApp" BOOLEAN NOT NULL DEFAULT true,
    "emailAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastChecked" TIMESTAMP(3),
    "lastTriggered" TIMESTAMP(3),
    "triggerCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_events" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_orders" (
    "id" TEXT NOT NULL,
    "alpacaOrderId" TEXT,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "qty" DOUBLE PRECISION,
    "notional" DOUBLE PRECISION,
    "limitPrice" DOUBLE PRECISION,
    "stopPrice" DOUBLE PRECISION,
    "timeInForce" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "filledQty" DOUBLE PRECISION,
    "filledPrice" DOUBLE PRECISION,
    "riskReward" DOUBLE PRECISION,
    "stopLoss" DOUBLE PRECISION,
    "target" DOUBLE PRECISION,
    "positionSizePercent" DOUBLE PRECISION,
    "isPreview" BOOLEAN NOT NULL DEFAULT false,
    "previewApproved" BOOLEAN NOT NULL DEFAULT false,
    "reportId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "filledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "raw" JSONB,

    CONSTRAINT "paper_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_logs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "symbol" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_settings" (
    "id" TEXT NOT NULL,
    "maxPositionSizePct" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "maxLossPerTradePct" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "minRiskReward" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "requireStopLoss" BOOLEAN NOT NULL DEFAULT true,
    "blockDuplicateWindow" INTEGER NOT NULL DEFAULT 24,
    "paperTradingOnly" BOOLEAN NOT NULL DEFAULT true,
    "maxDailyOrders" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_connection_status" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT,
    "latencyMs" INTEGER,

    CONSTRAINT "api_connection_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "watchlists_symbol_key" ON "watchlists"("symbol");

-- CreateIndex
CREATE INDEX "market_snapshots_symbol_timestamp_idx" ON "market_snapshots"("symbol", "timestamp");

-- CreateIndex
CREATE INDEX "historical_prices_symbol_timeframe_idx" ON "historical_prices"("symbol", "timeframe");

-- CreateIndex
CREATE UNIQUE INDEX "historical_prices_symbol_timeframe_timestamp_key" ON "historical_prices"("symbol", "timeframe", "timestamp");

-- CreateIndex
CREATE INDEX "technical_indicators_symbol_timeframe_timestamp_idx" ON "technical_indicators"("symbol", "timeframe", "timestamp");

-- CreateIndex
CREATE INDEX "fundamental_snapshots_symbol_timestamp_idx" ON "fundamental_snapshots"("symbol", "timestamp");

-- CreateIndex
CREATE INDEX "news_events_symbol_createdAt_idx" ON "news_events"("symbol", "createdAt");

-- CreateIndex
CREATE INDEX "institutional_flows_symbol_timestamp_idx" ON "institutional_flows"("symbol", "timestamp");

-- CreateIndex
CREATE INDEX "agent_reports_symbol_createdAt_idx" ON "agent_reports"("symbol", "createdAt");

-- CreateIndex
CREATE INDEX "alerts_symbol_enabled_idx" ON "alerts"("symbol", "enabled");

-- CreateIndex
CREATE INDEX "alert_events_alertId_triggeredAt_idx" ON "alert_events"("alertId", "triggeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "paper_orders_alpacaOrderId_key" ON "paper_orders"("alpacaOrderId");

-- CreateIndex
CREATE INDEX "paper_orders_symbol_createdAt_idx" ON "paper_orders"("symbol", "createdAt");

-- CreateIndex
CREATE INDEX "trade_logs_symbol_createdAt_idx" ON "trade_logs"("symbol", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "api_connection_status_service_key" ON "api_connection_status"("service");

-- AddForeignKey
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
