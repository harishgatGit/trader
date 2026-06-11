import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneProps } from '../MainVideo';
import { AnimatedPriceChart } from '../components/AnimatedPriceChart';
import { AnimatedVolumeChart } from '../components/AnimatedVolumeChart';

interface EvidenceProps extends SceneProps {
  catalysts: string;
}

// Build 10-day simulated daily prices showing trend with a pullback
const buildDailyPrices = (currentPrice: number) => {
  const base = currentPrice * 1.065;
  return [
    { label: 'D-9', price: base * 0.920 },
    { label: 'D-8', price: base * 0.935 },
    { label: 'D-7', price: base * 0.950 },
    { label: 'D-6', price: base * 0.960 },
    { label: 'D-5', price: base * 0.975 },
    { label: 'D-4', price: base * 0.990 },
    { label: 'D-3', price: base * 1.000 },
    { label: 'D-2', price: base * 0.985 },
    { label: 'D-1', price: base * 0.978 },
    { label: 'Today', price: currentPrice },
  ];
};

const buildDailyVolumes = () => [
  { label: 'D-9', value: 42, isUp: true },
  { label: 'D-8', value: 55, isUp: true },
  { label: 'D-7', value: 65, isUp: true },
  { label: 'D-6', value: 58, isUp: true },
  { label: 'D-5', value: 72, isUp: true },
  { label: 'D-4', value: 68, isUp: true },
  { label: 'D-3', value: 80, isUp: true },
  { label: 'D-2', value: 45, isUp: false },
  { label: 'D-1', value: 38, isUp: false },
  { label: 'Today', value: 32, isUp: false },
];

export const EvidenceScene: React.FC<EvidenceProps> = ({
  catalysts,
  dataFields,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });
  const p1 = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });
  const p2 = spring({ frame: frame - 10, fps, from: 0, to: 1, config: { damping: 12 } });
  const p3 = spring({ frame: frame - 20, fps, from: 0, to: 1, config: { damping: 12 } });

  const hasCatalysts = catalysts && catalysts !== 'Unavailable' && catalysts !== 'N/A';

  // Pull currentPrice from dataFields if available
  const currentPrice = dataFields?.currentPrice as number || 419.17;
  const prices = buildDailyPrices(currentPrice);
  const volumes = buildDailyVolumes();

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
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid rgba(51, 65, 85, 0.4)', paddingBottom: 8 }}>
          Evidence Verification
        </div>

        {/* 10-Day price chart */}
        <AnimatedPriceChart
          prices={prices}
          currentPrice={currentPrice}
          title="10-Day Price Trend"
          supportLevel={currentPrice * 0.952}
          resistanceLevel={currentPrice * 1.014}
        />

        {/* 10-Day Volume chart */}
        <AnimatedVolumeChart
          bars={volumes}
          avgVolume={60}
          title="10-Day Volume — Below-Average Warning"
          showBelowAvgWarning={true}
        />

        {/* Evidence check rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'News & Catalysts', status: hasCatalysts ? 'Confirmed' : 'None', ok: hasCatalysts, p: p1 },
            { label: 'Volume Confirmation', status: 'WEAK — Below Average', ok: false, p: p2 },
            { label: 'Technical Support', status: 'Holding above EMA', ok: true, p: p3 },
          ].map(row => (
            <div key={row.label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0a0f1e',
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid rgba(148,163,184,0.07)',
              opacity: row.p,
              transform: `translateY(${(1 - row.p) * 10}px)`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{row.label}</span>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                color: row.ok ? '#22c55e' : '#f59e0b',
                background: row.ok ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                padding: '2px 8px',
                borderRadius: 6,
                textTransform: 'uppercase',
              }}>
                {row.status}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
