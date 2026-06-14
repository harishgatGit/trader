# InvestingAtti — Full Project Technical Documentation

> **Version**: 1.0 — June 2026  
> **Architecture**: Microservices — NestJS Backend · React Frontend · React Native Mobile · Python Video Agent Service

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Infrastructure & Deployment](#2-infrastructure--deployment)
3. [Service 1 — NestJS Backend](#3-service-1--nestjs-backend)
4. [Service 2 — React Frontend (Web)](#4-service-2--react-frontend-web)
5. [Service 3 — React Native Mobile App](#5-service-3--react-native-mobile-app)
6. [Service 4 — Python Video Agent Service](#6-service-4--python-video-agent-service)
7. [Data Architecture](#7-data-architecture)
8. [Inter-Service Communication](#8-inter-service-communication)
9. [AI Agent Pipeline](#9-ai-agent-pipeline)
10. [Security Model](#10-security-model)
11. [Environment Variables](#11-environment-variables)

---

## 1. System Overview

InvestingAtti is an **AI-powered stock analysis platform** that provides retail investors with institutional-grade stock analysis, trend insights, daily market context, and video summaries.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│                                                                     │
│   ┌──────────────────────┐    ┌───────────────────────────────┐    │
│   │   React Web App      │    │  React Native Mobile App      │    │
│   │   (Vite + TypeScript)│    │  (Expo + TypeScript)          │    │
│   │   Port: 5173         │    │  iOS & Android                │    │
│   └──────────┬───────────┘    └────────────────┬──────────────┘    │
└──────────────┼─────────────────────────────────┼───────────────────┘
               │ REST API                         │ REST API
               ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER                                  │
│                                                                     │
│            ┌────────────────────────────────┐                       │
│            │   NestJS Backend               │                       │
│            │   (TypeScript + Prisma)        │                       │
│            │   Port: 3000 / Prefix: /api    │                       │
│            └──────────┬─────────────────────┘                       │
│                       │ fire-and-forget HTTP                        │
│                       ▼                                             │
│            ┌────────────────────────────────┐                       │
│            │  Python Video Agent Service    │                       │
│            │  (FastAPI + Multi-Agent)       │                       │
│            │  Port: 8090                    │                       │
│            └────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
               │                     │
               ▼                     ▼
┌──────────────────────┐   ┌──────────────────────┐
│  PostgreSQL 15       │   │  Redis 7             │
│  Port: 5432          │   │  Port: 6379          │
│  Primary datastore   │   │  Cache + Session     │
└──────────────────────┘   └──────────────────────┘
```

### Core Features

| Feature | Description |
|---------|-------------|
| **Stock Analysis** | Full AI-powered multi-agent analysis: technicals, fundamentals, news, institutional flow |
| **What's For Today** | Pre-market, Open, Mid-market, Close daily market narrative reports |
| **Video Insights** | Auto-generated MP4 stock analysis videos via multi-agent pipeline |
| **Watchlist & Alerts** | Track symbols, set price/RSI/signal-based alerts |
| **Paper Trading** | Risk-managed simulated order execution via Alpaca |
| **Admin Dashboard** | User management, data quality monitoring, API connection health |
| **Reports** | Historical analysis report archive with PDF export |

---

## 2. Infrastructure & Deployment

### Docker Compose Services

| Container | Image/Build | Port | Role |
|-----------|-------------|------|------|
| `trader_postgres` | `postgres:15-alpine` | 5432 | Primary relational database |
| `trader_redis` | `redis:7-alpine` | 6379 | Session cache |
| `trader_backend` | `./backend` Dockerfile | 3000 | NestJS API server |
| `trader_frontend` | `./frontend` Dockerfile | 5173→80 | Vite SPA via nginx |
| `trader_video_agents` | `./video_agents_service` Dockerfile | 8090 | FastAPI video pipeline |

### Startup Order

```
postgres (healthy) ──┐
                     ├──► backend ──► (prisma migrate deploy → node dist/main.js)
redis (healthy) ─────┘
backend ─────────────────────────────► frontend
video-agents (independent — no dependency on backend startup)
```

### Health Checks

| Service | Endpoint | Notes |
|---------|----------|-------|
| Backend | `GET /api/health` | Checks DB + Redis connectivity |
| Video Agent | `GET /health` | Returns `{ status: "ok" }` |
| Postgres | `pg_isready` | Docker healthcheck |
| Redis | `redis-cli ping` | Docker healthcheck |

---

## 3. Service 1 — NestJS Backend

### Overview

| Property | Value |
|----------|-------|
| **Language** | TypeScript |
| **Framework** | NestJS v10 |
| **ORM** | Prisma v5 |
| **Database** | PostgreSQL 15 |
| **Queue** | Bull (Redis-backed) — alerts only |
| **Auth** | Custom session token (stored in DB) |
| **API Prefix** | `/api` |
| **Port** | `3000` |

### Module Structure

```
src/
├── agents/
│   ├── orchestrator.agent.ts         # Coordinates all agents
│   ├── market-data.agent.ts          # Real-time price/quote (Alpaca)
│   ├── historical-data.agent.ts      # OHLCV candles 1Min–1Day
│   ├── technical.agent.ts            # Calls technical-analysis.lib.ts
│   ├── technical-analysis.lib.ts     # Pure TA: RSI, MACD, BB, ATR, ADX, OBV...
│   ├── fundamental.agent.ts          # Yahoo Finance fundamentals
│   ├── news.agent.ts                 # Alpaca News + keyword sentiment
│   ├── institutional-flow.agent.ts   # Proxy institutional flow composite score
│   ├── openai-analyst.agent.ts       # GPT-4o structured report (main + ecosystem)
│   ├── daily-trend-analyst.agent.ts  # Intraday trend pattern
│   ├── trend-story.agent.ts          # Move narrative agent
│   ├── signal-correlation.agent.ts   # Multi-signal zone correlation
│   ├── alert.agent.ts                # Alert rule evaluation
│   ├── document-builder.agent.ts     # PDF report generation
│   └── prompts/
│       ├── stock-analyst.system.md
│       ├── trend-story.system.md
│       ├── signal-correlation.system.md
│       ├── daily-trend.system.md
│       ├── fund-analyst.system.md
│       └── ecosystem-insights.system.md
│
├── modules/
│   ├── health/                       # GET /api/health
│   ├── auth/                         # Login, Register, Logout, Me
│   ├── analysis/                     # POST /api/analysis (main trigger)
│   ├── reports/                      # Historical reports
│   ├── watchlist/                    # CRUD watchlist
│   ├── alerts/                       # CRUD alerts + trigger
│   ├── video/                        # Video job status, callback receiver
│   ├── admin/                        # Admin dashboard APIs
│   ├── stocks/                       # Quick stock lookup
│   ├── risk-settings/                # Paper trading risk config
│   ├── feedback/                     # User problem reports
│   ├── client-logs/                  # Frontend JS error ingest
│   ├── config-status/                # API connection health
│   └── whats-for-today/             # Daily market narrative
│
├── workers/
│   └── alert.worker.ts               # Bull queue consumer for alert evaluation
│
└── services/
    └── alpaca.service.ts             # Alpaca REST API wrapper
```

### API Endpoints

#### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Login → session token |
| POST | `/api/auth/logout` | User | Invalidate session |
| GET | `/api/auth/me` | User | Current user info |

#### Analysis
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/analysis` | User | Run full AI stock analysis |
| GET | `/api/reports` | User | List historical reports |
| GET | `/api/reports/:id` | User | Get report by ID |

#### Watchlist
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/watchlist` | User | Get watchlist |
| POST | `/api/watchlist` | User | Add symbol |
| DELETE | `/api/watchlist/:symbol` | User | Remove symbol |

#### Alerts
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/alerts` | User | List alerts |
| POST | `/api/alerts` | User | Create alert |
| PATCH | `/api/alerts/:id` | User | Update alert |
| DELETE | `/api/alerts/:id` | User | Delete alert |

#### Video Jobs
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/video-jobs/ticker/:ticker/:date` | User | Get video job status |
| GET | `/api/video-jobs/:jobId/video` | Public | Stream MP4 video file |
| POST | `/api/video-jobs/:jobId/retry` | User | Retry failed job |
| POST | `/api/video-callback` | API Key | Receive Python service status callbacks |

#### What's For Today
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/whats-for-today` | User | Latest daily market report |
| GET | `/api/whats-for-today/history` | User | Historical reports |

#### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | Public | Returns DB + Redis status |

### Full Analysis Flow

```
POST /api/analysis { symbol }
         │
         ▼
  Cache check (AgentReport < cacheLimitMins old?)
  YES ──► return cached + fireAndForget video if no video job today
  NO  ──► OrchestratorAgent.runFullAnalysis()
               │
               ├── Phase 1 (Parallel):
               │   ├── MarketDataAgent     (Alpaca real-time)
               │   ├── HistoricalDataAgent (Alpaca bars)
               │   ├── FundamentalAgent    (Yahoo Finance)
               │   └── NewsAgent           (Alpaca News)
               │
               ├── Phase 2: TechnicalAgent (depends on historical data)
               │
               ├── Phase 3: InstitutionalFlowAgent (depends on technical + market)
               │
               └── Phase 4 (Parallel):
                   ├── OpenAIAnalystAgent (main GPT-4o report)
                   ├── OpenAIAnalystAgent (ecosystem insights)
                   ├── DailyTrendAnalystAgent
                   ├── TrendStoryAgent
                   └── SignalCorrelationAgent
                            │
                            ▼
                   [Save to AgentReport DB]
                            │
                            ▼  fire-and-forget (non-blocking)
                   VideoJobService.fireAndForget()
```

### Caching Strategy

| Data | Cache Duration | Source |
|------|---------------|--------|
| Analysis report | 5 min (SUPERUSER) / 15 min (BASIC) | `AgentReport` DB |
| Fundamentals | 24 hours | `FundamentalSnapshot` DB |
| News | Always fresh | Alpaca real-time |
| Market data | Always fresh | Alpaca real-time |

### Database Tables

| Table | Purpose |
|-------|---------|
| `agent_reports` | Full AI report JSON, scores, ratings |
| `watchlists` | Tracked symbols |
| `alerts` / `alert_events` | Alert rules + trigger history |
| `market_snapshots` | Real-time price snapshots |
| `historical_prices` | OHLCV candle data |
| `technical_indicators` | TA computed snapshots |
| `fundamental_snapshots` | Fundamentals cache |
| `news_events` | Articles with sentiment |
| `institutional_flows` | Proxy flow score snapshots |
| `video_generation_jobs` | Video job status mirror |
| `daily_market_reports` | What's For Today reports |
| `sector_watch_items` | Sectors within WFT reports |
| `penny_stock_watch_items` | Penny stock daily list |
| `users` / `user_sessions` | Auth |
| `paper_orders` / `trade_logs` | Paper trading |
| `search_logs` | Search activity + geo |
| `ip_request_logs` | Traffic intelligence |
| `client_logs` | Frontend error log ingest |
| `problem_reports` | User feedback |
| `risk_settings` | Paper trading risk config |
| `api_connection_status` | External API health |

---

## 4. Service 2 — React Frontend (Web)

### Overview

| Property | Value |
|----------|-------|
| **Language** | TypeScript |
| **Framework** | React 18 + Vite |
| **Routing** | React Router v6 |
| **State** | Zustand |
| **Styling** | Vanilla CSS (custom design system) |
| **Port (dev)** | 5173 |
| **Port (prod)** | 80 (nginx) |

### Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `Dashboard.tsx` | Market overview, watchlist, recent analyses |
| `/analyze` | `Analyze.tsx` | Stock analysis trigger + full report |
| `/stock/:ticker` | `StockDetail.tsx` | Deep-dive stock report (all sections) |
| `/whats-for-today` | `WhatsForToday.tsx` | Daily market narrative |
| `/penny-stocks` | `PennyStocksToWatch.tsx` | Penny stock watchlist |
| `/watchlist` | `Watchlist.tsx` | Watchlist management |
| `/alerts` | `Alerts.tsx` | Alert creation and history |
| `/reports` | `Reports.tsx` | Historical analysis archive |
| `/education` | `Education.tsx` | Educational content |
| `/glossary` | `Glossary.tsx` | Financial terms glossary |
| `/profile` | `Profile.tsx` | User profile |
| `/settings` | `Settings.tsx` | App settings |
| `/login` | `Login.tsx` | User login |
| `/register` | `Register.tsx` | Registration |
| `/admin` | `Admin.tsx` | Admin dashboard (SUPERUSER) |
| `/admin/login` | `AdminLogin.tsx` | Admin authentication |

### Key Components

| Component | Purpose |
|-----------|---------|
| `Layout.tsx` | Navigation shell, sidebar, global header |
| `TrendStoryCard.tsx` | Rich visual trend story breakdown |
| `FeedbackWidget.tsx` | In-app problem reporting widget |
| `ui.tsx` | Shared UI primitives (Button, Card, Badge, etc.) |
| `DirectionalTransition.tsx` | Page transition animations |

---

## 5. Service 3 — React Native Mobile App

### Overview

| Property | Value |
|----------|-------|
| **Language** | TypeScript |
| **Framework** | React Native + Expo |
| **Navigation** | React Navigation |
| **State** | Zustand |
| **Target** | iOS + Android |

### Screens

| Screen | Description |
|--------|-------------|
| `HomeScreen` | Dashboard: market overview, top movers |
| `AnalyzeScreen` | Stock ticker input + analysis trigger |
| `StockInsightScreen` | Full analysis report (richest screen) |
| `WhatsForTodayScreen` | Daily market narrative |
| `WhatsForTodayStockDetailScreen` | Individual stock from WFT |
| `WatchlistScreen` | Watchlist management |
| `AlertsScreen` | Alert management |
| `PennyStocksScreen` | Penny stock watchlist |
| `ReportReaderScreen` | Historical report browser |
| `LoginScreen` | Authentication |
| `RegisterScreen` | Registration |
| `SettingsScreen` | App preferences |

---

## 6. Service 4 — Python Video Agent Service

### Overview

| Property | Value |
|----------|-------|
| **Language** | Python 3.11+ |
| **Framework** | FastAPI |
| **Queue** | In-process `threading.Queue` (sequential worker) |
| **DB** | SQLite (`outputs/video_jobs.db`) |
| **Rendering** | Remotion (Node.js) |
| **TTS** | Edge TTS (Microsoft Neural) |
| **Audio/Video** | FFmpeg |
| **Port** | `8090` |

### Agents

| Agent | Responsibility |
|-------|---------------|
| `ReportNarrativeExtractor` | Normalize pre-analyzed backend JSON into clean video input |
| `VideoStoryAgent` | Generate narration script (GPT-4o) |
| `StoryboardAgent` | Generate scene storyboard JSON (GPT-4o) |
| `VoiceoverAgent` | TTS audio generation + format normalization |
| `AnimationRenderAgent` | Remotion slide animation rendering |
| `VideoValidationAgent` | FFprobe quality validation |

### Services

| Service | Responsibility |
|---------|---------------|
| `StorageService` | Job directory management |
| `TTSService` | Edge TTS API wrapper |
| `FFmpegService` | FFmpeg/FFprobe subprocess management |
| `RemotionRenderer` | Remotion CLI subprocess management |
| `CallbackService` | HTTP callbacks to NestJS |

### Status Lifecycle

```
POST /video-jobs received
        │
   [RECEIVED] → DB logged
        │
   Eligibility check
   /          \
NOT_ELIGIBLE   [QUEUED]
callback NestJS    │
              Worker picks up
                   │
             REPORT_RECEIVED
             SCRIPT_GENERATED
             STORYBOARD_GENERATED
             VOICEOVER_GENERATED
             ANIMATION_RENDERED
              /           \
          GENERATED        ERROR
         callback NestJS  callback NestJS
```

### Eligibility Rules

1. `GENERATED` job already exists for same ticker+date → NOT_ELIGIBLE (unless forceRegenerate)
2. `reportJson` missing `finalRating` or `executiveSummary` → NOT_ELIGIBLE

---

## 7. Data Architecture

### Key Design Decisions

1. **Reports are immutable** — each `AgentReport` is a point-in-time snapshot
2. **Video jobs are mirrored** — NestJS table is a lightweight status mirror; Python SQLite is the source of truth
3. **Cache-before-agent** — all agents check DB for recent data before external API calls
4. **Graceful degradation** — missing fundamentals, news, or video never blocks analysis result
5. **Fire-and-forget video** — backend analysis never fails due to video service being down

---

## 8. Inter-Service Communication

### Backend → Video Agent

```
POST http://video-agents:8090/video-jobs
x-api-key: <VIDEO_SERVICE_API_KEY>
{ ticker, reportDate, reportId, reportJson, forceRegenerate }

Non-blocking — errors swallowed, logged as warnings.
```

### Video Agent → Backend (Callback)

```
POST http://backend:3000/api/video-callback
x-api-key: <CURRENT_APP_CALLBACK_API_KEY>
{ jobId, ticker, reportDate, status, videoUrl?, eligibilityNote?, artifacts{} }

Called at each status transition.
```

### Backend → Alpaca

- Market data: `https://data.alpaca.markets`
- Paper trading: `https://paper-api.alpaca.markets`
- Auth: Bearer `ALPACA_API_KEY` + `ALPACA_SECRET_KEY`

### Backend → OpenAI

- Model: GPT-4o (configurable)
- Structured JSON output via function calling
- 4–5 concurrent calls per full analysis

---

## 9. AI Agent Pipeline

### Technical Indicators Computed

| Category | Indicators |
|----------|-----------|
| **Trend** | EMA 20/50/200, SMA 20/50/200 |
| **Momentum** | RSI 14, MACD (12/26/9) |
| **Volatility** | Bollinger Bands, ATR 14 |
| **Volume** | OBV, Relative Volume, VWAP |
| **Trend Strength** | ADX 14, +DI, -DI |
| **Levels** | Support/Resistance from swing highs/lows |
| **Signals** | Golden/death cross, RSI divergence, BB squeeze |

### Signal Correlation Zones

`STRONG_BUY → BUY → WEAK_BUY → NEUTRAL → WEAK_SELL → SELL → STRONG_SELL`

---

## 10. Security Model

| Layer | Mechanism |
|-------|-----------|
| User auth | Session token in `Authorization: Bearer` header |
| Role access | `BASIC` (analysis) / `SUPERUSER` (admin + cache bypass) |
| Video API | `x-api-key` header on all inter-service calls |
| Rate limiting | 100 req/60s per IP (global throttle) |
| Paper trading | Alpaca paper API (never real money) |

---

## 11. Environment Variables Reference

### Backend

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | Model name (default: `gpt-4o`) |
| `ALPACA_API_KEY` | Alpaca broker key |
| `ALPACA_SECRET_KEY` | Alpaca broker secret |
| `VIDEO_SERVICE_URL` | Python video service URL |
| `VIDEO_SERVICE_API_KEY` | Outgoing API key for video service |
| `CURRENT_APP_CALLBACK_API_KEY` | Expected API key for video callbacks |
| `DISABLE_VIDEO_PIPELINE` | Set `true` to disable all video generation |

### Python Video Agent

| Variable | Purpose |
|----------|---------|
| `VIDEO_SERVICE_API_KEY` | Incoming request auth |
| `CURRENT_APP_CALLBACK_URL` | NestJS callback URL |
| `CURRENT_APP_CALLBACK_API_KEY` | Outgoing callback key |
| `OPENAI_API_KEY` | For script/storyboard generation |
| `TTS_VOICE` | Edge TTS voice name |
| `VIDEO_DB_PATH` | SQLite DB file path |
| `OUTPUT_BASE_DIR` | Video output directory |

---

*End of Technical Documentation — InvestingAtti v1.0*
