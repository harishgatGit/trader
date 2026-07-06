import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

export const TrendAnalysisScene: React.FC<ShortsSceneProps> = ({ ticker, textOverlay, subText, decisionColor, dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isBullish = decisionColor === 'green' || dataFields.trend === 'bullish';
  const themeColor = isBullish ? '#10b981' : '#ef4444';

  const scale = spring({ frame, fps, from: 0.6, to: 1.0, config: { damping: 10 } });
  
  // Floating animation for the arrow
  const floatOffset = Math.sin(frame / 8) * 12;

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 32,
      background: 'radial-gradient(circle at bottom, #090d16 0%, #172554 100%)',
      padding: '0 40px',
    }}>
      {/* Title */}
      <div style={{ fontSize: 36, fontWeight: 700, color: '#94a3b8', letterSpacing: 2 }}>
        TREND ANALYSIS
      </div>

      {/* Giant Indicator Arrow Container */}
      <div style={{
        transform: `scale(${scale}) translateY(${floatOffset}px)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', width: 220, height: 220
      }}>
        {/* Glow behind arrow */}
        <div style={{
          position: 'absolute', width: 140, height: 140, borderRadius: '50%',
          background: `radial-gradient(circle, ${themeColor}60 0%, transparent 70%)`,
          filter: 'blur(20px)', zIndex: 1
        }} />

        {/* Large SVG Arrow */}
        <svg width="180" height="180" viewBox="0 0 24 24" fill="none" style={{ zIndex: 2, transform: isBullish ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.5s' }}>
          <path d="M12 4V20M12 4L6 10M12 4L18 10" stroke={themeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Primary Trend Label */}
      <div style={{
        fontSize: 56, fontWeight: 900, color: '#ffffff', textAlign: 'center',
        textTransform: 'uppercase', letterSpacing: -0.5, zIndex: 3
      }}>
        {textOverlay || 'EMA Trend Aligned'}
      </div>

      {/* Supporting detail */}
      <div style={{
        fontSize: 32, fontWeight: 600, color: themeColor, textAlign: 'center',
        letterSpacing: 0.5, zIndex: 3
      }}>
        {subText || 'MOMENTUM STABLE'}
      </div>
    </div>
  );
};
