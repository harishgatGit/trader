import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

export const MarketActionScene: React.FC<ShortsSceneProps> = ({ ticker, textOverlay, subText, dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const price = dataFields.price || textOverlay || '0.00';
  const change = dataFields.dayChangePct || '0.00';
  const changeColor = dataFields.changeColor === 'green' ? '#10b981' : '#ef4444';
  const isUp = parseFloat(change) >= 0;

  // Spring animation for price scale
  const scale = spring({ frame, fps, from: 0.8, to: 1.0, config: { damping: 10, stiffness: 120 } });
  
  // Animation progress for drawing chart line
  const lineDrawProgress = interpolate(frame, [10, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  // SVG dimensions for self-drawing line
  const width = 280;
  const height = 120;
  const strokeDash = 400;
  const dashOffset = strokeDash * (1 - lineDrawProgress);

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      background: 'radial-gradient(circle at top, #111827 0%, #090d16 100%)',
      padding: '0 40px',
    }}>
      {/* Header Label */}
      <div style={{ fontSize: 36, fontWeight: 700, color: '#94a3b8', letterSpacing: 2 }}>
        CURRENT MARKET ACTION
      </div>

      {/* Main Ticker Card */}
      <div style={{
        transform: `scale(${scale})`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        zIndex: 2
      }}>
        <div style={{ fontSize: 90, fontWeight: 900, color: '#ffffff', letterSpacing: -1 }}>
          {ticker}
        </div>
        <div style={{ fontSize: 80, fontWeight: 800, color: '#f8fafc' }}>
          ${price}
        </div>
        
        {/* Dynamic Badge */}
        <div style={{
          backgroundColor: isUp ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${changeColor}`,
          borderRadius: 30, padding: '10px 24px', fontSize: 36, fontWeight: 800, color: changeColor
        }}>
          {isUp ? '▲' : '▼'} {change}%
        </div>
      </div>

      {/* Self-drawing Chart Line Visual */}
      <div style={{
        width: '90%', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(30, 41, 59, 0.4)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)',
        position: 'relative', overflow: 'hidden', padding: 20
      }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={changeColor} stopOpacity="0.25"/>
              <stop offset="100%" stopColor={changeColor} stopOpacity="0.0"/>
            </linearGradient>
          </defs>
          
          {/* Animated Area under the curve */}
          <path
            d={isUp 
              ? `M 10 100 Q 80 80, 150 40 T 270 20 L 270 110 L 10 110 Z`
              : `M 10 20 Q 80 40, 150 80 T 270 100 L 270 110 L 10 110 Z`
            }
            fill="url(#chartGrad)"
            opacity={lineDrawProgress}
          />

          {/* Drawing chart line */}
          <path
            d={isUp 
              ? `M 10 100 Q 80 80, 150 40 T 270 20`
              : `M 10 20 Q 80 40, 150 80 T 270 100`
            }
            fill="none"
            stroke={changeColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={strokeDash}
            strokeDashoffset={dashOffset}
          />
        </svg>
      </div>
    </div>
  );
};
