import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

export const UpsidePotentialScene: React.FC<ShortsSceneProps> = ({ ticker, textOverlay, subText, dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const target = dataFields.targetStr || 'N/A';

  const progress = interpolate(frame, [5, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const animScale = spring({ frame, fps, from: 0.8, to: 1.0, config: { damping: 10 } });

  // Curve dimensions
  const width = 240;
  const height = 120;
  const strokeDash = 300;
  const dashOffset = strokeDash * (1 - progress);

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 28,
      background: 'radial-gradient(circle at center, #090d16 0%, #1e1b4b 100%)',
      padding: '0 40px',
    }}>
      {/* Title */}
      <div style={{ fontSize: 36, fontWeight: 700, color: '#94a3b8', letterSpacing: 2 }}>
        UPSIDE POTENTIAL
      </div>

      {/* Upward Price Path Animation */}
      <div style={{
        transform: `scale(${animScale})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(30, 41, 59, 0.4)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)',
        width: '90%', height: 160, position: 'relative'
      }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="upsideGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"/>
            </linearGradient>
          </defs>

          {/* Area */}
          <path
            d={`M 10 100 Q 120 100, 230 20 L 230 110 L 10 110 Z`}
            fill="url(#upsideGrad)"
            opacity={progress}
          />

          {/* Path Line */}
          <path
            d={`M 10 100 Q 120 100, 230 20`}
            fill="none"
            stroke="#10b981"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={strokeDash}
            strokeDashoffset={dashOffset}
          />

          {/* Endpoint Dot */}
          {progress > 0.9 && (
            <circle cx="230" cy="20" r="8" fill="#10b981" />
          )}
        </svg>
      </div>

      {/* Target Price Card */}
      <div style={{
        background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 6, width: '90%'
      }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#a7f3d0', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          UPSIDE TARGET
        </div>
        <div style={{ fontSize: 56, fontWeight: 900, color: '#10b981' }}>
          {target}
        </div>
      </div>
    </div>
  );
};
