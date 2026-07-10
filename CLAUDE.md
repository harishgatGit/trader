# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

InvestingAtti — an AI-powered stock research platform for retail investors. It turns market data into
investment insights via text reports (multi-agent analysis, daily "What's For Today" market narrative)
and short-form/long-form videos, across a web app, mobile app, and backend services.

## Services

| Service | Path | Stack | Port |
|---|---|---|---|
| Backend | `backend/` | NestJS 10, TypeScript, Prisma, PostgreSQL, Redis, Bull/BullMQ | 3000 |
| Frontend | `frontend/` | React 19, Vite, TypeScript, Zustand, custom CSS | 5173 (dev) / 80 (nginx) |
| Video Agents Service | `video_agents_service/` | Python 3.11 FastAPI, OpenAI, edge-tts, Remotion, FFmpeg, SQLite | 8090 |
| Mobile App | `mobile-app/` | Expo (SDK 54), React Native, TypeScript, Zustand | — |
| YouTube Agent Service | `youtube_agent_service/` | NestJS 11, googleapis | — |

`youtube_agent_service/` is a **zombie service** — not wired into `docker-compose.yml`. Its YouTube-upload
functionality was migrated into `video_agents_service/app/main.py`. Don't build new features there; if
touching YouTube upload logic, the live code is in the Python service.

`mobile-app/` has its own `AGENTS.md` (imported via `mobile-app/CLAUDE.md`) warning that Expo APIs have
changed recently — read https://docs.expo.dev/versions/v54.0.0/ before writing Expo code there.

## Commands

Root (`npm run <script>` from repo root, drives backend+frontend together):
```
npm run install:all      # installs root + backend + frontend deps
npm run dev               # concurrently runs backend + frontend dev servers
npm run build              # builds backend then frontend
npm run docker:up          # docker-compose up --build (postgres, redis, backend, frontend, video-agents)
npm run docker:down
npm run prisma:migrate     # proxies to backend
npm run test                # proxies to backend jest suite
```

Backend (`backend/`):
```
npm run dev                          # nest start --watch
npm run build                        # nest build
npm run lint                          # eslint --fix
npm test                              # jest, all specs
npx jest path/to/file.spec.ts         # run a single spec
npx jest -t "test name"               # run tests matching a name
npm run test:e2e                      # jest --config ./test/jest-e2e.json
npm run prisma:generate               # regenerate Prisma client after schema.prisma changes
npm run prisma:migrate                # create + apply a dev migration
npm run prisma:studio                 # inspect DB via Prisma Studio
npm run trigger:trending              # runs src/trigger-trending-analysis.ts directly (admin one-off script)
```

Frontend (`frontend/`):
```
npm run dev        # vite --host 0.0.0.0
npm run build       # tsc && vite build
npm run lint          # eslint src --ext ts,tsx
```

Video Agents Service (`video_agents_service/`):
```
.\start_local.ps1                                     # Windows: creates venv, installs deps + Remotion node_modules, runs uvicorn
python -m uvicorn app.main:app --host 0.0.0.0 --port 8090 --reload   # manual run once venv is active
```
No automated test suite exists for this service — validation is done via `VideoValidationAgent`
(ffprobe checks) at the end of the render pipeline, not unit tests.

Mobile (`mobile-app/`):
```
npm start          # expo start
npm run android      # expo run:android
npm run ios          # expo run:ios
npm run web           # expo start --web
```

## Architecture

### Request flow
```
User → Frontend/Mobile → Backend (NestJS :3000, prefix /api)
                              │ fire-and-forget POST /video-jobs (10s timeout, errors swallowed)
                              ▼
                         Video Agents Service (:8090)
                              │ callback POST /api/video-callback (x-api-key header) at each status transition
                              ▼
                         Backend updates video_generation_jobs row
```
Backend analysis never blocks on or fails because of the video service being down — video generation is
strictly fire-and-forget from the analysis path.

### Backend analysis pipeline (`OrchestratorAgent.runFullAnalysis()`)
Runs in `backend/src/agents/`, orchestrated in phases:
1. **Phase 1 (parallel)**: `MarketDataAgent` (Alpaca snapshot), `HistoricalDataAgent` (multi-timeframe candles),
   `FundamentalAgent`, `NewsAgent`.
2. **Phase 2 (sequential, depends on Phase 1)**: `TechnicalAgent` — RSI, MACD, BB, EMA/SMA, ATR, OBV, ADX,
   support/resistance, computed by `technical-analysis.lib.ts`.
3. **Phase 3 (sequential, depends on Phase 2)**: `InstitutionalFlowAgent` — proxy institutional flow score
   (0-100) from volume/OBV/VWAP divergence.
4. **Phase 4 (parallel)**: `OpenAIAnalystAgent` (main GPT-4o structured report, Zod-validated, + a separate
   ecosystem-insights call), `DailyTrendAnalystAgent`, `TrendStoryAgent`, `SignalCorrelationAgent`.
5. Merge → persist to `agent_reports` (Postgres, JSONB) → fire-and-forget video job.

