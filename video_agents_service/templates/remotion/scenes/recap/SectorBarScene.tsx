import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface SectorBar {
  name: string;
  trend: string;
  color: string;
}

interface SectorBarSceneProps {
  narration: string;
  textOverlay: string;
  subText?: string;
  dataFields: {
    sectorBars?: SectorBar[];
    winners?: Array<{ name?: string; sectorName?: string; trend?: string; reasoning?: string }>;
    losers?: Array<{ name?: string; sectorName?: string; trend?: string; reasoning?: string }>;
  };
}

const COLOR_MAP: Record<string, string> = { green: '#10b981', red: '#ef4444', yellow: '#f59e0b' };

const TREND_WIDTH: Record<string, number> = {
  STRONG: 85, NEUTRAL: 50, WEAK: 25, REVERSING: 20,
};

const Bar: React.FC<{ bar: SectorBar; idx: number; frame: number; fps: number }> = ({
  bar, idx, frame, fps,
}) => {
  const delay = fps * (0.4 + idx * 0.2);
  const width = interpolate(frame, [delay, delay + fps * 0.6], [0, TREND_WIDTH[bar.trend] || 50], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const opacity = interpolate(frame, [delay, delay + fps * 0.3], [0, 1], { extrapolateRight: 'clamp' });
  const color = COLOR_MAP[bar.color] || '#f59e0b';

  return (
    <div style={{ opacity, display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
      <div style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600, width: 200, flexShrink: 0 }}>
        {bar.name}
      </div>
      <div style={{ flex: 1, height: 12, background: '#1e293b', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${width}%`, borderRadius: 6,
          background: `linear-gradient(90deg, ${color}99, ${color})`,
        }} />
      </div>
      <div style={{
        color, fontSize: 12, fontWeight: 700, letterSpacing: 2, width: 90, textAlign: 'right',
      }}>
        {bar.trend}
      </div>
    </div>
  );
};

export const SectorBarScene: React.FC<SectorBarSceneProps> = ({
  textOverlay, dataFields,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bars = dataFields.sectorBars || [];
  const headerOp = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const headerY  = interpolate(frame, [0, fps * 0.4], [-20, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(160deg, #0f172a 0%, #090d16 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start', justifyContent: 'center',
      fontFamily: '"Outfit", "Inter", system-ui, sans-serif',
      padding: '40px 80px', gap: 0, position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        opacity: headerOp, transform: `translateY(${headerY}px)`,
        marginBottom: 32,
      }}>
        <div style={{ color: '#14b8a6', fontSize: 11, letterSpacing: 5, marginBottom: 8 }}>
          INVESTINGATTI • SECTOR ANALYSIS
        </div>
        <div style={{ color: '#f8fafc', fontSize: 30, fontWeight: 700 }}>
          {textOverlay}
        </div>
      </div>

      {/* Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
        {bars.slice(0, 6).map((bar, i) => (
          <Bar key={`${bar.name}-${i}`} bar={bar} idx={i} frame={frame} fps={fps} />
        ))}
      </div>

      {/* Brand */}
      <div style={{
        position: 'absolute', bottom: 22, right: 40,
        color: '#1e293b', fontSize: 11, letterSpacing: 3,
      }}>
        INVESTINGATTI
      </div>
    </div>
  );
};
