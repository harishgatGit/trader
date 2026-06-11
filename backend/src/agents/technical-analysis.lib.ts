/**
 * Technical Analysis Calculator
 * All calculations are deterministic and pure — no external API calls.
 * Input: OHLCV candle arrays (oldest first)
 */

export interface OHLCV {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface TechnicalResult {
  // Trend
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  // Momentum
  rsi14: number | null;
  rsi14Prev: number | null;
  macdLine: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  // Volatility
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  bbWidth: number | null;
  atr14: number | null;
  // Volume
  obv: number | null;
  relVolume: number | null;
  vwap: number | null;
  // Trend Strength
  adx14: number | null;
  plusDI: number | null;
  minusDI: number | null;
  // Support / Resistance
  supportLevels: number[];
  resistanceLevels: number[];
  // Signals
  overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  signals: string[];
}

// ── EMA ──────────────────────────────────────────────────────────
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = ema;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

// ── SMA ──────────────────────────────────────────────────────────
export function calculateSMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

// ── RSI ──────────────────────────────────────────────────────────
export function calculateRSI(prices: number[], period: number = 14): number[] {
  if (prices.length < period + 1) return [];
  const result: number[] = new Array(period).fill(null);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = 100 - 100 / (1 + rs);

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = Math.max(0, change);
    const loss = Math.max(0, -change);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rsi_rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = 100 - 100 / (1 + rsi_rs);
  }
  return result;
}

// ── MACD ─────────────────────────────────────────────────────────
export function calculateMACD(
  prices: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
  const ema12 = calculateEMA(prices, fastPeriod);
  const ema26 = calculateEMA(prices, slowPeriod);
  const macdLine: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (ema12[i] != null && ema26[i] != null) {
      macdLine.push(ema12[i] - ema26[i]);
    } else {
      macdLine.push(null);
    }
  }

  const validMacd = macdLine.filter((v) => v != null);
  const signalEMA = calculateEMA(validMacd, signalPeriod);
  const signalLine = new Array(macdLine.length).fill(null);
  let validIdx = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] != null) {
      signalLine[i] = signalEMA[validIdx];
      validIdx++;
    }
  }

  const histogram = macdLine.map((m, i) =>
    m != null && signalLine[i] != null ? m - signalLine[i] : null,
  );

  return { macdLine, signalLine, histogram };
}

// ── Bollinger Bands ───────────────────────────────────────────────
export function calculateBollingerBands(
  prices: number[],
  period = 20,
  stdDevMultiplier = 2,
): { upper: number[]; middle: number[]; lower: number[]; width: number[] } {
  const sma = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];
  const width: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (sma[i] == null) {
      upper.push(null);
      lower.push(null);
      width.push(null);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      const u = mean + stdDevMultiplier * stdDev;
      const l = mean - stdDevMultiplier * stdDev;
      upper.push(u);
      lower.push(l);
      width.push(mean !== 0 ? ((u - l) / mean) * 100 : 0);
    }
  }

  return { upper, middle: sma, lower, width };
}

// ── ATR ──────────────────────────────────────────────────────────
export function calculateATR(candles: OHLCV[], period = 14): number[] {
  const result: number[] = [null];
  const trueRanges: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose),
    );
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) return new Array(candles.length).fill(null);

  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const atrResult = new Array(period + 1).fill(null);
  atrResult[period] = atr;

  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
    atrResult.push(atr);
  }

  return atrResult;
}

// ── OBV ──────────────────────────────────────────────────────────
export function calculateOBV(candles: OHLCV[]): number[] {
  const result: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const prev = result[i - 1];
    if (candles[i].close > candles[i - 1].close) {
      result.push(prev + candles[i].volume);
    } else if (candles[i].close < candles[i - 1].close) {
      result.push(prev - candles[i].volume);
    } else {
      result.push(prev);
    }
  }
  return result;
}

// ── VWAP (session) ────────────────────────────────────────────────
export function calculateVWAP(candles: OHLCV[]): number | null {
  let totalVolume = 0;
  let totalTPV = 0;
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    totalTPV += tp * c.volume;
    totalVolume += c.volume;
  }
  return totalVolume > 0 ? totalTPV / totalVolume : null;
}