Fund symbols (`isFundSymbol()` in `analysis.service.ts`, hardcoded list — misses new ETFs silently) skip
straight to `OrchestratorAgent.runFundAnalysis()`: a single OpenAI call with no technical data.

Caching: analysis results cached in `agent_reports` for 5 min (SUPERUSER) / 15 min (BASIC). Cache hits still
rebuild live market/technical/news snapshots from DB on every request. A per-symbol in-flight promise
dedupes concurrent duplicate analysis requests for the same symbol.

Prompts live as markdown files read at runtime in `backend/src/agents/prompts/`.

### What's For Today pipeline
Runs 4x/day (Pre-Market, After Open, Mid-Market, Market Close) via
`backend/src/modules/whats-for-today/whats-for-today.scheduler.ts`. Each run gathers 4 index ETFs + 15
sector ETFs (fetched **sequentially**, a known perf gap) + ~75 stock snapshots + SPY news via Alpaca, then
one GPT-4o call (`json_object` mode, temp 0.3, max_tokens 8000 — a hard cap that can silently truncate).
Run 4 (Market Close) also triggers an EOD evaluation comparing pre-market predictions to actuals, saved to
`whats_for_today_feedback_logs` / `prompt_improvement_notes`.

The service supports two report schemas (`NewMarketReportOutputSchema` tried first, falls back to the old
`MarketReportOutputSchema`) via `mapNewReportToOld()`/`mapNewFeedbackToOld()` adapters — this is
in-progress migration debt, not intentional dual support; don't build new features on the old schema path.

### Video generation pipeline (`video_agents_service/app/agents/`)
Single-threaded daemon queue (one video at a time) runs 6-7 sequential agents per job:
`ReportNarrativeExtractor` → `VideoStoryAgent` (script) → `StoryboardAgent` (scene JSON) →
`VoiceoverAgent` (TTS, edge-tts or OpenAI TTS) → audio-duration alignment (rescales storyboard scene
durations to match actual TTS length) → `AnimationRenderAgent` (`npx remotion render`) →
`VideoValidationAgent` (ffprobe frame/stream checks).

Status lifecycle: `RECEIVED → QUEUED → REPORT_RECEIVED → SCRIPT_GENERATED → STORYBOARD_GENERATED →
VOICEOVER_GENERATED → ANIMATION_RENDERED → GENERATED | NOT_ELIGIBLE | ERROR | FAILED`. A job is
`NOT_ELIGIBLE` if a `GENERATED` video already exists for that ticker+date (unless `forceRegenerate`) or if
the report JSON is missing `finalRating`/`executiveSummary`.

Job state is persisted in both Postgres (`video_generation_jobs`, status mirror) and local SQLite
(`video_agents_service/outputs/video_jobs.db`, source of truth for the Python service, used for
recovery on restart).

Three video formats:
- **SHORTS** — per-ticker, vertical 9:16, 7 scenes, ~60-90s, voice `en-US-AnaNeural`/`nova`. Fired daily for
  top-5 trending tickers.
- **MARKET_RECAP** — whole-market aggregate (not per-ticker), landscape 1280x720, 11 fixed scenes, ~165s,
  built from WhatsForToday Run 4 data, voice `onyx`. Files: `video_agents_service/app/agents/market_recap_*.py`.
- **LONG_FORM** — defined in config as future work, not wired to any trigger path yet.

Both SHORTS (top-5) and MARKET_RECAP fire automatically from `EODVideoWorkflowService` via cron
`45 17 * * 1-5` America/New_York (5:45pm EST weekdays, right after market close).

### Data layer
PostgreSQL via Prisma is the system of record (`backend/prisma/schema.prisma`); SQLite in
`video_agents_service/outputs/video_jobs.db` is local job-tracking state for the Python service only.
Reports (`agent_reports.reportJson`) are immutable point-in-time JSONB snapshots, not updated in place.

### Auth
Custom session tokens (64-char hex) via `Authorization: Bearer <token>`, validated against the DB (not
JWT) with a 5-minute in-memory cache. Inter-service calls (backend ↔ video service) use a separate
`x-api-key` header, not user sessions. Roles: `BASIC` / `SUPERUSER` (admin + cache bypass).

## Known sharp edges (don't rediscover these)

- `VIDEO_SERVICE_API_KEY` has an insecure default (`"your-key"`) in both
  `backend/src/.../video-generation.client.ts` and `video_agents_service/app/config.py` — must be set via
  `.env`, never rely on the default outside local dev.
- The video service's CORS is wildcarded (`allow_origins=["*"]` in `app/main.py`) — it's meant to be
  reached only by the backend.
- Session store and the async analysis-job store (`analysis.service.ts`) are both in-memory `Map`s — they
  do not survive a backend restart/redeploy and won't work across multiple backend instances.
- Both `bull` and `bullmq` are installed in `backend/`; only Bull is actually used (alert worker). Don't add
  new BullMQ usage without consolidating.
- `hashPassword()` is duplicated in `auth.service.ts` and `admin.service.ts` — keep both in sync if you
  touch password hashing, or extract a shared util as part of the change.
