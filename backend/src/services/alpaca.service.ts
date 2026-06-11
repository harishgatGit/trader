import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface AlpacaBar {
  t: string;  // timestamp
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
  vw: number; // vwap
  n: number;  // trade count
}

export interface AlpacaQuote {
  ap: number; // ask price
  as: number; // ask size
  bp: number; // bid price
  bs: number; // bid size
  t: string;  // timestamp
}

export interface AlpacaTrade {
  p: number;  // price
  s: number;  // size
  t: string;  // timestamp
}

export interface AlpacaSnapshot {
  latestTrade: AlpacaTrade;
  latestQuote: AlpacaQuote;
  minuteBar: AlpacaBar;
  dailyBar: AlpacaBar;
  prevDailyBar: AlpacaBar;
}

export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  buying_power: string;
  regt_buying_power: string;
  daytrading_buying_power: string;
  non_marginable_buying_power: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  last_equity: string;
  long_market_value: string;
  short_market_value: string;
  initial_margin: string;
  maintenance_margin: string;
  pattern_day_trader: boolean;
  trade_suspended_by_user: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  shorting_enabled: boolean;
  daytrade_count: number;
  paper: boolean;
}

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  asset_marginable: boolean;
  qty: string;
  avg_entry_price: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  replaced_at: string | null;
  replaced_by: string | null;
  replaces: string | null;
  asset_id: string;
  symbol: string;
  asset_class: string;
  qty: string;
  filled_qty: string;
  type: string;
  side: string;
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  filled_avg_price: string | null;
  status: string;
  extended_hours: boolean;
  notional: string | null;
}

export interface AlpacaNewsItem {
  id: number;
  headline: string;
  author: string;
  created_at: string;
  updated_at: string;
  summary: string;
  url: string;
  images: Array<{ size: string; url: string }>;
  symbols: string[];
  source: string;
}

// ── Data Quality Probe ──────────────────────────────────────────────────────

export interface DataQualityFieldStatus {
  field: string;
  status: 'OK' | 'NULL' | 'ERROR' | 'EMPTY';
  value?: string | number | null;
  note?: string;
}

export interface DataQualityProbe {
  symbol: string;
  probedAt: string;
  overallHealth: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  healthScore: number; // 0-100
  snapshot: {
    available: boolean;
    httpStatus?: number;
    error?: string;
    fields: DataQualityFieldStatus[];
  };
  bars: {
    [timeframe: string]: {
      feed: 'iex' | 'sip' | 'none';
      barCount: number;
      available: boolean;
      firstBar?: string;
      lastBar?: string;
      error?: string;
    };
  };
  news: {
    available: boolean;
    articleCount: number;
    error?: string;
  };
  diagnosis: string[];
}

@Injectable()
export class AlpacaService {
  private readonly logger = new Logger(AlpacaService.name);
  private readonly dataClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly secretKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get('ALPACA_API_KEY', '');
    this.secretKey = this.config.get('ALPACA_SECRET_KEY', '');

    const dataBaseUrl = this.config.get('ALPACA_DATA_BASE_URL', 'https://data.alpaca.markets');

    const headers = {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.secretKey,
      'Content-Type': 'application/json',
    };

