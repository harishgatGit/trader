import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

export const MomentumIndicatorsScene: React.FC<ShortsSceneProps> = ({ ticker, textOverlay, subText, decisionColor, dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rsi = dataFields.rsi || 50;
  const isUp = decisionColor === 'green';
  const themeColor = isUp ? '#10b981' : '#f59e0b';

  // Circle animation for RSI
  const circleProgress = interpolate(frame, [5, 40], [0, rsi / 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - circleProgress);

  const scale = spring({ frame, fps, from: 0.7, to: 1.0, config: { damping: 12 } });

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 28,
      background: 'radial-gradient(circle at top, #111827 0%, #090d16 100%)',
      padding: '0 40px',
    }}>
      {/* Title */}
      <div style={{ fontSize: 36, fontWeight: 700, color: '#94a3b8', letterSpacing: 2 }}>
        MOMENTUM INDICATORS
      </div>

      {/* Row containing Circular RSI Gauge */}
      <div style={{
        transform: `scale(${scale})`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative',
        height: 180, width: 180, justifyContent: 'center'
      }}>
        <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
          {/* Base track */}
          <circle cx="80" cy="80" r={radius} fill="none" stroke="#334155" strokeWidth="12" />
          
          {/* Colored track */}
          <circle cx="80" cy="80" r={radius} fill="none" stroke={themeColor} strokeWidth="12"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Floating text inside circle */}
        <div style={{
          position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: '#ffffff' }}>
            {rsi}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#64748b', letterSpacing: 1 }}>
            RSI
          </div>
        </div>
      </div>

      {/* Overlay status indicator (e.g. MACD status) */}
      <div style={{
        backgroundColor: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: '16px 28px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 6, width: '85%'
      }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: '#ffffff', textAlign: 'center' }}>
          {textOverlay || 'RSI Stable'}
        </div>
        <div style={{ fontSize: 26, fontWeight: 600, color: themeColor }}>
          {subText || 'MACD BULLISH CROSS'}
        </div>
      </div>
    </div>
  );
};
