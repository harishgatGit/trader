import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface IndexPanel {
  name: string;
  pct: number;
  color: string;
}

interface IndexOverviewSceneProps {
  narration: string;
  textOverlay: string;
  subText?: string;
  dataFields: {
    indexPanels?: IndexPanel[];
    indexSummary?: string;
  };
}

const COLOR_MAP: Record<string, string> = {
  green: '#10b981', red: '#ef4444', yellow: '#f59e0b',
};

const IndexCard: React.FC<{ panel: IndexPanel; delay: number; frame: number; fps: number }> = ({
  panel, delay, frame, fps,
}) => {
  const appear = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 100 } });
  const color = COLOR_MAP[panel.color] || '#f59e0b';
  const sign = panel.pct >= 0 ? '+' : '';
  const absVal = Math.abs(panel.pct);

  return (
    <div style={{
      transform: `scale(${appear})`, opacity: appear,
      background: 'rgba(17,24,39,0.8)', border: `1px solid ${color}44`,
      borderRadius: 12, padding: '24px 28px', flex: 1, minWidth: 220,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow top border */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: color, opacity: 0.7,
      }} />
      <div style={{ color: '#94a3b8', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' }}>
        {panel.name}
      </div>
      <div style={{
        color, fontSize: 36, fontWeight: 800, letterSpacing: -1, lineHeight: 1,
      }}>
        {sign}{absVal.toFixed(2)}%
      </div>
      {/* Mini bar indicator */}
      <div style={{ width: '100%', height: 4, background: '#1e293b', borderRadius: 2, marginTop: 4 }}>
        <div style={{
          height: '100%', borderRadius: 2, background: color,
          width: `${Math.min(absVal * 20, 100)}%`,
          transition: 'none',
        }} />
      </div>
    </div>
  );
};

export const IndexOverviewScene: React.FC<IndexOverviewSceneProps> = ({
  textOverlay, dataFields,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const panels = dataFields.indexPanels || [];
  const headerOpacity = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const headerY = interpolate(frame, [0, fps * 0.4], [-20, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(160deg, #0f172a 0%, #090d16 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Outfit", "Inter", system-ui, sans-serif',
      gap: 32, padding: '40px 60px',
    }}>
      {/* Header */}
      <div style={{
        opacity: headerOpacity, transform: `translateY(${headerY}px)`,
        textAlign: 'center',
      }}>
        <div style={{ color: '#14b8a6', fontSize: 12, letterSpacing: 5, marginBottom: 6 }}>
          INVESTINGATTI MARKET RECAP
        </div>
        <div style={{ color: '#f8fafc', fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
          {textOverlay}
        </div>
      </div>

      {/* 4-panel grid */}
      <div style={{ display: 'flex', gap: 16, width: '100%', justifyContent: 'center' }}>
        {panels.map((panel, i) => (
          <IndexCard
            key={panel.name}
            panel={panel}
            delay={Math.round(fps * (0.4 + i * 0.2))}
            frame={frame}
            fps={fps}
          />
        ))}
      </div>

      {/* Summary text */}
      {dataFields.indexSummary && (
        <div style={{
          opacity: interpolate(frame, [fps * 1.2, fps * 1.6], [0, 1], { extrapolateRight: 'clamp' }),
          color: '#64748b', fontSize: 14, textAlign: 'center', maxWidth: 700,
        }}>
          {dataFields.indexSummary}
        </div>
      )}
    </div>
  );
};