    this.dataClient = axios.create({
      baseURL: dataBaseUrl,
      headers,
      timeout: 15000,
    });
  }

  // ── Market Data ─────────────────────────────────────────────────

  async getSnapshot(symbol: string): Promise<AlpacaSnapshot | null> {
    try {
      const res = await this.dataClient.get(`/v2/stocks/${symbol}/snapshot`);
      return res.data;
    } catch (error) {
      this.logger.warn(`Snapshot fetch failed for ${symbol}: ${error.message}`);
      return null;
    }
  }

  async getSnapshots(symbols: string[]): Promise<Record<string, AlpacaSnapshot>> {
    if (symbols.length === 0) return {};
    try {
      const res = await this.dataClient.get('/v2/stocks/snapshots', {
        params: { symbols: symbols.join(',') },
      });
      return res.data?.snapshots || {};
    } catch (error) {
      this.logger.warn(`Snapshots fetch failed for ${symbols.join(',')}: ${error.message}`);
      return {};
    }
  }

  /**
   * Fetch bars with automatic IEX → SIP feed fallback.
   * IEX doesn't cover ETFs, mutual funds, or all OTC securities.
   * SIP (Securities Information Processor) covers all US-listed equities.
   */
  async getBars(
    symbol: string,
    timeframe: string = '1Day',
    limit: number = 100,
    start?: string,
    end?: string,
  ): Promise<AlpacaBar[]> {
    // Try IEX first (free tier compatible)
    try {
      const params: any = { timeframe, limit, feed: 'iex' };
      if (start) params.start = start;
      if (end) params.end = end;

      const res = await this.dataClient.get(`/v2/stocks/${symbol}/bars`, { params });
      const bars = res.data?.bars || [];

      if (bars.length > 0) return bars;

      // IEX returned empty — try SIP feed (covers ETFs, all NYSE/NASDAQ)
      this.logger.debug(`IEX returned 0 bars for ${symbol} ${timeframe}, trying SIP feed`);
    } catch (error) {
      this.logger.warn(`IEX bars fetch failed for ${symbol} ${timeframe}: ${error.message}`);
    }

    // SIP fallback
    try {
      const params: any = { timeframe, limit, feed: 'sip' };
      if (start) params.start = start;
      if (end) params.end = end;

      const res = await this.dataClient.get(`/v2/stocks/${symbol}/bars`, { params });
      const bars = res.data?.bars || [];
      if (bars.length > 0) {
        this.logger.debug(`SIP fallback succeeded for ${symbol} ${timeframe}: ${bars.length} bars`);
      }
      return bars;
    } catch (error) {
      this.logger.warn(`SIP bars fetch also failed for ${symbol} ${timeframe}: ${error.message}`);
      return [];
    }
  }

  async getLatestTrade(symbol: string): Promise<AlpacaTrade | null> {
    try {
      const res = await this.dataClient.get(`/v2/stocks/${symbol}/trades/latest`);
      return res.data?.trade || null;
    } catch (error) {
      this.logger.warn(`Latest trade fetch failed for ${symbol}: ${error.message}`);
      return null;
    }
  }

  async getLatestQuote(symbol: string): Promise<AlpacaQuote | null> {
    try {
      const res = await this.dataClient.get(`/v2/stocks/${symbol}/quotes/latest`);
      return res.data?.quote || null;
    } catch (error) {
      this.logger.warn(`Latest quote fetch failed for ${symbol}: ${error.message}`);
      return null;
    }
  }

  async getNews(symbol: string, limit: number = 10): Promise<AlpacaNewsItem[]> {
    try {
      const res = await this.dataClient.get('/v1beta1/news', {
        params: { symbols: symbol, limit },
      });
      return res.data?.news || [];
    } catch (error) {
      this.logger.warn(`News fetch failed for ${symbol}: ${error.message}`);
      return [];
    }
  }

  async isConnected(): Promise<{ data: boolean; trading: boolean }> {
    const dataOk = await this.testDataConnection();
    return { data: dataOk, trading: true };
  }

  async getAssets(): Promise<any[]> {
    try {
      const baseUrl = this.config.get('ALPACA_PAPER_BASE_URL', 'https://paper-api.alpaca.markets');
      const res = await this.dataClient.get(`${baseUrl}/v2/assets`, {
        baseURL: '', // Override baseURL since we are using full URL
        params: {
          status: 'active',
          asset_class: 'us_equity',
        },
        headers: {
          'APCA-API-KEY-ID': this.apiKey,
          'APCA-API-SECRET-KEY': this.secretKey,
        },
        timeout: 15000,
      });
      return res.data || [];
    } catch (error: any) {
      this.logger.error(`Failed to fetch assets from Alpaca: ${error.message}`);
      return [];
    }
  }

  // ── Data Quality Probe ───────────────────────────────────────────

  /**
   * Full field-level health probe for a single symbol.
   * Hits every Alpaca endpoint, tries IEX then SIP for bars,
   * and returns a structured DataQualityProbe report.
   */
  async probeSymbol(symbol: string): Promise<DataQualityProbe> {
    const probedAt = new Date().toISOString();
    const diagnosis: string[] = [];

    // ── 1. Snapshot probe ──────────────────────────────────────────
    let snapshotResult: DataQualityProbe['snapshot'] = { available: false, fields: [] };
    try {
      const res = await this.dataClient.get(`/v2/stocks/${symbol}/snapshot`);
      const snap: AlpacaSnapshot = res.data;
      snapshotResult.available = true;
      snapshotResult.httpStatus = res.status;

      const f = (field: string, value: any, note?: string): DataQualityFieldStatus => ({
        field,
        status: value != null && value !== 0 ? 'OK' : 'NULL',
        value: value != null ? String(value) : null,
        note,
      });

      snapshotResult.fields = [
        f('latestTrade.price', snap.latestTrade?.p),
        f('latestTrade.timestamp', snap.latestTrade?.t),
        f('latestQuote.bid', snap.latestQuote?.bp),
        f('latestQuote.ask', snap.latestQuote?.ap),
        f('dailyBar.open', snap.dailyBar?.o),
        f('dailyBar.high', snap.dailyBar?.h),
        f('dailyBar.low', snap.dailyBar?.l),
        f('dailyBar.close', snap.dailyBar?.c),
        f('dailyBar.volume', snap.dailyBar?.v),
        f('dailyBar.vwap', snap.dailyBar?.vw),
        f('prevDailyBar.close', snap.prevDailyBar?.c),
        f('minuteBar.close', snap.minuteBar?.c),
      ];

      const nullFields = snapshotResult.fields.filter(f => f.status === 'NULL').map(f => f.field);
      if (nullFields.length > 0) {
        diagnosis.push(`Snapshot has ${nullFields.length} null fields: ${nullFields.slice(0, 3).join(', ')}${nullFields.length > 3 ? '...' : ''}`);
      }
    } catch (error) {
      const httpStatus = error.response?.status;
      snapshotResult.available = false;
      snapshotResult.httpStatus = httpStatus;
      snapshotResult.error = `HTTP ${httpStatus || 'timeout'}: ${error.message}`;

      if (httpStatus === 422) {
        diagnosis.push(`Symbol not found on Alpaca IEX feed (HTTP 422) — may be ETF, mutual fund, or OTC`);
      } else if (httpStatus === 403) {
        diagnosis.push(`Access denied (HTTP 403) — subscription may not cover this symbol`);
      } else if (httpStatus === 429) {
        diagnosis.push(`Rate limited (HTTP 429) — too many requests`);
      } else {
        diagnosis.push(`Snapshot unavailable: ${error.message}`);
      }
    }

    // ── 2. Bars probe per timeframe (IEX then SIP) ─────────────────
    const barsResult: DataQualityProbe['bars'] = {};
    const timeframes = [
      { label: '1Day', alpaca: '1Day', daysBack: 30 },
      { label: '1Hour', alpaca: '1Hour', daysBack: 7 },
      { label: '15Min', alpaca: '15Min', daysBack: 2 },
      { label: '5Min', alpaca: '5Min', daysBack: 1 },
    ];

    for (const tf of timeframes) {
      const start = new Date(Date.now() - tf.daysBack * 24 * 60 * 60 * 1000).toISOString();

      // Try IEX
      let iexBars: AlpacaBar[] = [];
      let iexError: string | null = null;
      try {
        const res = await this.dataClient.get(`/v2/stocks/${symbol}/bars`, {
          params: { timeframe: tf.alpaca, limit: 50, feed: 'iex', start },
        });
        iexBars = res.data?.bars || [];
      } catch (e) {
        iexError = e.message;
      }

      if (iexBars.length > 0) {
        barsResult[tf.label] = {
          feed: 'iex',
          barCount: iexBars.length,
          available: true,
          firstBar: iexBars[0]?.t,
          lastBar: iexBars[iexBars.length - 1]?.t,
        };
        continue;
      }

      // IEX empty — try SIP
      let sipBars: AlpacaBar[] = [];
      let sipError: string | null = null;
      try {
        const res = await this.dataClient.get(`/v2/stocks/${symbol}/bars`, {
          params: { timeframe: tf.alpaca, limit: 50, feed: 'sip', start },
        });
        sipBars = res.data?.bars || [];
      } catch (e) {
        sipError = e.message;
      }

      if (sipBars.length > 0) {
        barsResult[tf.label] = {
          feed: 'sip',
          barCount: sipBars.length,
          available: true,
          firstBar: sipBars[0]?.t,
          lastBar: sipBars[sipBars.length - 1]?.t,
        };
        diagnosis.push(`${tf.label}: IEX returned 0 bars but SIP feed succeeded (${sipBars.length} bars) — symbol may be ETF/fund`);
      } else {
        barsResult[tf.label] = {
          feed: 'none',
          barCount: 0,
          available: false,
          error: sipError || iexError || 'Both IEX and SIP returned empty',
        };
        diagnosis.push(`${tf.label}: No bars from either IEX or SIP feed`);
      }
    }

    // ── 3. News probe ──────────────────────────────────────────────
    let newsResult: DataQualityProbe['news'] = { available: false, articleCount: 0 };
    try {
      const res = await this.dataClient.get('/v1beta1/news', {
        params: { symbols: symbol, limit: 5 },
      });
      const articles = res.data?.news || [];
      newsResult = { available: articles.length > 0, articleCount: articles.length };
      if (articles.length === 0) diagnosis.push('No news articles found for this symbol');
    } catch (error) {
      newsResult = { available: false, articleCount: 0, error: error.message };
    }

    // ── 4. Overall health score ────────────────────────────────────
    let score = 0;
    if (snapshotResult.available) score += 40;

    const okFields = snapshotResult.fields.filter(f => f.status === 'OK').length;
    const totalFields = snapshotResult.fields.length || 1;
    score += Math.round((okFields / totalFields) * 20);

    const availableBars = Object.values(barsResult).filter(b => b.available).length;
    score += Math.round((availableBars / timeframes.length) * 30);

    if (newsResult.available) score += 10;

    const overallHealth: DataQualityProbe['overallHealth'] =
      score >= 70 ? 'HEALTHY' : score >= 30 ? 'DEGRADED' : 'UNAVAILABLE';

    if (diagnosis.length === 0) {
      diagnosis.push('All data sources returned healthy data');
    }

    return {
      symbol,
      probedAt,
      overallHealth,
      healthScore: score,
      snapshot: snapshotResult,
      bars: barsResult,
      news: newsResult,
      diagnosis,
    };
  }

  private async testDataConnection(): Promise<boolean> {
    try {
      await this.dataClient.get('/v2/stocks/AAPL/snapshot');
      return true;
    } catch {
      return false;
    }
  }
}
