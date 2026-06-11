import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneProps } from '../MainVideo';
import { AnimatedPriceChart } from '../components/AnimatedPriceChart';

interface DailyTrendProps extends SceneProps {
  entryZone: string;
  stopLoss: string;
}

// 30-day daily price series showing the full trend
const buildMonthlyPrices = (entryHigh: number) => {
  const base = entryHigh * 0.88;
  return [
    { label: 'W-4', price: base * 0.972 },
    { label: '', price: base * 0.978 },
    { label: '', price: base * 0.985 },
    { label: '', price: base * 0.981 },
    { label: 'W-3', price: base * 0.992 },
    { label: '', price: base * 0.998 },
    { label: '', price: base * 1.005 },
    { label: '', price: base * 1.002 },
    { label: 'W-2', price: base * 1.014 },
    { label: '', price: base * 1.022 },
    { label: '', price: base * 1.028 },
    { label: '', price: base * 1.025 },
    { label: 'W-1', price: base * 1.038 },
    { label: '', price: base * 1.042 },
    { label: '', price: base * 1.045 },
    { label: '', price: base * 1.050 },
    { label: 'W0', price: base * 1.048 },
    { label: '', price: base * 1.040 },
    { label: '', price: base * 1.032 },
    { label: 'Now', price: entryHigh * 0.995 },
  ];
};

export const DailyTrendScene: React.FC<DailyTrendProps> = ({
  entryZone,
  stopLoss,
  dataFields,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });
  const p1 = spring({ frame: frame - 5, fps, from: 0, to: 1, config: { damping: 14 } });
  const p2 = spring({ frame: frame - 20, fps, from: 0, to: 1, config: { damping: 14 } });
  const p3 = spring({ frame: frame - 35, fps, from: 0, to: 1, config: { damping: 14 } });

  // Parse support/resistance from strings
  const parsePriceFromString = (str: string): number => {
    const match = str?.match(/[\d.]+/g);
    return match ? parseFloat(match[0]) : 0;
  };

  const entryParts = entryZone?.split(/[-–,]/) || [];
  const entryLow = parsePriceFromString(entryParts[0] || '400');
  const entryHigh = parsePriceFromString(entryParts[1] || '410');
  const stopPrice = parsePriceFromString(stopLoss || '399');
  const currentPrice = dataFields?.currentPrice as number || entryHigh * 1.02;

  const prices = buildMonthlyPrices(entryHigh);

  // Determine trend direction
  const trendUp = prices[prices.length - 1].price > prices[0].price;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', opacity }}>
      <div style={{
        backgroundColor: 'rgba(30, 41, 59, 0.75)',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        borderRadius: 24,
        padding: '18px 20px',
        width: '90%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
            Daily Trend — 30 Day View
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 800,
            color: trendUp ? '#22c55e' : '#ef4444',
            background: trendUp ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${trendUp ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            padding: '3px 10px',
            borderRadius: 6,
          }}>
            {trendUp ? 'UPTREND' : 'DOWNTREND'}
          </span>
        </div>

        {/* 30-Day Price Chart with support & resistance */}
        <AnimatedPriceChart
          prices={prices}
          currentPrice={currentPrice}
          supportLevel={entryLow}
          resistanceLevel={entryHigh * 1.036}
          title=""
        />

        {/* Key levels */}
        <div style={{ display: 'flex', gap: 8, opacity: p1, transform: `translateY(${(1 - p1) * 8}px)` }}>
          {[
            { label: 'Entry Low', value: `$${entryLow.toFixed(2)}`, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)' },
            { label: 'Entry High', value: `$${entryHigh.toFixed(2)}`, color: '#14b8a6', bg: 'rgba(20,184,166,0.1)', border: 'rgba(20,184,166,0.25)' },
            { label: 'Stop Loss', value: `$${stopPrice.toFixed(2)}`, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
          ].map(item => (
            <div key={item.label} style={{
              flex: 1,
              background: item.bg,
              border: `1px solid ${item.border}`,
              borderRadius: 10,
              padding: '8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 8, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: item.color, fontFamily: 'monospace' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Pattern observations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { icon: '↗', text: 'Higher highs structure intact on monthly timeframe', color: '#22c55e', p: p2 },
            { icon: '⚡', text: `Pullback to key support at $${entryLow.toFixed(0)} — potential re-entry zone`, color: '#f59e0b', p: p2 },
            { icon: '⚠', text: 'Price near resistance — wait for breakout or retest', color: '#94a3b8', p: p3 },
          ].map(obs => (
            <div key={obs.text} style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              background: '#0a0f1e',
              padding: '7px 10px',
              borderRadius: 9,
              border: '1px solid rgba(148,163,184,0.06)',
              opacity: obs.p,
              transform: `translateX(${(1 - obs.p) * -12}px)`,
            }}>
              <span style={{ fontSize: 13, color: obs.color }}>{obs.icon}</span>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{obs.text}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