// ── ADX / DMI ─────────────────────────────────────────────────────
export function calculateADX(
  candles: OHLCV[],
  period = 14,
): { adx: number[]; plusDI: number[]; minusDI: number[] } {
  const n = candles.length;
  if (n < period + 1) {
    return {
      adx: new Array(n).fill(null),
      plusDI: new Array(n).fill(null),
      minusDI: new Array(n).fill(null),
    };
  }

  const tr: number[] = [0];
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];

  for (let i = 1; i < n; i++) {
    const highDiff = candles[i].high - candles[i - 1].high;
    const lowDiff = candles[i - 1].low - candles[i].low;
    const prevClose = candles[i - 1].close;

    tr.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - prevClose),
        Math.abs(candles[i].low - prevClose),
      ),
    );
    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
  }

  const smoothedTR = smoothWilder(tr, period);
  const smoothedPlusDM = smoothWilder(plusDM, period);
  const smoothedMinusDM = smoothWilder(minusDM, period);

  const plusDIArr = smoothedPlusDM.map((v, i) =>
    smoothedTR[i] > 0 ? (v / smoothedTR[i]) * 100 : null,
  );
  const minusDIArr = smoothedMinusDM.map((v, i) =>
    smoothedTR[i] > 0 ? (v / smoothedTR[i]) * 100 : null,
  );

  const dx = plusDIArr.map((p, i) => {
    const m = minusDIArr[i];
    if (p == null || m == null) return null;
    const sum = p + m;
    return sum > 0 ? (Math.abs(p - m) / sum) * 100 : 0;
  });

  const adxArr = smoothWilder(dx.filter((v) => v != null) as number[], period);
  const adxResult = new Array(n).fill(null);
  let adxIdx = 0;
  for (let i = 0; i < n; i++) {
    if (dx[i] != null) {
      adxResult[i] = adxArr[adxIdx] || null;
      adxIdx++;
    }
  }

  return { adx: adxResult, plusDI: plusDIArr, minusDI: minusDIArr };
}

function smoothWilder(data: number[], period: number): number[] {
  if (data.length < period) return new Array(data.length).fill(null);
  const result: number[] = new Array(period - 1).fill(null);
  let sum = data.slice(0, period).reduce((a, b) => a + b, 0);
  result.push(sum);
  for (let i = period; i < data.length; i++) {
    sum = sum - sum / period + data[i];
    result.push(sum);
  }
  return result;
}

// ── Relative Volume ───────────────────────────────────────────────
export function calculateRelativeVolume(candles: OHLCV[], lookback = 20): number | null {
  if (candles.length < lookback + 1) return null;
  const recent = candles[candles.length - 1].volume;
  const avgVol =
    candles
      .slice(candles.length - 1 - lookback, candles.length - 1)
      .reduce((sum, c) => sum + c.volume, 0) / lookback;
  return avgVol > 0 ? recent / avgVol : null;
}

// ── Support / Resistance ──────────────────────────────────────────
export function calculateSupportResistance(
  candles: OHLCV[],
  lookback = 50,
  pivotStrength = 3,
): { support: number[]; resistance: number[] } {
  const recent = candles.slice(-lookback);
  const supports: number[] = [];
  const resistances: number[] = [];

  for (let i = pivotStrength; i < recent.length - pivotStrength; i++) {
    const window = recent.slice(i - pivotStrength, i + pivotStrength + 1);
    const lows = window.map((c) => c.low);
    const highs = window.map((c) => c.high);

    if (recent[i].low === Math.min(...lows)) {
      supports.push(recent[i].low);
    }
    if (recent[i].high === Math.max(...highs)) {
      resistances.push(recent[i].high);
    }
  }

  // Cluster nearby levels (within 0.5%)
  return {
    support: clusterLevels(supports, 0.005).slice(-5),
    resistance: clusterLevels(resistances, 0.005).slice(-5),
  };
}

function clusterLevels(levels: number[], tolerance: number): number[] {
  if (levels.length === 0) return [];
  const sorted = [...levels].sort((a, b) => a - b);
  const clusters: number[][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    const last = clusters[clusters.length - 1];
    const avg = last.reduce((a, b) => a + b, 0) / last.length;
    if (Math.abs(sorted[i] - avg) / avg < tolerance) {
      last.push(sorted[i]);
    } else {
      clusters.push([sorted[i]]);
    }
  }

  return clusters.map((c) => +(c.reduce((a, b) => a + b, 0) / c.length).toFixed(2));
}

