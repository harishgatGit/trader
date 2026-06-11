import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface VolumeBar { label: string; value: number; isUp: boolean; }

interface AnimatedVolumeChartProps {
  bars: VolumeBar[];
  avgVolume?: number; // 0-100 as reference line
  title?: string;
  showBelowAvgWarning?: boolean;
}

export const AnimatedVolumeChart: React.FC<AnimatedVolumeChartProps> = ({
  bars,
  avgVolume = 65,
  title = 'Volume Analysis',
  showBelowAvgWarning = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const drawProgress = spring({ frame, fps, from: 0, to: 1, config: { damping: 20, stiffness: 50 } });
  const avgLineProgress = spring({ frame: frame - 15, fps, from: 0, to: 1, config: { damping: 16, stiffness: 60 } });
  const labelProgress = spring({ frame: frame - 25, fps, from: 0, to: 1, config: { damping: 14, stiffness: 55 } });

  const W = 300;
  const H = 80;
  const PAD_L = 28;
  const PAD_R = 8;
  const PAD_T = 6;
  const PAD_B = 18;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const barW = Math.min(18, (chartW / bars.length) * 0.65);
  const spacing = chartW / bars.length;

  const avgY = PAD_T + chartH - (avgVolume / 100) * chartH;

  return (
    <div style={{ width: '100%' }}>
      {title && (
        <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          {title}
        </div>
      )}
      <div style={{
        background: '#0a0f1e',
        borderRadius: 12,
        border: '1px solid rgba(148,163,184,0.08)',
        padding: '8px 6px 4px',
        position: 'relative',
      }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="vol-up-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="vol-dn-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Y-axis grid + labels */}
          {[25, 50, 75, 100].map(pct => {
            const y = PAD_T + chartH - (pct / 100) * chartH;
            return (
              <g key={pct}>
                <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <text x={PAD_L - 3} y={y + 3} textAnchor="end" fill="rgba(148,163,184,0.4)" fontSize="7" fontFamily="monospace">{pct}</text>
              </g>
            );
          })}

          {/* Volume bars */}
          {bars.map((bar, i) => {
            const x = PAD_L + i * spacing + spacing / 2;
            const maxH = chartH;
            const barH = (bar.value / 100) * maxH * drawProgress;
            const y = PAD_T + chartH - barH;
            const fill = bar.isUp ? 'url(#vol-up-grad)' : 'url(#vol-dn-grad)';
            const isBelowAvg = bar.value < avgVolume;

            return (
              <g key={i}>
                <rect
                  x={x - barW / 2}
                  y={y}
                  width={barW}
                  height={barH}
                  fill={fill}
                  rx="2"
                  opacity={isBelowAvg ? 0.6 : 1}
                />
                {/* X label */}
                <text
                  x={x}
                  y={PAD_T + chartH + PAD_B - 2}
                  textAnchor="middle"
                  fill="rgba(148,163,184,0.45)"
                  fontSize="7"
                  fontFamily="monospace"
                >
                  {bar.label}
                </text>
              </g>
            );
          })}

          {/* Average volume line */}
          {avgLineProgress > 0 && (
            <g>
              <line
                x1={PAD_L}
                y1={avgY}
                x2={PAD_L + (W - PAD_L - PAD_R) * avgLineProgress}
                y2={avgY}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="4,3"
                opacity={0.8}
              />
              {avgLineProgress > 0.6 && (
                <text
                  x={W - PAD_R - 2}
                  y={avgY - 3}
                  textAnchor="end"
                  fill="#f59e0b"
                  fontSize="8"
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  AVG
                </text>
              )}
            </g>
          )}
        </svg>

        {/* Below average warning badge */}
        {showBelowAvgWarning && labelProgress > 0.5 && (
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.35)',
            borderRadius: 6,
            padding: '3px 7px',
            fontSize: 9,
            fontWeight: 700,
            color: '#f59e0b',
            letterSpacing: 0.5,
            opacity: labelProgress,
          }}>
            BELOW AVG
          </div>
        )}
      </div>
    </div>
  );
};
