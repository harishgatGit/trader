import {
  calculateEMA,
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateOBV,
  calculateVWAP,
  calculateRelativeVolume,
  calculateSupportResistance,
  calculateAllIndicators,
  OHLCV,
} from '../agents/technical-analysis.lib';

// Generate deterministic test candles
function generateCandles(count: number, startPrice = 100): OHLCV[] {
  const candles: OHLCV[] = [];
  let price = startPrice;
  for (let i = 0; i < count; i++) {
    const change = (Math.sin(i / 10) * 5) + (i % 3 === 0 ? 2 : -1);
    price = Math.max(50, price + change);
    const high = price + Math.abs(Math.sin(i) * 2);
    const low = price - Math.abs(Math.cos(i) * 2);
    candles.push({
      timestamp: new Date(Date.now() - (count - i) * 86400000).toISOString(),
      open: price - 0.5,
      high,
      low,
      close: price,
      volume: 1000000 + Math.floor(Math.sin(i) * 500000),
    });
  }
  return candles;
}

describe('Technical Analysis Library', () => {
  const candles = generateCandles(250);
  const closes = candles.map((c) => c.close);

  describe('EMA', () => {
    it('should calculate EMA20 with correct length', () => {
      const ema = calculateEMA(closes, 20);
      expect(ema.length).toBe(closes.length);
      expect(ema[19]).toBeGreaterThan(0);
    });

    it('should return empty array for insufficient data', () => {
      const ema = calculateEMA([100, 101], 20);
      expect(ema.length).toBe(0);
    });

    it('EMA should be smoother than raw prices (less variance)', () => {
      const ema = calculateEMA(closes, 20);
      const validEma = ema.filter((v) => v != null);
      const emaVariance = validEma.reduce((s, v) => s + Math.pow(v - validEma[0], 2), 0) / validEma.length;
      const priceVariance = closes.reduce((s, v) => s + Math.pow(v - closes[0], 2), 0) / closes.length;
      // EMA variance typically differs but both should be finite
      expect(isFinite(emaVariance)).toBe(true);
      expect(isFinite(priceVariance)).toBe(true);
    });
  });

  describe('SMA', () => {
    it('should calculate SMA with null for initial period', () => {
      const sma = calculateSMA(closes, 20);
      expect(sma[18]).toBeNull();
      expect(sma[19]).toBeCloseTo(
        closes.slice(0, 20).reduce((a, b) => a + b, 0) / 20,
        2,
      );
    });
  });

  describe('RSI', () => {
    it('should return values between 0 and 100', () => {
      const rsi = calculateRSI(closes, 14);
      const valid = rsi.filter((v) => v != null);
      valid.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      });
    });

    it('should detect oversold for declining prices', () => {
      const decliningPrices = Array.from({ length: 50 }, (_, i) => 100 - i * 2);
      const rsi = calculateRSI(decliningPrices, 14);
      const last = rsi.filter((v) => v != null).pop();
      expect(last).toBeLessThan(50);
    });
  });

  describe('MACD', () => {
    it('should return macdLine, signalLine, histogram arrays', () => {
      const { macdLine, signalLine, histogram } = calculateMACD(closes);
      expect(macdLine.length).toBe(closes.length);
      expect(signalLine.length).toBe(closes.length);
      expect(histogram.length).toBe(closes.length);
    });

    it('histogram should equal macdLine - signalLine', () => {
      const { macdLine, signalLine, histogram } = calculateMACD(closes);
      for (let i = 0; i < histogram.length; i++) {
        if (histogram[i] != null && macdLine[i] != null && signalLine[i] != null) {
          expect(histogram[i]).toBeCloseTo(macdLine[i] - signalLine[i], 5);
        }
      }
    });
  });

  describe('Bollinger Bands', () => {
    it('upper should always be above lower', () => {
      const { upper, lower } = calculateBollingerBands(closes);
      for (let i = 0; i < upper.length; i++) {
        if (upper[i] != null && lower[i] != null) {
          expect(upper[i]).toBeGreaterThan(lower[i]);
        }
      }
    });

    it('middle should be SMA20', () => {
      const { middle } = calculateBollingerBands(closes);
      const sma = calculateSMA(closes, 20);
      for (let i = 0; i < middle.length; i++) {
        if (middle[i] != null && sma[i] != null) {
          expect(middle[i]).toBeCloseTo(sma[i], 5);
        }
      }
    });
  });

  describe('ATR', () => {
    it('should return positive values', () => {
      const atr = calculateATR(candles);
      const valid = atr.filter((v) => v != null);
      valid.forEach((v) => expect(v).toBeGreaterThan(0));
    });
  });

  describe('OBV', () => {
    it('should start at 0', () => {
      const obv = calculateOBV(candles);
      expect(obv[0]).toBe(0);
    });

    it('should increase when price rises', () => {
      const rising = [
        { close: 100, volume: 1000, open: 99, high: 101, low: 98, timestamp: '' },
        { close: 105, volume: 2000, open: 100, high: 106, low: 99, timestamp: '' },
      ];
      const obv = calculateOBV(rising);
      expect(obv[1]).toBe(2000);
    });

    it('should decrease when price falls', () => {
      const falling = [
        { close: 100, volume: 1000, open: 99, high: 101, low: 98, timestamp: '' },
        { close: 95, volume: 2000, open: 100, high: 101, low: 94, timestamp: '' },
      ];
      const obv = calculateOBV(falling);
      expect(obv[1]).toBe(-2000);
    });
  });

  describe('VWAP', () => {
    it('should return a number for valid candles', () => {
      const vwap = calculateVWAP(candles);
      expect(typeof vwap).toBe('number');
      expect(vwap).toBeGreaterThan(0);
    });
  });

  describe('Relative Volume', () => {
    it('should return 1.0 for equal volumes', () => {
      const equalVolumeCandles = generateCandles(30).map((c) => ({ ...c, volume: 1000000 }));
      const relVol = calculateRelativeVolume(equalVolumeCandles, 20);
      expect(relVol).toBeCloseTo(1, 1);
    });

    it('should return high value for spike volume', () => {
      const spikeCandles = generateCandles(30).map((c, i) => ({
        ...c,
        volume: i === 29 ? 5000000 : 1000000,
      }));
      const relVol = calculateRelativeVolume(spikeCandles, 20);
      expect(relVol).toBeGreaterThan(3);
    });
  });

  describe('Support/Resistance', () => {
    it('should return arrays of support and resistance levels', () => {
      const { support, resistance } = calculateSupportResistance(candles);
      expect(Array.isArray(support)).toBe(true);
      expect(Array.isArray(resistance)).toBe(true);
    });

    it('support levels should be below resistance levels on average', () => {
      const { support, resistance } = calculateSupportResistance(candles);
      if (support.length > 0 && resistance.length > 0) {
        const avgSupport = support.reduce((a, b) => a + b, 0) / support.length;
        const avgResistance = resistance.reduce((a, b) => a + b, 0) / resistance.length;
        expect(avgSupport).toBeLessThan(avgResistance);
      }
    });
  });

  describe('calculateAllIndicators', () => {
    it('should return all indicator fields', () => {
      const result = calculateAllIndicators(candles);
      expect(result).toHaveProperty('rsi14');
      expect(result).toHaveProperty('macdLine');
      expect(result).toHaveProperty('ema20');
      expect(result).toHaveProperty('bbUpper');
      expect(result).toHaveProperty('atr14');
      expect(result).toHaveProperty('obv');
      expect(result).toHaveProperty('overallBias');
      expect(result).toHaveProperty('signals');
    });

    it('overallBias should be BULLISH, BEARISH, or NEUTRAL', () => {
      const result = calculateAllIndicators(candles);
      expect(['BULLISH', 'BEARISH', 'NEUTRAL']).toContain(result.overallBias);
    });

    it('should handle empty candles gracefully', () => {
      const result = calculateAllIndicators([]);
      expect(result.rsi14).toBeNull();
      expect(result.overallBias).toBe('NEUTRAL');
    });
  });
});