// ── Main Calculate All ────────────────────────────────────────────
export function calculateAllIndicators(candles: OHLCV[]): TechnicalResult {
  if (!candles || candles.length < 2) {
    return emptyResult();
  }

  const closes = candles.map((c) => c.close);
  const n = candles.length;

  // EMAs
  const ema20Arr = calculateEMA(closes, 20);
  const ema50Arr = calculateEMA(closes, 50);
  const ema200Arr = calculateEMA(closes, 200);

  // SMAs
  const sma20Arr = calculateSMA(closes, 20);
  const sma50Arr = calculateSMA(closes, 50);
  const sma200Arr = calculateSMA(closes, 200);

  // RSI
  const rsiArr = calculateRSI(closes, 14);

  // MACD
  const { macdLine, signalLine, histogram } = calculateMACD(closes);

  // Bollinger Bands
  const bb = calculateBollingerBands(closes);

  // ATR
  const atrArr = calculateATR(candles);

  // OBV
  const obvArr = calculateOBV(candles);

  // VWAP
  const vwap = calculateVWAP(candles.slice(-20)); // last 20 bars as proxy

  // ADX
  const { adx, plusDI, minusDI } = calculateADX(candles);

  // Relative Volume
  const relVolume = calculateRelativeVolume(candles);

  // Support / Resistance
  const { support, resistance } = calculateSupportResistance(candles);

  // Get latest values
  const ema20 = lastNonNull(ema20Arr);
  const ema50 = lastNonNull(ema50Arr);
  const ema200 = lastNonNull(ema200Arr);
  const sma20 = lastNonNull(sma20Arr);
  const sma50 = lastNonNull(sma50Arr);
  const sma200 = lastNonNull(sma200Arr);
  const rsi14 = lastNonNull(rsiArr);
  const rsi14Prev = secondLastNonNull(rsiArr);
  const macdLineVal = lastNonNull(macdLine);
  const macdSignalVal = lastNonNull(signalLine);
  const macdHistVal = lastNonNull(histogram);
  const bbUpper = lastNonNull(bb.upper);
  const bbMiddle = lastNonNull(bb.middle);
  const bbLower = lastNonNull(bb.lower);
  const bbWidth = lastNonNull(bb.width);
  const atr14 = lastNonNull(atrArr);
  const obv = lastNonNull(obvArr);
  const adx14 = lastNonNull(adx);
  const plusDIVal = lastNonNull(plusDI);
  const minusDIVal = lastNonNull(minusDI);

  const currentPrice = closes[n - 1];

  // ── Signal generation ───────────────────────────────────────────
  const signals: string[] = [];
  let bullishPoints = 0;
  let bearishPoints = 0;

  if (rsi14 != null) {
    if (rsi14 < 30) { signals.push('RSI oversold (<30)'); bullishPoints += 2; }
    else if (rsi14 > 70) { signals.push('RSI overbought (>70)'); bearishPoints += 2; }
    else if (rsi14 < 50) bearishPoints++;
    else bullishPoints++;
  }

  if (macdHistVal != null && macdLineVal != null) {
    if (macdHistVal > 0 && macdLineVal > 0) { signals.push('MACD bullish'); bullishPoints += 2; }
    else if (macdHistVal < 0 && macdLineVal < 0) { signals.push('MACD bearish'); bearishPoints += 2; }
    else if (macdHistVal > 0) { signals.push('MACD histogram positive'); bullishPoints++; }
    else { signals.push('MACD histogram negative'); bearishPoints++; }
  }

  if (ema20 && ema50 && currentPrice) {
    if (currentPrice > ema20 && ema20 > ema50) { signals.push('Price above EMA20 > EMA50'); bullishPoints += 2; }
    else if (currentPrice < ema20 && ema20 < ema50) { signals.push('Price below EMA20 < EMA50'); bearishPoints += 2; }
  }

  if (ema50 && ema200) {
    if (ema50 > ema200) { signals.push('Golden cross (EMA50 > EMA200)'); bullishPoints += 2; }
    else { signals.push('Death cross (EMA50 < EMA200)'); bearishPoints += 2; }
  }

  if (vwap && currentPrice) {
    if (currentPrice > vwap) { signals.push('Price above VWAP'); bullishPoints++; }
    else { signals.push('Price below VWAP'); bearishPoints++; }
  }

  if (adx14 != null && plusDIVal != null && minusDIVal != null) {
    if (adx14 > 25) {
      if (plusDIVal > minusDIVal) { signals.push('Strong uptrend (ADX>25, +DI>-DI)'); bullishPoints += 2; }
      else { signals.push('Strong downtrend (ADX>25, -DI>+DI)'); bearishPoints += 2; }
    } else {
      signals.push('Weak trend (ADX<25)');
    }
  }

  if (bbWidth != null && bbWidth < 5) signals.push('Bollinger Band squeeze (low volatility)');
  if (relVolume != null && relVolume > 2) { signals.push('High relative volume (>2x avg)'); bullishPoints++; }

  const overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
    bullishPoints > bearishPoints + 2
      ? 'BULLISH'
      : bearishPoints > bullishPoints + 2
      ? 'BEARISH'
      : 'NEUTRAL';

  return {
    ema20, ema50, ema200, sma20, sma50, sma200,
    rsi14, rsi14Prev, macdLine: macdLineVal, macdSignal: macdSignalVal, macdHist: macdHistVal,
    bbUpper, bbMiddle, bbLower, bbWidth, atr14,
    obv: obv != null ? Math.round(obv) : null,
    relVolume, vwap, adx14, plusDI: plusDIVal, minusDI: minusDIVal,
    supportLevels: support, resistanceLevels: resistance,
    overallBias, signals,
  };
}

function lastNonNull<T>(arr: T[]): T | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] != null) return arr[i];
  }
  return null;
}

function secondLastNonNull<T>(arr: T[]): T | null {
  let foundFirst = false;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] != null) {
      if (foundFirst) return arr[i];
      foundFirst = true;
    }
  }
  return null;
}

function emptyResult(): TechnicalResult {
  return {
    ema20: null, ema50: null, ema200: null,
    sma20: null, sma50: null, sma200: null,
    rsi14: null, rsi14Prev: null, macdLine: null, macdSignal: null, macdHist: null,
    bbUpper: null, bbMiddle: null, bbLower: null, bbWidth: null,
    atr14: null, obv: null, relVolume: null, vwap: null,
    adx14: null, plusDI: null, minusDI: null,
    supportLevels: [], resistanceLevels: [],
    overallBias: 'NEUTRAL', signals: [],
  };
}
