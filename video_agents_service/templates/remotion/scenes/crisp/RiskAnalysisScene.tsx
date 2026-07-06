import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

export const RiskAnalysisScene: React.FC<ShortsSceneProps> = ({ ticker, textOverlay, subText, dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const risk = dataFields.risk || subText || 'Standard market volatility';

  // Gauge needle rotation animation (0 to 180 degrees)
  const needleRotation = interpolate(frame, [5, 35], [-90, 30], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const scale = spring({ frame, fps, from: 0.8, to: 1.0, config: { damping: 10 } });

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      background: 'radial-gradient(circle at center, #311010 0%, #090d16 100%)',
      padding: '0 40px',
    }}>
      {/* Title */}
      <div style={{ fontSize: 36, fontWeight: 700, color: '#fca5a5', letterSpacing: 2 }}>
        RISK ANALYSIS
      </div>

      {/* Semi-circular Risk Gauge */}
      <div style={{
        transform: `scale(${scale})`,
        position: 'relative', width: 220, height: 120, display: 'flex',
        alignItems: 'flex-end', justifyContent: 'center'
      }}>
        <svg width="200" height="100" viewBox="0 0 200 100">
          <defs>
            <linearGradient id="riskGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981"/>
              <stop offset="50%" stopColor="#eab308"/>
              <stop offset="100%" stopColor="#ef4444"/>
            </linearGradient>
          </defs>
          {/* Arc */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#riskGrad)" strokeWidth="18" strokeLinecap="round" />
        </svg>

        {/* Needle */}
        <div style={{
          position: 'absolute', bottom: 0, width: 8, height: 75,
          backgroundColor: '#ffffff', borderRadius: 4, transformOrigin: 'bottom center',
          transform: `rotate(${needleRotation}deg)`, transition: 'transform 0.1s'
        }} />
      </div>

      {/* Risk Alert Text */}
      <div style={{
        background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 6, width: '90%'
      }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>
          {textOverlay || 'Risk Check Active'}
        </div>
        <div style={{ fontSize: 28, fontWeight: 500, color: '#cbd5e1', textAlign: 'center', lineHeight: 1.3 }}>
          {risk}
        </div>
      </div>
    </div>
  );
};
