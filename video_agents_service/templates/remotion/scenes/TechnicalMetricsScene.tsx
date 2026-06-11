import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneProps } from '../MainVideo';
import { AnimatedRSIChart } from '../components/AnimatedRSIChart';
import { AnimatedVolumeChart } from '../components/AnimatedVolumeChart';

interface TechnicalMetricsProps extends SceneProps {
  technicals: Record<string, any>;
}

const buildVolumeHistory = () => [
  { label: 'D-6', value: 78, isUp: true },
  { label: 'D-5', value: 65, isUp: true },
  { label: 'D-4', value: 72, isUp: true },
  { label: 'D-3', value: 55, isUp: false },
  { label: 'D-2', value: 40, isUp: false },
  { label: 'D-1', value: 38, isUp: false },
  { label: 'Today', value: 30, isUp: false },
];

export const TechnicalMetricsScene: React.FC<TechnicalMetricsProps> = ({
  technicals,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  const rsi = Number(technicals?.rsi14 ?? technicals?.rsi ?? 55.5);
  const macdLine = Number(technicals?.macdLine ?? 1.2);
  const macdSignal = Number(technicals?.macdSignal ?? 0.8);
  const macdHistogram = Number(technicals?.macdHistogram ?? (macdLine - macdSignal));
  const bias = technicals?.overallBias ?? 'BULLISH';
  const ema20 = technicals?.ema20 ? Number(technicals.ema20) : undefined;
  const ema50 = technicals?.ema50 ? Number(technicals.ema50) : undefined;

  const volumes = buildVolumeHistory();

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
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid rgba(51, 65, 85, 0.4)', paddingBottom: 8 }}>
          Technical Indicators
        </div>

        {/* RSI Gauge + MACD + Moving Averages */}
        <AnimatedRSIChart
          rsiValue={rsi}
          macdLine={macdLine}
          macdSignal={macdSignal}
          macdHistogram={macdHistogram}
          overallBias={bias}
          ema20={ema20}
          ema50={ema50}
        />

        {/* Volume trend */}
        <AnimatedVolumeChart
          bars={volumes}
          avgVolume={62}
          title="Volume Trend — 7 Days"
          showBelowAvgWarning={true}
        />

      </div>
    </div>
  );
};
