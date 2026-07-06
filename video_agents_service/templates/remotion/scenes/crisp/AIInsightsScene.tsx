import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

export const AIInsightsScene: React.FC<ShortsSceneProps> = ({ ticker, textOverlay, subText, decisionColor, dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const confidence = dataFields.confidence || 80;
  const rating = dataFields.signal || 'HOLD';
  const themeColor = decisionColor === 'green' ? '#10b981' : decisionColor === 'red' ? '#ef4444' : '#eab308';

  const ringProgress = interpolate(frame, [5, 45], [0, confidence / 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ringProgress);

  const glowPulse = 1 + Math.sin(frame / 12) * 0.04;
  const scale = spring({ frame, fps, from: 0.7, to: 1.0, config: { damping: 10 } });

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 28,
      background: 'radial-gradient(circle at center, #1e1b4b 0%, #090d16 100%)',
      padding: '0 40px',
    }}>
      {/* Title */}
      <div style={{ fontSize: 36, fontWeight: 700, color: '#94a3b8', letterSpacing: 2 }}>
        AI INSIGHTS
      </div>

      {/* Confidence Ring */}
      <div style={{
        transform: `scale(${scale * glowPulse})`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative',
        height: 180, width: 180, justifyContent: 'center'
      }}>
        {/* Glow */}
        <div style={{
          position: 'absolute', width: 130, height: 130, borderRadius: '50%',
          background: `radial-gradient(circle, ${themeColor}50 0%, transparent 70%)`,
          filter: 'blur(15px)', zIndex: 1
        }} />

        <svg width="170" height="170" viewBox="0 0 170 170" style={{ transform: 'rotate(-90deg)', zIndex: 2 }}>
          {/* Base */}
          <circle cx="85" cy="85" r={radius} fill="none" stroke="#1e293b" strokeWidth="12" />
          {/* Active */}
          <circle cx="85" cy="85" r={radius} fill="none" stroke={themeColor} strokeWidth="12"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Text inside */}
        <div style={{
          position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3
        }}>
          <div style={{ fontSize: 44, fontWeight: 900, color: '#ffffff' }}>
            {confidence}%
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', letterSpacing: 1.5 }}>
            CONFIDENCE
          </div>
        </div>
      </div>

      {/* AI Signal Detail Box */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.6)', border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 6, width: '90%', zIndex: 2
      }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#94a3b8', letterSpacing: 1 }}>
          RECOMMENDED ACTION
        </div>
        <div style={{ fontSize: 56, fontWeight: 900, color: themeColor, textTransform: 'uppercase' }}>
          {rating}
        </div>
      </div>
    </div>
  );
};
