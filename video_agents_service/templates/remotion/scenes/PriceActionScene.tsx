import React from 'react';
import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { SceneProps } from '../MainVideo';
import { AnimatedPriceChart } from '../components/AnimatedPriceChart';

interface PriceActionProps extends SceneProps {
  currentPrice: number;
  dayChangePct: number;
  overallSignal: string;
}

// Simulated intraday price points that show the pullback pattern
const buildIntradayPrices = (currentPrice: number, dayChangePct: number) => {
  const open = currentPrice / (1 + dayChangePct / 100);
  // Simulate an intraday arc: up in AM, sold off in PM
  const points = [
    { label: '9:30', price: open },
    { label: '10:00', price: open * 1.008 },
    { label: '10:30', price: open * 1.015 },
    { label: '11:00', price: open * 1.012 },
    { label: '11:30', price: open * 1.018 },
    { label: '12:00', price: open * 1.010 },
    { label: '13:00', price: open * 0.998 },
    { label: '14:00', price: open * 0.990 },
    { label: '14:30', price: open * 0.985 },
    { label: '15:00', price: open * 0.980 },
    { label: '15:30', price: open * 0.978 },
    { label: '4:00', price: currentPrice },
  ];
  return points;
};

const buildIntradayVolumes = (dayChangePct: number) => {
  // Heavy volume at open and close, low midday
  const isDown = dayChangePct < 0;
  return [85, 70, 45, 38, 30, 25, 42, 55, 60, 72, 78, 90].map((v, i) => ({
    relative: v,
    isUp: i < 5, // morning is up, afternoon sells off
  }));
};

export const PriceActionScene: React.FC<PriceActionProps> = ({
  currentPrice,
  dayChangePct,
  overallSignal,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });
  const countProgress = spring({ frame, fps, from: 0, to: 1, config: { damping: 18, stiffness: 60 } });
  const statsProgress = spring({ frame: frame - 12, fps, from: 0, to: 1, config: { damping: 14 } });

  const displayedPrice = (currentPrice * countProgress).toFixed(2);
  const isPositive = dayChangePct >= 0;
  const color = isPositive ? '#22c55e' : '#ef4444';

  const open = currentPrice / (1 + dayChangePct / 100);
  const dayHigh = Math.max(open, currentPrice) * 1.012;
  const dayLow = Math.min(open, currentPrice) * 0.987;

  const prices = buildIntradayPrices(currentPrice, dayChangePct);
  const volData = buildIntradayVolumes(dayChangePct);

  const volumeBars = prices.map((p, i) => ({
    label: p.label,
    value: volData[i]?.relative ?? 50,
    isUp: volData[i]?.isUp ?? true,
  }));

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
        gap: 14,
      }}>

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Current Price</div>
            <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', fontFamily: 'monospace', lineHeight: 1.1 }}>
              ${displayedPrice}
            </div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
              Open: ${open.toFixed(2)}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              background: isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${color}44`,
              borderRadius: 10,
              padding: '6px 14px',
              marginBottom: 6,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Day Change</div>
              <div style={{ fontSize: 22, fontWeight: 900, color }}>{isPositive ? '+' : ''}{dayChangePct.toFixed(2)}%</div>
            </div>
            <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>
              H: ${dayHigh.toFixed(2)} / L: ${dayLow.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Intraday Price Chart */}
        <AnimatedPriceChart
          prices={prices}
          currentPrice={currentPrice}
          title="Intraday Price Action"
        />

        {/* Intraday Volume Chart */}
        <AnimatedVolumeInline bars={volumeBars} />

        {/* Stats row */}
        <div style={{
          display: 'flex',
          gap: 8,
          opacity: statsProgress,
          transform: `translateY(${(1 - statsProgress) * 8}px)`,
        }}>
          {[
            { label: 'Day Range', value: `$${dayLow.toFixed(0)} – $${dayHigh.toFixed(0)}` },
            { label: 'Change $', value: `${isPositive ? '+' : ''}$${(currentPrice - open).toFixed(2)}`, color },
            { label: 'Signal', value: overallSignal, color: overallSignal === 'BULLISH' ? '#22c55e' : overallSignal === 'BEARISH' ? '#ef4444' : '#f59e0b' },
          ].map(stat => (
            <div key={stat.label} style={{
              flex: 1,
              background: '#0a0f1e',
              borderRadius: 10,
              padding: '8px',
              textAlign: 'center',
              border: '1px solid rgba(148,163,184,0.07)',
            }}>
              <div style={{ fontSize: 8, color: '#475569', fontWeight: 600, marginBottom: 2 }}>{stat.label}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: stat.color || '#e2e8f0', fontFamily: 'monospace' }}>{stat.value}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

// Inline mini volume bars (compact, inside the scene)
const AnimatedVolumeInline: React.FC<{ bars: { label: string; value: number; isUp: boolean }[] }> = ({ bars }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - 8, fps, from: 0, to: 1, config: { damping: 20, stiffness: 50 } });

  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Intraday Volume</div>
      <div style={{ background: '#0a0f1e', borderRadius: 10, padding: '6px', border: '1px solid rgba(148,163,184,0.06)', display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
        {bars.map((bar, i) => {
          const h = Math.max(2, (bar.value / 100) * 28 * progress);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: h,
                background: bar.isUp ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)',
                borderRadius: 2,
                alignSelf: 'flex-end',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
